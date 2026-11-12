// Development only (never deployed). Scenarios of tools/web/test.js. Attacks: what each move destroys, income per second, single moves on a chosen building.
// Each block runs when the scenario named after the # in the address matches.
export default async function ({ g, sc, wait, fire, moves, errors }) {
  if (sc === 'income') { const T = Number(new URLSearchParams(location.search).get('run') ?? 60000); const t0 = g.time, e0 = g.earned; const end = performance.now() + T; while (performance.now() < end) { g.growCool = 1e9; await wait(400); } const dt = g.time - t0; window.__extra = { stage: g.progress.stage, secs: +dt.toFixed(1), earned: Math.round(g.earned - e0), rate: Math.round((g.earned - e0) / dt), fell: g.world.structures.filter((s) => s.fell).length, world: +(100 - 100 * g.world.remaining / g.world.total).toFixed(2) }; }
  if (sc === 'jetgear') { const which = Number(new URLSearchParams(location.search).get('n') ?? 0); const list = g.unlockedTools(); g.selectTool(list[which]); g.input.aimX = innerWidth * 0.8; g.input.aimY = innerHeight * 0.75; await wait(1200); g.input.firePressed = true; await wait(250); window.__extra = { tool: g.tool, look: +g.monster.pose.look.toFixed(2), pitch: +g.monster.pose.aimPitch.toFixed(2), heading: +g.monster.heading.toFixed(2), yaw: +g.camYaw.toFixed(2) }; }
  if (sc === 'movetest') { const q = new URLSearchParams(location.search), m = g.monster, w = g.world, heavy = q.get('heavy') === '1';
    // direct=1: count only what the move itself destroys (calls from tools.js and the creature's own blows), not what then collapses
    let direct = 0, cascading = false; const book = {}; if (q.get('direct')) { const later = g.tools.later.bind(g.tools); g.tools.later = (t, fn) => later(t, /cascade/.test(new Error().stack) ? () => { cascading = true; try { fn(); } finally { cascading = false; } } : fn); /* chain reactions are no part of a move */ const d = g.destruction; for (const fn of ['sphere', 'capsule']) { const orig = d[fn].bind(d); d[fn] = (...a) => { const n = orig(...a); const st = new Error().stack; if (/tools\.js|onSurface|onUndermine|onWash|monster\.js/.test(st) && !cascading) { direct += n; const l = (st.split('\n')[2] ?? '').trim().replace(/\(.*\/src\//, '(').replace(/:\d+\)$/, ')'); book[l] = (book[l] ?? 0) + n; } return n; }; } } let best = null, bd = 1e9; for (const st of g.hud.major) { if (st.top - st.y0 < m.h * 1.5 || st.x1 - st.x0 < 20 || st.link) continue; const d = Math.hypot((st.x0 + st.x1) / 2 - m.x, (st.z0 + st.z1) / 2 - m.z); if (d < bd) { bd = d; best = st; } } const out = []; if (best) { const cx = (best.x0 + best.x1) / 2; m.x = cx; m.z = best.z0 - m.h * 0.9 - 2; m.y = w.heightBelow(m.x, m.z, 60); m.heading = 0; g.camYaw = 0; g.selectTool(q.get('tool')); await wait(600); for (let i = 0; i < 3; i++) { const r0 = w.remaining; g.aim.x = cx; g.aim.y = m.y + m.h * 0.5; g.aim.z = best.z0 + 2; const d0 = direct; g.tools.use(q.get('tool'), heavy); const t0 = performance.now(); while ((g.tools.act || performance.now() - t0 < 300) && performance.now() - t0 < 6000) { g.aim.x = cx; g.aim.y = m.y + m.h * 0.5; g.aim.z = best.z0 + 2; await wait(30); } await wait(q.get('direct') ? 1500 : 300); out.push(q.get('direct') ? direct - d0 : r0 - w.remaining); } } window.__extra = { tool: q.get('tool'), heavy, h: +m.h.toFixed(1), removed: out, book }; }
  if (sc === 'hitwall') { // a creature at the foot of a big structure attacks it: how much goes, how deep it gets
    const q = new URLSearchParams(location.search), w = g.world, m = g.monster, st = w.structures.find((s) => s.kind === (q.get('kind') ?? 'mountain')), out = {}; window.__extra = out;
    if (st) {
      const cz = Math.round((st.z0 + st.z1) / 2) + Number(q.get('dz') ?? 0), cx = Math.round((st.x0 + st.x1) / 2), y = st.y0 + Math.round(m.h * 0.4) + 2;
      let edge = st.x0; while (edge < cx && !w.get(edge, y, cz)) edge++;
      const depth = () => { let d = 0; while (d < 40 && !w.get(edge + d, y, cz)) d++; return d; };
      m.x = edge - m.h * 0.6 - 3; m.z = cz; m.y = w.heightBelow(m.x, m.z, y + 20); m.heading = Math.PI / 2; g.camYaw = Math.PI / 2; await wait(600);
      g.selectTool(q.get('tool') ?? g.unlockedTools()[0]); const r0 = st.remaining; out.coll = []; const oc = g.stability.collapse.bind(g.stability); g.stability.collapse = (s2, yy) => { if (out.coll.length < 6) out.coll.push(s2.kind + ':' + yy + ':S' + Math.round(s2.S[yy]) + '/' + Math.round(s2.S0[yy]) + ':w' + s2.weak.toFixed(2) + ':sh' + s2.shove.toFixed(2)); return oc(s2, yy); };
      for (let i = 0; i < Number(q.get('n') ?? 8); i++) { g.aim.x = edge + 2; g.aim.y = y; g.aim.z = cz; g.tools.use(g.tool, q.get('heavy') !== '0'); const t0 = performance.now(); while ((g.tools.act || performance.now() - t0 < 300) && performance.now() - t0 < 5000) { g.aim.x = edge + 2; g.aim.y = y; g.aim.z = cz; await wait(30); } }
      Object.assign(out, { tool: g.tool, removed: r0 - st.remaining, hole: depth(), h: +m.h.toFixed(1) });
    }
  }
  if (sc === 'newmoves') { // helicopter and tentacle: a move (tool, heavy) at the nearest big building, a screenshot `at` ms later; or do=emote|dive
    const q = new URLSearchParams(location.search), m = g.monster, w = g.world, tool = q.get('tool'), heavy = q.get('heavy') === '1', at = Number(q.get('at') ?? 1500), dist = Number(q.get('dist') ?? 1.4);
    g.hud.hintBox?.remove(); g.hud.hintId = null;
    let best = null, bd = 1e9;
    for (const st of g.hud.major) { if (st.top - st.y0 < Math.min(m.h * 0.8, 30) || st.x1 - st.x0 < 10 || st.link) continue; const d = Math.hypot((st.x0 + st.x1) / 2 - m.x, (st.z0 + st.z1) / 2 - m.z); if (d < bd) { bd = d; best = st; } }
    const cx = (best.x0 + best.x1) / 2, r0 = w.remaining;
    if (!q.get('keep')) { m.x = cx; m.z = best.z0 - m.h * dist - 2; m.y = Math.max(m.y, w.heightBelow(m.x, m.z, w.sy - 1)); m.heading = 0; g.camYaw = 0; } g.camOffset = Number(q.get('view') ?? 0.6);
    const aim = () => { g.aim.x = cx; g.aim.y = best.y0 + Math.min(m.h * 0.8, (best.top - best.y0) * 0.5); g.aim.z = best.z0 + 2; };
    const trace = [];
    const hold = async (ms) => { const t0 = performance.now(); let k = 0; while (performance.now() - t0 < ms) { aim(); await wait(20); if (q.get('trace') && k++ % 10 === 0) trace.push([Math.round(m.x), Math.round(m.z), g.tools.act ? g.tools.act.move.id : '-', g.tools.rope ? (g.tools.rope.ball ? 'B' : 'R') + Math.round(g.tools.rope.len) : '-', Math.round(m.y), m.onGround ? 1 : 0]); } };
    if (tool) g.selectTool(tool);
    await hold(500);
    if (q.get('do') === 'emote') { g.emote(q.get('id')); const t0 = performance.now(); while (performance.now() - t0 < at) { m.pose.emoteT = 0.6; await wait(50); } }
    else if (q.get('do') === 'dive') { g.doAction('stomp'); await wait(300); const x0 = m.x, z0 = m.z; g.input.keys.add('KeyW'); await hold(at); g.input.keys.delete('KeyW'); await wait(200); trace.push(['moved', Math.round(Math.hypot(m.x - x0, m.z - z0)), Math.round(m.y), m.pose.emerge]); }
    else { aim(); g.tools.use(tool, heavy); await hold(at); if (q.get('go')) { g.input.keys.add('KeyW'); await hold(Number(q.get('go'))); } }
    if (q.get('above')) { const d = Number(q.get('above')); g.fly = true; g.camYaw = m.heading + Math.PI; g.flyPos = [m.x + Math.sin(m.heading) * d * 0.8, m.y + d, m.z + Math.cos(m.heading) * d * 0.8]; g.flyPitch = -0.85; await wait(400); } // a look back down at the trail
    if (q.get('freeze')) g.paused = true; // hold the picture for the screenshot
    window.__extra = { tool, heavy, h: +m.h.toFixed(1), removed: r0 - w.remaining, rope: !!g.tools.rope, held: !!g.tools.held, vort: g.tools.vortices.length, kr: g.tools.krakens.length, under: m.under, emote: m.pose.emote, trace, raised: g.heave?.raised.size, lifting: g.heave?.cols.size };
  }
  if (sc === 'audit') { // who destroys how much: every sphere and capsule is booked to the function that called it
    const T = Number(new URLSearchParams(location.search).get('run') ?? 20000), d = g.destruction, book = {};
    for (const fn of ['sphere', 'capsule']) { const orig = d[fn].bind(d); d[fn] = (...a) => { const n = orig(...a); const line = (new Error().stack.split('\n')[2] ?? '').trim().replace(/\(.*\/src\//, '(').replace(/:\d+\)$/, ')'); book[line] = (book[line] ?? 0) + n; return n; }; }
    const e0 = g.earned, m = g.monster, path = [];
    for (let t = 0; t < T; t += 2000) { await wait(2000); const a = g.autopilot.target; path.push([Math.round(m.x), Math.round(m.z), Math.round(m.y), m.under ? 'U' : 'S', a ? Math.round(Math.hypot((a.x0 + a.x1) / 2 - m.x, (a.z0 + a.z1) / 2 - m.z)) : -1, +g.input.forward.toFixed(1), g.tools.act ? g.tools.act.move.id : '-']); }
    window.__extra = { earned: Math.round(g.earned - e0), book: Object.fromEntries(Object.entries(book).sort((a, b) => b[1] - a[1]).slice(0, 8)), path };
  }
  if (sc === 'punch') { g.input.keys.add('KeyW'); await wait(1500); g.input.keys.delete('KeyW'); for (let i = 0; i < 12; i++) { fire(0.5, 0.45); await wait(350); } }
  if (sc === 'shoot') { for (let i = 0; i < 10; i++) { fire(0.35 + i * 0.03, 0.42); await wait(450); } }
  if (sc === 'hold') { g.input.aimX = innerWidth * 0.5; g.input.aimY = innerHeight * 0.4; g.input.fire = true; await wait(3000); }
  if (sc === 'rampage') { g.input.keys.add('KeyW'); for (let i = 0; i < 16; i++) { fire(0.3 + (i % 5) * 0.1, 0.35 + (i % 3) * 0.08); await wait(400); if (i % 4 === 3) g.doAction('stomp'); } g.input.keys.delete('KeyW'); window.__extra = 'maxms'; }
  if (sc === 'flyshoot') { g.doAction('camera'); await wait(300); for (let i = 0; i < 8; i++) { fire(0.4 + i * 0.03, 0.55); await wait(450); } }
  if (sc === 'tools') { g.input.keys.add('KeyW'); await wait(1200); g.input.keys.delete('KeyW'); for (const t of ['fist', 'throw', 'throw', 'cannon', 'dynamite', 'rocket', 'sword', 'sword', 'beam']) { g.selectTool(t); await wait(100); fire(0.5, 0.42); g.input.fire = t === 'beam'; await wait(700); } g.input.fire = false; g.doAction('roar'); await wait(500); g.doAction('stomp'); await wait(2500); }
  if (sc === 'grow') { for (let i = 0; i < 3; i++) { g.progress.power = 1e13; await wait(2300); } }
  if (sc === 'boom') { g.input.keys.add('KeyW'); await wait(1200); g.input.keys.delete('KeyW'); fire(0.5, 0.4); await wait(250); g.doAction('stomp'); await wait(1750); fire(0.5, 0.42); await wait(250); }
  if (sc === 'whip') { g.input.keys.add('KeyW'); await wait(Number(new URLSearchParams(location.search).get('walk') ?? 1500)); g.input.keys.delete('KeyW'); for (let i = 0; i < 3; i++) { fire(0.5, 0.45); await wait(700); } fire(0.5, 0.45); await wait(330); }
  if (sc === 'allmoves') { g.input.keys.add('KeyW'); await wait(900); g.input.keys.delete('KeyW'); const list = g.unlockedTools(); for (const id of list) { g.selectTool(id); g.input.aimX = innerWidth * 0.5; g.input.aimY = innerHeight * 0.42; await wait(100); g.input.firePressed = true; await wait(1300); g.input.heavyPressed = true; await wait(3600); } window.__extra = { moves: list, buttons: moves(), helis: g.actors.helis.length, heat: +g.heat.toFixed(2) }; }
  if (sc === 'heavy') { g.input.keys.add('KeyW'); await wait(Number(new URLSearchParams(location.search).get('walk') ?? 900)); g.input.keys.delete('KeyW'); g.input.aimX = innerWidth * 0.5; g.input.aimY = innerHeight * 0.42; g.input.heavyPressed = true; await wait(Number(new URLSearchParams(location.search).get('at') ?? 700)); }
  if (sc === 'beam') { g.monster.place(516, 12, 600, 0); g.camYaw = 0.5; await wait(300); g.input.aimX = innerWidth * 0.22; g.input.aimY = innerHeight * 0.3; await wait(100); g.input.heavyPressed = true; let n = 0; for (let i = 0; i < 300; i++) { await wait(16); const r = g.tools.rays.find((x) => x.life < 0.05 && Math.hypot(x.bx - x.ax, x.bz - x.az) > 60); if (r && ++n > 25) { g.paused = true; window.__extra = { len: Math.hypot(r.bx - r.ax, r.bz - r.az) | 0 }; break; } } }
  if (sc === 'stomp') { for (let i = 0; i < 3; i++) { g.doAction('stomp'); await wait(1200); } }
}
