// On-screen interface, built from DOM elements and emoji. There are no words anywhere except
// in the parents' corner. New controls stay hidden until the game introduces them.

import { ABILITIES, movesFor } from './tools.js';
import { SPECIES } from './monster.js';
import { WORLDS } from './worldgen.js';
import { saveProgress, resetProgress } from './progress.js';

function el(tag, cls, parent, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  if (parent) parent.appendChild(e);
  return e;
}

const SVG = 'http://www.w3.org/2000/svg';
function svg(tag, attrs, parent) {
  const e = document.createElementNS(SVG, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}

const MIX_ICONS = { size: ['▫️', '🌍'], buildings: ['🌳', '🏘️'], height: ['🏠', '🏢'], industry: ['🌼', '🏭'], cars: ['🚶', '🚗'], people: ['🧍', '👪'], hills: ['➖', '⛰️'], green: ['🏜️', '🌲'] };

export class Hud {
  constructor(game) {
    this.g = game;
    const root = (this.root = document.getElementById('hud'));

    this.power = el('div', '', root); this.power.id = 'power';
    const ring = svg('svg', { viewBox: '0 0 100 100' }, this.power);
    svg('circle', { class: 'bg', cx: 50, cy: 50, r: 43 }, ring);
    this.ring = svg('circle', { class: 'fg', cx: 50, cy: 50, r: 43, 'stroke-dasharray': 270.2, 'stroke-dashoffset': 270.2 }, ring);
    this.face = el('div', 'face', this.power);
    this.stageBadge = el('div', 'stage', this.power);

    this.worldbar = el('div', '', root); this.worldbar.id = 'worldbar';
    const track = el('div', 'track', this.worldbar);
    this.fill = el('div', 'fill', track);
    this.pct = el('div', 'pct', track);
    this.icons = el('div', 'icons', this.worldbar);

    const tr = el('div', '', root); tr.id = 'topright';
    this.btnRebuild = this.button(tr, '🔄', () => game.doAction('rebuild'));
    this.btnCascade = this.button(tr, '⛓️', () => game.doAction('cascade'));
    this.btnCamera = this.button(tr, '🎥', () => game.doAction('camera'));
    this.btnWorlds = this.button(tr, '🌍', () => this.openWorlds());
    this.btnIdle = this.button(tr, '🍿', () => game.setIdle(!game.idle)); // lean back and watch: the game plays itself
    this.btnGear = this.button(tr, '⚙️', null); this.btnGear.id = 'gear';
    // On small and touch screens everything in this row folds away behind one menu button,
    // so the playing field stays free. The legal link moves in here as well.
    this.drawer = tr;
    const legal2 = el('a', '', tr, 'Impressum & Datenschutz'); legal2.id = 'legal2'; legal2.href = 'impressum.html';
    this.btnMenu = this.button(root, '☰', () => this.toggleMenu()); this.btnMenu.id = 'menuBtn';
    tr.addEventListener('click', (e) => { if (e.target.closest('.btn') && !e.target.closest('#gear')) this.toggleMenu(false); });
    game.canvas.addEventListener('pointerdown', () => this.toggleMenu(false));
    // The parents' corner opens only after holding the gear for three seconds.
    let gearTimer = 0;
    const cancel = () => { clearTimeout(gearTimer); this.btnGear.classList.remove('holding'); };
    this.btnGear.addEventListener('pointerdown', () => { this.btnGear.classList.add('holding'); gearTimer = setTimeout(() => { cancel(); this.openParent(); }, 3000); });
    for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) this.btnGear.addEventListener(ev, cancel);

    this.toolbar = el('div', '', root); this.toolbar.id = 'toolbar';
    this.abilities = el('div', '', root); this.abilities.id = 'abilities';
    this.toolButtons = {};

    // Touch only: the buttons under the right thumb. Jump lives in #abilities; here are the two attacks
    // and one button that steps through the available moves (instead of a whole toolbar).
    this.touchpad = el('div', '', root); this.touchpad.id = 'touchpad';
    const hold = (b, fn) => b.addEventListener('pointerdown', (e) => { e.preventDefault(); game.audio.unlock(); fn(); });
    this.btnLight = el('button', 'btn', this.touchpad); this.btnLight.dataset.id = 'light';
    this.btnHeavy = el('button', 'btn', this.touchpad); this.btnHeavy.dataset.id = 'heavy';
    this.btnCycle = el('button', 'btn', this.touchpad, '🔁'); this.btnCycle.dataset.id = 'cycle';
    hold(this.btnLight, () => game.input.press(false));
    hold(this.btnHeavy, () => game.input.press(true));
    hold(this.btnCycle, () => { game.input.gesture('touch'); game.doAction('tool+'); });

    this.stick = el('div', 'hidden', root); this.stick.id = 'stick';
    this.stickKnob = el('i', '', this.stick);
    this.cross = el('div', 'hidden', root); this.cross.id = 'cross';

    this.bcount = el('div', 'hidden', root); this.bcount.id = 'bcount';
    this.bIcon = el('span', 'ico', this.bcount);
    this.bBar = el('i', '', el('div', 'bar', this.bcount));
    this.bPct = el('span', '', this.bcount);

    this.next = this.button(root, '➡️', () => game.nextWorld()); this.next.id = 'next';
    this.next.classList.add('hidden', 'pulse');

    // Legal notice: the one piece of text outside the parents' corner. The law wants it easy to find.
    const legal = el('a', '', root, 'Impressum & Datenschutz'); legal.id = 'legal';
    legal.href = 'impressum.html';

    this.hintBox = el('div', 'hidden', root); this.hintBox.id = 'hint';
    this.hintQueue = [];
    this.hintId = null;
    this.shownTools = new Set();
    this.overlay = null;
  }

  toggleMenu(open = !this.drawer.classList.contains('open')) {
    this.drawer.classList.toggle('open', open);
    this.btnMenu.classList.toggle('sel', open);
  }

  // Layout classes on <body>: the input device, plus "compact" for touch and for small windows.
  layout() {
    const dev = this.g.input.device, cls = dev + (dev === 'touch' || innerWidth < 760 || innerHeight < 520 ? ' compact' : '');
    if (document.body.className === cls) return;
    document.body.className = cls;
    if (this.hintBox) this.renderHint(); // the demonstration shows the device in use
  }

  button(parent, icon, onClick, key) {
    const b = el('button', 'btn', parent, icon);
    if (key) el('span', 'key kbm', b, key);
    if (onClick) b.addEventListener('click', () => { this.g.audio.unlock(); this.g.audio.click(); onClick(); b.blur(); });
    return b;
  }

  // Rebuilds tool and ability buttons for the current stage. Newly unlocked ones jump in.
  refreshTools(announce = false) {
    const g = this.g, stage = g.progress.settings.unlockAll ? 99 : g.monster.stage;
    this.toolbar.replaceChildren();
    this.abilities.replaceChildren();
    let n = 0;
    for (const t of movesFor(g.progress.species)) {
      if (t.stage > stage) continue;
      n++;
      const b = this.button(this.toolbar, t.icon, () => g.selectTool(t.id), String(n));
      this.toolButtons[t.id] = b;
      if (t.id === g.tool) b.classList.add('sel');
      if (announce && !this.shownTools.has(t.id)) b.classList.add('fresh');
      this.shownTools.add(t.id);
    }
    for (const a of ABILITIES) {
      if (a.stage > stage || g.progress.species === 'jet') continue; // the aircraft neither jumps nor roars
      const b = this.button(this.abilities, a.icon, a.id === 'stomp' ? null : () => g.doAction(a.id), a.id === 'stomp' ? '␣' : 'R');
      if (a.id === 'stomp') { // held like a real jump button: longer press, higher jump
        b.addEventListener('pointerdown', () => { g.audio.unlock(); g.input.jumpBtn = true; g.doAction('stomp'); });
        for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(ev, () => { g.input.jumpBtn = false; });
      }
      b.dataset.id = a.id;
      this.toolButtons[a.id] = b;
      if (announce && !this.shownTools.has(a.id)) b.classList.add('fresh');
      this.shownTools.add(a.id);
    }
    // A single tool needs no bar.
    this.toolbar.classList.toggle('hidden', n < 2);
    // Touch buttons show the selected move: plain for the quick version, with a flexed arm for the strong one.
    const cur = movesFor(g.progress.species).find((t) => t.id === g.tool) ?? movesFor(g.progress.species)[0];
    this.btnLight.textContent = cur.icon;
    this.btnHeavy.replaceChildren(cur.icon, el('span', 'badge', null, '💪'));
    this.btnCycle.classList.toggle('hidden', n < 2);
    if (announce) { this.btnCycle.classList.remove('fresh'); void this.btnCycle.offsetWidth; this.btnCycle.classList.add('fresh'); }
    this.refreshButtons();
  }

  refreshButtons() {
    const p = this.g.progress, all = p.settings.unlockAll;
    this.btnRebuild.classList.toggle('hidden', !all && !p.seen.rebuildShown);
    this.btnCamera.classList.toggle('hidden', !all && p.stage < 2);
    // Chain reactions are an upgrade that arrives with stage 4 and can be switched off again.
    this.btnCascade.classList.toggle('hidden', !all && p.stage < 4);
    this.btnCascade.classList.toggle('off', !p.settings.cascade);
    this.btnIdle.classList.toggle('sel', this.g.idle);
    this.root.classList.toggle('idle', this.g.idle); // no demonstrations while the game plays itself
    this.btnWorlds.classList.toggle('hidden', false); // the world choice is open from the first minute
    this.btnCamera.textContent = this.g.fly ? SPECIES.find((s) => s.id === p.species).icon : '🎥';
    this.face.textContent = SPECIES.find((s) => s.id === p.species).icon;
    this.layout();
  }

  // Called every simulation step while something breaks, so the DOM is only touched when the picture changes.
  setPower(frac, stage, grew) {
    const off = Math.round(270.2 * (1 - Math.min(1, frac)));
    if (off !== this.ringOff) { this.ringOff = off; this.ring.setAttribute('stroke-dashoffset', off); }
    if (stage !== this.stageShown) { this.stageShown = stage; this.stageBadge.textContent = stage; }
    if (grew) { this.power.classList.remove('grow'); void this.power.offsetWidth; this.power.classList.add('grow'); }
  }

  // Fills the row of building icons for a freshly generated world.
  setStructures(world) {
    this.icons.replaceChildren();
    this.major = world.structures.filter((s) => s.major && s.total > 0);
    this.compact = this.major.length > 26;
    this.pctShown = -1; this.doneShown = -1;
    if (this.compact) this.tally = el('span', 'tally', this.icons);
    else for (const s of this.major) s.el = el('span', '', this.icons, s.icon);
    this.setWorld(0);
  }

  setWorld(frac) {
    const pct = Math.min(100, Math.round(frac * 100));
    if (pct !== this.pctShown) { this.pctShown = pct; this.fill.style.width = pct + '%'; this.pct.textContent = pct + '%'; }
    let done = 0;
    for (const s of this.major) if (s.done) done++;
    if (done === this.doneShown) return;
    this.doneShown = done;
    if (this.compact) this.tally.textContent = '🏚️ ' + done + ' / ' + this.major.length;
    else for (const s of this.major) if (s.done && s.el) s.el.className = 'done';
  }

  // Floating counter above the building that is being taken apart.
  showBuilding(st, x, y) {
    if (!st) { this.bcount.classList.add('hidden'); return; }
    const pct = Math.round((st.done ? 1 : Math.min(1, (1 - st.remaining / st.total) / 0.9)) * 100);
    this.bcount.classList.remove('hidden');
    this.bcount.style.left = Math.round(x) + 'px'; this.bcount.style.top = Math.round(y) + 'px';
    if (this.bShown !== st || this.bPctShown !== pct) {
      this.bShown = st; this.bPctShown = pct;
      this.bIcon.textContent = st.icon;
      this.bBar.style.width = pct + '%';
      this.bPct.textContent = pct + '%';
    }
  }

  stamp(st, x, y) {
    const s = el('div', '', this.root, st.icon); s.id = 'stamp';
    s.style.left = x + 'px'; s.style.top = y + 'px';
    setTimeout(() => s.remove(), 1300);
  }

  showNext(on) { this.next.classList.toggle('hidden', !on); }

  // Per frame: touch stick, gamepad cursor.
  update() {
    const inp = this.g.input, touch = inp.device === 'touch';
    this.layout();
    this.stick.classList.toggle('hidden', !touch);
    if (touch) this.stickKnob.style.transform = `translate(${inp.stick.x * 36}px, ${inp.stick.y * 36}px)`;
    this.cross.classList.toggle('hidden', inp.device !== 'pad');
    if (inp.device === 'pad') { this.cross.style.left = inp.aimX + 'px'; this.cross.style.top = inp.aimY + 'px'; }
  }

  // Demonstrations ---------------------------------------------------------------

  // Queues a demonstration unless the player has already performed that action once.
  requestHint(id, force = false) {
    if ((!force && this.g.progress.seen[id]) || this.hintId === id || this.hintQueue.includes(id)) return;
    this.hintQueue.push(id);
    if (!this.hintId) this.nextHint();
  }

  // The player did it: the demonstration is over for good.
  doneHint(id) {
    const p = this.g.progress;
    if (!p.seen[id]) { p.seen[id] = true; saveProgress(p); }
    this.hintQueue = this.hintQueue.filter((h) => h !== id);
    if (this.hintId === id) this.nextHint();
  }

  nextHint() {
    this.hintId = this.hintQueue.shift() ?? null;
    this.renderHint();
  }

  renderHint() {
    const id = this.hintId, box = this.hintBox, dev = this.g.input.device;
    for (const b of [this.btnRebuild, this.btnCamera, this.btnWorlds, this.btnMenu, ...Object.values(this.toolButtons)]) b.classList.remove('pulse');
    box.replaceChildren();
    box.classList.toggle('hidden', !id);
    if (!id) return;
    const key = (label, blink, wide) => el('div', 'keycap' + (blink ? ' blink' : '') + (wide ? ' wide' : ''), null, label);
    const pad = (label) => el('div', 'padbtn blink', null, label);
    const finger = () => el('div', 'finger', null, '👆');
    const mouse = (right = false) => {
      const s = svg('svg', { viewBox: '0 0 46 62' });
      svg('rect', { class: 'body', x: 3, y: 3, width: 40, height: 56, rx: 19 }, s);
      svg('path', { class: 'lmb', d: right ? 'M23 5 H24 A17 17 0 0 1 41 22 V26 H23 Z' : 'M23 5 H22 A17 17 0 0 0 5 22 V26 H23 Z' }, s);
      svg('path', { class: 'body', d: 'M23 3 V26 M3 26 H43', fill: 'none' }, s);
      return s;
    };
    const point = () => (dev === 'kbm' ? mouse() : dev === 'pad' ? pad('RT') : finger());
    const tool = id, def = ABILITIES.find((a) => a.id === id);
    const move = movesFor(this.g.progress.species).find((t) => t.id === this.g.tool);

    if (id === 'move') {
      el('span', '', box, SPECIES.find((s) => s.id === this.g.progress.species).icon);
      if (dev === 'kbm') {
        const k = el('div', 'keys', box);
        k.append(el('span'), key('W', true), el('span'), key('A'), key('S'), key('D'));
        const k2 = el('div', 'keys', box);
        k2.append(el('span'), key('↑', true), el('span'), key('←'), key('↓'), key('→'));
      } else if (dev === 'pad') box.append('🎮', pad('L'));
      else box.append(finger());
    } else if (id === 'light' || id === 'heavy') {
      // The selected move with the button for its quick or its slow, strong version.
      const heavy = id === 'heavy', icon = el('span', '', box, move?.icon ?? '👊');
      if (heavy) { icon.style.fontSize = '58px'; el('span', '', box, '💪'); }
      if (dev === 'kbm') box.append(mouse(heavy));
      else if (dev === 'pad') box.append('🎮', pad(heavy ? 'LT' : 'RT'));
      else { const f = finger(); if (heavy) f.classList.add('hold'); box.append(f); }
    } else if (id === 'stomp' || id === 'roar') {
      el('span', '', box, def.icon);
      if (dev === 'kbm') box.append(id === 'stomp' ? key('', true, true) : key('R', true));
      else if (dev === 'pad') box.append('🎮', pad(id === 'stomp' ? 'A' : 'X'));
      else box.append(finger());
      this.toolButtons[id]?.classList.add('pulse');
    } else if (def) {
      el('span', '', box, def.icon);
      box.append(point());
      this.toolButtons[tool]?.classList.add('pulse');
    } else {
      // Interface buttons: the button itself pulses, the bubble shows what to press it with.
      const b = { rebuild: this.btnRebuild, camera: this.btnCamera, worlds: this.btnWorlds, next: this.next }[id];
      if (b) { b.classList.add('pulse'); el('span', '', box, b.textContent); }
      if (b && this.drawer.contains(b)) this.btnMenu.classList.add('pulse'); // in the compact layout the button sits inside the menu
      box.append(dev === 'kbm' ? mouse() : dev === 'pad' ? pad(id === 'rebuild' ? 'Y' : '☰') : finger());
    }
  }

  // Overlays ---------------------------------------------------------------------

  close() {
    this.overlay?.remove();
    this.overlay = null;
    this.g.paused = false;
  }

  open(cls) {
    this.close();
    this.g.paused = true;
    this.overlay = el('div', 'overlay', this.root);
    this.overlay.addEventListener('click', (e) => { if (e.target === this.overlay) this.close(); });
    return el('div', 'sheet ' + cls, this.overlay);
  }

  // World choice, monster choice, world mixer and sticker album.
  openWorlds() {
    const g = this.g, p = g.progress, sheet = this.open('worlds');
    this.doneHint('worlds');
    const worlds = el('div', 'row', sheet);
    // Every world can be chosen at any time. The badge shows the monster stage a world is built for
    // (green once the monster has reached it); a tick marks worlds that were destroyed completely.
    for (const w of WORLDS) {
      if (w.id === 'random') continue; // the dice tile sits next to its mixer below
      const b = this.button(worlds, w.icon, () => { this.close(); g.loadWorld(w.id); });
      b.classList.add('tile');
      if (w.id === p.world) b.classList.add('sel');
      if (p.completed.includes(w.id)) b.classList.add('complete');
      el('span', 'key' + (p.stage >= w.stage ? ' ok' : ''), b, String(w.stage));
    }
    const mons = el('div', 'row', sheet);
    for (const s of SPECIES) {
      const b = this.button(mons, s.icon, () => { g.setSpecies(s.id); this.openWorlds(); });
      if (s.id === p.species) b.classList.add('sel');
    }
    // Any stage reached so far can be played again, e.g. to take a house apart from the inside.
    if (p.stage > 1) {
      const stages = el('div', 'row', sheet);
      for (let s = 1; s <= p.stage; s++) {
        const b = this.button(stages, String(s), () => { g.setPlayStage(s); this.openWorlds(); });
        b.classList.add('small');
        b.style.fontSize = 14 + Math.min(s, 9) * 2 + 'px';
        if (s === p.playStage) b.classList.add('sel');
      }
    }
    {
      const mix = el('div', 'mixer', sheet);
      for (const k of Object.keys(MIX_ICONS)) {
        el('span', '', mix, MIX_ICONS[k][0]);
        const r = el('input', '', mix);
        r.type = 'range'; r.min = 0; r.max = 1; r.step = 0.05; r.value = p.mix[k];
        r.addEventListener('input', () => { p.mix[k] = Number(r.value); saveProgress(p); });
        el('span', '', mix, MIX_ICONS[k][1]);
      }
      this.button(sheet, '🎲', () => { this.close(); g.loadWorld('random', true); }).classList.add('tile');
    }
    if (p.stickers.length) el('div', 'stickers', sheet, p.stickers.join(' '));
    this.button(sheet, '✖️', () => this.close()).classList.add('small');
  }

  // The only place with text; meant for grown-ups.
  openParent() {
    const g = this.g, p = g.progress, s = p.settings, sheet = this.open('parent');
    el('h2', '', sheet, 'Eltern-Ecke');
    const row = (label, input) => { const l = el('label', '', sheet, label); l.appendChild(input); return input; };
    const check = (label, key) => {
      const c = document.createElement('input');
      c.type = 'checkbox'; c.checked = s[key];
      c.addEventListener('change', () => { s[key] = c.checked; saveProgress(p); g.applySettings(key); });
      row(label, c);
    };
    const vol = document.createElement('input');
    vol.type = 'range'; vol.min = 0; vol.max = 1; vol.step = 0.05; vol.value = s.volume;
    vol.addEventListener('input', () => { s.volume = Number(vol.value); saveProgress(p); g.applySettings('volume'); });
    row('Lautstärke', vol);
    const q = document.createElement('select');
    for (const [v, t] of [['auto', 'Automatisch'], ['high', 'Hoch'], ['low', 'Niedrig']]) { const o = el('option', '', q, t); o.value = v; }
    q.value = s.quality;
    q.addEventListener('change', () => { s.quality = q.value; saveProgress(p); g.applySettings('quality'); });
    row('Grafikqualität', q);
    check('Kamerawackeln', 'shake');
    check('Leben in der Welt (Bewohner, Hubschrauber)', 'life');
    check('Kettenreaktionen', 'cascade');
    check('Selbstspiel nach 2 Minuten ohne Eingabe', 'autoIdle');
    check('Alles freischalten', 'unlockAll');
    const full = el('button', '', sheet, 'Vollbild an/aus');
    full.addEventListener('click', () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.()));
    const reset = el('button', 'danger', sheet, 'Spielstand und Einstellungen löschen');
    reset.addEventListener('click', () => {
      if (reset.dataset.armed) { resetProgress(p); location.reload(); }
      else { reset.dataset.armed = '1'; reset.textContent = 'Wirklich alles löschen? Nochmal tippen'; }
    });
    el('button', '', sheet, 'Schließen').addEventListener('click', () => this.close());
  }
}
