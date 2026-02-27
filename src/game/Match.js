import { MATCH_DURATION } from '../config/constants.js'

export class Match {
  /**
   * @param {Player[]} players  [humanPlayer, botPlayer]
   */
  constructor(players) {
    this.players = players
    this.matchTimer = MATCH_DURATION
    this.matchOver = false
    this.winner = null   // 'player' | 'bot' | 'draw' | null
  }

  /**
   * Called each frame. Ticks the countdown and evaluates the win condition.
   * Sets matchOver + winner when the match ends.
   * @param {number} dt  seconds since last frame
   */
  update(dt) {
    if (this.matchOver) return

    // Instant-win: a player's HP reached 0
    const [p, bot] = this.players
    if (p.isDead) {
      this._end('bot')
      return
    }
    if (bot.isDead) {
      this._end('player')
      return
    }

    this.matchTimer -= dt
    if (this.matchTimer <= 0) {
      this.matchTimer = 0
      // Time-out: higher HP wins; equal HP → draw
      if (p.hp > bot.hp) {
        this._end('player')
      } else if (bot.hp > p.hp) {
        this._end('bot')
      } else {
        this._end('draw')
      }
    }
  }

  _end(result) {
    this.matchOver = true
    this.winner = result
  }
}
