// Keyboard + on-screen touch controls, unified into one input object.
//   x / y        : movement axes (A/D, W/S, arrows, or the left virtual stick)
//   throttle     : Shift (up) / Ctrl (down) or the ▲ ▼ buttons
//   brake, jump  : Space, or the Jump/Brake button
//   run          : Shift for sprinting on foot (same key as throttle-up in vehicles)
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export function createInput() {
  const keys = new Set();
  const pressedQueue = new Set();
  const touch = { x: 0, y: 0, up: false, down: false, brake: false, run: false };

  window.addEventListener('keydown', (e) => {
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    if (e.repeat) return;
    keys.add(e.code);
    pressedQueue.add(e.code);
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => keys.clear());

  const down = (...codes) => codes.some((c) => keys.has(c));

  return {
    touch,
    /** Returns the current axes. Call once per frame. */
    poll() {
      const kx = (down('KeyD', 'ArrowRight') ? 1 : 0) - (down('KeyA', 'ArrowLeft') ? 1 : 0);
      const ky = (down('KeyW', 'ArrowUp') ? 1 : 0) - (down('KeyS', 'ArrowDown') ? 1 : 0);
      const shift = down('ShiftLeft', 'ShiftRight');
      const ctrl = down('ControlLeft', 'ControlRight');
      return {
        x: clamp(kx + touch.x, -1, 1),
        y: clamp(ky + touch.y, -1, 1),
        throttle: clamp((shift || touch.up ? 1 : 0) - (ctrl || touch.down ? 1 : 0), -1, 1),
        brake: down('Space') || touch.brake,
        jump: down('Space') || touch.brake,
        run: shift || touch.run,
      };
    },
    /** True once per key press (edge-triggered). */
    pressed(code) {
      if (pressedQueue.has(code)) {
        pressedQueue.delete(code);
        return true;
      }
      return false;
    },
    /** Trigger an edge-style action from UI buttons. */
    fire(code) {
      pressedQueue.add(code);
    },
  };
}
