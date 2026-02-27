import { describe, it, expect, beforeEach } from 'vitest'
import { DEFAULT_KEYBINDINGS, loadKeybindings, saveKeybindings } from '../config/keybindings.js'

describe('DEFAULT_KEYBINDINGS', () => {
  it('has correct movement defaults', () => {
    expect(DEFAULT_KEYBINDINGS.up).toBe('KeyW')
    expect(DEFAULT_KEYBINDINGS.down).toBe('KeyS')
    expect(DEFAULT_KEYBINDINGS.left).toBe('KeyA')
    expect(DEFAULT_KEYBINDINGS.right).toBe('KeyD')
  })

  it('has correct spell slot defaults', () => {
    expect(DEFAULT_KEYBINDINGS.spell1).toBe('Digit1')
    expect(DEFAULT_KEYBINDINGS.spell2).toBe('Digit2')
    expect(DEFAULT_KEYBINDINGS.spell8).toBe('Digit8')
  })
})

describe('loadKeybindings', () => {
  beforeEach(() => localStorage.clear())

  it('returns defaults when nothing stored', () => {
    expect(loadKeybindings()).toEqual(DEFAULT_KEYBINDINGS)
  })

  it('returns stored value when present', () => {
    const custom = { ...DEFAULT_KEYBINDINGS, up: 'ArrowUp' }
    localStorage.setItem('spellforge-keybindings', JSON.stringify(custom))
    expect(loadKeybindings()).toEqual(custom)
  })

  it('returns defaults when localStorage is corrupted', () => {
    localStorage.setItem('spellforge-keybindings', 'not-json')
    expect(loadKeybindings()).toEqual(DEFAULT_KEYBINDINGS)
  })

  it('merges stored partial with defaults — missing keys fall back', () => {
    localStorage.setItem('spellforge-keybindings', JSON.stringify({ up: 'ArrowUp' }))
    const result = loadKeybindings()
    expect(result.up).toBe('ArrowUp')
    expect(result.down).toBe('KeyS')
    expect(result.spell1).toBe('Digit1')
  })
})

describe('saveKeybindings', () => {
  beforeEach(() => localStorage.clear())

  it('stores keybindings in localStorage', () => {
    const custom = { ...DEFAULT_KEYBINDINGS, up: 'ArrowUp' }
    saveKeybindings(custom)
    const stored = JSON.parse(localStorage.getItem('spellforge-keybindings'))
    expect(stored).toEqual(custom)
  })
})
