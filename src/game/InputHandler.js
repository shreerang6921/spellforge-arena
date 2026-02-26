import { RESOLUTION_W, RESOLUTION_H } from '../config/constants.js'

const SPELL_KEYS = ['Digit1','Digit2','Digit3','Digit4','Digit5','Digit6','Digit7','Digit8']

export class InputHandler {
  static SPELL_KEYS = SPELL_KEYS
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

    this._onKeyDown   = this._onKeyDown.bind(this)
    this._onKeyUp     = this._onKeyUp.bind(this)
    this._onMouseMove = this._onMouseMove.bind(this)
    this._onMouseDown = this._onMouseDown.bind(this)
    this._onMouseUp   = this._onMouseUp.bind(this)

    window.addEventListener('keydown', this._onKeyDown)
    window.addEventListener('keyup',   this._onKeyUp)
    canvas.addEventListener('mousemove', this._onMouseMove)
    canvas.addEventListener('mousedown', this._onMouseDown)
    canvas.addEventListener('mouseup',   this._onMouseUp)
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

    const slot = InputHandler.SPELL_KEYS.indexOf(code)
    if (slot !== -1) this.player.input.spellSlots[slot] = value
  }

  _onMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect()
    // Map screen coords → internal game coords
    const scaleX = RESOLUTION_W / rect.width
    const scaleY = RESOLUTION_H / rect.height
    this.mouse.x = Math.round((e.clientX - rect.left) * scaleX)
    this.mouse.y = Math.round((e.clientY - rect.top)  * scaleY)
  }

  _onMouseDown(e) {
    if (e.button === 0) this.player.input.attack = true
  }

  _onMouseUp(e) {
    if (e.button === 0) this.player.input.attack = false
  }

  destroy() {
    window.removeEventListener('keydown', this._onKeyDown)
    window.removeEventListener('keyup',   this._onKeyUp)
    this.canvas.removeEventListener('mousemove', this._onMouseMove)
    this.canvas.removeEventListener('mousedown', this._onMouseDown)
    this.canvas.removeEventListener('mouseup',   this._onMouseUp)
  }
}
