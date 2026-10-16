// Dual-mode map: a circular minimap (top-right) that expands into a full-screen map.
// One DOM element animates between the two states with a CSS transition.
// Pan with drag, zoom with pinch or wheel, and tap to teleport.
import { getLandRings } from './land.js';
import { ROAD_WIDTH } from './osm.js';
import { PLACES } from './config.js';
import { lonLatToXZ, ringsBounds, pointInLand } from './geo.js';

const MINI_RADIUS_M = 650; // metres visible across the minimap diameter / 2
const COLORS = {
  sea: '#0c5a72',
  land: '#d8c394',
  street: '#7d7f83',
  arterial: '#9c9ea3',
  building: '#8e8270',
  player: '#ffffff',
  car: '#ff5a4e',
  boat: '#3aa7ff',
  plane: '#ffd23f',
  heli: '#6ee37a',
};

const PATH_CHUNK = 1000;

/** Splits `items` into Path2D objects of PATH_CHUNK items each; `addItem(path, item)` draws one item. */
function chunkPaths(items, addItem) {
  const paths = [];
  let p = null;
  for (let i = 0; i < items.length; i++) {
    if (i % PATH_CHUNK === 0) paths.push((p = new Path2D()));
    addItem(p, items[i]);
  }
  return paths;
}

/** Road segments as thin quads. Each segment is [ax, az, bx, bz, halfWidth]. */
function segmentPaths(segs) {
  return chunkPaths(segs, (p, [ax, az, bx, bz, hw]) => {
    const dx = bx - ax;
    const dz = bz - az;
    const len = Math.hypot(dx, dz) || 1;
    const nx = (-dz / len) * hw;
    const nz = (dx / len) * hw;
    p.moveTo(ax + nx, az + nz);
    p.lineTo(bx + nx, bz + nz);
    p.lineTo(bx - nx, bz - nz);
    p.lineTo(ax - nx, az - nz);
    p.closePath();
  });
}

export class GameMap {
  /**
   * @param {object} o
   * @param {HTMLElement} o.container  the #minimap element (gets .expanded when full screen)
   * @param {HTMLCanvasElement} o.canvas
   * @param {object} o.data  dataset with roads + buildings
   * @param {(x:number,z:number)=>void} o.onTeleport
   * @param {()=>{x:number,z:number,fx:number,fz:number}} o.getPlayer  position + forward (unit, XZ)
   * @param {()=>Array<{kind:string,x:number,z:number}>} o.getVehicles
   * @param {(msg:string)=>void} o.toast
   */
  constructor(o) {
    Object.assign(this, o);
    this.ctx = this.canvas.getContext('2d');
    this.expanded = false;
    this.needsFit = false;
    this.view = { cx: 0, cz: 0, scale: 0.1 };
    this.pointers = new Map();
    this.gesture = null;
    this.land = getLandRings();
    const b = ringsBounds(this.land);
    this.landBounds = b;
    this.fitScale = 1;
    this.buildPaths();
    this.bindEvents();
  }

  buildPaths() {
    const land = new Path2D();
    for (const ring of this.land) {
      land.moveTo(ring[0][0], ring[0][1]);
      for (const [x, z] of ring) land.lineTo(x, z);
      land.closePath();
    }
    this.landPath = land;

    // Chromium builds a single Path2D with many sub-paths very slowly (60k shapes took minutes),
    // so roads and buildings are split into chunks of about 1000 shapes each.
    const streetSegs = [];
    const arterialSegs = [];
    for (const r of this.data.roads) {
      const hw = (r.w ?? ROAD_WIDTH[r.kind] ?? 8) / 2;
      const list = r.kind === 'street' ? streetSegs : arterialSegs;
      for (let i = 0; i < r.pts.length - 1; i++) {
        list.push([r.pts[i][0], r.pts[i][1], r.pts[i + 1][0], r.pts[i + 1][1], hw]);
      }
    }
    this.roadPaths = segmentPaths(streetSegs);
    this.arterialPaths = segmentPaths(arterialSegs);

    const buildings = this.data.buildings.filter((b) => b.pts && b.pts.length >= 3);
    this.buildingPaths = chunkPaths(buildings, (p, b) => {
      p.moveTo(b.pts[0][0], b.pts[0][1]);
      for (let i = 1; i < b.pts.length; i++) p.lineTo(b.pts[i][0], b.pts[i][1]);
      p.closePath();
    });
    this.placeXZ = PLACES.map((p) => ({ name: p.name, ...this.xz(p) }));
  }

  xz(p) {
    const [x, z] = lonLatToXZ(p.lon, p.lat);
    return { x, z };
  }

  setExpanded(on) {
    if (on === this.expanded) return;
    this.expanded = on;
    this.container.classList.toggle('expanded', on);
    this.needsFit = on; // fit once the CSS transition has finished growing the element
    this.hint?.classList.toggle('hidden', !on);
  }

  open() {
    this.setExpanded(true);
  }

  close() {
    this.setExpanded(false);
  }

  toggle() {
    this.setExpanded(!this.expanded);
  }

  fitView() {
    const { minX, maxX, minZ, maxZ } = this.landBounds;
    const w = this.width || 1;
    const h = this.height || 1;
    this.view.cx = (minX + maxX) / 2;
    this.view.cz = (minZ + maxZ) / 2;
    this.fitScale = Math.min(w / (maxX - minX + 2000), h / (maxZ - minZ + 2000));
    this.view.scale = this.fitScale;
  }

  bindEvents() {
    const c = this.canvas;
    c.addEventListener('pointerdown', (e) => this.onDown(e));
    c.addEventListener('pointermove', (e) => this.onMove(e));
    c.addEventListener('pointerup', (e) => this.onUp(e));
    c.addEventListener('pointercancel', (e) => this.pointers.delete(e.pointerId));
    c.addEventListener(
      'wheel',
      (e) => {
        if (!this.expanded) return;
        e.preventDefault();
        const f = Math.exp(-e.deltaY * 0.0015);
        this.zoomAt(f, e.clientX, e.clientY);
      },
      { passive: false },
    );
    this.container.addEventListener('click', (e) => {
      if (!this.expanded) this.open();
      else if (e.target.closest('[data-close]')) this.close();
    });
  }

  local(e) {
    const r = this.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  onDown(e) {
    if (!this.expanded) return;
    this.canvas.setPointerCapture?.(e.pointerId);
    const p = this.local(e);
    this.pointers.set(e.pointerId, p);
    if (this.pointers.size === 1) {
      this.gesture = { type: 'tap-or-pan', start: p, moved: 0, t: performance.now() };
    } else if (this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()];
      this.gesture = {
        type: 'pinch',
        d0: Math.hypot(a.x - b.x, a.y - b.y) || 1,
        scale0: this.view.scale,
        moved: 99,
      };
    }
  }

  onMove(e) {
    if (!this.expanded || !this.pointers.has(e.pointerId)) return;
    const prev = this.pointers.get(e.pointerId);
    const p = this.local(e);
    this.pointers.set(e.pointerId, p);
    if (this.pointers.size === 1 && this.gesture?.type === 'tap-or-pan') {
      const dx = p.x - prev.x;
      const dy = p.y - prev.y;
      this.gesture.moved += Math.abs(dx) + Math.abs(dy);
      this.view.cx -= dx / this.view.scale;
      this.view.cz -= dy / this.view.scale;
    } else if (this.pointers.size >= 2) {
      const [a, b] = [...this.pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const target = this.gesture?.scale0 ? this.gesture.scale0 * (d / this.gesture.d0) : this.view.scale;
      this.zoomTo(target, mid);
    }
  }

  onUp(e) {
    if (!this.expanded) return;
    const wasTap =
      this.pointers.size === 1 &&
      this.gesture?.type === 'tap-or-pan' &&
      this.gesture.moved < 10 &&
      performance.now() - this.gesture.t < 500;
    this.pointers.delete(e.pointerId);
    if (this.pointers.size === 0) this.gesture = null;
    if (wasTap) {
      const p = this.local(e);
      const w = this.screenToWorld(p.x, p.y);
      if (!pointInLand(w.x, w.z, this.land)) {
        this.toast('That is open water. Tap a point on land.');
        return;
      }
      this.onTeleport(w.x, w.z);
    }
  }

  screenToWorld(sx, sy) {
    return {
      x: this.view.cx + (sx - this.width / 2) / this.view.scale,
      z: this.view.cz + (sy - this.height / 2) / this.view.scale,
    };
  }

  zoomAt(factor, clientX, clientY) {
    const r = this.canvas.getBoundingClientRect();
    this.zoomTo(this.view.scale * factor, { x: clientX - r.left, y: clientY - r.top });
  }

  zoomTo(scale, anchor) {
    const minS = this.fitScale * 0.5;
    const maxS = 1.5;
    const s1 = Math.min(maxS, Math.max(minS, scale));
    const wx = this.view.cx + (anchor.x - this.width / 2) / this.view.scale;
    const wz = this.view.cz + (anchor.y - this.height / 2) / this.view.scale;
    this.view.scale = s1;
    this.view.cx = wx - (anchor.x - this.width / 2) / s1;
    this.view.cz = wz - (anchor.y - this.height / 2) / s1;
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (w !== this.width || h !== this.height || dpr !== this.dpr) {
      this.width = w;
      this.height = h;
      this.dpr = dpr;
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
      this.canvas.style.width = `${w}px`;
      this.canvas.style.height = `${h}px`;
    }
    if (this.needsFit && this.expanded && w >= window.innerWidth - 4) {
      this.needsFit = false;
      this.fitView();
    }
  }

  /** Called every frame by the game loop. */
  update() {
    this.resize();
    if (!this.width) return;
    const p = this.getPlayer();
    if (!this.expanded) {
      // minimap: centred on the player, north up
      this.view.cx = p.x;
      this.view.cz = p.z;
      this.view.scale = Math.min(this.width, this.height) / 2 / MINI_RADIUS_M;
    }
    this.draw(p);
  }

  draw(player) {
    const ctx = this.ctx;
    const { width: W, height: H, dpr, view } = this;
    const s = view.scale;
    const ox = W / 2 - view.cx * s;
    const oz = H / 2 - view.cz * s;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = COLORS.sea;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // world -> device pixels
    ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oz);
    ctx.fillStyle = COLORS.land;
    ctx.fill(this.landPath);
    ctx.fillStyle = COLORS.arterial;
    for (const p of this.arterialPaths) ctx.fill(p);
    ctx.fillStyle = COLORS.street;
    for (const p of this.roadPaths) ctx.fill(p);
    if (s > 0.02) {
      ctx.fillStyle = COLORS.building;
      for (const p of this.buildingPaths) ctx.fill(p);
    }

    // overlays are drawn in CSS pixels
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const toScreen = (x, z) => ({ x: x * s + ox, y: z * s + oz });

    if (this.expanded) {
      ctx.font = '600 12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0,0,0,0.55)';
      ctx.fillStyle = '#fff';
      // skip a label that would overlap one already drawn (Airport and Muharraq are close together)
      // each label sits beside its dot (right, or left if the right side is taken), so the text never covers the marker
      ctx.textBaseline = 'middle';
      // main towns first, so they win when two labels collide (Muharraq must not lose to the Airport label)
      const LABEL_RANK = ['Muharraq', 'Manama', 'Riffa', 'Isa Town'];
      const rank = (p) => { const i = LABEL_RANK.indexOf(p.name); return i < 0 ? 99 : i; };
      const taken = [];
      for (const place of [...this.placeXZ].sort((a, b) => rank(a) - rank(b))) {
        const q = toScreen(place.x, place.z);
        const w = ctx.measureText(place.name).width;
        const clashes = (box) => taken.some((o) => box.l < o.r && box.r > o.l && box.t < o.b && box.b > o.t);
        const right = { l: q.x + 7, r: q.x + 9 + w + 2, t: q.y - 8, b: q.y + 8 };
        const left = { l: q.x - 9 - w - 2, r: q.x - 7, t: q.y - 8, b: q.y + 8 };
        let side = null;
        if (!clashes(right)) side = 'right';
        else if (!clashes(left)) side = 'left';
        if (!side) continue;
        taken.push(side === 'right' ? right : left);
        ctx.textAlign = side === 'right' ? 'left' : 'right';
        const x0 = side === 'right' ? q.x + 9 : q.x - 9;
        ctx.strokeText(place.name, x0, q.y);
        ctx.fillText(place.name, x0, q.y);
      }
    }

    for (const v of this.getVehicles()) {
      const q = toScreen(v.x, v.z);
      if (q.x < -20 || q.y < -20 || q.x > W + 20 || q.y > H + 20) continue;
      ctx.fillStyle = COLORS[v.kind] ?? '#fff';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(q.x, q.y, this.expanded ? 6 : 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // player: arrow pointing along heading (north = up)
    const q = toScreen(player.x, player.z);
    ctx.save();
    ctx.translate(q.x, q.y);
    // arrow points up when facing north (-Z); player.fx/fz is the world-space forward vector
    ctx.rotate(Math.atan2(player.fz, player.fx) + Math.PI / 2);
    ctx.fillStyle = COLORS.player;
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -9);
    ctx.lineTo(6, 7);
    ctx.lineTo(0, 3.5);
    ctx.lineTo(-6, 7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

