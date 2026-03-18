'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
      backgroundImage: 'radial-gradient(ellipse at 50% 0%, #7c3aed22 0%, transparent 60%)'
    }}>
      <div style={{
        width: 420,
        padding: '48px',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        boxShadow: '0 0 80px #7c3aed22',
        animation: 'fadeIn 0.4s ease'
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 52, marginBottom: 12 }}>⚔️</div>
          <h1 style={{
            fontSize: 28, fontWeight: 800,
            color: 'var(--text)', fontFamily: 'Syne',
            letterSpacing: '-0.5px'
          }}>KamiGit</h1>
          <p style={{
            color: 'var(--text2)', marginTop: 6,
            fontSize: 13, fontFamily: 'Space Mono'
          }}>Developer Assistant Dashboard</p>
        </div>

        <form onSubmit={handleLogin}>
          {/* Email */}
          <div style={{ marginBottom: 18 }}>
            <label style={{
              display: 'block', color: 'var(--text2)', fontSize: 11,
              fontFamily: 'Space Mono', marginBottom: 8,
              textTransform: 'uppercase', letterSpacing: 1.5
            }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              style={{
                width: '100%', padding: '12px 16px',
                background: 'var(--surface2)',
                border: '1px solid var(--border)',
                borderRadius: 8, color: 'var(--text)',
                fontSize: 14, outline: 'none',
                fontFamily: 'Syne', transition: 'border 0.2s'
              }}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: 28 }}>
            <label style={{
              display: 'block', color: 'var(--text2)', fontSize: 11,
              fontFamily: 'Space Mono', marginBottom: 8,
              textTransform: 'uppercase', letterSpacing: 1.5
            }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              style={{
                width: '100%', padding: '12px 16px',
                background: 'var(--surface2)',
                border: '1px solid var(--border)',
                borderRadius: 8, color: 'var(--text)',
                fontSize: 14, outline: 'none',
                fontFamily: 'Syne', transition: 'border 0.2s'
              }}
            />
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: '#ff446618', border: '1px solid var(--red)',
              borderRadius: 8, padding: '12px 16px', marginBottom: 20,
              color: 'var(--red)', fontSize: 13, fontFamily: 'Space Mono'
            }}>{error}</div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '14px',
              background: loading ? 'var(--surface2)' : 'var(--accent)',
              color: loading ? 'var(--text2)' : '#000',
              border: 'none', borderRadius: 8,
              fontSize: 15, fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'Syne', transition: 'all 0.2s',
              letterSpacing: '0.3px'
            }}
          >
            {loading ? 'Signing in...' : 'Sign In →'}
          </button>
        </form>

        <p style={{
          textAlign: 'center', marginTop: 24,
          color: 'var(--text2)', fontSize: 12,
          fontFamily: 'Space Mono'
        }}>
          kami-claw · KamiGit v2026
        </p>
      </div>
    </div>
  )
}
