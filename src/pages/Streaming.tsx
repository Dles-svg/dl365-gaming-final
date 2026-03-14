import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useStreaming } from '../hooks/useStreaming'
import { supabase } from '../lib/supabase'
import BroadcasterView from '../components/BroadcasterView'
import StreamViewer from '../components/StreamViewer'
import { TokenPurchaseModal } from '../components/TokenPurchaseModal'
import { CardPurchase } from '../components/CardPurchase'

export default function Streaming() {
  const { user, signOut } = useAuth()
  const { liveStreams, loading } = useStreaming()
  const [view, setView] = useState<'list' | 'broadcast' | 'watch'>('list')
  const [selectedStream, setSelectedStream] = useState<any>(null)
  const [userRole, setUserRole] = useState<'Miner' | 'Gamer'>('Gamer')
  const [showTokenModal, setShowTokenModal] = useState(false)
  const [showCardPurchase, setShowCardPurchase] = useState(false)

  useEffect(() => {
    if (user) {
      loadUserProfile()
    }
  }, [user])

  const loadUserProfile = async () => {
    if (!user) return

    const { data, error } = await supabase
      .from('user_profiles')
      .select('user_role')
      .eq('id', user.id)
      .maybeSingle()

    if (!error && data) {
      setUserRole(data.user_role)
    }
  }

  const handleWatchStream = (stream: any) => {
    setSelectedStream(stream)
    setView('watch')
  }

  const handleBackToList = () => {
    setView('list')
    setSelectedStream(null)
  }

  if (view === 'broadcast') {
    return (
      <div style={{ minHeight: '100vh' }}>
        <BroadcasterView
          streamType={userRole === 'Miner' ? 'mining' : 'gaming'}
          onBack={handleBackToList}
        />
      </div>
    )
  }

  if (view === 'watch' && selectedStream) {
    return (
      <div style={{ minHeight: '100vh' }}>
        <StreamViewer
          stream={selectedStream}
          onBack={handleBackToList}
        />
      </div>
    )
  }

  const streamType = userRole === 'Miner' ? 'mining' : 'gaming'
  const filteredStreams = liveStreams.filter(s => s.stream_type === streamType)

  return (
    <div style={{ minHeight: '100vh' }}>
      <header style={{
        padding: '1.5rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'rgba(15, 23, 42, 0.8)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <Link to="/dashboard" style={{
          fontSize: '1.5rem',
          fontWeight: 'bold',
          background: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          textDecoration: 'none'
        }}>
          Daylight ES365
        </Link>
        <nav style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <Link to="/" style={{
            color: '#f1f5f9',
            textDecoration: 'none',
            padding: '0.5rem 1rem',
            fontWeight: '600'
          }}>
            ← Home
          </Link>
          <Link to="/dashboard" style={{
            color: '#f1f5f9',
            textDecoration: 'none',
            padding: '0.5rem 1rem'
          }}>
            Dashboard
          </Link>
          <Link to="/games" style={{
            color: '#f1f5f9',
            textDecoration: 'none',
            padding: '0.5rem 1rem'
          }}>
            Games
          </Link>
          <Link to="/compute" style={{
            color: '#f1f5f9',
            textDecoration: 'none',
            padding: '0.5rem 1rem'
          }}>
            Compute
          </Link>
          <Link to="/wallet" style={{
            color: '#f1f5f9',
            textDecoration: 'none',
            padding: '0.5rem 1rem'
          }}>
            Wallet
          </Link>
          <button
            onClick={signOut}
            style={{
              padding: '0.5rem 1.5rem',
              borderRadius: '0.5rem',
              border: '1px solid rgba(239, 68, 68, 0.5)',
              background: 'transparent',
              color: '#fca5a5',
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}
          >
            Sign Out
          </button>
        </nav>
      </header>

      <main style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{
              fontSize: '2.5rem',
              fontWeight: 'bold',
              marginBottom: '0.5rem'
            }}>
              {userRole === 'Miner' ? 'Mining Streams' : 'Gaming Streams'}
            </h1>
            <p style={{
              color: '#94a3b8',
              fontSize: '1.125rem'
            }}>
              {userRole === 'Miner'
                ? 'Stream your mining operations and watch other miners'
                : 'Stream your gameplay and watch other gamers'}
            </p>
            <div style={{
              marginTop: '0.5rem',
              padding: '0.5rem 1rem',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              borderRadius: '0.5rem',
              display: 'inline-block'
            }}>
              <span style={{ color: '#10b981', fontSize: '0.875rem', fontWeight: '600' }}>
                Using Google STUN Servers + WebRTC
              </span>
            </div>
          </div>
          <button
            onClick={() => setView('broadcast')}
            style={{
              padding: '1rem 2rem',
              borderRadius: '0.5rem',
              border: 'none',
              background: 'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)',
              color: 'white',
              cursor: 'pointer',
              fontSize: '1.125rem',
              fontWeight: '600',
              boxShadow: '0 4px 6px rgba(16, 185, 129, 0.3)'
            }}
          >
            Start Broadcasting
          </button>
        </div>

        <div>
          <h2 style={{
            fontSize: '1.75rem',
            fontWeight: '600',
            marginBottom: '1.5rem'
          }}>
            Live Now
          </h2>
          {loading ? (
            <p style={{ color: '#94a3b8' }}>Loading streams...</p>
          ) : filteredStreams.length === 0 ? (
            <div style={{
              background: 'rgba(30, 41, 59, 0.5)',
              padding: '3rem',
              borderRadius: '1rem',
              border: '1px solid rgba(148, 163, 184, 0.2)',
              textAlign: 'center'
            }}>
              <p style={{
                color: '#94a3b8',
                fontSize: '1.125rem'
              }}>
                No live {userRole === 'Miner' ? 'mining' : 'gaming'} streams at the moment. Be the first to go live!
              </p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
              gap: '1.5rem'
            }}>
              {filteredStreams.map((stream) => (
                <div
                  key={stream.id}
                  style={{
                    background: 'rgba(30, 41, 59, 0.5)',
                    borderRadius: '1rem',
                    border: '2px solid #ef4444',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    transition: 'transform 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  onClick={() => handleWatchStream(stream)}
                >
                  <div style={{
                    background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                    height: '200px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative'
                  }}>
                    <span style={{
                      position: 'absolute',
                      top: '1rem',
                      left: '1rem',
                      padding: '0.5rem 1rem',
                      borderRadius: '0.5rem',
                      background: '#ef4444',
                      color: 'white',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      <span style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: 'white'
                      }} />
                      LIVE
                    </span>
                    <div style={{
                      fontSize: '3rem'
                    }}>
                      {stream.stream_type === 'mining' ? '⛏️' : '🎮'}
                    </div>
                  </div>
                  <div style={{ padding: '1.5rem' }}>
                    <h3 style={{
                      fontSize: '1.25rem',
                      fontWeight: '600',
                      marginBottom: '0.5rem'
                    }}>
                      {stream.stream_title}
                    </h3>
                    <p style={{
                      color: '#94a3b8',
                      marginBottom: '1rem',
                      fontSize: '0.875rem'
                    }}>
                      {stream.stream_description || 'No description'}
                    </p>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <span style={{
                        color: '#64748b',
                        fontSize: '0.875rem'
                      }}>
                        {stream.viewers} viewers
                      </span>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '0.5rem',
                        background: 'rgba(16, 185, 129, 0.1)',
                        color: '#10b981',
                        fontSize: '0.75rem',
                        fontWeight: '600'
                      }}>
                        FREE
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{
          marginTop: '3rem',
          paddingTop: '2rem',
          borderTop: '1px solid rgba(148, 163, 184, 0.2)',
          textAlign: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
            <img src="/1000125978.jpg" alt="DL365" style={{ width: '200px', height: 'auto', objectFit: 'contain' }} />
          </div>
          <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center' }}>
            <button onClick={() => setShowTokenModal(true)} style={{
              display: 'inline-block',
              padding: '0.75rem 1.5rem',
              borderRadius: '0.5rem',
              background: 'linear-gradient(135deg, #14b8a6 0%, #06b6d4 100%)',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: '600',
              boxShadow: '0 4px 6px rgba(20, 184, 166, 0.3)'
            }}>
              Buy DL365 Tokens
            </button>
          </div>
        </div>
      </main>

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
