/**
 * LoopManager
 * ───────────
 * Owns the requestAnimationFrame loop.
 * Provides:
 *  - start(onFrame)  — begin the loop, calling onFrame(dt, elapsed) each tick
 *  - stop()          — cancel RAF
 *  - elapsed         — total seconds since start
 *
 * Delta-time is capped at 50 ms to prevent physics explosions on tab-switch.
 */

export class LoopManager {
  _rafId    = null
  _lastTime = 0
  elapsed   = 0

  /**
   * @param {(dt: number, elapsed: number) => void} onFrame
   */
  start(onFrame) {
    this._lastTime = performance.now()

    const tick = (now) => {
      this._rafId = requestAnimationFrame(tick)
      const dt = Math.min((now - this._lastTime) / 1000, 0.05)
      this._lastTime = now
      this.elapsed  += dt
      onFrame(dt, this.elapsed)
    }

    this._rafId = requestAnimationFrame(tick)
  }

  stop() {
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId)
      this._rafId = null
    }
  }
}

export default new LoopManager()
