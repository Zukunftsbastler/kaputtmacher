// Mouse + keyboard (the primary scheme), gamepad and touch, merged into one state.
// The last device used is remembered so the hints can show the right pictures.

import { clamp } from './math.js';

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.device = matchMedia('(pointer: coarse)').matches ? 'touch' : 'kbm';
    this.keys = new Set();
    this.forward = 0; this.turn = 0; this.lift = 0;
    this.aimX = innerWidth / 2; this.aimY = innerHeight / 2;
    this.fire = false;
    this.jumpHeld = false; // jump button is down (keyboard, gamepad or on-screen button)
    this.jumpBtn = false;
    this.firePressed = false; // light attack: edge, cleared by the game once consumed
    this.heavyPressed = false; // heavy attack: right mouse button, left trigger, long touch
    this.sprint = false;
    this.touchT = 0; this.touchHeavy = false;
    this.dragX = 0; this.dragY = 0; // camera drag since last read
    this.actions = []; // queued one-shot actions: 'stomp', 'roar', 'camera', 'tool+', 'tool-', 'tool:3'
    this.stick = { id: -1, x: 0, y: 0, ox: 0, oy: 0 };
    this.fireTouch = -1;
    this.padPrev = [];
    this.padHold = 0;
    this.onFirstGesture = null;
    this.onActivity = null;
    this.lastActivity = performance.now(); // time of the last real key press, click, touch or gamepad input
    this.bind();
  }

  // On-screen attack buttons (touch): attack whatever is straight ahead, a little above the creature.
  press(heavy) {
    this.gesture('touch');
    this.aimX = innerWidth / 2; this.aimY = innerHeight * 0.4;
    if (heavy) this.heavyPressed = true; else this.firePressed = true;
  }

  gesture(device) {
    this.device = device;
    this.lastActivity = performance.now();
    if (this.onFirstGesture) { this.onFirstGesture(); }
    if (this.onActivity) this.onActivity(); // a real player has taken over
  }

  bind() {
    const c = this.canvas;
    // Keys belong to the game only while no menu is open and no form control has the focus;
    // otherwise Tab, arrows and space must keep working for sliders, checkboxes and buttons.
    const forGame = (e) => !document.querySelector('#hud .overlay') && !/^(INPUT|SELECT|TEXTAREA)$/.test(e.target?.tagName ?? '');
    addEventListener('keydown', (e) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey || !forGame(e)) return;
      this.gesture('kbm');
      this.keys.add(e.code);
      if (e.code === 'Space') this.actions.push('stomp');
      else if (e.code === 'KeyR') this.actions.push('roar');
      else if (e.code === 'Tab') this.actions.push('camera');
      else if (e.code === 'KeyI') this.actions.push('idle');
      else if (/^Digit[1-9]$/.test(e.code)) this.actions.push('tool:' + (Number(e.code[5]) - 1));
      if (['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => { this.keys.clear(); this.fire = false; });

    c.addEventListener('mousemove', (e) => {
      this.aimX = e.clientX; this.aimY = e.clientY;
      if (e.buttons & 4) { this.dragX += e.movementX; this.dragY += e.movementY; } // middle button turns the camera
    });
    c.addEventListener('mousedown', (e) => {
      this.gesture('kbm');
      this.aimX = e.clientX; this.aimY = e.clientY;
      if (e.button === 0) { this.fire = true; this.firePressed = true; }
      else if (e.button === 2) this.heavyPressed = true;
      else if (e.button === 1) e.preventDefault();
    });
    addEventListener('mouseup', (e) => { if (e.button === 0) this.fire = false; });
    c.addEventListener('contextmenu', (e) => e.preventDefault());
    c.addEventListener('wheel', (e) => { this.actions.push(e.deltaY > 0 ? 'tool+' : 'tool-'); e.preventDefault(); }, { passive: false });

    // Touch: a thumb stick in the lower left quarter, everything else aims and fires.
    c.addEventListener('touchstart', (e) => {
      this.gesture('touch');
      for (const t of e.changedTouches) {
        if (this.stick.id < 0 && t.clientX < innerWidth * 0.35 && t.clientY > innerHeight * 0.4) {
          Object.assign(this.stick, { id: t.identifier, ox: t.clientX, oy: t.clientY, x: 0, y: 0 });
        } else if (this.fireTouch < 0) {
          this.fireTouch = t.identifier;
          this.aimX = t.clientX; this.aimY = t.clientY;
          // A short tap is the light attack, holding the finger down the heavy one.
          this.fire = true; this.touchT = performance.now(); this.touchHeavy = false;
        }
      }
      e.preventDefault();
    }, { passive: false });
    c.addEventListener('touchmove', (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === this.stick.id) {
          this.stick.x = clamp((t.clientX - this.stick.ox) / 50, -1, 1);
          this.stick.y = clamp((t.clientY - this.stick.oy) / 50, -1, 1);
        } else if (t.identifier === this.fireTouch) { this.aimX = t.clientX; this.aimY = t.clientY; }
      }
      e.preventDefault();
    }, { passive: false });
    const end = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === this.stick.id) { this.stick.id = -1; this.stick.x = this.stick.y = 0; }
        else if (t.identifier === this.fireTouch) { this.fireTouch = -1; this.fire = false; if (!this.touchHeavy) this.firePressed = true; }
      }
    };
    c.addEventListener('touchend', end);
    c.addEventListener('touchcancel', end);
  }

  // Call once per frame: folds keyboard, stick and gamepad into forward/turn/lift.
  poll(dt) {
    const k = this.keys;
    let f = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0);
    let t = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
    let l = (k.has('KeyE') ? 1 : 0) - (k.has('KeyQ') ? 1 : 0);
    if (this.stick.id >= 0) { f -= this.stick.y; t += this.stick.x; }
    if (this.fireTouch >= 0 && !this.touchHeavy && performance.now() - this.touchT > 380) { this.touchHeavy = true; this.heavyPressed = true; }
    let sprint = k.has('ShiftLeft') || k.has('ShiftRight') || (this.stick.id >= 0 && Math.hypot(this.stick.x, this.stick.y) > 0.97);

    let pad = null;
    if (navigator.getGamepads) { const pads = navigator.getGamepads(); for (let i = 0; i < pads.length && !pad; i++) if (pads[i] && pads[i].connected) pad = pads[i]; }
    if (pad) {
      const dz = (v) => (Math.abs(v) < 0.18 ? 0 : v), b = pad.buttons.map((x) => x.pressed), prev = this.padPrev;
      const ax = dz(pad.axes[0] ?? 0), ay = dz(pad.axes[1] ?? 0), rx = dz(pad.axes[2] ?? 0), ry = dz(pad.axes[3] ?? 0);
      if (ax || ay || rx || ry || b.some(Boolean)) this.gesture('pad');
      f -= ay; t += ax;
      if (this.device === 'pad') {
        this.aimX = clamp(this.aimX + rx * dt * innerWidth * 0.7, 0, innerWidth);
        this.aimY = clamp(this.aimY + ry * dt * innerHeight * 0.7, 0, innerHeight);
        const fire = b[7];
        if (fire && !this.padFire) this.firePressed = true;
        if (b[6] && !prev[6]) this.heavyPressed = true;
        if (b[1]) sprint = true;
        this.fire = fire; this.padFire = fire;
        l += (b[12] ? 1 : 0) - (b[13] ? 1 : 0);
      }
      const hit = (i) => b[i] && !prev[i];
      if (hit(0)) this.actions.push('stomp');
      if (hit(2)) this.actions.push('roar');
      if (hit(4)) this.actions.push('tool-');
      if (hit(5)) this.actions.push('tool+');
      if (hit(8)) this.actions.push('camera');
      // Rebuilding needs a long press so it cannot happen by accident.
      this.padHold = b[3] ? this.padHold + dt : 0;
      if (b[3] && this.padHold > 0.8 && this.padHold - dt <= 0.8) this.actions.push('rebuild');
      this.padPrev = b;
    }
    this.jumpHeld = k.has('Space') || this.jumpBtn || (pad ? pad.buttons[0]?.pressed : false);
    this.sprint = sprint;
    this.forward = clamp(f, -1, 1); this.turn = clamp(t, -1, 1); this.lift = clamp(l, -1, 1);
  }

  takeDrag(out) {
    out[0] = this.dragX; out[1] = this.dragY;
    this.dragX = this.dragY = 0;
    return out;
  }
}
