import { RESOLUTION_W, RESOLUTION_H } from '../config/constants.js'

export class InputHandler {
  constructor(canvas, player, keybindings) {
    this.canvas = canvas
    this.player = player
    this.mouse = { x: 0, y: 0 }   // in game coords

    this.keys = {
      up:    keybindings?.up    ?? 'KeyW',
      down:  keybindings?.down  ?? 'KeyS',
      left:  keybindings?.left  ?? 'KeyA',
      right: keybindings?.right ?? 'KeyD',
    }

    this._onKeyDown = this._onKeyDown.bind(this)
    this._onKeyUp   = this._onKeyUp.bind(this)
    this._onMouseMove = this._onMouseMove.bind(this)

    window.addEventListener('keydown', this._onKeyDown)
    window.addEventListener('keyup',   this._onKeyUp)
    canvas.addEventListener('mousemove', this._onMouseMove)
  }

  _onKeyDown(e) {
    this._setKey(e.code, true)
  }

  _onKeyUp(e) {
    this._setKey(e.code, false)
  }

  _setKey(code, value) {
    if (code === this.keys.up)    this.player.input.up    = value
    if (code === this.keys.down)  this.player.input.down  = value
    if (code === this.keys.left)  this.player.input.left  = value
    if (code === this.keys.right) this.player.input.right = value
  }

  _onMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect()
    // Map screen coords → internal game coords
    const scaleX = RESOLUTION_W / rect.width
    const scaleY = RESOLUTION_H / rect.height
    this.mouse.x = Math.round((e.clientX - rect.left) * scaleX)
    this.mouse.y = Math.round((e.clientY - rect.top)  * scaleY)
  }

  destroy() {
    window.removeEventListener('keydown', this._onKeyDown)
    window.removeEventListener('keyup',   this._onKeyUp)
    this.canvas.removeEventListener('mousemove', this._onMouseMove)
  }
}
