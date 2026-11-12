// Power, growth, finished buildings and the counters behind the achievements (part of class Game, see main.js).

import { MATS, TYPE_MAT, MAT } from './materials.js';
import { stageNeed, SPECIES } from './monster.js';
import { movesFor } from './tools.js';
import { saveProgress } from './progress.js';
import { checkAchievements } from './achievements.js';

// Growing takes time: whatever is destroyed goes into a reserve first, and the power bar fills from it at most so fast
// that stage N takes N minutes (PACE seconds per stage number). A big collapse keeps the bar filling for a while
// instead of throwing the creature up several stages at once. The reserve holds at most RESERVE of a stage: a whole one,
// because destruction comes in bursts (an outpost, then a long walk to the next) and nothing earned should be lost.
const PACE = 60, RESERVE = 1;
const v3 = [0, 0, 0];

export class GamePower {
  // Counters behind the achievements (see achievements.js).
  // What the game does on its own in idle mode does not count: achievements are for the player.
  stat(key, n = 1) { if (!this.idle) this.progress.stats[key] += n; }

  statMax(key, v) { if (!this.idle && v > this.progress.stats[key]) this.progress.stats[key] = v; }

  // A few times per second: tally what was destroyed, look for achievements that have just been reached.
  checkStats(dt) {
    const p = this.progress, st = p.stats, c = this.matCount, gain = SPECIES.find((s) => s.id === p.species).gain;
    this.speciesGain = gain ? gain(this.monster.stage) : 1;
    st.time += dt;
    if (p.playStage === p.stage) p.t += dt; // seconds spent on the current stage, for the play log
    if (this.idle) { st.idle += dt; c.fill(0); this.fire.lit = 0; }
    st.vox += c[MAT.GLASS] + c[MAT.LEAF] + c[MAT.WOOD] + c[MAT.BRICK] + c[MAT.CONCRETE] + c[MAT.STEEL] + c[MAT.SHEET] + c[MAT.EXPLOSIVE] + c[MAT.FABRIC] + c[MAT.FORT] + c[MAT.ROCK];
    st.glass += c[MAT.GLASS]; st.wood += c[MAT.WOOD]; st.leaf += c[MAT.LEAF]; st.stone += c[MAT.BRICK] + c[MAT.CONCRETE] + c[MAT.FORT] + c[MAT.ROCK]; st.steel += c[MAT.STEEL] + c[MAT.SHEET];
    c.fill(0);
    st.fires += this.fire.lit; this.fire.lit = 0;
    const fresh = checkAchievements(p);
    if (fresh) { for (const a of fresh) this.hud.toast(a); this.audio.achieve(); saveProgress(p); }
    if ((this.saveT += dt) > 20) { this.saveT = 0; saveProgress(p); }
    // Most players never find out that creature and world can be changed: after three minutes the choice is shown.
    if (!p.seen.worlds && !this.idle && this.time > 180) this.hud.requestHint('worlds');
  }

  // Called by the world for every original voxel that leaves its place.
  onDestroyed(type, x, y, z, st) {
    this.gain += MATS[TYPE_MAT[type]].power * this.gainScale * this.speciesGain;
    this.reactions.onVoxel(type, x, y, z);
    this.gainPos[0] = x; this.gainPos[1] = y; this.gainPos[2] = z;
    if (!st || !st.id) return;
    this.spans.touch(st);
    this.minimap.hit(x, z);
    this.matCount[TYPE_MAT[type]]++;
    if (st.major) { this.activeSt = st; this.activeT = this.time; }
    if (!st.done && st.remaining <= st.total * 0.1) { st.done = true; this.doneQueue.push(st); }
  }

  addPower(v) {
    const p = this.progress;
    this.earned += v;
    if (!this.idle) p.stats.power += v;
    this.reserve = Math.min(this.reserve + v, stageNeed(p.stage) * RESERVE);
  }

  // Every step: power flows from the reserve onto the bar, at most at the stage's pace.
  flowPower(dt) {
    const p = this.progress, need = stageNeed(p.stage);
    if (this.reserve > 0) {
      const v = Math.min(this.reserve, (need / (PACE * p.stage)) * dt);
      this.reserve -= v;
      p.power += v;
      this.hud.setPower(p.power / need, p.stage);
    }
    if (p.power < need || this.growCool > 0) return;
    p.power -= need;
    const follow = p.playStage === p.stage;
    // Play log: how long this stage took. It is what the stage thresholds are tuned with.
    p.log.push({ c: p.species, s: p.stage, t: Math.round(p.t), a: this.idle ? 1 : 0 });
    if (p.log.length > 60) p.log.shift();
    p.t = 0;
    p.stage++;
    this.growCool = 2;
    if (follow) { p.playStage = p.stage; this.grow(); }
    saveProgress(p);
  }

  // The growth moment: roar, flash, shock wave, a new ability.
  grow() {
    const m = this.monster, p = this.progress;
    if (!p.seen.worlds) this.hud.requestHint('worlds'); // the first growth is a good moment to show the other creatures and worlds
    m.stage = p.playStage;
    m.grow = 1;
    m.pose.roar = 1;
    this.emote('star');
    this.buildMonster();
    this.audio.grow();
    this.audio.roar(m.stage);
    this.shake(0.9);
    const H = m.targetHeight();
    this.debris.blast(m.x, m.y, m.z, H * 2, 20 + H * 0.3);
    this.actors.blast(m.x, m.y, m.z, H * 1.5, 14);
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * 6.283;
      this.fx.add(m.x, m.y + 1, m.z, Math.cos(a) * H * 2.5, 2, Math.sin(a) * H * 2.5, H * 0.12 + 1, H * 0.2, 0.7, 1, 0.9, 0.4, 0.9, 1, 0, 1.5);
    }
    this.hud.setPower(p.power / stageNeed(p.stage), p.stage, true);
    const fresh = movesFor(p.species).find((t) => t.stage === m.stage);
    if (fresh) this.tool = fresh.id; // the new move is selected right away
    this.hud.refreshTools(true);
    if (fresh) { this.hud.requestHint('light', true); this.hud.requestHint('heavy', true); }
  }

  structureDone(st) {
    const p = this.progress;
    this.addPower(st.total * 0.25);
    if (!st.major) return;
    // The building's power bursts out of it in a cloud of glowing balls.
    const cx = (st.x0 + st.x1) / 2, cz = (st.z0 + st.z1) / 2;
    this.orbBurst(cx, st.y0 + Math.min(20, (st.top - st.y0) * 0.3), cz, Math.max(st.x1 - st.x0, st.z1 - st.z0) * 0.4, Math.min(28, 10 + (st.total >> 12)));
    this.stat('buildings');
    this.emote('heart');
    if (st.top - st.y0 > 100) this.stat('towers');
    this.doneTimes.push(this.time);
    while (this.time - this.doneTimes[0] > 10) this.doneTimes.shift();
    this.statMax('multi', this.doneTimes.length);
    if (!st.link) this.cascade(st, (st.x0 + st.x1) / 2, (st.z0 + st.z1) / 2, Math.max(st.x1 - st.x0, st.z1 - st.z0)); // a fallen bridge shakes no neighbours (it is long, its shock would reach far)
    this.audio.fanfare();
    if (this.project((st.x0 + st.x1) / 2, st.top * 0.5 + 6, (st.z0 + st.z1) / 2, v3)) this.hud.stamp(st, v3[0], v3[1]);
    if (!p.stickers.includes(st.icon)) p.stickers.push(st.icon);
    if (!this.worldDone && this.hud.major.every((s) => s.done)) {
      this.worldDone = true;
      this.fireworks = 7;
      if (!p.completed.includes(p.world)) p.completed.push(p.world);
      this.audio.win();
      this.hud.showNext(true);
      this.hud.requestHint('next');
      this.hud.refreshButtons();
    }
    saveProgress(p);
  }

  // Size of the power balls: they grow with the creature, so they stay visible next to a giant.
  orbSize() { return 0.7 + this.monster.h * 0.045; }

  // A cloud of power balls thrown out of a building.
  orbBurst(x, y, z, spread, count) {
    const size = this.orbSize() * 1.3;
    for (let i = 0; i < Math.ceil(count * Math.min(1, this.fx.thin + 0.3)); i++)
      this.fx.orb(x + (this.rng() - 0.5) * spread * 2, y + this.rng() * spread, z + (this.rng() - 0.5) * spread * 2, size, 2.2);
  }
}
