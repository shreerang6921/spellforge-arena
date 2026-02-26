export class StateMachine {
  constructor() {
    this.currentState = null
  }

  setState(newState) {
    if (this.currentState === newState) return
    if (this.currentState) this.currentState.exit()
    this.currentState = newState
    this.currentState.enter()
  }

  update(dt) {
    if (this.currentState) this.currentState.update(dt)
  }

  get name() {
    return this.currentState ? this.currentState.name : null
  }
}
