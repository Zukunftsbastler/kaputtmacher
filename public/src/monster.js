// The player's creature: the controller that moves it through the world (walking, jumping, climbing, ground pound).
// Its data, models, body language and climbing grip live in species.js, models.js, posing.js and climb.js; flying,
// hovering and travelling below the ground in monster-air.js and monster-burrow.js. Everything is re-exported here.
// Attack animations are layered on top by tools.js.

import { clamp, wrapDelta } from './math.js';
import { GRAVITY, launch } from './particles.js';
import { tracked, stageScale, motionOf } from './species.js';
import { newPose, locomotion } from './posing.js';
import { Climber } from './climb.js';
import { mixin } from './mixin.js';
import { MonsterAir } from './monster-air.js';
import { MonsterBurrow } from './monster-burrow.js';
export * from './species.js';
export * from './models.js';
export * from './posing.js';
export { Climber } from './climb.js';

// Jumping works like in a classic platformer: hold the button for the full height, tap for a hop,
// rise fast, fall faster, steer freely in the air.
const JUMP_HEIGHT = 3.2; // apex of a full jump in monster heights
const JUMP_CUT = 3; // extra gravity while rising with the button released
const FALL_GRAVITY = 1.7; // extra gravity on the way down
const SPRINT = 1.75;
const AIR_SPEED = 2; // a jump with a direction carries: horizontal speed in the air, relative to walking
const AIR_FLOOR = 12, AIR_FLOOR2 = 21; // least horizontal speed of a first and of a second jump, in world units per second
const AIR_SPEED2 = 3.4; // the same after the second jump: a double jump clears a street with room to spare
const TANK_HOP = 0.7; // the tank only hops, in its own heights: enough to climb out of a crater it has dug
const JUMP2_HEIGHT = 2.4; // extra height of the second jump in mid-air, in monster heights
const FLIP_TIME = 0.55; // seconds the somersault of the second jump takes
// Ground pound, as in classic platformers: third press near the top of the double jump.
const POUND_HANG = 0.2; // seconds the creature hangs and curls up before it drops
const POUND_SPEED = 2.4; // drop speed, in launch speeds of the first jump
const POUND_STUN = 0.3; // seconds it stays crouched in its crater afterwards
const POUND_CHAIN = 8; // how many floors in a row it may smash through

export class Monster {
  constructor(game) {
    this.g = game;
    this.x = 0; this.y = 0; this.z = 0;
    this.heading = 0;
    this.vy = 0;
    this.onGround = true;
    this.stage = 1;
    this.h = 8; // current height in voxels (eases towards the stage's height)
    this.pose = newPose();
    this.jumpHeld = false; // set by the game from the jump button
    this.sprint = false;
    this.speed = 0; // current ground speed in voxels per second
    this.stomping = false;
    this.leaping = null; // { vx, vz }: an aimed leap in progress
    this.trampleT = 0; this.shoveT = 0;
    this.lastStep = 0;
    this.grow = 0; // 1 right after a growth, fades out
    this.jumps = 0; // jumps since the feet last touched the ground (2 = the double jump is used up)
    this.flipT = -1; // seconds into the somersault, -1 = none
    this.flipped = false; // this flight included a somersault: the landing hits harder
    this.v2 = 1; // launch speed of the last double jump
    this.pound = null; // ground pound in progress: { t, falling, chain }
    this.stun = 0; // seconds the creature cannot move after a ground pound
    this.cued = false;
    this.cling = null; // hanging on a wall: { dx, dz, t } (direction of the wall)
    this.climbV = 0; this.climbH = 0; // climbing controls: up/down and sideways, -1..1
    this.climber = new Climber(); // where hands and feet hold on to the wall
    this.kick = null; // shove away from the wall after a wall jump: { vx, vz, t }
    this.clingCool = 0; // seconds until the next wall may be grabbed
    this.wallJump = false;
    this.bounce = 0; this.bounceDir = 1; // aircraft: seconds it is still tumbling after a crash, and which way
    this.steer = 0; this.pitchIn = 0; // aircraft controls: turn and climb, -1..1
    this.homing = false; // aircraft has left an island and is turning back
    this.vx = 0; this.vz = 0; this.liftIn = 0; this.strafe = 0; this.washT = 0; this.landT = 0; // helicopter: drift, height over the ground, controls
    this.under = false; this.diveCool = 0; this.leanT = 0; this.mineT = 0; this.eruptT = -9; this.quietT = 0; // tentacle: below the ground, timers
  }

  targetHeight() {
    const w = this.g.world;
    return Math.min(w.monsterBase * stageScale(this.stage), w.sy * 0.92);
  }

  place(x, y, z, heading) {
    this.x = x; this.y = y; this.z = z; this.heading = heading;
    this.vy = 0; this.leaping = null; this.onGround = true;
    this.jumps = 0; this.flipT = -1; this.flipped = false; this.pose.flip = 0;
    this.pound = null; this.stun = 0; this.cling = null;
    this.h = this.targetHeight();
    const sp = this.g.progress.species;
    const mo = motionOf(sp);
    if (mo === 'plane') { this.y = y + 40 + this.h; this.onGround = false; } // the aircraft starts in the air
    if (mo === 'hover') { this.y = y + this.h * 1.1 + 4; this.vx = this.vz = this.vy = 0; this.onGround = false; }
    if (mo === 'burrow') { this.under = false; this.pose.emerge = 1; this.pose.ta.fill(0); }
  }

  faceTo(x, z) {
    const size = this.g.world.wrap ? this.g.world.sx : 0;
    const dx = wrapDelta(x - this.x, size), dz = wrapDelta(z - this.z, size);
    if (dx * dx + dz * dz > 1) this.heading = Math.atan2(dx, dz);
  }

  // Big monsters fall faster, so a jump takes about as long at every size instead of floating.
  gravity() { return GRAVITY * 2 * Math.max(1, this.h / 14) * this.g.world.grav; }

  // First press: jump from the ground. Second press in the air: one more jump, with a forward somersault.
  jump() {
    const tank = tracked(this.g.progress.species); // tank and excavator only hop (the excavator pushes itself up with its arm)
    if (this.g.world.under && !this.onGround && !this.cling && !this.leaping && !tank) {
      // Under water every press in mid-water is a swimming stroke: up again, as often as you like.
      this.vy = Math.sqrt(2 * this.gravity() * this.h * 1.3);
      this.jumps = Math.max(1, this.jumps); this.stomping = true; this.pound = null;
      this.pose.squash = 0.7;
      this.g.onSwim(this);
      return true;
    }
    if (this.cling) {
      // Up, and a little away from the wall. Steering forwards again brings the creature back to it further up.
      this.kick = { vx: -this.cling.dx * this.h * 1.8, vz: -this.cling.dz * this.h * 1.8, t: 0.28 };
      this.cling = null; this.clingCool = 0.15;
      this.wallJump = true; // until the top of this jump the wall is neither grabbed again nor broken through
      this.vy = Math.sqrt(2 * this.gravity() * this.h * JUMP2_HEIGHT);
      this.jumps = 1; this.stomping = true; this.flipT = -1;
      this.g.stat('jumps');
      return true;
    }
    if (this.onGround) {
      this.vy = Math.sqrt(2 * this.gravity() * this.h * (tank ? TANK_HOP : JUMP_HEIGHT));
      this.onGround = false;
      this.stomping = !tank; // a hop leaves no crater: it is the way out of one
      this.jumps = 1;
      this.g.stat('jumps');
      return true;
    }
    if (this.leaping || this.pound || tank) return false; // 30 tonnes: no second jump, no ground pound
    if (this.jumps >= 2) {
      // Third press: only at the right moment. Then all steering ends and the creature drops like a stone.
      if (!this.poundReady()) return false;
      this.pound = { t: 0, falling: false, chain: 0 };
      this.jumps = 3; this.flipT = -1; this.vy = 0;
      this.stomping = false;
      this.g.onPoundStart(this);
      return true;
    }
    // Also allowed after walking off an edge: then it is the only jump of that fall.
    this.vy = this.v2 = Math.sqrt(2 * this.gravity() * this.h * JUMP2_HEIGHT);
    this.cued = false;
    this.jumps = 2;
    this.stomping = true;
    this.flipT = 0; this.flipped = true;
    this.g.onDoubleJump(this);
    return true;
  }

  // The right moment for the ground pound: around the top of the double jump, from the second half
  // of the somersault until the creature has started to fall in earnest.
  poundReady() {
    return this.jumps === 2 && !this.onGround && !this.leaping && !this.pound &&
      (this.flipT < 0 || this.flipT > FLIP_TIME * 0.5) && this.vy > -this.v2 * 0.55;
  }

  // An aimed leap: flies in an arc to (tx, tz), ignoring what stands in the way, and reports the landing.
  leap(tx, tz, apex) {
    if (!this.onGround) return false;
    const g = this.gravity(), size = this.g.world.wrap ? this.g.world.sx : 0;
    this.vy = Math.sqrt(2 * g * apex);
    const time = this.vy / g + Math.sqrt((2 * apex) / (g * FALL_GRAVITY));
    this.leaping = { vx: wrapDelta(tx - this.x, size) / time, vz: wrapDelta(tz - this.z, size) / time };
    this.onGround = false;
    return true;
  }

  // mx/mz: desired walking direction in world space (length 0..1). aimX/aimZ: where the head looks.
  update(dt, mx, mz, aimX, aimZ) {
    const g = this.g, w = g.world, h = this.h, pose = this.pose, species = g.progress.species;
    this.h += (this.targetHeight() - h) * Math.min(1, dt * 2.5);
    this.grow = Math.max(0, this.grow - dt * 0.7);
    pose.time += dt;
    const mo = motionOf(species); // how this creature gets about: on foot (below), flying, hovering or below the ground
    if (mo === 'plane') { pose.roar = Math.max(0, pose.roar - dt * 1.1); pose.squash = 0; this.flyPlane(dt, aimX, aimZ); return; }
    if (mo === 'hover') { pose.roar = Math.max(0, pose.roar - dt * 1.1); pose.squash = 0; this.hover(dt, mx, mz, aimX, aimZ); return; }
    if (mo === 'burrow') { pose.roar = Math.max(0, pose.roar - dt * 1.1); pose.squash += (0 - pose.squash) * Math.min(1, dt * 7); this.burrow(dt, mx, mz, aimX, aimZ); return; }
    pose.roar = Math.max(0, pose.roar - dt * 1.1);
    pose.squash = Math.max(0, pose.squash - dt * 4);
    pose.air += ((this.onGround ? 0 : 1) - pose.air) * Math.min(1, dt * 12);
    pose.cling += ((this.cling ? 1 : 0) - pose.cling) * Math.min(1, dt * 14);
    if (!this.cling && pose.cling < 0.01) pose.cling = 0;
    if (this.flipT >= 0) { // somersault: one full forward turn, quick in the middle
      this.flipT += dt;
      const t = Math.min(1, this.flipT / FLIP_TIME);
      pose.flip = Math.PI * 2 * t * t * (3 - 2 * t);
      if (t >= 1) { this.flipT = -1; pose.flip = 0; }
    }

    this.stun = Math.max(0, this.stun - dt);
    if (this.pound || this.stun > 0) { mx = 0; mz = 0; } // no steering during a ground pound or while getting up from it
    if (!this.cued && this.poundReady()) { this.cued = true; g.onPoundCue(this); }
    // In the air a ledge up to half the body height is still caught: a jump that almost reaches a roof lands on it.
    const stepH = Math.max(1.5, h * (this.onGround ? 0.3 : 0.5)), r = h * 0.22;
    this.clingCool -= dt;
    if (this.kick) { // pushed off a wall: a short shove backwards
      this.x += this.kick.vx * dt; this.z += this.kick.vz * dt;
      if ((this.kick.t -= dt) <= 0) this.kick = null;
    }
    if (this.cling) {
      // Climbing. The creature hangs on the wall and moves along it: up, down and sideways, round corners too.
      // It only leaves the wall when there is nothing left to hold on to, when its feet reach the ground,
      // when it has pulled itself onto the roof, or with a jump.
      // The climbing speed pulses with the grips: the body moves while the hands hold (Climber.update, last frame).
      const c = this.cling, reach = r + 1.5 + h * 0.2, sp = (8 + h * 2.2) * dt * (this.climbPace ?? 1);
      // Is there something to hold on to? Probed at three depths: a glass front is only one voxel thick, with an empty room behind it.
      const wall = (x, y, z, dx = c.dx, dz = c.dz) => {
        const y0 = this.y;
        this.y = y;
        let hit = false;
        for (const d of [r + 1, r + 1.5 + h * 0.1, reach]) if (this.blocked(x + dx * d, z + dz * d, stepH, dx, dz, r)) { hit = true; break; }
        this.y = y0;
        return hit;
      };
      mx = 0; mz = 0;
      if (!wall(this.x, this.y, this.z)) { this.cling = null; this.clingCool = 0.3; } // the wall is gone
      else {
        if (this.climbV > 0.1) {
          const ny = this.y + this.climbV * sp;
          if (wall(this.x, ny, this.z)) { this.y = ny; c.stuck = 0; }
          else {
            // The top: pull up onto the roof, if there is one within reach.
            // A narrow ledge (the step of a tower that gets slimmer further up) counts as well.
            for (const d of [r * 2 + 2, r + 1.5]) {
              const fx = this.x + c.dx * d, fz = this.z + c.dz * d, top = w.heightBelow(fx, fz, ny + h * 0.8);
              // The roof may lie a little below the feet as well: in the air the wall is felt from half a body height up only.
              if (top < this.y - h * 0.5 || top > ny + h * 0.8) continue;
              this.x = fx; this.z = fz; this.y = top; this.onGround = true; this.jumps = 0; this.cling = null; this.clingCool = 0.4; pose.squash = 0.6;
              break;
            }
            // Nothing found to step onto (a parapet, an odd roof): after a moment the creature vaults over the edge
            // instead of hanging there for ever.
            if (this.cling && (c.stuck = (c.stuck ?? 0) + dt) > 0.4) {
              this.cling = null; this.clingCool = 0.6; this.wallJump = false;
              this.vy = Math.sqrt(2 * this.gravity() * h * 1.2); this.jumps = 1;
              this.kick = { vx: c.dx * h * 2.5, vz: c.dz * h * 2.5, t: 0.4 };
            }
          }
        } else if (this.climbV < -0.1) {
          const ny = this.y + this.climbV * sp, gy = w.heightBelow(this.x, this.z, this.y + 1);
          if (ny <= gy) { this.y = gy; this.onGround = true; this.jumps = 0; this.cling = null; this.clingCool = 0.4; } // feet on the ground
          else if (wall(this.x, ny, this.z)) this.y = ny;
        }
        if (this.cling && Math.abs(this.climbH) > 0.1) {
          const s = Math.sign(this.climbH), tx = -c.dz * s, tz = c.dx * s; // along the wall, to the creature's right or left
          if (this.blocked(this.x + tx * (r + 1 + sp), this.z + tz * (r + 1 + sp), stepH, tx, tz, r)) { c.dx = tx; c.dz = tz; } // inner corner: on to the next wall
          else {
            const nx = this.x + tx * sp, nz = this.z + tz * sp;
            if (wall(nx, this.y, nz)) { this.x = nx; this.z = nz; }
            else {
              // Outer corner: swing round it onto the side of the building.
              const ox = nx + c.dx * (r * 2 + 2) + tx * (r + 1), oz = nz + c.dz * (r * 2 + 2) + tz * (r + 1);
              if (wall(ox, this.y, oz, -tx, -tz)) { this.x = ox; this.z = oz; c.dx = -tx; c.dz = -tz; }
            }
          }
        }
        if (this.cling) {
          this.heading = Math.atan2(c.dx, c.dz);
          const moving = Math.abs(this.climbV) > 0.1 || Math.abs(this.climbH) > 0.1;
          // Hands and feet take hold of the wall one after the other (Climber).
          const len = Math.hypot(this.climbH, this.climbV) || 1;
          this.climbPace = this.climber.update(this, dt, species, moving, moving ? -this.climbH / len : 0, moving ? this.climbV / len : 0);
          pose.climbAmt += ((moving ? 1 : 0) - pose.climbAmt) * Math.min(1, dt * 8);
          pose.climbV = this.climbV; pose.climbH = this.climbH;
          // A heavy creature tears at the wall it climbs: from stage 3 on the claws keep breaking pieces out.
          if (moving && this.stage >= 3 && (c.t += dt) > 1) { c.t = 0; g.onCling(this, c.dx, c.dz, false); }
        }
      }
    }
    const input = Math.hypot(mx, mz);
    this.speed = 0;
    if (this.leaping) {
      this.x += this.leaping.vx * dt; this.z += this.leaping.vz * dt;
    } else if (input > 0.05) {
      // In a jump the creature keeps going where it is steered, and faster than on foot: that is what carries it
      // across a street from one roof to the next. The higher it starts, the longer it flies and the further it gets.
      const air = this.onGround || !this.jumps || tracked(species) ? 1 : this.jumps >= 2 ? AIR_SPEED2 : AIR_SPEED;
      // Wading through open water (the harbour basin) is slow going while the water is above the knees.
      const wet = this.onGround && w.water && this.y < w.water.level - h * 0.25 && w.water.rects.some((q) => this.x >= q[0] && this.x < q[2] && this.z >= q[1] && this.z < q[3]);
      if (wet && g.rng() < 0.5) g.onWade(this, w.water.level);
      const dx = mx / input, dz = mz / input, push = Math.min(1, input) * (this.sprint ? SPRINT : 1) * (wet ? 0.6 : 1);
      // Small creatures are slow on foot and short in the air, so their jumps have a minimum speed of their own
      // (in the world's scale): even the smallest gets across a street with a double jump.
      const v = Math.max((5 + h * 0.9) * air, air === 1 ? 0 : (air === AIR_SPEED2 ? AIR_FLOOR2 : AIR_FLOOR) * w.unit) * push;
      const want = Math.atan2(dx, dz);
      let dh = want - this.heading;
      dh = Math.atan2(Math.sin(dh), Math.cos(dh));
      this.heading += dh * Math.min(1, dt * 10);

      // Whatever is weaker than the monster simply breaks when it walks into it. The way is probed both
      // where the next step lands and a little beyond, so neither a thin pole nor a fast run slips through.
      this.trampleT -= dt; this.shoveT -= dt;
      const nx = this.x + dx * v * dt, nz = this.z + dz * v * dt;
      const px = this.x + dx * (r + 1 + v * dt), pz = this.z + dz * (r + 1 + v * dt);
      let stopped = this.blocked(nx + dx * r, nz + dz * r, stepH, dx, dz, r);
      // A jump that ends at the wall of a building does not just punch through: the creature grabs hold.
      // (Sprinting into a wall still smashes through it.)
      const rising = this.wallJump && !this.onGround && this.vy > 0;
      if (!this.onGround && this.jumps > 0 && !this.pound && this.clingCool <= 0 && !rising && !this.sprint && !tracked(species)
        && (stopped || this.blocked(px, pz, stepH, dx, dz, r)) && w.structureAt(px + dx * 2, pz + dz * 2)?.major) {
        this.cling = this.wallFace(dx, dz, stepH, r);
        this.climber.reset();
        this.wallJump = false;
        this.vy = 0; this.trampleT = 0.3; this.flipT = -1; pose.flip = 0; this.stomping = false;
        stopped = true;
        g.onCling(this, this.cling.dx, this.cling.dz, true);
      }
      if (this.trampleT <= 0 && !rising && (stopped || this.blocked(px, pz, stepH, dx, dz, r))) {
        this.trampleT = 0.08;
        g.lastHit.dx = dx; g.lastHit.dz = dz;
        g.destruction.sphere(this.x + dx * h * 0.3, this.y + h * 0.48, this.z + dz * h * 0.3, h * 0.36, (1.5 + this.stage * 1.6) * (this.sprint ? 1.3 : 1),
          { dx, dy: 0.1, dz, impulse: launch(h * 0.9 + 3), debris: 30 });
        // Running into a building at full speed shoves it: if it is shaky enough, it goes over.
        if (this.sprint && this.shoveT <= 0) { this.shoveT = 0.35; g.onShove(this, px + dx * 2, pz + dz * 2, dx, dz, 1); }
        stopped = this.blocked(nx + dx * r, nz + dz * r, stepH, dx, dz, r);
      }
      if (!stopped) { this.x = nx; this.z = nz; this.speed = v; }
      else if (this.cling) { /* held by the wall */ }
      else if (!this.blocked(nx + dx * r, this.z, stepH, dx, 0, r)) this.x = nx;
      else if (!this.blocked(this.x, nz + dz * r, stepH, 0, dz, r)) this.z = nz;

      pose.walk += (dt * v * 5.2) / h;
      pose.walkAmp = Math.min(this.sprint ? 1.4 : 1, pose.walkAmp + dt * 6);
      const half = Math.floor(pose.walk / Math.PI);
      if (half !== this.lastStep && this.onGround) { this.lastStep = half; g.onStep(this); }
    } else pose.walkAmp = Math.max(0, pose.walkAmp - dt * 5);
    if (w.wrap) { this.x = ((this.x % w.sx) + w.sx) % w.sx; this.z = ((this.z % w.sz) + w.sz) % w.sz; }
    else { this.x = clamp(this.x, r + 1, w.sx - r - 1); this.z = clamp(this.z, r + 1, w.sz - r - 1); }

    // Ground: the highest support under the feet that is not taller than a step.
    let gy = 0;
    for (let i = 0; i < 5; i++) {
      const ox = i === 1 ? r : i === 2 ? -r : 0, oz = i === 3 ? r : i === 4 ? -r : 0;
      gy = Math.max(gy, w.heightBelow(this.x + ox * 0.7, this.z + oz * 0.7, this.y + stepH));
    }
    if (this.onGround) {
      if (gy >= this.y) this.y = Math.min(gy, this.y + h * 5 * dt + 0.2);
      else if (gy < this.y - 0.6) { this.onGround = false; this.vy = 0; }
      else this.y = gy;
    } else if (this.cling) this.vy = 0; // hanging: no rising, no falling
    else {
      // Released early: the rise is cut short. Falling is faster than rising. A leap always flies its full arc.
      const held = this.jumpHeld || this.leaping, pd = this.pound;
      if (pd && !pd.falling) { // curl up and hang for a moment, then go straight down at full speed
        pd.t += dt;
        this.vy = 0;
        if (pd.t >= POUND_HANG) { pd.falling = true; this.vy = -Math.sqrt(2 * this.gravity() * h * JUMP_HEIGHT) * POUND_SPEED; }
      } else if (pd) {
        this.vy -= this.gravity() * dt;
        if (g.rng() < 0.7) g.fx.add(this.x + (g.rng() - 0.5) * h * 0.5, this.y + h * (1 + g.rng()), this.z + (g.rng() - 0.5) * h * 0.5, 0, h * 2, 0, h * 0.05 + 0.4, 0, 0.25, 1, 1, 1, 0.6, 1);
      } else {
        this.vy -= this.gravity() * (this.vy > 0 ? (held ? 1 : JUMP_CUT) : FALL_GRAVITY) * dt;
        if (w.under) this.vy = Math.max(this.vy, -h * 0.9 - 3); // sinking, not falling
      }
      this.y += this.vy * dt;
      if (this.y <= gy && this.vy <= 0) {
        this.y = gy;
        if (pd) {
          // The whole weight comes down. If that breaks a floor away, the drop goes on into the next one;
          // on plain ground it ends in a crater instead of digging a shaft.
          const fx = Math.floor(this.x), fz = Math.floor(this.z), st = fx >= 0 && fz >= 0 && fx < w.sx && fz < w.sz ? w.structures[w.footprint[fx + w.sx * fz]] : null;
          const onGroundLevel = !st || !st.major || this.y <= st.y0 + 1; // only floors of a building count, never the ground
          g.onPoundLand(this, pd.chain);
          let below = 0;
          for (let i = 0; i < 5; i++) below = Math.max(below, w.heightBelow(this.x + (i === 1 ? r : i === 2 ? -r : 0) * 0.7, this.z + (i === 3 ? r : i === 4 ? -r : 0) * 0.7, this.y + stepH));
          if (!onGroundLevel && below < this.y - 1 && pd.chain < POUND_CHAIN) { pd.chain++; this.vy *= 0.85; }
          else { this.pound = null; this.stun = POUND_STUN; this.y = below; }
        }
        if (!this.pound) {
          this.onGround = true;
          this.jumps = 0; this.flipT = -1; pose.flip = 0; this.wallJump = false;
          pose.squash = pd ? 1.6 : 1;
          if (this.leaping) { this.leaping = null; g.onLeapLand(this); }
          else if (this.stomping) {
            // On the ground every landing is a stomp. On a roof it only is one while the jump button is held:
            // hopping from roof to roof must not knock a hole into every roof on the way.
            const st = w.structureAt(this.x, this.z), roof = st && st.major && this.y > st.y0 + h * 0.5;
            if (roof && !this.jumpHeld) g.onSoftLand(this); else g.onStompLand(this);
          }
          this.stomping = false; this.flipped = false;
        }
      }
    }

    // The head (or the turret) follows the aim point.
    const size = w.wrap ? w.sx : 0;
    let look = Math.atan2(wrapDelta(aimX - this.x, size), wrapDelta(aimZ - this.z, size)) - this.heading;
    look = Math.atan2(Math.sin(look), Math.cos(look));
    if (!tracked(species)) look = clamp(look, -1, 1);
    let dl = look - pose.look;
    if (tracked(species)) dl = Math.atan2(Math.sin(dl), Math.cos(dl));
    pose.look += dl * Math.min(1, dt * (species === 'digger' ? 4 : 8)); // the excavator's upper carriage swings round more slowly
    if (species === 'digger') { // and its arm follows the height of the aim point
      const d = Math.hypot(wrapDelta(aimX - this.x, size), wrapDelta(aimZ - this.z, size));
      pose.aimPitch += (Math.atan2(g.aim.y - (this.y + h * 0.45), Math.max(d, h * 0.5)) - pose.aimPitch) * Math.min(1, dt * 5);
    }
    locomotion(pose, species);
    this.poundPose(species);
  }

  // Body language of the ground pound: curl into a ball with one quick turn while hanging,
  // then drop seat first, stretched long, arms thrown up; afterwards stay crouched in the crater.
  poundPose(species) {
    const pose = this.pose, j = pose.j, pd = this.pound;
    if (!pd) { if (this.stun > 0) { pose.squash = Math.max(pose.squash, 1.2 * (this.stun / POUND_STUN)); j.torso[0] += 0.35; j.head[0] += 0.2; } return; }
    if (!pd.falling) {
      const t = pd.t / POUND_HANG;
      pose.flip = Math.PI * 2 * t * t * (3 - 2 * t);
      pose.squash = 0.8 * t; // tucked in tight
      if (!tracked(species)) { j.legL[0] = j.legR[0] = -1.5 * t; j.armL[0] = j.armR[0] = -1.2 * t; j.torso[0] += 0.5 * t; j.head[0] += 0.4 * t; j.tail[0] += 0.9 * t; j.tail2[0] += 0.7 * t; }
      return;
    }
    pose.flip = 0;
    pose.squash = -1.1; // stretched by the speed
    if (tracked(species)) { j.torso[0] = 0; j.barrel[0] -= 0.5; return; }
    j.legL[0] = j.legR[0] = -1.45; // sitting position: the seat hits first
    j.armL[0] = j.armR[0] = 0; j.armL[2] = -2.5; j.armR[2] = 2.5;
    j.torso[0] = -0.12; j.head[0] = 0.35; j.jaw[0] += 0.7;
    j.tail[0] = 1.1; j.tail2[0] = 0.6;
  }

  // The wall the creature has jumped against, as { dx, dz, t } pointing into it. Walls of voxels face along x or z,
  // so the direction of the jump is turned onto the face it met: jumping at a wall at a slant, the creature would
  // otherwise hang at that slant, its shoulder in the building. It is also set back to the distance at which it
  // holds on (the first depth the climbing probes, see update), never closer.
  wallFace(dx, dz, stepH, r) {
    const sx = Math.sign(dx) || 1, sz = Math.sign(dz) || 1, ax = Math.abs(dx), az = Math.abs(dz), reach = r + 1.5 + this.h * 0.2;
    const hitX = ax > 0.15 && this.blocked(this.x + sx * reach, this.z, stepH, sx, 0, r);
    const hitZ = az > 0.15 && this.blocked(this.x, this.z + sz * reach, stepH, 0, sz, r);
    const alongX = hitX && hitZ ? ax >= az : hitX || (!hitZ && ax >= az);
    const nx = alongX ? sx : 0, nz = alongX ? 0 : sz;
    for (let d = 0.5; d < r + 1; d += 0.5) {
      if (!this.blocked(this.x + nx * d, this.z + nz * d, stepH, nx, nz, r)) continue;
      this.x -= nx * (r + 1 - d); this.z -= nz * (r + 1 - d); // too close: back out to arm's length
      break;
    }
    return { dx: nx, dz: nz, t: 0 };
  }

  // True if something solid stands between knee and head height at the given spot.
  blocked(px, pz, stepH, dx, dz, r) {
    const w = this.g.world, h = this.h, falling = this.g.bodies.list.length > 0;
    for (let s = -1; s <= 1; s++) {
      const x = px - dz * r * s * 0.8, z = pz + dx * r * s * 0.8;
      for (let k = 0; k < 5; k++) {
        const y = this.y + stepH + 1 + (h * 0.75 - stepH) * (k / 4);
        if (w.get(Math.floor(x), Math.floor(y), Math.floor(z)) || (falling && this.g.bodies.solidAt(x, y, z))) return true; // a building on its way down is in the way too
      }
    }
    return false;
  }
}

mixin(Monster, MonsterAir, MonsterBurrow);
