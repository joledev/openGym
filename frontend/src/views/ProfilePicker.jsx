import { useEffect } from 'react'
import { PROFILES, setActiveProfile } from '../lib/profiles.js'
import { BrandMark } from '../components/BrandLogo.jsx'
import { hideBoot } from '../lib/boot.js'

// The front door for a two-person install. No password: the picker chooses whose
// storage namespace the app boots into. A reload is deliberate — it lets the
// store, the media backend and the pairing file all start under the new slot.
export default function ProfilePicker() {
  useEffect(() => { hideBoot() }, [])
  const choose = id => {
    setActiveProfile(id)
    window.location.reload()
  }
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 26, padding: 24,
      background: 'var(--bg, #0c0e12)', color: 'var(--text, #f2f2f2)',
    }}>
      <BrandMark height={32} />
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: 26, margin: '0 0 8px' }}>¿Quién entrena hoy?</h1>
        <p style={{ margin: 0, opacity: 0.7, fontSize: 15 }}>
          Elige tu perfil. Rutinas, pesos y récords quedan separados.
        </p>
      </div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
        {PROFILES.map(p => (
          <button
            key={p.id}
            onClick={() => choose(p.id)}
            aria-label={`Entrar como ${p.name}`}
            style={{
              width: 150, minHeight: 170, borderRadius: 20, padding: 16,
              border: '1px solid rgba(255,255,255,.12)', background: 'var(--card, #161a20)',
              color: 'inherit', display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 12, cursor: 'pointer',
            }}
          >
            <span aria-hidden="true" style={{
              width: 64, height: 64, borderRadius: '50%', background: 'var(--accent, #b6f36b)',
              color: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, fontWeight: 700,
            }}>{p.name[0]}</span>
            <span style={{ fontSize: 20, fontWeight: 600 }}>{p.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
