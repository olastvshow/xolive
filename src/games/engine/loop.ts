export const FIXED_STEP = 1 / 120;
export class FixedLoop {
  accumulator = 0;
  paused = false;
  stop = 0;
  advance(delta: number, step: (dt: number) => void) {
    if (this.paused) { this.accumulator = 0; return 0; }
    const dt = Math.min(.25, Math.max(0, delta));
    if (this.stop > 0) { this.stop = Math.max(0, this.stop - dt); return this.accumulator / FIXED_STEP; }
    this.accumulator += dt;
    while (this.accumulator >= FIXED_STEP) { step(FIXED_STEP); this.accumulator -= FIXED_STEP; }
    return this.accumulator / FIXED_STEP;
  }
  visibility() {
    const update = () => { this.paused = document.hidden; this.accumulator = 0; };
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }
}
