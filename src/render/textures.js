import * as THREE from 'three';

/**
 * Procedural PBR Textures and Facades for Bahrain.
 * Generates realistic architectural window facades, asphalt roads with lane stripes,
 * and Arabian Gulf water textures.
 */

/**
 * Creates repeating architectural window facade texture for extruded 3D buildings.
 * @param {string} style - 'sapphire', 'cyan', 'limestone', 'mashrabiya'
 */
export function createBuildingWindowTexture(style = 'sapphire') {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  let wallColor = '#1e293b';
  let frameColor = '#334155';
  let glassColor = '#0284c7';
  let litGlassColor = '#fef08a';

  if (style === 'cyan') {
    wallColor = '#0f172a';
    frameColor = '#1e293b';
    glassColor = '#06b6d4';
    litGlassColor = '#e0f2fe';
  } else if (style === 'limestone') {
    wallColor = '#d6c4a8';
    frameColor = '#b59e7d';
    glassColor = '#3b4252';
    litGlassColor = '#fef3c7';
  } else if (style === 'mashrabiya') {
    wallColor = '#c4a47c';
    frameColor = '#8c6d48';
    glassColor = '#2b2118';
    litGlassColor = '#fed7aa';
  }

  // Base wall color
  ctx.fillStyle = wallColor;
  ctx.fillRect(0, 0, 512, 512);

  // Draw 8x8 grid of windows with architectural frames
  const cols = 8;
  const rows = 8;
  const padX = 14;
  const padY = 16;
  const winW = (512 - padX * (cols + 1)) / cols;
  const winH = (512 - padY * (rows + 1)) / rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = padX + c * (winW + padX);
      const y = padY + r * (winH + padY);

      // Outer window frame
      ctx.fillStyle = frameColor;
      ctx.fillRect(x - 2, y - 2, winW + 4, winH + 4);

      // Glass pane - randomly lit for vibrant city skyline
      const isLit = (Math.sin(r * 13 + c * 7) > 0.35);
      ctx.fillStyle = isLit ? litGlassColor : glassColor;
      ctx.fillRect(x, y, winW, winH);

      // Subtle reflection gradient
      const grad = ctx.createLinearGradient(x, y, x + winW, y + winH);
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
      grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.0)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0.2)');
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, winW, winH);

      // Mashrabiya geometric latticework if requested
      if (style === 'mashrabiya') {
        ctx.strokeStyle = frameColor;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + winW, y + winH);
        ctx.moveTo(x + winW, y);
        ctx.lineTo(x, y + winH);
        ctx.stroke();
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 4);
  return texture;
}

/**
 * Creates asphalt roadway texture with yellow center divider and white dashed lane stripes.
 */
export function createAsphaltRoadTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Dark asphalt base with subtle aggregate noise
  ctx.fillStyle = '#1e1e24';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle aggregate grain
  for (let i = 0; i < 5000; i++) {
    const gx = Math.random() * 512;
    const gy = Math.random() * 512;
    const gval = Math.floor(Math.random() * 30 + 25);
    ctx.fillStyle = `rgb(${gval}, ${gval}, ${gval + 2})`;
    ctx.fillRect(gx, gy, 1.5, 1.5);
  }

  // Concrete curb borders (Left and Right)
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(0, 0, 24, 512);
  ctx.fillRect(512 - 24, 0, 24, 512);

  // Center double yellow line
  ctx.fillStyle = '#eab308';
  ctx.fillRect(250, 0, 5, 512);
  ctx.fillRect(257, 0, 5, 512);

  // White lane lines (dashed)
  ctx.fillStyle = '#f8fafc';
  const dashH = 40;
  const gapH = 30;
  for (let y = 0; y < 512; y += (dashH + gapH)) {
    ctx.fillRect(130, y, 4, dashH);
    ctx.fillRect(378, y, 4, dashH);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 10);
  return texture;
}

/**
 * Creates procedural water normal/bump map for Arabian Gulf waves.
 */
export function createWaterTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  const imgData = ctx.createImageData(256, 256);
  const data = imgData.data;

  for (let y = 0; y < 256; y++) {
    for (let x = 0; x < 256; x++) {
      const idx = (y * 256 + x) * 4;
      const v = Math.sin(x * 0.15) * Math.cos(y * 0.15) * 0.5 + 0.5;
      data[idx] = Math.floor(v * 40 + 20);     // R
      data[idx + 1] = Math.floor(v * 120 + 80); // G (Turquoise)
      data[idx + 2] = Math.floor(v * 160 + 95); // B (Deep Gulf Blue)
      data[idx + 3] = 220;                     // Alpha
    }
  }

  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(40, 40);
  return texture;
}
