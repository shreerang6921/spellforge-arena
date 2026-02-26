# Spellforge Arena — Claude Instructions

## Testing
- 90% minimum coverage on lines, statements, branches, and functions
- Run `yarn test` for tests, `yarn test:coverage` to verify thresholds
- Coverage scope: `src/game/**` and `src/config/**` only
- Every phase must pass coverage before the next phase begins
- Each spell and modifier tested individually

## Development
- Build phases in order — never skip or batch phases
- One spell at a time in Phase 5; test each before adding the next
- Full spec lives in `spec.md` — if it's not there, don't build it

## Code Patterns
- Physics positions are floats; `Math.round` only at render time
- Game logic is pure JS classes — no React inside `src/game/`
- State machine transitions: `player.setState('stateName')`
- Input is set externally on `player.input` — states just read it

## Package Manager
- Always use `yarn`, never `npm`
