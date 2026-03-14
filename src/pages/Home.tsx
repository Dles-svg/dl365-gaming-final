import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useState, useEffect } from 'react'
import { TokenPurchaseModal } from '../components/TokenPurchaseModal'
import { CardPurchase } from '../components/CardPurchase'
import { supabase } from '../lib/supabase'

export default function Home() {
  const { user } = useAuth()
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showInstallButton, setShowInstallButton] = useState(false)
  const [selectedDevice, setSelectedDevice] = useState<'desktop' | 'ios' | 'android' | null>(null)
  const [showTokenModal, setShowTokenModal] = useState(false)
  const [showCardPurchase, setShowCardPurchase] = useState(false)
  const [companySocialLinks, setCompanySocialLinks] = useState<any>({
    twitter: '#',
    tiktok: '#',
    instagram: '#',
    facebook: '#',
    linkedin: '#',
    discord: '#'
  })

  useEffect(() => {
    loadCompanySocialLinks()

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowInstallButton(true)
    }

    window.addEventListener('beforeinstallprompt', handler)

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const loadCompanySocialLinks = async () => {
    const { data } = await supabase
      .from('social_media_connections')
      .select('platform, profile_url')
      .eq('is_active', true)
      .eq('is_company_link', true)

    if (data && data.length > 0) {
      const links: any = {
        twitter: '#',
        tiktok: '#',
        instagram: '#',
        facebook: '#',
        linkedin: '#',
        discord: '#'
      }

      data.forEach((connection: any) => {
        const platform = connection.platform.toLowerCase()
        if (platform === 'x' || platform === 'twitter') {
          links.twitter = connection.profile_url
        } else if (platform in links) {
          links[platform] = connection.profile_url
        }
      })

      setCompanySocialLinks(links)
    }
  }

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      setShowInstallButton(false)
    }

    setDeferredPrompt(null)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{
        padding: '1.5rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'rgba(255, 255, 255, 0.98)',
        backdropFilter: 'blur(12px)',
        borderBottom: '2px solid rgba(230, 117, 39, 0.25)',
        boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            fontSize: '1.5rem',
            fontWeight: 'bold',
            display: 'flex',
            gap: '0.2rem'
          }}>
            <span style={{
              background: 'linear-gradient(135deg, #1a5490 0%, #3d8ed9 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              filter: 'drop-shadow(0 3px 8px rgba(26, 84, 144, 0.5))'
            }}>Day</span>
            <span style={{
              background: 'linear-gradient(135deg, #e67527 0%, #ff9447 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              filter: 'drop-shadow(0 3px 8px rgba(230, 117, 39, 0.5))'
            }}>Light</span>
            <span style={{
              background: 'linear-gradient(135deg, #0f3b6b 0%, #1a5490 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              filter: 'drop-shadow(0 3px 8px rgba(26, 84, 144, 0.5))'
            }}> ES365</span>
          </div>
        </div>
        <nav style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {showInstallButton && (
            <button
              onClick={handleInstallClick}
              style={{
                background: 'linear-gradient(135deg, #1a5490 0%, #3d8ed9 100%)',
                color: 'white',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                boxShadow: '0 4px 12px rgba(26, 84, 144, 0.5), inset 0 -2px 4px rgba(0, 0, 0, 0.2)',
                fontSize: '0.9rem'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = '0 8px 20px rgba(26, 84, 144, 0.7), inset 0 -2px 4px rgba(0, 0, 0, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(26, 84, 144, 0.5), inset 0 -2px 4px rgba(0, 0, 0, 0.2)';
              }}
            >
              Install App
            </button>
          )}
          {user ? (
            <>
              <Link to="/dashboard" style={{
                color: '#1e5a96',
                textDecoration: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
                fontWeight: '600',
                transition: 'background 0.2s'
              }}>
                Dashboard
              </Link>
            </>
          ) : (
            <>
              <Link to="/login" style={{
                color: '#1a5490',
                textDecoration: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
                fontWeight: '600',
                transition: 'background 0.2s'
              }}>
                Login
              </Link>
              <Link to="/register" style={{
                background: 'linear-gradient(135deg, #e67527 0%, #ff9447 100%)',
                color: 'white',
                textDecoration: 'none',
                padding: '0.5rem 1.5rem',
                borderRadius: '0.5rem',
                fontWeight: '600',
                transition: 'transform 0.2s, box-shadow 0.2s',
                boxShadow: '0 4px 12px rgba(230, 117, 39, 0.5), inset 0 -2px 4px rgba(0, 0, 0, 0.2)',
                display: 'inline-block'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = '0 8px 20px rgba(230, 117, 39, 0.7), inset 0 -2px 4px rgba(0, 0, 0, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(230, 117, 39, 0.5), inset 0 -2px 4px rgba(0, 0, 0, 0.2)';
              }}>
                Get Started
              </Link>
            </>
          )}
        </nav>
      </header>

      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          maxWidth: '1200px',
          width: '100%',
          padding: '2rem',
          textAlign: 'center'
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginBottom: '2rem'
          }}>
            <div style={{
              width: '420px',
              height: '300px',
              background: 'linear-gradient(135deg, rgba(26, 84, 144, 0.15) 0%, rgba(230, 117, 39, 0.15) 100%)',
              borderRadius: '2rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1.5rem',
              boxShadow: '0 8px 32px rgba(230, 117, 39, 0.35), 0 12px 48px rgba(26, 84, 144, 0.3), inset 0 -2px 8px rgba(255, 255, 255, 0.2)',
              position: 'relative',
              border: '4px solid rgba(241, 243, 245, 0.4)',
              overflow: 'hidden',
              transform: 'translateZ(0)',
              animation: 'glow 3s ease-in-out infinite'
            }}>
              <img
                src="/8013752e-51e4-4757-93c0-412235569aa3.jpg"
                alt="DL365 Logo"
                className="rotating-logo"
                style={{
                  width: '270px',
                  height: '270px',
                  objectFit: 'contain'
                }}
              />
            </div>
            <div style={{
              fontSize: '1.75rem',
              fontWeight: 'bold',
              marginBottom: '0.5rem',
              letterSpacing: '0.05em',
              display: 'flex',
              gap: '0.25rem',
              justifyContent: 'center'
            }}>
              <span style={{
                background: 'linear-gradient(135deg, #1a5490 0%, #3d8ed9 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                filter: 'drop-shadow(0 4px 12px rgba(26, 84, 144, 0.6))'
              }}>DAY</span>
              <span style={{
                background: 'linear-gradient(135deg, #e67527 0%, #ff9447 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                filter: 'drop-shadow(0 4px 12px rgba(230, 117, 39, 0.6))'
              }}>LIGHT</span>
              <span style={{
                background: 'linear-gradient(135deg, #0f3b6b 0%, #1a5490 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                filter: 'drop-shadow(0 4px 12px rgba(26, 84, 144, 0.6))'
              }}> ES365</span>
            </div>
          </div>

          <h1 style={{
            fontSize: '3.5rem',
            fontWeight: 'bold',
            marginBottom: '1.5rem',
            background: 'linear-gradient(90deg, #1a5490 0%, #2c6fb0 25%, #e67527 50%, #ff9447 75%, #1a5490 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            lineHeight: '1.2',
            filter: 'drop-shadow(0 3px 10px rgba(230, 117, 39, 0.6)) drop-shadow(0 3px 10px rgba(26, 84, 144, 0.4))',
            backgroundSize: '200% auto',
            animation: 'shimmer 8s linear infinite'
          }}>
            Crypto Gaming & Compute Rental Platform
          </h1>

          <p style={{
            fontSize: '1.25rem',
            color: '#64748b',
            marginBottom: '3rem',
            lineHeight: '1.8',
            maxWidth: '800px',
            margin: '0 auto 3rem'
          }}>
            Experience the future of gaming and computation. Rent high-performance equipment,
            play blockchain-based games, and monetize your idle hardware. All payments powered by DL365 tokens.
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '2rem',
            marginTop: '4rem',
            textAlign: 'left'
          }}>
            <Link to="/games" style={{ textDecoration: 'none' }}>
              <div style={{
                background: '#ffffff',
                padding: '2rem',
                borderRadius: '1rem',
                border: '2px solid rgba(30, 90, 150, 0.15)',
                transition: 'transform 0.2s, border-color 0.2s, box-shadow 0.2s',
                cursor: 'pointer',
                height: '100%',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-6px)';
                e.currentTarget.style.borderColor = 'rgba(40, 117, 199, 0.4)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(30, 90, 150, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = 'rgba(30, 90, 150, 0.15)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
              }}>
                <div style={{
                  fontSize: '2.5rem',
                  marginBottom: '1rem'
                }}>🎮</div>
                <h3 style={{
                  fontSize: '1.5rem',
                  fontWeight: '600',
                  marginBottom: '0.75rem',
                  color: '#3d8ed9',
                  textShadow: 'none'
                }}>
                  Crypto Gaming
                </h3>
                <p style={{
                  color: '#64748b',
                  lineHeight: '1.6',
                  marginBottom: '1rem'
                }}>
                  Play cutting-edge blockchain games, earn rewards, and own your in-game assets with true digital ownership.
                </p>
                <div style={{
                  color: '#3d8ed9',
                  fontWeight: '600',
                  fontSize: '0.875rem',
                  textShadow: '0 2px 4px rgba(40, 117, 199, 0.3)'
                }}>
                  Browse Games →
                </div>
              </div>
            </Link>

            <Link to="/register" style={{ textDecoration: 'none' }}>
              <div style={{
                background: '#ffffff',
                padding: '2rem',
                borderRadius: '1rem',
                border: '2px solid rgba(16, 185, 129, 0.15)',
                transition: 'transform 0.2s, border-color 0.2s, box-shadow 0.2s',
                cursor: 'pointer',
                height: '100%',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-6px)';
                e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.4)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(16, 185, 129, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.15)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
              }}>
                <div style={{
                  fontSize: '2.5rem',
                  marginBottom: '1rem'
                }}>💵</div>
                <h3 style={{
                  fontSize: '1.5rem',
                  fontWeight: '600',
                  marginBottom: '0.75rem',
                  color: '#10b981',
                  textShadow: 'none'
                }}>
                  Rent Your Equipment
                </h3>
                <p style={{
                  color: '#64748b',
                  lineHeight: '1.6',
                  marginBottom: '1rem'
                }}>
                  List your gaming PC, mining rig, or high-end equipment. Earn DL365 tokens when others rent it by the hour.
                </p>
                <div style={{
                  color: '#10b981',
                  fontWeight: '600',
                  fontSize: '0.875rem',
                  textShadow: '0 2px 4px rgba(16, 185, 129, 0.3)'
                }}>
                  Get Started →
                </div>
              </div>
            </Link>

            <Link to="/compute" style={{ textDecoration: 'none' }}>
              <div style={{
                background: '#ffffff',
                padding: '2rem',
                borderRadius: '1rem',
                border: '2px solid rgba(230, 117, 39, 0.15)',
                transition: 'transform 0.2s, border-color 0.2s, box-shadow 0.2s',
                cursor: 'pointer',
                height: '100%',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-6px)';
                e.currentTarget.style.borderColor = 'rgba(255, 148, 71, 0.4)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(230, 117, 39, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = 'rgba(230, 117, 39, 0.15)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
              }}>
                <div style={{
                  fontSize: '2.5rem',
                  marginBottom: '1rem'
                }}>⚡</div>
                <h3 style={{
                  fontSize: '1.5rem',
                  fontWeight: '600',
                  marginBottom: '0.75rem',
                  color: '#ff9447',
                  textShadow: 'none'
                }}>
                  Equipment Marketplace
                </h3>
                <p style={{
                  color: '#64748b',
                  lineHeight: '1.6',
                  marginBottom: '1rem'
                }}>
                  Browse and rent professional gaming PCs, mining rigs, and high-performance equipment by the hour using DL365 tokens.
                </p>
                <div style={{
                  color: '#ff9447',
                  fontWeight: '600',
                  fontSize: '0.875rem',
                  textShadow: '0 2px 4px rgba(255, 148, 71, 0.3)'
                }}>
                  View Resources →
                </div>
              </div>
            </Link>

            <Link to="/streaming" style={{ textDecoration: 'none' }}>
              <div style={{
                background: '#ffffff',
                padding: '2rem',
                borderRadius: '1rem',
                border: '2px solid rgba(201, 95, 26, 0.15)',
                transition: 'transform 0.2s, border-color 0.2s, box-shadow 0.2s',
                cursor: 'pointer',
                height: '100%',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-6px)';
                e.currentTarget.style.borderColor = 'rgba(230, 117, 39, 0.4)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(201, 95, 26, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = 'rgba(201, 95, 26, 0.15)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
              }}>
                <div style={{
                  fontSize: '2.5rem',
                  marginBottom: '1rem'
                }}>📡</div>
                <h3 style={{
                  fontSize: '1.5rem',
                  fontWeight: '600',
                  marginBottom: '0.75rem',
                  color: '#e67527',
                  textShadow: 'none'
                }}>
                  Live Streaming
                </h3>
                <p style={{
                  color: '#64748b',
                  lineHeight: '1.6',
                  marginBottom: '1rem'
                }}>
                  Stream your gameplay, connect with viewers, and monetize your content with integrated crypto rewards.
                </p>
                <div style={{
                  color: '#e67527',
                  fontWeight: '600',
                  fontSize: '0.875rem',
                  textShadow: '0 2px 4px rgba(230, 117, 39, 0.3)'
                }}>
                  Start Streaming →
                </div>
              </div>
            </Link>

            <Link to="/wallet" style={{ textDecoration: 'none' }}>
              <div style={{
                background: '#ffffff',
                padding: '2rem',
                borderRadius: '1rem',
                border: '2px solid rgba(26, 84, 144, 0.15)',
                transition: 'transform 0.2s, border-color 0.2s, box-shadow 0.2s',
                cursor: 'pointer',
                height: '100%',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-6px)';
                e.currentTarget.style.borderColor = 'rgba(61, 142, 217, 0.4)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(26, 84, 144, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = 'rgba(26, 84, 144, 0.15)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
              }}>
                <div style={{
                  fontSize: '2.5rem',
                  marginBottom: '1rem'
                }}>💰</div>
                <h3 style={{
                  fontSize: '1.5rem',
                  fontWeight: '600',
                  marginBottom: '0.75rem',
                  color: '#3d8ed9',
                  textShadow: 'none'
                }}>
                  DL365 Wallet
                </h3>
                <p style={{
                  color: '#64748b',
                  lineHeight: '1.6',
                  marginBottom: '1rem'
                }}>
                  Buy and manage DL365 tokens - the platform's payment currency. Use them to rent equipment or earn them by listing your own.
                </p>
                <div style={{
                  color: '#3d8ed9',
                  fontWeight: '600',
                  fontSize: '0.875rem',
                  textShadow: '0 2px 4px rgba(61, 142, 217, 0.3)'
                }}>
                  Open Wallet →
                </div>
              </div>
            </Link>

            <div style={{
              background: '#ffffff',
              padding: '2rem',
              borderRadius: '1rem',
              border: '2px solid rgba(16, 185, 129, 0.15)',
              transition: 'transform 0.2s, border-color 0.2s, box-shadow 0.2s',
              cursor: 'pointer',
              height: '100%',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-6px)';
              e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.4)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(16, 185, 129, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.15)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
            }}>
              <div style={{
                fontSize: '2.5rem',
                marginBottom: '1rem'
              }}>🌍</div>
              <h3 style={{
                fontSize: '1.5rem',
                fontWeight: '600',
                marginBottom: '0.75rem',
                color: '#10b981',
                textShadow: 'none'
              }}>
                Global Platform
              </h3>
              <p style={{
                color: '#64748b',
                lineHeight: '1.6',
                marginBottom: '1rem'
              }}>
                Access Daylight ES365's worldwide gaming network from anywhere, anytime on any device.
              </p>
              <div style={{
                color: '#10b981',
                fontWeight: '600',
                fontSize: '0.875rem',
                textShadow: '0 2px 4px rgba(16, 185, 129, 0.3)'
              }}>
                Learn More →
              </div>
            </div>
          </div>

          <div style={{ marginTop: '4rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem' }}>
            <img
              src="/8013752e-51e4-4757-93c0-412235569aa3.jpg"
              alt="Daylight ES365 Logo"
              style={{
                width: '150px',
                height: '150px',
                objectFit: 'contain',
                filter: 'drop-shadow(0 8px 20px rgba(230, 117, 39, 0.4))',
                animation: 'spin 6s linear infinite, float 3s ease-in-out infinite',
                transform: 'perspective(1000px) rotateY(0deg)',
                transition: 'transform 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'perspective(1000px) rotateY(180deg) scale(1.15)';
                e.currentTarget.style.filter = 'drop-shadow(0 12px 30px rgba(230, 117, 39, 0.7))';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'perspective(1000px) rotateY(0deg) scale(1)';
                e.currentTarget.style.filter = 'drop-shadow(0 8px 20px rgba(230, 117, 39, 0.4))';
              }}
            />
            {!user && (
              <Link to="/register" style={{
                display: 'inline-block',
                background: 'linear-gradient(135deg, #e67527 0%, #ff9447 100%)',
                color: 'white',
                textDecoration: 'none',
                padding: '1rem 2.5rem',
                borderRadius: '0.75rem',
                fontSize: '1.125rem',
                fontWeight: '600',
                transition: 'transform 0.2s, box-shadow 0.2s',
                boxShadow: '0 8px 20px rgba(230, 117, 39, 0.5), inset 0 -3px 6px rgba(0, 0, 0, 0.2), inset 0 2px 2px rgba(255, 255, 255, 0.2)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px) scale(1.05)';
                e.currentTarget.style.boxShadow = '0 12px 32px rgba(230, 117, 39, 0.7), inset 0 -3px 6px rgba(0, 0, 0, 0.2), inset 0 2px 2px rgba(255, 255, 255, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.boxShadow = '0 8px 20px rgba(230, 117, 39, 0.5), inset 0 -3px 6px rgba(0, 0, 0, 0.2), inset 0 2px 2px rgba(255, 255, 255, 0.2)';
              }}>
                Start Your Journey
              </Link>
            )}
            {user && (
              <Link to="/dashboard" style={{
                display: 'inline-block',
                background: 'linear-gradient(135deg, #e67527 0%, #ff9447 100%)',
                color: 'white',
                textDecoration: 'none',
                padding: '1rem 2.5rem',
                borderRadius: '0.75rem',
                fontSize: '1.125rem',
                fontWeight: '600',
                transition: 'transform 0.2s, box-shadow 0.2s',
                boxShadow: '0 8px 20px rgba(230, 117, 39, 0.5), inset 0 -3px 6px rgba(0, 0, 0, 0.2), inset 0 2px 2px rgba(255, 255, 255, 0.2)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px) scale(1.05)';
                e.currentTarget.style.boxShadow = '0 12px 32px rgba(230, 117, 39, 0.7), inset 0 -3px 6px rgba(0, 0, 0, 0.2), inset 0 2px 2px rgba(255, 255, 255, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.boxShadow = '0 8px 20px rgba(230, 117, 39, 0.5), inset 0 -3px 6px rgba(0, 0, 0, 0.2), inset 0 2px 2px rgba(255, 255, 255, 0.2)';
              }}>
                Go to Dashboard
              </Link>
            )}
            <img
              src="/8013752e-51e4-4757-93c0-412235569aa3.jpg"
              alt="Daylight ES365 Logo"
              style={{
                width: '150px',
                height: '150px',
                objectFit: 'contain',
                filter: 'drop-shadow(0 8px 20px rgba(230, 117, 39, 0.4))',
                animation: 'spin 6s linear infinite, float 3s ease-in-out infinite',
                transform: 'perspective(1000px) rotateY(0deg)',
                transition: 'transform 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'perspective(1000px) rotateY(180deg) scale(1.15)';
                e.currentTarget.style.filter = 'drop-shadow(0 12px 30px rgba(230, 117, 39, 0.7))';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'perspective(1000px) rotateY(0deg) scale(1)';
                e.currentTarget.style.filter = 'drop-shadow(0 8px 20px rgba(230, 117, 39, 0.4))';
              }}
            />
          </div>

          <div style={{
            marginTop: '6rem',
            padding: '3rem',
            background: 'linear-gradient(135deg, rgba(26, 84, 144, 0.05) 0%, rgba(230, 117, 39, 0.05) 100%)',
            borderRadius: '1.5rem',
            border: '2px solid rgba(230, 117, 39, 0.2)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)'
          }}>
            <h2 style={{
              fontSize: '2rem',
              fontWeight: 'bold',
              marginBottom: '1.5rem',
              textAlign: 'center',
              background: 'linear-gradient(135deg, #1a5490 0%, #e67527 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              Install Daylight ES365
            </h2>
            <p style={{
              fontSize: '1.1rem',
              color: '#64748b',
              marginBottom: '2rem',
              textAlign: 'center'
            }}>
              Choose your device to see installation instructions
            </p>

            <div style={{
              display: 'flex',
              gap: '1rem',
              justifyContent: 'center',
              flexWrap: 'wrap',
              marginBottom: '2rem'
            }}>
              <button
                onClick={() => setSelectedDevice(selectedDevice === 'desktop' ? null : 'desktop')}
                style={{
                  padding: '1rem 2rem',
                  fontSize: '1rem',
                  fontWeight: '600',
                  borderRadius: '0.75rem',
                  border: selectedDevice === 'desktop' ? '3px solid #3d8ed9' : '2px solid rgba(26, 84, 144, 0.3)',
                  background: selectedDevice === 'desktop'
                    ? 'linear-gradient(135deg, #1a5490 0%, #3d8ed9 100%)'
                    : '#ffffff',
                  color: selectedDevice === 'desktop' ? 'white' : '#1a5490',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: selectedDevice === 'desktop'
                    ? '0 6px 16px rgba(26, 84, 144, 0.5)'
                    : '0 2px 8px rgba(0, 0, 0, 0.08)'
                }}
                onMouseEnter={(e) => {
                  if (selectedDevice !== 'desktop') {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(26, 84, 144, 0.3)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedDevice !== 'desktop') {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.08)';
                  }
                }}
              >
                Desktop (Chrome/Edge)
              </button>

              <button
                onClick={() => setSelectedDevice(selectedDevice === 'ios' ? null : 'ios')}
                style={{
                  padding: '1rem 2rem',
                  fontSize: '1rem',
                  fontWeight: '600',
                  borderRadius: '0.75rem',
                  border: selectedDevice === 'ios' ? '3px solid #ff9447' : '2px solid rgba(230, 117, 39, 0.3)',
                  background: selectedDevice === 'ios'
                    ? 'linear-gradient(135deg, #e67527 0%, #ff9447 100%)'
                    : '#ffffff',
                  color: selectedDevice === 'ios' ? 'white' : '#e67527',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: selectedDevice === 'ios'
                    ? '0 6px 16px rgba(230, 117, 39, 0.5)'
                    : '0 2px 8px rgba(0, 0, 0, 0.08)'
                }}
                onMouseEnter={(e) => {
                  if (selectedDevice !== 'ios') {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(230, 117, 39, 0.3)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedDevice !== 'ios') {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.08)';
                  }
                }}
              >
                iPhone/iPad
              </button>

              <button
                onClick={() => setSelectedDevice(selectedDevice === 'android' ? null : 'android')}
                style={{
                  padding: '1rem 2rem',
                  fontSize: '1rem',
                  fontWeight: '600',
                  borderRadius: '0.75rem',
                  border: selectedDevice === 'android' ? '3px solid #3d8ed9' : '2px solid rgba(26, 84, 144, 0.3)',
                  background: selectedDevice === 'android'
                    ? 'linear-gradient(135deg, #0f3b6b 0%, #1a5490 100%)'
                    : '#ffffff',
                  color: selectedDevice === 'android' ? 'white' : '#0f3b6b',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: selectedDevice === 'android'
                    ? '0 6px 16px rgba(26, 84, 144, 0.5)'
                    : '0 2px 8px rgba(0, 0, 0, 0.08)'
                }}
                onMouseEnter={(e) => {
                  if (selectedDevice !== 'android') {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(26, 84, 144, 0.3)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedDevice !== 'android') {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.08)';
                  }
                }}
              >
                Android
              </button>
            </div>

            {selectedDevice && (
              <div style={{
                padding: '2rem',
                background: 'white',
                borderRadius: '1rem',
                border: '2px solid rgba(230, 117, 39, 0.2)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.06)',
                animation: 'fadeIn 0.3s ease-in'
              }}>
                {selectedDevice === 'desktop' && (
                  <div>
                    <h3 style={{
                      fontSize: '1.5rem',
                      fontWeight: '600',
                      marginBottom: '1rem',
                      color: '#1a5490'
                    }}>
                      Desktop Installation (Chrome/Edge)
                    </h3>
                    <ol style={{
                      color: '#64748b',
                      fontSize: '1.05rem',
                      lineHeight: '1.8',
                      paddingLeft: '1.5rem'
                    }}>
                      <li style={{ marginBottom: '0.75rem' }}>Click the <strong>3 dots menu</strong> at the top-right corner of your browser</li>
                      <li style={{ marginBottom: '0.75rem' }}>Select <strong>"Install Daylight ES365"</strong> from the dropdown menu</li>
                      <li style={{ marginBottom: '0.75rem' }}>Click <strong>"Install"</strong> in the confirmation dialog</li>
                      <li>The app will be installed and you can launch it from your desktop or taskbar</li>
                    </ol>
                  </div>
                )}

                {selectedDevice === 'ios' && (
                  <div>
                    <h3 style={{
                      fontSize: '1.5rem',
                      fontWeight: '600',
                      marginBottom: '1rem',
                      color: '#e67527'
                    }}>
                      iPhone/iPad Installation
                    </h3>
                    <ol style={{
                      color: '#64748b',
                      fontSize: '1.05rem',
                      lineHeight: '1.8',
                      paddingLeft: '1.5rem'
                    }}>
                      <li style={{ marginBottom: '0.75rem' }}>Tap the <strong>Share button</strong> (square with arrow pointing up) at the bottom of Safari</li>
                      <li style={{ marginBottom: '0.75rem' }}>Scroll down in the share menu</li>
                      <li style={{ marginBottom: '0.75rem' }}>Tap <strong>"Add to Home Screen"</strong></li>
                      <li style={{ marginBottom: '0.75rem' }}>Tap <strong>"Add"</strong> in the top-right corner</li>
                      <li>The app icon will appear on your home screen</li>
                    </ol>
                  </div>
                )}

                {selectedDevice === 'android' && (
                  <div>
                    <h3 style={{
                      fontSize: '1.5rem',
                      fontWeight: '600',
                      marginBottom: '1rem',
                      color: '#0f3b6b'
                    }}>
                      Android Installation
                    </h3>
                    <ol style={{
                      color: '#64748b',
                      fontSize: '1.05rem',
                      lineHeight: '1.8',
                      paddingLeft: '1.5rem'
                    }}>
                      <li style={{ marginBottom: '0.75rem' }}>Tap the <strong>3 dots menu</strong> at the top-right corner of your browser</li>
                      <li style={{ marginBottom: '0.75rem' }}>Select <strong>"Add to Home screen"</strong> or <strong>"Install app"</strong></li>
                      <li style={{ marginBottom: '0.75rem' }}>Tap <strong>"Install"</strong> or <strong>"Add"</strong> to confirm</li>
                      <li>The app will be installed and accessible from your app drawer or home screen</li>
                    </ol>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      <footer style={{
        padding: '2rem',
        textAlign: 'center',
        borderTop: '1px solid rgba(0, 0, 0, 0.08)',
        color: '#64748b'
      }}>
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem' }}>
            <img
              src="/1000125974.jpg"
              alt="Daylight ES365 Logo"
              style={{
                width: '150px',
                height: '150px',
                objectFit: 'contain',
                filter: 'drop-shadow(0 8px 20px rgba(212, 175, 55, 0.4))',
                animation: 'spin 6s linear infinite, float 3s ease-in-out infinite',
                transform: 'perspective(1000px) rotateY(0deg)',
                transition: 'transform 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'perspective(1000px) rotateY(180deg) scale(1.15)';
                e.currentTarget.style.filter = 'drop-shadow(0 12px 30px rgba(212, 175, 55, 0.7))';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'perspective(1000px) rotateY(0deg) scale(1)';
                e.currentTarget.style.filter = 'drop-shadow(0 8px 20px rgba(212, 175, 55, 0.4))';
              }}
            />
            <button onClick={() => setShowTokenModal(true)} style={{
              display: 'inline-block',
              padding: '0.75rem 1.5rem',
              borderRadius: '0.75rem',
              background: 'linear-gradient(135deg, #e67527 0%, #ff9447 100%)',
              color: 'white',
              border: 'none',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'transform 0.2s, box-shadow 0.2s',
              boxShadow: '0 6px 16px rgba(230, 117, 39, 0.5), inset 0 -2px 4px rgba(0, 0, 0, 0.2), inset 0 1px 2px rgba(255, 255, 255, 0.2)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-3px) scale(1.05)';
              e.currentTarget.style.boxShadow = '0 10px 24px rgba(230, 117, 39, 0.7), inset 0 -2px 4px rgba(0, 0, 0, 0.2), inset 0 1px 2px rgba(255, 255, 255, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0) scale(1)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(230, 117, 39, 0.5), inset 0 -2px 4px rgba(0, 0, 0, 0.2), inset 0 1px 2px rgba(255, 255, 255, 0.2)';
            }}>
              Buy DL365 Tokens
            </button>
            <img
              src="/1000125974.jpg"
              alt="Daylight ES365 Logo"
              style={{
                width: '150px',
                height: '150px',
                objectFit: 'contain',
                filter: 'drop-shadow(0 8px 20px rgba(212, 175, 55, 0.4))',
                animation: 'spin 6s linear infinite, float 3s ease-in-out infinite',
                transform: 'perspective(1000px) rotateY(0deg)',
                transition: 'transform 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'perspective(1000px) rotateY(180deg) scale(1.15)';
                e.currentTarget.style.filter = 'drop-shadow(0 12px 30px rgba(212, 175, 55, 0.7))';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'perspective(1000px) rotateY(0deg) scale(1)';
                e.currentTarget.style.filter = 'drop-shadow(0 8px 20px rgba(212, 175, 55, 0.4))';
              }}
            />
          </div>
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '2rem',
          marginBottom: '1.5rem',
          flexWrap: 'wrap'
        }}>
          <a
            href={companySocialLinks.twitter}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.25rem',
              borderRadius: '0.5rem',
              background: 'linear-gradient(135deg, #000000 0%, #14171A 100%)',
              color: 'white',
              textDecoration: 'none',
              fontSize: '0.95rem',
              fontWeight: '600',
              transition: 'transform 0.2s, box-shadow 0.2s',
              boxShadow: '0 4px 10px rgba(0, 0, 0, 0.2)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 10px rgba(0, 0, 0, 0.2)';
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
            X (Twitter)
          </a>

          <a
            href={companySocialLinks.tiktok}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.25rem',
              borderRadius: '0.5rem',
              background: 'linear-gradient(135deg, #000000 0%, #fe2c55 100%)',
              color: 'white',
              textDecoration: 'none',
              fontSize: '0.95rem',
              fontWeight: '600',
              transition: 'transform 0.2s, box-shadow 0.2s',
              boxShadow: '0 4px 10px rgba(254, 44, 85, 0.3)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(254, 44, 85, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 10px rgba(254, 44, 85, 0.3)';
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
            </svg>
            TikTok
          </a>

          <a
            href={companySocialLinks.instagram}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.25rem',
              borderRadius: '0.5rem',
              background: 'linear-gradient(135deg, #833AB4 0%, #FD1D1D 50%, #FCAF45 100%)',
              color: 'white',
              textDecoration: 'none',
              fontSize: '0.95rem',
              fontWeight: '600',
              transition: 'transform 0.2s, box-shadow 0.2s',
              boxShadow: '0 4px 10px rgba(131, 58, 180, 0.3)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(131, 58, 180, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 10px rgba(131, 58, 180, 0.3)';
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>
            Instagram
          </a>

          <a
            href={companySocialLinks.facebook}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.25rem',
              borderRadius: '0.5rem',
              background: 'linear-gradient(135deg, #1877F2 0%, #0C5AA6 100%)',
              color: 'white',
              textDecoration: 'none',
              fontSize: '0.95rem',
              fontWeight: '600',
              transition: 'transform 0.2s, box-shadow 0.2s',
              boxShadow: '0 4px 10px rgba(24, 119, 242, 0.3)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(24, 119, 242, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 10px rgba(24, 119, 242, 0.3)';
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            Facebook
          </a>

          <a
            href={companySocialLinks.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.25rem',
              borderRadius: '0.5rem',
              background: 'linear-gradient(135deg, #0077B5 0%, #004471 100%)',
              color: 'white',
              textDecoration: 'none',
              fontSize: '0.95rem',
              fontWeight: '600',
              transition: 'transform 0.2s, box-shadow 0.2s',
              boxShadow: '0 4px 10px rgba(0, 119, 181, 0.3)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 119, 181, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 10px rgba(0, 119, 181, 0.3)';
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
            LinkedIn
          </a>

          <a
            href={companySocialLinks.discord}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.25rem',
              borderRadius: '0.5rem',
              background: 'linear-gradient(135deg, #5865F2 0%, #4752C4 100%)',
              color: 'white',
              textDecoration: 'none',
              fontSize: '0.95rem',
              fontWeight: '600',
              transition: 'transform 0.2s, box-shadow 0.2s',
              boxShadow: '0 4px 10px rgba(88, 101, 242, 0.3)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(88, 101, 242, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 10px rgba(88, 101, 242, 0.3)';
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
            </svg>
            Discord
          </a>
        </div>

        <p>© 2026 Daylight ES365. All rights reserved.</p>
      </footer>

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
