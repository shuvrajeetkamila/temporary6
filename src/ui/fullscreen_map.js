import { BAHRAIN_ISLAND_SHORELINES, BAHRAIN_HIGHWAYS, BAHRAIN_LANDMARKS, geoToWorld, worldToGeo } from '../data/bahrain_osm_data.js';

/**
 * Step 4: Fullscreen Interactive World Map with Zoom, Pan, and Touch Teleportation.
 */
export class FullscreenMapModal {
  constructor(containerElement, onTeleportCallback) {
    this.container = containerElement;
    this.onTeleport = onTeleportCallback;
    this.isOpen = false;

    this.zoom = 1.0;
    this.panX = 0;
    this.panY = 0;
    this.isDragging = false;
    this.dragStart = { x: 0, y: 0 };

    this.setupDOM();
  }

  setupDOM() {
    this.container.innerHTML = `
      <div id="map-modal-backdrop" class="map-modal-backdrop hidden">
        <div class="map-modal-content">
          <!-- Header -->
          <div class="map-header">
            <div>
              <h2 class="map-title">KINGDOM OF BAHRAIN — 3D WORLD MAP</h2>
              <p class="map-subtitle">TOUCH ANY LOCATION TO TELEPORT • DRAG TO PAN • ZOOM [+] / [-]</p>
            </div>
            <button id="map-close-btn" class="map-btn-close">✕ CLOSE</button>
          </div>

          <!-- Main Layout -->
          <div class="map-body">
            <!-- Left Fast-Travel Sidebar -->
            <div class="map-sidebar">
              <h3 class="sidebar-title">FAST TRAVEL HUBS</h3>
              <div id="landmark-list" class="landmark-list"></div>
              <div class="osm-attribution">© OpenStreetMap contributors<br>EPSG:32639 / WGS84</div>
            </div>

            <!-- Map Interactive Canvas Area -->
            <div class="map-canvas-container" id="map-canvas-wrap">
              <canvas id="fullscreen-map-canvas"></canvas>
              
              <!-- Zoom Overlay Buttons -->
              <div class="map-zoom-controls">
                <button id="map-zoom-in" class="zoom-btn">+</button>
                <button id="map-zoom-out" class="zoom-btn">−</button>
                <button id="map-recenter" class="zoom-btn">⌖</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.backdrop = document.getElementById('map-modal-backdrop');
    this.canvas = document.getElementById('fullscreen-map-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.canvasWrap = document.getElementById('map-canvas-wrap');

    // Populate Fast Travel Landmark List
    const listEl = document.getElementById('landmark-list');
    BAHRAIN_LANDMARKS.forEach(lm => {
      const btn = document.createElement('button');
      btn.className = 'landmark-item';
      btn.innerHTML = `
        <span class="lm-name">${lm.name}</span>
        <span class="lm-name-ar">${lm.name_ar}</span>
      `;
      btn.addEventListener('click', () => {
        const { x, z } = geoToWorld(lm.lat, lm.lon);
        this.triggerTeleport(x, z, lm.groundY || 2.5);
      });
      listEl.appendChild(btn);
    });

    // Close button
    document.getElementById('map-close-btn').addEventListener('click', () => this.close());

    // Zoom buttons
    document.getElementById('map-zoom-in').addEventListener('click', () => {
      this.zoom = Math.min(4.0, this.zoom * 1.35);
      this.render();
    });
    document.getElementById('map-zoom-out').addEventListener('click', () => {
      this.zoom = Math.max(0.4, this.zoom / 1.35);
      this.render();
    });
    document.getElementById('map-recenter').addEventListener('click', () => {
      this.panX = 0;
      this.panY = 0;
      this.zoom = 1.0;
      this.render();
    });

    // Canvas Mouse / Touch Events for Pan & Direct Touch-to-Teleport
    this.canvas.addEventListener('pointerdown', (e) => {
      this.isDragging = true;
      this.dragStart = { x: e.clientX, y: e.clientY };
      this.dragDistance = 0;
    });

    window.addEventListener('pointermove', (e) => {
      if (!this.isDragging || !this.isOpen) return;
      const dx = e.clientX - this.dragStart.x;
      const dy = e.clientY - this.dragStart.y;
      this.dragDistance += Math.hypot(dx, dy);
      this.panX += dx;
      this.panY += dy;
      this.dragStart = { x: e.clientX, y: e.clientY };
      this.render();
    });

    window.addEventListener('pointerup', (e) => {
      if (!this.isDragging || !this.isOpen) return;
      this.isDragging = false;

      // If user tapped without dragging: Touch-To-Teleport!
      if (this.dragDistance < 8) {
        const rect = this.canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        // Convert canvas click to world space
        const { worldX, worldZ } = this.canvasToWorld(clickX, clickY);
        this.triggerTeleport(worldX, worldZ, 2.5);
      }
    });

    // Mouse wheel zoom
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
      this.zoom = Math.max(0.4, Math.min(4.5, this.zoom * zoomFactor));
      this.render();
    });

    // Resize observer for canvas
    const resizeObserver = new ResizeObserver(() => {
      if (this.isOpen) this.resizeCanvas();
    });
    resizeObserver.observe(this.canvasWrap);
  }

  resizeCanvas() {
    const rect = this.canvasWrap.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
    this.render();
  }

  open(playerPos = { x: 0, z: 0 }, playerHeading = 0) {
    this.playerPos = playerPos;
    this.playerHeading = playerHeading;
    this.isOpen = true;
    this.backdrop.classList.remove('hidden');
    setTimeout(() => this.resizeCanvas(), 50);
  }

  close() {
    this.isOpen = false;
    this.backdrop.classList.add('hidden');
  }

  triggerTeleport(x, z, groundY = 2.5) {
    if (this.onTeleport) {
      this.onTeleport(x, groundY, z);
    }
    this.close();
  }

  canvasToWorld(cx, cy) {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const midX = w / 2 + this.panX;
    const midY = h / 2 + this.panY;

    // Base scale: fits Bahrain archipelago (~65,000m north-south) into canvas height
    const baseScale = (h / 65000) * this.zoom;

    const worldX = (cx - midX) / baseScale;
    const worldZ = (cy - midY) / baseScale;
    return { worldX, worldZ };
  }

  worldToCanvas(wx, wz) {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const midX = w / 2 + this.panX;
    const midY = h / 2 + this.panY;
    const baseScale = (h / 65000) * this.zoom;

    const cx = midX + wx * baseScale;
    const cy = midY + wz * baseScale;
    return { cx, cy };
  }

  render() {
    if (!this.isOpen) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // 1. Arabian Gulf Dark Oceanic Backdrop
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);

    // UTM / Geo Coordinate Grid Lines
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.1)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 60) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y < h; y += 60) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    // 2. Draw Bahrain Sovereign Islands (Main Island, Muharraq, Sitra, Amwaj, Durrat, Hawar)
    BAHRAIN_ISLAND_SHORELINES.forEach(poly => {
      if (poly.length < 3) return;
      ctx.beginPath();
      const first = geoToWorld(poly[0][0], poly[0][1]);
      const p0 = this.worldToCanvas(first.x, first.z);
      ctx.moveTo(p0.cx, p0.cy);

      for (let i = 1; i < poly.length; i++) {
        const pt = geoToWorld(poly[i][0], poly[i][1]);
        const p = this.worldToCanvas(pt.x, pt.z);
        ctx.lineTo(p.cx, p.cy);
      }
      ctx.closePath();
      ctx.fillStyle = '#334155'; // Dark limestone tint
      ctx.fill();
      ctx.strokeStyle = '#38bdf8'; // Cyan coastline
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

    // 3. Draw Major Highway Networks (Gold & Amber Arteries)
    BAHRAIN_HIGHWAYS.forEach(hwy => {
      if (!hwy.nodes || hwy.nodes.length < 2) return;
      ctx.beginPath();
      const first = geoToWorld(hwy.nodes[0][0], hwy.nodes[0][1]);
      const p0 = this.worldToCanvas(first.x, first.z);
      ctx.moveTo(p0.cx, p0.cy);

      for (let i = 1; i < hwy.nodes.length; i++) {
        const pt = geoToWorld(hwy.nodes[i][0], hwy.nodes[i][1]);
        const p = this.worldToCanvas(pt.x, pt.z);
        ctx.lineTo(p.cx, p.cy);
      }
      ctx.strokeStyle = hwy.type === 'motorway' ? '#f59e0b' : '#fbbf24';
      ctx.lineWidth = Math.max(2, 3 * this.zoom);
      ctx.stroke();
    });

    // 4. Draw Landmark Checkpoints
    BAHRAIN_LANDMARKS.forEach((lm, idx) => {
      const { x, z } = geoToWorld(lm.lat, lm.lon);
      const { cx, cy } = this.worldToCanvas(x, z);

      // Checkpoint Dot
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(cx, cy, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Checkpoint Label
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(`${idx + 1}. ${lm.name}`, cx + 9, cy + 4);
    });

    // 5. Current Player Location (Pulsing Cyan Ring + Heading Arrow)
    if (this.playerPos) {
      const { cx, cy } = this.worldToCanvas(this.playerPos.x, this.playerPos.z);

      ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(cx, cy, 14, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#06b6d4';
      ctx.beginPath();
      ctx.arc(cx, cy, 6, 0, Math.PI * 2);
      ctx.fill();

      // Heading triangle
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(this.playerHeading || 0);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(0, -12);
      ctx.lineTo(-5, 5);
      ctx.lineTo(5, 5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }
}
