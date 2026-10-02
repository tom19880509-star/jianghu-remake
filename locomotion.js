// Copyright 2026 Tom (tom19880509-star)
// SPDX-License-Identifier: Apache-2.0
// Attribution: Jianghu Remake / 江湖重绘, created and directed by Tom.
// Visual positions only. Collision, event triggers, saves and tile costs stay in Lua.
export class StepMotion {
  target = null;
  from = null;
  started = 0;
  duration = 110;
  update(next, now) {
    const old = this.target;
    const distance = old ? Math.abs(next.x - old.x) + Math.abs(next.y - old.y) : 0;
    // 主角走路贴图 2501-2528，乘船贴图 3715-3730（CC.BoatStartPic=3715 + 方向*4 + 帧）
    const smooth = (next.pic >= 2501 && next.pic < 2529) || (next.pic >= 3715 && next.pic < 3731);
    if (!old || old.map !== next.map || distance > 1 || !smooth) {
      this.target = {...next, travel:0}; this.from = null; return;
    }
    if (!distance) {
      // Scripted camera cuts and map transitions are immediate, not walking.
      if (next.cx !== old.cx || next.cy !== old.cy) this.from = null;
      this.target = {...next, travel:old.travel}; return;
    }
    const display = this.sample(now);
    this.duration = this.started ? Math.min(150, Math.max(65, now - this.started)) : 110;
    this.from = display;
    this.started = now;
    this.target = {...next, travel:old.travel + distance};
  }
  clear() { this.target = this.from = null; this.started = 0; }
  sample(now) {
    if (!this.target) return null;
    const t = this.from ? Math.min(1, Math.max(0, (now - this.started) / this.duration)) : 1;
    const result = {...this.target, active:t < 1};
    if (this.from) for (const k of ["x","y","cx","cy","travel"])
      result[k] = this.from[k] + (this.target[k] - this.from[k]) * t;
    result.phase = (result.travel % 2) / 2;
    return result;
  }
}
