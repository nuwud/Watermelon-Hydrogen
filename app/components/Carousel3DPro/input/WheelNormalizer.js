// WheelNormalizer: converts raw wheel deltas into discrete, de-bounced impulses
// Usage: const normalizer = new WheelNormalizer(opts, (sign)=>{ ...carousel.applyImpulse(sign) })
// opts: { sensitivity, thresholdPx, maxBurst }
export class WheelNormalizer {
  constructor(opts, onImpulse) {
    this.sensitivity = opts.sensitivity;
    this.thresholdPx = opts.thresholdPx;
    this.maxBurst = opts.maxBurst;
    this.onImpulse = onImpulse;
    this.acc = 0;
  }
  _emit(sign, count) {
    // Schedule microtasks to keep UI responsive; avoid setTimeout for determinism
    for (let i = 0; i < count; i++) {
      queueMicrotask(() => this.onImpulse(sign));
    }
  }
  handleEvent(e) {
    // Normalize deltaMode (0=pixel,1=line,2=page) => approximate pixel delta
    const lineHeight = 16; // heuristic; acceptable for detent estimate
    let dy = e.deltaY;
    if (e.deltaMode === 1) dy *= lineHeight;
    else if (e.deltaMode === 2) dy *= window.innerHeight;
    this.acc += dy * this.sensitivity;
    const abs = Math.abs(this.acc);
    if (abs >= this.thresholdPx) {
      let n = Math.floor(abs / this.thresholdPx);
      if (n > this.maxBurst) n = this.maxBurst;
      const sign = Math.sign(this.acc) || 1;
      this.acc = this.acc % this.thresholdPx; // retain remainder for smoothness
      this._emit(sign, n);
    }
  }
}
