import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Downloads() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const handleDownload = () => {
    // GitHub repository for releases
    const repoUrl = 'https://github.com/Dles-svg/DL365-WEBSITE'

    // Open the releases page - apps will be available after first build
    window.open(`${repoUrl}/releases`, '_blank')
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)' }}>
      <header style={{
        padding: '1.5rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(0, 0, 0, 0.08)'
      }}>
        <div style={{
          fontSize: '1.5rem',
          fontWeight: 'bold',
          background: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          Daylight ES365
        </div>
        <nav style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button
            onClick={() => navigate('/')}
            style={{
              color: '#1e5a96',
              fontWeight: '600',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '0.5rem 1rem',
              fontSize: '1rem'
            }}
          >
            ← Home
          </button>
          {user && (
            <button
              onClick={() => navigate('/dashboard')}
              style={{
                color: '#1e5a96',
                fontWeight: '600',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '0.5rem 1rem',
                fontSize: '1rem'
              }}
            >
              Dashboard
            </button>
          )}
        </nav>
      </header>

      <main style={{ padding: '4rem 2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1 style={{
            fontSize: '3rem',
            fontWeight: 'bold',
            marginBottom: '1rem',
            background: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            Download Desktop Apps
          </h1>
          <p style={{
            fontSize: '1.25rem',
            color: '#64748b',
            maxWidth: '600px',
            margin: '0 auto'
          }}>
            Get the full Daylight ES365 experience with our native desktop applications for Windows, macOS, and Linux
          </p>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, rgba(251, 146, 60, 0.1) 0%, rgba(234, 88, 12, 0.1) 100%)',
          border: '2px solid rgba(251, 146, 60, 0.3)',
          borderRadius: '1rem',
          padding: '1.5rem',
          marginBottom: '2rem',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚠️</div>
          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            color: '#ea580c',
            marginBottom: '0.5rem'
          }}>
            Desktop Apps Coming Soon
          </h3>
          <p style={{
            color: '#64748b',
            fontSize: '1rem',
            maxWidth: '700px',
            margin: '0 auto'
          }}>
            The desktop applications are currently being built. Click the download buttons below to check our GitHub releases page for availability.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: '2rem',
          marginBottom: '3rem'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '1rem',
            padding: '2.5rem',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
            border: '2px solid rgba(59, 130, 246, 0.2)',
            transition: 'transform 0.3s, box-shadow 0.3s'
          }}>
            <div style={{
              fontSize: '4rem',
              marginBottom: '1rem',
              textAlign: 'center'
            }}>
              🎮
            </div>
            <h2 style={{
              fontSize: '2rem',
              fontWeight: 'bold',
              color: '#3b82f6',
              marginBottom: '1rem',
              textAlign: 'center'
            }}>
              E-Gamer App
            </h2>
            <p style={{
              color: '#64748b',
              fontSize: '1rem',
              marginBottom: '1.5rem',
              textAlign: 'center',
              lineHeight: '1.6'
            }}>
              Stream your gameplay to the platform. Share your gaming sessions with miners who provide the compute power.
            </p>

            <div style={{
              background: '#f8fafc',
              padding: '1.5rem',
              borderRadius: '0.75rem',
              marginBottom: '1.5rem'
            }}>
              <h3 style={{
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#1f2937',
                marginBottom: '1rem'
              }}>
                Features:
              </h3>
              <ul style={{
                listStyle: 'none',
                padding: 0,
                margin: 0,
                color: '#475569',
                fontSize: '0.875rem',
                lineHeight: '1.8'
              }}>
                <li>✓ Screen & window capture</li>
                <li>✓ Live WebRTC streaming</li>
                <li>✓ Viewer count tracking</li>
                <li>✓ Chat with miners</li>
                <li>✓ Stream management dashboard</li>
              </ul>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button
                onClick={handleDownload}
                style={{
                  display: 'block',
                  padding: '1rem',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  color: 'white',
                  textAlign: 'center',
                  borderRadius: '0.5rem',
                  fontWeight: '600',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'transform 0.2s',
                  width: '100%',
                  fontSize: '1rem'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                🪟 Download for Windows
              </button>
              <button
                onClick={handleDownload}
                style={{
                  display: 'block',
                  padding: '1rem',
                  background: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
                  color: 'white',
                  textAlign: 'center',
                  borderRadius: '0.5rem',
                  fontWeight: '600',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'transform 0.2s',
                  width: '100%',
                  fontSize: '1rem'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                🍎 Download for macOS
              </button>
              <button
                onClick={handleDownload}
                style={{
                  display: 'block',
                  padding: '1rem',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  color: 'white',
                  textAlign: 'center',
                  borderRadius: '0.5rem',
                  fontWeight: '600',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'transform 0.2s',
                  width: '100%',
                  fontSize: '1rem'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                🐧 Download for Linux
              </button>
            </div>
          </div>

          <div style={{
            background: 'white',
            borderRadius: '1rem',
            padding: '2.5rem',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
            border: '2px solid rgba(251, 146, 60, 0.2)',
            transition: 'transform 0.3s, box-shadow 0.3s'
          }}>
            <div style={{
              fontSize: '4rem',
              marginBottom: '1rem',
              textAlign: 'center'
            }}>
              ⛏️
            </div>
            <h2 style={{
              fontSize: '2rem',
              fontWeight: 'bold',
              color: '#fb923c',
              marginBottom: '1rem',
              textAlign: 'center'
            }}>
              Miner App
            </h2>
            <p style={{
              color: '#64748b',
              fontSize: '1rem',
              marginBottom: '1.5rem',
              textAlign: 'center',
              lineHeight: '1.6'
            }}>
              Watch game streams and rent your equipment to gamers. Earn DL365 tokens by providing compute resources.
            </p>

            <div style={{
              background: '#f8fafc',
              padding: '1.5rem',
              borderRadius: '0.75rem',
              marginBottom: '1.5rem'
            }}>
              <h3 style={{
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#1f2937',
                marginBottom: '1rem'
              }}>
                Features:
              </h3>
              <ul style={{
                listStyle: 'none',
                padding: 0,
                margin: 0,
                color: '#475569',
                fontSize: '0.875rem',
                lineHeight: '1.8'
              }}>
                <li>✓ Browse available streams</li>
                <li>✓ Watch live gameplay</li>
                <li>✓ Real-time chat</li>
                <li>✓ Resource monitoring</li>
                <li>✓ Earnings dashboard</li>
              </ul>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button
                onClick={handleDownload}
                style={{
                  display: 'block',
                  padding: '1rem',
                  background: 'linear-gradient(135deg, #fb923c 0%, #f97316 100%)',
                  color: 'white',
                  textAlign: 'center',
                  borderRadius: '0.5rem',
                  fontWeight: '600',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'transform 0.2s',
                  width: '100%',
                  fontSize: '1rem'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                🪟 Download for Windows
              </button>
              <button
                onClick={handleDownload}
                style={{
                  display: 'block',
                  padding: '1rem',
                  background: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
                  color: 'white',
                  textAlign: 'center',
                  borderRadius: '0.5rem',
                  fontWeight: '600',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'transform 0.2s',
                  width: '100%',
                  fontSize: '1rem'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                🍎 Download for macOS
              </button>
              <button
                onClick={handleDownload}
                style={{
                  display: 'block',
                  padding: '1rem',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  color: 'white',
                  textAlign: 'center',
                  borderRadius: '0.5rem',
                  fontWeight: '600',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'transform 0.2s',
                  width: '100%',
                  fontSize: '1rem'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                🐧 Download for Linux
              </button>
            </div>
          </div>
        </div>

        <div style={{
          background: 'white',
          borderRadius: '1rem',
          padding: '2.5rem',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
          border: '1px solid rgba(148, 163, 184, 0.2)'
        }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: 'bold',
            color: '#1f2937',
            marginBottom: '1.5rem'
          }}>
            📡 How It Works
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '2rem'
          }}>
            <div>
              <div style={{
                fontSize: '2rem',
                marginBottom: '0.5rem',
                color: '#3b82f6'
              }}>
                1️⃣
              </div>
              <h3 style={{
                fontSize: '1.125rem',
                fontWeight: '600',
                color: '#1f2937',
                marginBottom: '0.5rem'
              }}>
                Download & Install
              </h3>
              <p style={{
                color: '#64748b',
                fontSize: '0.875rem',
                lineHeight: '1.6'
              }}>
                Choose your app (Gamer or Miner) and download for your operating system. Install just like any desktop application.
              </p>
            </div>

            <div>
              <div style={{
                fontSize: '2rem',
                marginBottom: '0.5rem',
                color: '#10b981'
              }}>
                2️⃣
              </div>
              <h3 style={{
                fontSize: '1.125rem',
                fontWeight: '600',
                color: '#1f2937',
                marginBottom: '0.5rem'
              }}>
                Login & Setup
              </h3>
              <p style={{
                color: '#64748b',
                fontSize: '0.875rem',
                lineHeight: '1.6'
              }}>
                Use your www.dles365.co account credentials to sign in. Your profile and settings sync automatically.
              </p>
            </div>

            <div>
              <div style={{
                fontSize: '2rem',
                marginBottom: '0.5rem',
                color: '#f59e0b'
              }}>
                3️⃣
              </div>
              <h3 style={{
                fontSize: '1.125rem',
                fontWeight: '600',
                color: '#1f2937',
                marginBottom: '0.5rem'
              }}>
                Start Streaming
              </h3>
              <p style={{
                color: '#64748b',
                fontSize: '0.875rem',
                lineHeight: '1.6'
              }}>
                Gamers: Start broadcasting. Miners: Browse and watch streams. Connect using miner codes for P2P streaming.
              </p>
            </div>

            <div>
              <div style={{
                fontSize: '2rem',
                marginBottom: '0.5rem',
                color: '#ef4444'
              }}>
                4️⃣
              </div>
              <h3 style={{
                fontSize: '1.125rem',
                fontWeight: '600',
                color: '#1f2937',
                marginBottom: '0.5rem'
              }}>
                Earn DL365
              </h3>
              <p style={{
                color: '#64748b',
                fontSize: '0.875rem',
                lineHeight: '1.6'
              }}>
                Miners earn DL365 tokens by renting equipment. Gamers pay for premium access. All transactions tracked in real-time.
              </p>
            </div>
          </div>
        </div>

        <div style={{
          marginTop: '3rem',
          padding: '2rem',
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(16, 185, 129, 0.1) 100%)',
          borderRadius: '1rem',
          border: '1px solid rgba(59, 130, 246, 0.2)',
          textAlign: 'center'
        }}>
          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            color: '#1f2937',
            marginBottom: '0.75rem'
          }}>
            🚀 WebRTC Streaming
          </h3>
          <p style={{
            color: '#64748b',
            fontSize: '1rem',
            maxWidth: '700px',
            margin: '0 auto',
            lineHeight: '1.6'
          }}>
            Our platform uses WebRTC for peer-to-peer connections with sub-second latency. No third-party streaming service needed - it's built into the apps!
          </p>
        </div>
      </main>
    </div>
  )
}
