import { describe, it, expect, beforeEach } from 'vitest'
import { StateMachine } from '../game/StateMachine.js'

class MockState {
  constructor(name) {
    this.name = name
    this.enterCount = 0
    this.exitCount  = 0
    this.updateCount = 0
  }
  enter()      { this.enterCount++ }
  exit()       { this.exitCount++ }
  update(_dt)  { this.updateCount++ }
}

describe('StateMachine', () => {
  let sm, stateA, stateB

  beforeEach(() => {
    sm     = new StateMachine()
    stateA = new MockState('a')
    stateB = new MockState('b')
  })

  it('starts with no current state', () => {
    expect(sm.currentState).toBeNull()
    expect(sm.name).toBeNull()
  })

  it('calls enter() on the first state', () => {
    sm.setState(stateA)
    expect(stateA.enterCount).toBe(1)
    expect(sm.name).toBe('a')
  })

  it('calls exit() on old state and enter() on new state when transitioning', () => {
    sm.setState(stateA)
    sm.setState(stateB)
    expect(stateA.exitCount).toBe(1)
    expect(stateB.enterCount).toBe(1)
    expect(sm.name).toBe('b')
  })

  it('does NOT call enter/exit if transitioning to the same state', () => {
    sm.setState(stateA)
    sm.setState(stateA)
    expect(stateA.enterCount).toBe(1)
    expect(stateA.exitCount).toBe(0)
  })

  it('calls update() on the current state', () => {
    sm.setState(stateA)
    sm.update(0.016)
    sm.update(0.016)
    expect(stateA.updateCount).toBe(2)
  })

  it('does nothing on update() with no state', () => {
    expect(() => sm.update(0.016)).not.toThrow()
  })
})
