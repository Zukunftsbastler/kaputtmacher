// On-screen interface, built from DOM elements and emoji. There are no words anywhere except
// in the parents' corner. New controls stay hidden until the game introduces them.

import { ABILITIES, movesFor } from './tools.js';
import { SPECIES } from './monster.js';
import { WORLDS } from './worldgen.js';
import { saveProgress, resetProgress, exportProgress, importProgress, MAX_DETAIL } from './progress.js';
import { ACHIEVEMENTS, achievementProgress } from './achievements.js';

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
    this.wanted = el('div', 'wanted hidden', this.worldbar); // alarm level of police and army, in stars
    this.toasts = el('div', '', root); this.toasts.id = 'toasts';
    this.toastQueue = []; this.toastN = 0; this.gainT = 0;

    const tr = el('div', '', root); tr.id = 'topright';
    // Only shown while the free camera is on (it is switched on in the settings): the way back to the creature.
    this.btnCamera = this.button(tr, '🎥', () => game.doAction('camera'));
    this.btnWorlds = this.button(tr, '🌍', () => this.openWorlds());
    this.btnIdle = this.button(tr, '🍿', () => game.setIdle(!game.idle)); // lean back and watch: the game plays itself
    this.btnTrophy = this.button(tr, '🏆', () => this.openAchievements());
    this.btnGear = this.button(tr, '⚙️', () => this.openParent()); this.btnGear.id = 'gear';
    // On small and touch screens everything in this row folds away behind one menu button,
    // so the playing field stays free. The legal link moves in here as well.
    this.drawer = tr;
    const legal2 = el('a', '', tr, 'Impressum & Datenschutz'); legal2.id = 'legal2'; legal2.href = 'impressum.html';
    this.btnMenu = this.button(root, '☰', () => this.toggleMenu()); this.btnMenu.id = 'menuBtn';
    tr.addEventListener('click', (e) => { if (e.target.closest('.btn')) this.toggleMenu(false); });
    game.canvas.addEventListener('pointerdown', () => this.toggleMenu(false));

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
    const p = this.g.progress;
    this.btnCamera.classList.toggle('hidden', !this.g.fly);
    this.btnIdle.classList.toggle('sel', this.g.idle);
    this.root.classList.toggle('idle', this.g.idle); // no demonstrations while the game plays itself
    this.btnWorlds.classList.toggle('hidden', false); // the world choice is open from the first minute
    this.btnCamera.textContent = SPECIES.find((s) => s.id === p.species).icon;
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

  // Shows an hourglass, lets the browser draw it, then runs fn (which blocks the page for a moment).
  busy(fn) {
    const o = el('div', 'overlay busy', this.root, '⏳');
    requestAnimationFrame(() => setTimeout(() => { try { fn(); } finally { o.remove(); } }, 20));
  }

  // Alarm level 0..5 as a row of stars under the world bar.
  setWanted(level) {
    this.wanted.classList.toggle('hidden', !level);
    this.wanted.textContent = '⭐'.repeat(level);
    if (level) { this.wanted.classList.remove('pop'); void this.wanted.offsetWidth; this.wanted.classList.add('pop'); }
  }

  // An achievement has been reached: a small card slides in for a few seconds. Several wait their turn.
  toast(a) {
    this.toastQueue.push(a);
    this.nextToast();
  }

  nextToast() {
    if (this.toastN >= 2 || !this.toastQueue.length) return;
    const a = this.toastQueue.shift(), t = el('div', 'toast', this.toasts);
    el('span', 'ico', t, a.icon);
    const txt = el('div', '', t);
    el('b', '', txt, a.name);
    el('small', '', txt, a.text);
    el('span', 'cup', t, '🏆');
    this.toastN++;
    // With many waiting (e.g. after a long chain reaction) each one stays only briefly.
    const ms = this.toastQueue.length > 3 ? 1800 : 4200;
    t.style.animationDuration = ms + 'ms';
    setTimeout(() => { t.remove(); this.toastN--; this.nextToast(); }, ms);
  }

  // Power has reached the creature at screen position (x, y): a spark flies on to the ring, which bumps.
  gain(x, y) {
    const now = performance.now();
    if (now - this.gainT < 140) return;
    this.gainT = now;
    const r = this.power.getBoundingClientRect(), s = el('i', 'spark', this.root);
    s.style.left = Math.round(x) + 'px'; s.style.top = Math.round(y) + 'px';
    void s.offsetWidth; // start the transition from the creature's position
    s.style.left = Math.round(r.left + r.width / 2) + 'px'; s.style.top = Math.round(r.top + r.height / 2) + 'px';
    s.classList.add('go');
    setTimeout(() => {
      s.remove();
      this.power.classList.remove('gain'); void this.power.offsetWidth; this.power.classList.add('gain');
    }, 420);
  }

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
    for (const b of [this.btnCamera, this.btnWorlds, this.btnMenu, ...Object.values(this.toolButtons)]) b.classList.remove('pulse');
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
      const b = { worlds: this.btnWorlds, next: this.next }[id];
      if (b) { b.classList.add('pulse'); el('span', '', box, b.textContent); }
      if (b && this.drawer.contains(b)) this.btnMenu.classList.add('pulse'); // in the compact layout the button sits inside the menu
      box.append(dev === 'kbm' ? mouse() : dev === 'pad' ? pad('☰') : finger());
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
      const b = this.button(worlds, w.icon, () => { this.close(); g.travel(w.id); });
      b.classList.add('tile');
      if (w.id === p.world) b.classList.add('sel');
      if (p.completed.includes(w.id)) b.classList.add('complete');
      el('span', 'key' + (p.stage >= w.stage ? ' ok' : ''), b, String(w.stage));
    }
    const mons = el('div', 'row', sheet);
    for (const s of SPECIES) {
      const b = this.button(mons, s.icon, () => { g.setSpecies(s.id); this.openWorlds(); });
      if (s.id === p.species) b.classList.add('sel');
      // Every creature has its own stage.
      el('span', 'key ok', b, String(s.id === p.species ? p.stage : p.creatures[s.id].stage));
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
      this.button(sheet, '🎲', () => { this.close(); g.travel('random', true); }).classList.add('tile');
    }
    if (p.stickers.length) el('div', 'stickers', sheet, p.stickers.join(' '));
    this.button(sheet, '✖️', () => this.close()).classList.add('small');
  }

  // All achievements: reached ones in colour, the others with how far they have come.
  openAchievements() {
    const p = this.g.progress, sheet = this.open('trophies');
    el('h2', '', sheet, `🏆 ${p.achieved.length} / ${ACHIEVEMENTS.length}`);
    const grid = el('div', 'grid', sheet);
    for (const a of ACHIEVEMENTS) {
      const got = p.achieved.includes(a.id), c = el('div', 'card' + (got ? ' got' : ''), grid);
      el('span', 'ico', c, a.icon);
      const txt = el('div', '', c);
      el('b', '', txt, a.name);
      el('small', '', txt, a.text);
      if (!got) el('i', '', el('div', 'bar', txt)).style.width = Math.round(achievementProgress(p, a) * 100) + '%';
    }
    this.button(sheet, '✖️', () => this.close()).classList.add('small');
  }

  // The only place with text; meant for grown-ups.
  openParent() {
    const g = this.g, p = g.progress, s = p.settings, sheet = this.open('parent');
    el('h2', '', sheet, 'Einstellungen');
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
    // One slider between speed and detail; nobody has to know what their device can do.
    el('p', 'note', sheet, 'Grafik: links läuft das Spiel flüssiger (kleinerer Ausschnitt, weniger Trümmer, Staub, Feuer und Fahrzeuge), rechts sieht es reicher aus. Ruckelt es, schiebe den Regler nach links. Die Welt wird dabei neu aufgebaut.');
    const auto = document.createElement('input'), q = document.createElement('input');
    auto.type = 'checkbox'; auto.checked = !s.detail;
    q.type = 'range'; q.min = 1; q.max = MAX_DETAIL; q.step = 1; q.value = g.detail; q.disabled = auto.checked;
    const apply = () => { s.detail = auto.checked ? 0 : Number(q.value); q.disabled = auto.checked; saveProgress(p); g.applySettings('detail'); q.value = g.detail; };
    auto.addEventListener('change', apply);
    q.addEventListener('change', apply);
    row('Grafik automatisch wählen', auto);
    row('Schnell ⟷ Schön', q);
    check('Staub- und Rauchwolken', 'smoke');
    check('Feuer breitet sich aus', 'fireSpread');
    check('Einsatzkräfte (Polizei, Feuerwehr, Reporter, Militär)', 'units');
    check('Kamerawackeln', 'shake');
    check('Bewohner und Verkehr', 'life');
    check('Kettenreaktionen: einstürzende Gebäude reißen ihre Nachbarn mit (wirkt ab Stufe 3, mit jeder Stufe stärker)', 'cascade');
    check('Militär kann den Kaputtmacher kurz zurückstoßen (es gibt trotzdem kein Scheitern)', 'fightBack');
    check('Selbstspiel nach 2 Minuten ohne Eingabe', 'autoIdle');
    check('Alles freischalten', 'unlockAll');
    const full = el('button', '', sheet, 'Vollbild an/aus');
    full.addEventListener('click', () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.()));
    // Rarely needed, so it lives here instead of on the screen: fly around freely without the creature.
    const cam = el('button', '', sheet, g.fly ? 'Zurück zur Figur' : 'Freie Flugkamera');
    cam.addEventListener('click', () => { this.close(); g.doAction('camera'); });
    // Backup: the save as a file, and back again (e.g. to move to another device).
    const io = el('div', 'row', sheet);
    el('button', '', io, 'Spielstand als Datei sichern').addEventListener('click', () => {
      const a = document.createElement('a'), url = URL.createObjectURL(new Blob([exportProgress(p)], { type: 'application/json' }));
      a.href = url; a.download = 'kaputtmacher-spielstand.json';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
    const file = document.createElement('input');
    file.type = 'file'; file.accept = '.json,application/json'; file.className = 'hidden';
    sheet.appendChild(file);
    const load = el('button', '', io, 'Spielstand aus Datei laden …');
    load.addEventListener('click', () => file.click());
    file.addEventListener('change', async () => {
      const f = file.files[0];
      if (!f) return;
      const ok = f.size < 300000 && importProgress(await f.text());
      if (ok) { p.volatile = true; location.reload(); } else load.textContent = 'Das ist kein Kaputtmacher-Spielstand';
    });
    // Play log: how long each stage took. Useful for judging whether the stages are well balanced.
    if (p.log.length) {
      const fmt = (t) => Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0');
      const box = el('details', 'log', sheet);
      el('summary', '', box, 'Spielprotokoll: Dauer je Stufe');
      for (const sp of SPECIES) {
        const rows = p.log.filter((e) => e.c === sp.id);
        if (rows.length) el('p', 'note', box, sp.icon + ' ' + rows.map((e) => `Stufe ${e.s}: ${fmt(e.t)}${e.a ? ' (Selbstspiel)' : ''}`).join(' · '));
      }
    }
    // Starting over: stage, power, finished worlds, stickers and settings are wiped; the game begins at stage 1.
    el('p', 'note', sheet, 'Von vorn beginnen: Stufen und Macht aller Figuren, abgeschlossene Welten, Sticker, Erfolge und Einstellungen werden auf diesem Gerät gelöscht. Das Spiel startet danach wieder bei Stufe 1.');
    const reset = el('button', 'danger', sheet, 'Von vorn beginnen …');
    const sure = el('div', 'row hidden', sheet);
    el('button', '', sure, 'Abbrechen').addEventListener('click', () => { sure.classList.add('hidden'); reset.classList.remove('hidden'); });
    el('button', 'danger solid', sure, 'Ja, alles löschen').addEventListener('click', () => { resetProgress(p); location.reload(); });
    reset.addEventListener('click', () => { reset.classList.add('hidden'); sure.classList.remove('hidden'); });
    el('button', '', sheet, 'Schließen').addEventListener('click', () => this.close());
  }
}
