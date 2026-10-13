import { BAHRAIN_ISLAND_SHORELINES, geoToWorld } from '../data/bahrain_osm_data.js';

/**
 * Circular HUD Minimap Radar for Bahrain.
 * Renders an interactive 2D vector radar overlay tracking player and vehicle blips.
 */
export class MinimapRadar {
  constructor(canvasElement, onExpandCallback) {
    this.canvas = canvasElement;
    this.ctx = this.canvas.getContext('2d');
    this.size = 180;
    this.canvas.width = this.size;
    this.canvas.height = this.size;
    this.onExpand = onExpandCallback;

    // Attach click/tap listener to trigger fullscreen map modal
    this.canvas.addEventListener('click', () => {
      if (this.onExpand) this.onExpand();
    });
    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      if (this.onExpand) this.onExpand();
    });
  }

  render(playerPos, playerHeading, vehiclePositions = {}) {
    const ctx = this.ctx;
    const w = this.size;
    const h = this.size;
    const cx = w / 2;
    const cy = h / 2;
    const radius = w / 2 - 6;

    ctx.clearRect(0, 0, w, h);

    // 1. Circular Radar Backdrop & Mask
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.clip();

    // Dark translucent Gulf water background
    ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
    ctx.fillRect(0, 0, w, h);

    // Radar Range Rings & Crosshairs
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.35, 0, Math.PI * 2);
    ctx.arc(cx, cy, radius * 0.70, 0, Math.PI * 2);
    ctx.moveTo(cx, 0); ctx.lineTo(cx, h);
    ctx.moveTo(0, cy); ctx.lineTo(w, cy);
    ctx.stroke();

    // 2. Draw Bahrain Island Shorelines
    // Scale: 1 pixel ~ 60 meters
    const scale = 0.016;
    ctx.fillStyle = 'rgba(74, 222, 128, 0.35)'; // Land tint

    BAHRAIN_ISLAND_SHORELINES.forEach(poly => {
      if (poly.length < 3) return;
      ctx.beginPath();
      const first = geoToWorld(poly[0][0], poly[0][1]);
      const sx0 = cx + (first.x - playerPos.x) * scale;
      const sy0 = cy + (first.z - playerPos.z) * scale;
      ctx.moveTo(sx0, sy0);

      for (let i = 1; i < poly.length; i++) {
        const pt = geoToWorld(poly[i][0], poly[i][1]);
        const sx = cx + (pt.x - playerPos.x) * scale;
        const sy = cy + (pt.z - playerPos.z) * scale;
        ctx.lineTo(sx, sy);
      }
      ctx.closePath();
      ctx.fill();
    });

    // 3. Vehicle Blips on Radar
    const drawBlip = (pos, color) => {
      if (!pos) return;
      const bx = cx + (pos.x - playerPos.x) * scale;
      const by = cy + (pos.z - playerPos.z) * scale;
      if (Math.hypot(bx - cx, by - cy) < radius - 4) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(bx, by, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    };

    drawBlip(vehiclePositions.car, '#4ade80');   // Car: Green
    drawBlip(vehiclePositions.boat, '#38bdf8');  // Boat: Blue
    drawBlip(vehiclePositions.heli, '#facc15');  // Heli: Yellow
    drawBlip(vehiclePositions.plane, '#a855f7'); // Plane: Purple

    // 4. Center Player Heading Arrow (Yellow / White)
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(playerHeading);

    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.moveTo(0, -9);
    ctx.lineTo(-6, 7);
    ctx.lineTo(0, 4);
    ctx.lineTo(6, 7);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.restore(); // Restore clip

    // 5. Outer Bezel & Compass Cardinal Points
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();

    // North Marker (Red)
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('N', cx, 14);

    ctx.fillStyle = '#94a3b8';
    ctx.fillText('S', cx, h - 5);
    ctx.fillText('E', w - 8, cy + 4);
    ctx.fillText('W', 8, cy + 4);
  }
}
