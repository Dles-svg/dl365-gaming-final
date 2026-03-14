import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { TokenPurchaseModal } from '../components/TokenPurchaseModal'
import { CardPurchase } from '../components/CardPurchase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showTokenModal, setShowTokenModal] = useState(false)
  const [showCardPurchase, setShowCardPurchase] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await signIn(email, password)
      navigate('/dashboard')
    } catch (err) {
      setError('Failed to sign in. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
        background: 'rgba(30, 41, 59, 0.5)',
        padding: '2.5rem',
        borderRadius: '1rem',
        border: '1px solid rgba(59, 130, 246, 0.2)'
      }}>
        <h2 style={{
          fontSize: '2rem',
          fontWeight: 'bold',
          marginBottom: '0.5rem',
          textAlign: 'center'
        }}>
          Welcome Back
        </h2>
        <p style={{
          color: '#e2e8f0',
          textAlign: 'center',
          marginBottom: '2rem'
        }}>
          Sign in to your Daylight ES365 account
        </p>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#fca5a5',
            padding: '0.75rem',
            borderRadius: '0.5rem',
            marginBottom: '1.5rem',
            fontSize: '0.875rem'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: '500'
            }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '0.5rem',
                border: '1px solid rgba(148, 163, 184, 0.3)',
                background: 'rgba(15, 23, 42, 0.5)',
                color: '#f1f5f9',
                fontSize: '1rem'
              }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: '500'
            }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '0.5rem',
                border: '1px solid rgba(148, 163, 184, 0.3)',
                background: 'rgba(15, 23, 42, 0.5)',
                color: '#f1f5f9',
                fontSize: '1rem'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '0.5rem',
              border: 'none',
              background: loading ? '#64748b' : 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
              color: 'white',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'transform 0.2s',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem'
            }}
          >
            {loading ? (
              'Signing in...'
            ) : (
              <>
                <img src="/1000125978.jpg" alt="DL365" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
                Sign In
                <img src="/1000125978.jpg" alt="DL365" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
              </>
            )}
          </button>
        </form>

        <p style={{
          textAlign: 'center',
          color: '#e2e8f0',
          fontSize: '0.875rem'
        }}>
          Don't have an account?{' '}
          <Link to="/register" style={{
            color: '#3b82f6',
            textDecoration: 'none',
            fontWeight: '600'
          }}>
            Register here
          </Link>
        </p>

        <div style={{
          marginTop: '1.5rem',
          paddingTop: '1.5rem',
          borderTop: '1px solid rgba(148, 163, 184, 0.2)',
          textAlign: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <img src="/1000125974.jpg" alt="DL365" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
            <button onClick={() => setShowTokenModal(true)} style={{
              display: 'inline-block',
              padding: '0.75rem 1.5rem',
              borderRadius: '0.5rem',
              background: 'linear-gradient(135deg, #14b8a6 0%, #06b6d4 100%)',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '600'
            }}>
              Buy DL365 Tokens
            </button>
            <img src="/1000125974.jpg" alt="DL365" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
          </div>
        </div>

        <div style={{
          marginTop: '1rem',
          textAlign: 'center'
        }}>
          <Link to="/" style={{
            color: '#64748b',
            textDecoration: 'none',
            fontSize: '0.875rem'
          }}>
            ← Back to Home
          </Link>
        </div>
      </div>

      {showTokenModal && (
        <TokenPurchaseModal
          onClose={() => setShowTokenModal(false)}
          onSelectPayment={(method) => {
            if (method === 'card') {
              setShowTokenModal(false)
              setShowCardPurchase(true)
            } else {
              window.open('https://apespace.io/bsc/0xa768ed990313a08ab706fd245319531c31f7e83d', '_blank')
              setShowTokenModal(false)
            }
          }}
        />
      )}

      {showCardPurchase && (
        <CardPurchase onClose={() => setShowCardPurchase(false)} />
      )}
    </div>
  )
}
