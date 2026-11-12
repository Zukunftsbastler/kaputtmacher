// Development only (never deployed). Scenarios of tools/web/test.js. The interface: buttons on every device and window size, sheets, touch input, achievements, music.
// Each block runs when the scenario named after the # in the address matches.
export default async function ({ g, sc, wait, fire, moves, errors }) {
  if (sc === 'trophies') { g.stat('vox', 5000); g.stat('jumps', 20); await wait(1500); const n = document.querySelectorAll('.toast').length; if (new URLSearchParams(location.search).get('open')) g.hud.openAchievements(); window.__extra = { toasts: n, ach: g.progress.achieved.length }; }
  if (sc === 'music') { const mu = g.music, t0 = performance.now(), log = []; g.audio.unlock(); let ready = null, all = null; for (let i = 0; i < 300; i++) { await wait(200); if (ready === null && mu.started) ready = +((performance.now() - t0) / 1000).toFixed(1); if (mu.progress >= 1) { all = +((performance.now() - t0) / 1000).toFixed(1); break; } if (mu.mode === 'classic') break; } if (mu.player) { g.heat = 0; await wait(1500); log.push(mu.state + ':' + mu.player.voices.size); const gains = () => Object.fromEntries([...mu.player.layerNodes].map(([k, n]) => [k, +n.gain.value.toFixed(2)])); log.push(JSON.stringify(gains())); await mu.player.setState('chase', { force: true }); await wait(4500); log.push(mu.player.state + ':' + mu.player.voices.size); await mu.player.setState('mayhem', { force: true }); await wait(4500); log.push(mu.player.state + ':' + mu.player.voices.size); } window.__extra = { mode: mu.mode, startedAfter: ready, renderedAfter: all, ctx: g.audio.ctx?.state, rate: g.audio.ctx?.sampleRate, buffers: mu.player?.buffers.size, log, errors }; }
  if (sc === 'musicswitch') { // the piece follows the world, the setting overrides it
    const mu = g.music, out = { log: [] }; window.__extra = out; g.audio.unlock();
    const until = async (what) => { const t0 = performance.now(); while (performance.now() - t0 < 20000) { await wait(100); if (mu.started && mu.player) break; } out.log.push(`${what}:${mu.track}:${mu.mode}:${mu.started ? ((performance.now() - t0) / 1000).toFixed(1) + 's' : 'not started'}`); };
    await until('start');
    for (const w of (new URLSearchParams(location.search).get('to') ?? 'neon,castle').split(',')) { g.loadWorld(w); await until(w); await wait(1500); }
    g.progress.settings.track = 'jungle'; g.applySettings('track'); await until('setting');
    g.progress.settings.track = ''; g.applySettings('track'); await until('back');
    out.ctx = g.audio.ctx?.state; out.voices = mu.player?.voices?.size;
  }
  if (sc === 'buttons') { // every button on screen, for every creature and every input device: inside the picture, big enough, not covered by another
    const { SPECIES } = await import('../src/monster.js'), { movesFor } = await import('../src/tools.js'), m = g.monster, bad = [], seen = {};
    g.hud.hintBox?.remove(); g.hud.hintId = null; g.progress.settings.unlockAll = true;
    const check = (label) => {
      const vis = [...document.querySelectorAll('#hud .btn')].filter((b) => b.getClientRects().length && getComputedStyle(b).visibility !== 'hidden' && !b.closest('.overlay'));
      seen[label] = vis.length;
      for (const b of vis) {
        const r = b.getBoundingClientRect(), name = (b.dataset.id ?? b.textContent.slice(0, 4)) + '';
        if (r.width < 24 || r.height < 24) { bad.push(label + ' ' + name + ' too small ' + Math.round(r.width)); continue; }
        if (r.left < -1 || r.top < -1 || r.right > innerWidth + 1 || r.bottom > innerHeight + 1) { bad.push(label + ' ' + name + ' outside ' + [r.left, r.top, r.right, r.bottom].map(Math.round)); continue; }
        const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        if (!hit || (!b.contains(hit) && !(label.startsWith('menu/') && hit.closest('#topright.open')))) bad.push(label + ' ' + name + ' covered by ' + (hit ? hit.tagName + '.' + hit.className + '#' + hit.id + ' ' + (hit.dataset?.id ?? hit.textContent.slice(0, 4)) : 'nothing'));
      }
    };
    for (const sp of SPECIES) {
      g.progress.species = sp.id; m.stage = 9; g.tool = movesFor(sp.id)[0].id; g.buildMonster(); g.hud.refreshTools(); g.hud.refreshButtons();
      for (const dev of ['kbm', 'pad', 'touch']) { g.input.device = dev; g.hud.layout(); await wait(120); check(sp.id + '/' + dev); }
      g.input.device = 'kbm'; g.hud.layout();
    }
    // The sheets (world choice, settings) and the folded menu: every control within the width of the picture and big enough
    // (a sheet may scroll, so below the bottom edge is allowed there), and the folded menu fully inside.
    const sheet = (label) => {
      const ctl = [...document.querySelectorAll('#hud .overlay button, #hud .overlay input, #hud .overlay select, #hud .overlay a')].filter((b) => b.getClientRects().length);
      seen[label] = ctl.length;
      for (const b of ctl) { const r = b.getBoundingClientRect(), name = b.tagName + ' ' + (b.textContent || b.type || '').trim().slice(0, 12) + ' [' + (b.closest('label')?.textContent ?? b.parentElement?.textContent ?? '').trim().slice(0, 30) + '] ' + Math.round(r.width) + 'x' + Math.round(r.height); if (r.width < 14 || r.height < 14) bad.push(label + ' ' + name + ' too small'); else if (r.left < -1 || r.right > innerWidth + 1) bad.push(label + ' ' + name + ' outside ' + [r.left, r.right].map(Math.round)); }
    };
    for (const dev of ['kbm', 'touch']) {
      g.input.device = dev; g.hud.layout(); g.progress.species = 'chopper'; g.hud.refreshTools();
      g.hud.openWorlds(); await wait(150); sheet('worlds/' + dev); g.hud.close();
      g.hud.openParent(); await wait(150); sheet('settings/' + dev); g.hud.close();
      if (document.body.classList.contains('compact')) { g.hud.toggleMenu(true); await wait(150); check('menu/' + dev); g.hud.toggleMenu(false); }
    }
    g.input.device = 'kbm'; g.hud.layout();
    // A mouse click on the helicopter's up button must leave the layout as it is.
    g.progress.species = 'chopper'; g.hud.refreshTools(); g.input.device = 'kbm'; g.hud.layout(); await wait(100);
    const up = document.querySelector('#abilities .btn[data-id=up]'); up?.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'mouse', bubbles: true })); up?.dispatchEvent(new PointerEvent('pointerup', { pointerType: 'mouse', bubbles: true })); await wait(100);
    if (document.body.className.startsWith('touch')) bad.push('mouse click on up switched to touch');
    window.__extra = { size: [innerWidth, innerHeight], bad: bad.slice(0, 40), nbad: bad.length, seen };
    if (bad.length) setTimeout(() => { throw new Error('buttons: ' + bad.join('; ')); }); // makes the smoke run fail
  }
  if (sc === 'worlds') { g.hud.openWorlds(); }
  if (sc === 'parent') { g.hud.openParent(); }
  if (sc === 'win') { for (const s of g.hud.major) { s.done = true; } g.structureDone(g.hud.major[0]); await wait(1500); }
  if (sc === 'touch') { g.input.device = 'touch'; g.hud.requestHint('fist', true); g.input.stick.on = true; g.input.stick.y = -1; g.input.stick.x = 0.3; await wait(1500); for (let i = 0; i < 5; i++) { fire(0.55, 0.4); await wait(350); } }
  if (sc.startsWith('mobile')) { g.input.device = 'touch'; g.hud.refreshTools(); await wait(300);
    const check = () => { const bad = [], seen = []; for (const b of document.querySelectorAll('#hud .btn, #hud a')) { const r = b.getBoundingClientRect(); if (!r.width || getComputedStyle(b).visibility === 'hidden') continue; const cx = r.left + r.width / 2, cy = r.top + r.height / 2, top = document.elementFromPoint(cx, cy); const name = (b.id || b.dataset.id || b.textContent).slice(0, 12); seen.push(name + ':' + Math.round(r.width)); if (!top || !(top === b || b.contains(top))) bad.push(name + ' covered by ' + (top ? (top.id || top.className || top.tagName) : 'nothing')); if (r.left < 0 || r.top < 0 || r.right > innerWidth || r.bottom > innerHeight) bad.push(name + ' off screen'); if (Math.min(r.width, r.height) < 40 && b.tagName === 'BUTTON') bad.push(name + ' too small ' + Math.round(r.width)); } return { seen, bad }; };
    const closed = check(); g.hud.toggleMenu(true); await wait(100); const open = check(); const out = { size: innerWidth + 'x' + innerHeight, body: document.body.className, closed, openBad: open.bad, openSeen: open.seen.length };
    if (sc === 'mobile') g.hud.toggleMenu(false);
    if (sc === 'mobilemenu') { await wait(100); }
    if (sc === 'mobileworlds') { g.hud.toggleMenu(false); g.hud.openWorlds(); await wait(200); const sh = document.querySelector('.sheet'); out.sheet = { h: sh.clientHeight, scroll: sh.scrollHeight, touchAction: getComputedStyle(sh).touchAction, canvasTA: getComputedStyle(g.canvas).touchAction, bodyTA: getComputedStyle(document.body).touchAction }; }
    if (sc === 'mobileplay') { g.hud.toggleMenu(false); const p0 = g.progress.power; g.input.stick.on = true; g.input.stick.y = -1; await wait(1500); g.input.stick.on = false; g.input.stick.y = 0; const ev = (el) => el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); for (let i = 0; i < 4; i++) { ev(g.hud.btnLight); await wait(600); } const t0 = g.tool; ev(g.hud.btnCycle); await wait(100); const t1 = g.tool; ev(g.hud.btnHeavy); await wait(1800); ev(document.querySelector('#abilities [data-id=stomp]')); await wait(300); const jumped = !g.monster.onGround; out.play = { gained: (g.progress.power - p0) | 0, cycled: t0 + '>' + t1, jumped, lightIcon: g.hud.btnLight.textContent }; }
    window.__extra = out; }
  if (sc === 'desk') { await wait(300); const vis = (id) => { const e = document.getElementById(id); return !!e && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().width > 0; }; window.__extra = { body: document.body.className, menuBtn: vis('menuBtn'), touchpad: vis('touchpad'), toolbar: vis('toolbar'), topright: vis('topright'), legal: vis('legal'), legal2: vis('legal2'), icons: getComputedStyle(document.querySelector('#worldbar .icons')).display }; }
  if (sc === 'iostouch') { const m = g.monster, c = g.canvas, x0 = m.x, z0 = m.z; const T = (type, id, x, y) => { const t = new Touch({ identifier: id, target: c, clientX: x, clientY: y }); c.dispatchEvent(new TouchEvent(type, { changedTouches: [t], touches: type === 'touchend' ? [] : [t], bubbles: true, cancelable: true })); };
    const id = Number(new URLSearchParams(location.search).get('tid') ?? -1463293746); T('touchstart', id, 80, innerHeight - 80); await wait(50); T('touchmove', id, 80, innerHeight - 160); await wait(1500); const moved = Math.hypot(m.x - x0, m.z - z0), knob = g.input.stick.y; T('touchend', id, 80, innerHeight - 160); await wait(300); const x1 = m.x, z1 = m.z; await wait(400);
    const p0 = g.progress.power; T('touchstart', id - 7, innerWidth * 0.55, innerHeight * 0.4); await wait(80); T('touchend', id - 7, innerWidth * 0.55, innerHeight * 0.4); await wait(900);
    window.__extra = { id, device: g.input.device, moved: +moved.toFixed(1), knobY: knob, stoppedAfter: +Math.hypot(m.x - x1, m.z - z1).toFixed(2), tapAttacked: g.progress.power > p0 || !!g.tools.act || g.tools.cool > -0.9 }; }
  if (sc === 'settings') { g.hud.btnGear.click(); await wait(200); const sh = document.querySelector('.sheet'); const labels = [...sh.querySelectorAll('h2, label, button, p')].map((e) => e.childNodes[0].textContent.slice(0, 34)); [...sh.querySelectorAll('button')].find((b) => b.textContent.startsWith('Von vorn')).click(); await wait(100); const confirmVisible = [...sh.querySelectorAll('button')].filter((b) => b.offsetParent).map((b) => b.textContent); window.__extra = { top: [...document.querySelectorAll('#topright .btn')].filter((b) => b.offsetParent).map((b) => b.textContent), gearOpacity: getComputedStyle(g.hud.btnGear).opacity, labels, confirmVisible }; }
  // The demonstration of creature and world choice, and the sheet itself (for a screenshot; sheet=1 opens it).
  if (sc === 'worldhint') {
    const q = new URLSearchParams(location.search);
    await wait(3600); // after the title card
    g.hud.hintQueue.length = 0; g.hud.hintId = null; g.hud.requestHint('worlds', true);
    await wait(900);
    if (q.get('sheet')) { g.hud.openWorlds(); await wait(300); }
    window.__extra = { hint: g.hud.hintId, parade: document.querySelectorAll('#hint .parade span').length, sheetRows: [...document.querySelectorAll('.sheet .row')].map((r) => r.className) };
  }
}
