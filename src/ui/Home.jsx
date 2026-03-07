export function Home({ onPlayBot, onPlayOnline, onDeckForge, onSettings }) {
  const primaryBtn = {
    display: 'block', padding: '12px 40px', fontSize: '16px',
    fontFamily: 'monospace', background: '#e8a020', color: '#000',
    border: 'none', cursor: 'pointer', letterSpacing: '2px',
    fontWeight: 'bold', marginBottom: '12px', width: '220px',
  }
  const secondaryBtn = {
    display: 'block', padding: '10px 40px', fontSize: '14px',
    fontFamily: 'monospace', background: 'transparent', color: '#aaa',
    border: '1px solid #444', cursor: 'pointer', letterSpacing: '1px',
    marginBottom: '10px', width: '220px',
  }

  return (
    <div style={{ textAlign: 'center' }}>
      <h1 style={{ fontFamily: 'monospace', letterSpacing: '4px', marginBottom: '48px', fontSize: '28px' }}>
        ✦ SPELLFORGE ARENA ✦
      </h1>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <button style={primaryBtn} onClick={onPlayBot}>PLAY VS BOT</button>
        <button style={secondaryBtn} onClick={onPlayOnline}>PLAY ONLINE</button>
        <button style={secondaryBtn} onClick={onDeckForge}>DECK FORGE</button>
        <button style={secondaryBtn} onClick={onSettings}>SETTINGS</button>
      </div>
    </div>
  )
}
