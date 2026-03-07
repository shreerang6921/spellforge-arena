export class GameLoop {
  constructor(engine, renderer, ctx) {
    this.engine = engine
    this.renderer = renderer
    this.ctx = ctx
    this.running = false
    this._rafId = null
    this._lastTime = 0
  }

  start() {
    if (this.running) return
    this.running = true
    this._lastTime = performance.now()
    this._loop(this._lastTime)
  }

  stop() {
    this.running = false
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId)
      this._rafId = null
    }
  }

  _loop(timestamp) {
    if (!this.running) return
    const dt = Math.min((timestamp - this._lastTime) / 1000, 0.05)
    this._lastTime = timestamp
    this.engine.update(dt)
    this.renderer.render(this.ctx, this.engine)
    this._rafId = requestAnimationFrame((ts) => this._loop(ts))
  }
}
