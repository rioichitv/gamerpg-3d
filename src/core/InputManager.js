// Cross-Platform Input Manager for PC Keyboard/Mouse and Mobile Virtual Touch Controls

export class InputManager {
  constructor(engine) {
    this.engine = engine;
    
    // Movement Vector
    this.moveVector = { x: 0, z: 0 };
    this.isMoving = false;

    // Action Triggers
    this.actions = {
      attack: false,
      dodge: false,
      skill1: false,
      skill2: false,
      skill3: false,
      skill4: false,
      ult: false
    };

    // Keyboard state
    this.keys = {};

    // Mouse drag camera state
    this.isMouseDown = false;
    this.lastMouseX = 0;
    this.lastMouseY = 0;

    // Mobile Joystick state
    this.joystickActive = false;
    this.joystickOrigin = { x: 0, y: 0 };
    this.joystickTouchId = null;

    this.initEventListeners();
  }

  initEventListeners() {
    // 1. KEYBOARD EVENTS
    window.addEventListener('keydown', (e) => {
      // Don't capture inputs if typing in chat
      if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) {
        return;
      }

      this.keys[e.code] = true;

      // Quick action triggers
      if (e.code === 'Space') {
        this.actions.jump = true;
      } else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        this.actions.dodge = true;
      } else if (e.code === 'Digit1' || e.code === 'Numpad1') {
        this.actions.skill1 = true;
      } else if (e.code === 'Digit2' || e.code === 'Numpad2') {
        this.actions.skill2 = true;
      } else if (e.code === 'Digit3' || e.code === 'Numpad3') {
        this.actions.skill3 = true;
      } else if (e.code === 'Digit4' || e.code === 'Numpad4') {
        this.actions.skill4 = true;
      } else if (e.code === 'KeyR') {
        this.actions.ult = true;
      } else if (e.code === 'KeyI') {
        document.getElementById('btn-inventory-toggle')?.click();
      } else if (e.code === 'KeyP') {
        document.getElementById('btn-party-toggle')?.click();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    // 2. MOUSE EVENTS
    const canvas = this.engine.canvas;
    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        // Left click = attack
        this.actions.attack = true;
      }
      if (e.button === 2 || e.button === 0) {
        // Right click or Drag = rotate camera
        this.isMouseDown = true;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isMouseDown) {
        const dx = e.clientX - this.lastMouseX;
        const dy = e.clientY - this.lastMouseY;
        
        this.engine.cameraRotationAngle -= dx * 0.005;
        this.engine.cameraPitch = Math.max(-0.2, Math.min(1.2, this.engine.cameraPitch - dy * 0.004));

        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
      }
    });

    window.addEventListener('mouseup', () => {
      this.isMouseDown = false;
    });

    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // 3. MOBILE TOUCH JOYSTICK
    const joystickZone = document.getElementById('joystick-zone');
    const joystickKnob = document.getElementById('joystick-knob');

    if (joystickZone && joystickKnob) {
      const resetJoystick = () => {
        this.joystickActive = false;
        this.joystickTouchId = null;
        joystickKnob.style.transform = `translate(0px, 0px)`;
        this.moveVector.x = 0;
        this.moveVector.z = 0;
        this.isMoving = false;
      };

      joystickZone.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touch = e.targetTouches[0];
        this.joystickActive = true;
        this.joystickTouchId = touch.identifier;
        const rect = joystickZone.getBoundingClientRect();
        this.joystickOrigin = {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2
        };
      }, { passive: false });

      window.addEventListener('touchmove', (e) => {
        if (!this.joystickActive) return;
        for (let i = 0; i < e.changedTouches.length; i++) {
          const touch = e.changedTouches[i];
          if (touch.identifier === this.joystickTouchId) {
            const dx = touch.clientX - this.joystickOrigin.x;
            const dy = touch.clientY - this.joystickOrigin.y;
            const dist = Math.hypot(dx, dy);
            const maxRadius = 45;
            const clampedDist = Math.min(dist, maxRadius);
            const angle = Math.atan2(dy, dx);

            const knobX = Math.cos(angle) * clampedDist;
            const knobY = Math.sin(angle) * clampedDist;
            joystickKnob.style.transform = `translate(${knobX}px, ${knobY}px)`;

            // Normalize vector (-1 to 1)
            const normX = knobX / maxRadius;
            const normY = knobY / maxRadius;

            this.moveVector.x = normX;
            this.moveVector.z = normY;
            this.isMoving = clampedDist > 5;
            break;
          }
        }
      }, { passive: false });

      window.addEventListener('touchend', (e) => {
        for (let i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === this.joystickTouchId) {
            resetJoystick();
            break;
          }
        }
      });
      window.addEventListener('touchcancel', resetJoystick);
    }

    // 4. MOBILE ACTION BUTTONS
    const mobileButtons = document.querySelectorAll('.mobile-btn');
    mobileButtons.forEach(btn => {
      const action = btn.dataset.action;
      if (action) {
        const trigger = (e) => {
          e.preventDefault();
          this.actions[action] = true;
        };
        btn.addEventListener('touchstart', trigger, { passive: false });
        btn.addEventListener('mousedown', trigger);
      }
    });

    // Touch Drag on Canvas to Rotate Camera
    canvas.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        // If touch is not on joystick
        if (touch.clientX > window.innerWidth * 0.35) {
          if (!this.lastTouchX) {
            this.lastTouchX = touch.clientX;
          } else {
            const dx = touch.clientX - this.lastTouchX;
            this.engine.cameraRotationAngle -= dx * 0.007;
            this.lastTouchX = touch.clientX;
          }
        }
      }
    });

    canvas.addEventListener('touchend', () => {
      this.lastTouchX = null;
    });
  }

  update() {
    // If not mobile joystick, compute from keyboard WASD
    if (!this.joystickActive) {
      let vx = 0;
      let vz = 0;

      if (this.keys['KeyW'] || this.keys['ArrowUp']) vz -= 1;
      if (this.keys['KeyS'] || this.keys['ArrowDown']) vz += 1;
      if (this.keys['KeyA'] || this.keys['ArrowLeft']) vx -= 1;
      if (this.keys['KeyD'] || this.keys['ArrowRight']) vx += 1;

      const len = Math.hypot(vx, vz);
      if (len > 0) {
        this.moveVector.x = vx / len;
        this.moveVector.z = vz / len;
        this.isMoving = true;
      } else {
        this.moveVector.x = 0;
        this.moveVector.z = 0;
        this.isMoving = false;
      }
    }
  }

  consumeAction(actionName) {
    if (this.actions[actionName]) {
      this.actions[actionName] = false;
      return true;
    }
    return false;
  }
}
