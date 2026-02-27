const STORAGE_KEY = 'spellforge-keybindings'

export const DEFAULT_KEYBINDINGS = {
  up:     'KeyW',
  down:   'KeyS',
  left:   'KeyA',
  right:  'KeyD',
  spell1: 'Digit1',
  spell2: 'Digit2',
  spell3: 'Digit3',
  spell4: 'Digit4',
  spell5: 'Digit5',
  spell6: 'Digit6',
  spell7: 'Digit7',
  spell8: 'Digit8',
}

export function loadKeybindings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...DEFAULT_KEYBINDINGS, ...JSON.parse(raw) }
  } catch {
    // corrupted — ignore
  }
  return { ...DEFAULT_KEYBINDINGS }
}

export function saveKeybindings(bindings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bindings))
}
