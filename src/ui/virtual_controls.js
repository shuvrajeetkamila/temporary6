/**
 * Universal Mobile Touch Controls & Desktop Keyboard/Mouse Input Manager.
 */
export class VirtualControls {
  constructor(options = {}) {
    this.onVehicleSwap = options.onVehicleSwap || null;
    this.onInteract = options.onInteract || null;
    this.onToggleMap = options.onToggleMap || null;

    // Inputs (-1.0 to 1.0)
    this.moveX = 0;
    this.moveY = 0;
    this.sprint = false;
    this.jump = false;
    this.brake = false;
    this.cameraYaw = 0;

    // Active locomotion mode: 'human', 'car', 'boat', 'plane', 'heli'
    this.currentMode = 'human';

    this.keys = {};
    this.setupKeyboard();
    this.setupTouchJoystick();
  }

  setMode(mode) {
    this.currentMode = mode;
    // Update active highlight on UI buttons
    document.querySelectorAll('.vehicle-mode-btn').forEach(btn => {
      if (btn.dataset.mode === mode) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  setupKeyboard() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;

      if (e.code === 'KeyF' || e.code === 'KeyE' || e.code === 'Enter') {
        if (this.onInteract) this.onInteract();
      }
      if (e.code === 'KeyM') {
        if (this.onToggleMap) this.onToggleMap();
      }
      if (e.code === 'Digit1') this.triggerSwap('human');
      if (e.code === 'Digit2') this.triggerSwap('car');
      if (e.code === 'Digit3') this.triggerSwap('boat');
      if (e.code === 'Digit4') this.triggerSwap('heli');
      if (e.code === 'Digit5') this.triggerSwap('plane');

      this.updateKeyboardMovement();
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
      this.updateKeyboardMovement();
    });
  }

  triggerSwap(mode) {
    this.setMode(mode);
    if (this.onVehicleSwap) this.onVehicleSwap(mode);
  }

  updateKeyboardMovement() {
    let x = 0;
    let y = 0;

    if (this.keys['KeyW'] || this.keys['ArrowUp']) y += 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) y -= 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) x -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) x += 1;

    // Only overwrite if keyboard is actively being used
    if (x !== 0 || y !== 0 || (!this.joystickActive)) {
      this.moveX = x;
      this.moveY = y;
    }

    this.sprint = !!(this.keys['ShiftLeft'] || this.keys['ShiftRight']);
    this.jump = !!this.keys['Space'];
    this.brake = !!this.keys['KeyS'] || !!this.keys['Space'];
  }

  setupTouchJoystick() {
    const zone = document.getElementById('joystick-zone');
    const knob = document.getElementById('joystick-knob');
    if (!zone || !knob) return;

    let touchId = null;
    let startX = 0;
    let startY = 0;
    const maxRadius = 45;

    zone.addEventListener('touchstart', (e) => {
      const t = e.changedTouches[0];
      touchId = t.identifier;
      const rect = zone.getBoundingClientRect();
      startX = rect.left + rect.width / 2;
      startY = rect.top + rect.height / 2;
      this.joystickActive = true;
    }, { passive: false });

    zone.addEventListener('touchmove', (e) => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.identifier === touchId) {
          let dx = t.clientX - startX;
          let dy = t.clientY - startY;
          const dist = Math.hypot(dx, dy);

          if (dist > maxRadius) {
            dx = (dx / dist) * maxRadius;
            dy = (dy / dist) * maxRadius;
          }

          knob.style.transform = `translate(${dx}px, ${dy}px)`;
          this.moveX = dx / maxRadius;
          this.moveY = -dy / maxRadius; // Up is positive
        }
      }
    }, { passive: false });

    const resetJoystick = (e) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === touchId) {
          touchId = null;
          this.joystickActive = false;
          knob.style.transform = 'translate(0px, 0px)';
          this.moveX = 0;
          this.moveY = 0;
        }
      }
    };

    zone.addEventListener('touchend', resetJoystick);
    zone.addEventListener('touchcancel', resetJoystick);

    // On-Screen Action Buttons
    const btnSprint = document.getElementById('btn-sprint');
    if (btnSprint) {
      btnSprint.addEventListener('touchstart', (e) => { e.preventDefault(); this.sprint = true; });
      btnSprint.addEventListener('touchend', () => { this.sprint = false; });
      btnSprint.addEventListener('mousedown', () => { this.sprint = true; });
      btnSprint.addEventListener('mouseup', () => { this.sprint = false; });
    }

    const btnJump = document.getElementById('btn-jump');
    if (btnJump) {
      btnJump.addEventListener('touchstart', (e) => { e.preventDefault(); this.jump = true; this.brake = true; });
      btnJump.addEventListener('touchend', () => { this.jump = false; this.brake = false; });
      btnJump.addEventListener('mousedown', () => { this.jump = true; this.brake = true; });
      btnJump.addEventListener('mouseup', () => { this.jump = false; this.brake = false; });
    }

    const btnInteract = document.getElementById('btn-interact');
    if (btnInteract) {
      btnInteract.addEventListener('click', () => {
        if (this.onInteract) this.onInteract();
      });
    }

    // Vehicle Selector Buttons
    document.querySelectorAll('.vehicle-mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.mode;
        this.triggerSwap(mode);
      });
    });
  }

  getInput() {
    return {
      moveX: this.moveX,
      moveY: this.moveY,
      sprint: this.sprint,
      jump: this.jump,
      brake: this.brake,
      cameraYaw: this.cameraYaw
    };
  }
}
