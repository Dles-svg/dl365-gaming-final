import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { TokenPurchaseModal } from '../components/TokenPurchaseModal'
import { CardPurchase } from '../components/CardPurchase'

export default function Dashboard() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState({
    activeSessions: 0,
    activeRentals: 0,
    totalEarnings: 0,
    dl365Balance: 0,
    totalGames: 0,
    activeStreams: 0,
    marketplaceListings: 0,
    equipmentRentals: 0
  })
  const [userRole, setUserRole] = useState<'Miner' | 'Gamer' | 'E-gamer' | 'both'>('Gamer')
  const [loading, setLoading] = useState(true)
  const [recentTransactions, setRecentTransactions] = useState<any[]>([])
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showInstallButton, setShowInstallButton] = useState(false)
  const [selectedDevice, setSelectedDevice] = useState('')
  const [profileData, setProfileData] = useState<any>(null)
  const [minerProfile, setMinerProfile] = useState<any>(null)
  const [_gamerProfile, setGamerProfile] = useState<any>(null)
  const [notifications, setNotifications] = useState<any[]>([])
  const [upcomingRentals, setUpcomingRentals] = useState<any[]>([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [showTokenModal, setShowTokenModal] = useState(false)
  const [showCardPurchase, setShowCardPurchase] = useState(false)
  const [socialConnections, setSocialConnections] = useState<any[]>([])
  const [showSocialModal, setShowSocialModal] = useState(false)
  const [newSocialPlatform, setNewSocialPlatform] = useState('')
  const [newSocialUsername, setNewSocialUsername] = useState('')
  const [isCompanyLink, setIsCompanyLink] = useState(false)

  const desktopRef = useRef<HTMLDivElement>(null)
  const iphoneRef = useRef<HTMLDivElement>(null)
  const androidRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (user) {
      loadDashboardStats()
      loadNotifications()
      loadUpcomingRentals()
      loadSocialConnections()

      const notifSubscription = supabase
        .channel('notifications')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, () => {
          loadNotifications()
        })
        .subscribe()

      return () => {
        notifSubscription.unsubscribe()
      }
    }
  }, [user])

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowInstallButton(true)
    }

    window.addEventListener('beforeinstallprompt', handler)

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      setShowInstallButton(false)
    }

    setDeferredPrompt(null)
  }

  const handleDeviceSelect = async (device: string) => {
    setSelectedDevice(device)

    if (device === 'desktop') {
      if (deferredPrompt) {
        deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice

        if (outcome === 'accepted') {
          setShowInstallButton(false)
        }

        setDeferredPrompt(null)
      } else if (desktopRef.current) {
        desktopRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    } else if (device === 'iphone' && iphoneRef.current) {
      iphoneRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    } else if (device === 'android' && androidRef.current) {
      androidRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  const loadNotifications = async () => {
    if (!user) return

    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .eq('read', false)
      .order('created_at', { ascending: false })
      .limit(5)

    if (data) {
      setNotifications(data)
    }
  }

  const loadUpcomingRentals = async () => {
    if (!user) return

    const { data: minerProfileData } = await supabase
      .from('miner_profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    const { data: gamerProfileData } = await supabase
      .from('gamer_profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    let query = supabase
      .from('rental_schedules')
      .select(`
        *,
        miner_profiles!rental_schedules_miner_profile_id_fkey(user_id, miner_code),
        gamer_profiles!rental_schedules_gamer_profile_id_fkey(user_id)
      `)
      .in('status', ['pending', 'confirmed'])
      .gte('scheduled_start', new Date().toISOString())
      .order('scheduled_start', { ascending: true })
      .limit(5)

    if (minerProfileData || gamerProfileData) {
      const { data } = await query

      if (data) {
        setUpcomingRentals(data)
      }
    }
  }

  const markNotificationAsRead = async (notificationId: string) => {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId)

    loadNotifications()
  }

  const loadSocialConnections = async () => {
    if (!user) return

    const { data } = await supabase
      .from('social_media_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (data) {
      setSocialConnections(data)
    }
  }

  const handleAddSocialConnection = async () => {
    if (!user || !newSocialPlatform || !newSocialUsername) return

    const platformUrls: Record<string, string> = {
      'x': `https://x.com/${newSocialUsername}`,
      'twitter': `https://twitter.com/${newSocialUsername}`,
      'tiktok': `https://www.tiktok.com/@${newSocialUsername}`,
      'instagram': `https://www.instagram.com/${newSocialUsername}`,
      'youtube': `https://www.youtube.com/@${newSocialUsername}`,
      'twitch': `https://www.twitch.tv/${newSocialUsername}`,
      'facebook': `https://www.facebook.com/${newSocialUsername}`,
      'linkedin': `https://www.linkedin.com/company/${newSocialUsername}`,
      'discord': `https://discord.gg/${newSocialUsername}`
    }

    const { error } = await supabase
      .from('social_media_connections')
      .insert({
        user_id: isCompanyLink ? null : user.id,
        platform: newSocialPlatform,
        platform_username: newSocialUsername,
        profile_url: platformUrls[newSocialPlatform] || '',
        is_active: true,
        is_company_link: isCompanyLink
      })

    if (!error) {
      loadSocialConnections()
      setShowSocialModal(false)
      setNewSocialPlatform('')
      setNewSocialUsername('')
      setIsCompanyLink(false)
    }
  }

  const handleRemoveSocialConnection = async (connectionId: string) => {
    await supabase
      .from('social_media_connections')
      .delete()
      .eq('id', connectionId)

    loadSocialConnections()
  }

  const getSocialPlatformIcon = (platform: string) => {
    const icons: Record<string, string> = {
      'x': '𝕏',
      'twitter': '𝕏',
      'tiktok': '🎵',
      'instagram': '📷',
      'youtube': '▶️',
      'twitch': '🎮',
      'facebook': '👥'
    }
    return icons[platform] || '🔗'
  }

  const loadDashboardStats = async () => {
    if (!user) return

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*, username, display_name, bio, avatar_url, is_online')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile) {
      await supabase
        .from('user_profiles')
        .insert({
          id: user.id,
          total_earnings: 0,
          user_role: 'Gamer',
          dl365_balance: 0,
          display_name: user.email?.split('@')[0] || 'User'
        })

      await supabase
        .from('gamer_profiles')
        .insert({ user_id: user.id })
    } else {
      setUserRole(profile.user_role || 'Gamer')
      setProfileData(profile)

      if (profile.user_role === 'Miner' || profile.user_role === 'both') {
        const { data: minerData } = await supabase
          .from('miner_profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle()

        if (minerData) {
          setMinerProfile(minerData)
        } else {
          const { data: newMinerProfile } = await supabase
            .from('miner_profiles')
            .insert({
              user_id: user.id,
              profile_name: `${profile.display_name}'s Equipment`,
              tier: 'standard',
              hourly_rate: 50
            })
            .select()
            .single()

          if (newMinerProfile) {
            setMinerProfile(newMinerProfile)
          }
        }
      }

      if (profile.user_role === 'Gamer' || profile.user_role === 'E-gamer' || profile.user_role === 'both') {
        const { data: gamerData } = await supabase
          .from('gamer_profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle()

        if (gamerData) {
          setGamerProfile(gamerData)
        } else {
          const { data: newGamerProfile } = await supabase
            .from('gamer_profiles')
            .insert({ user_id: user.id })
            .select()
            .single()

          if (newGamerProfile) {
            setGamerProfile(newGamerProfile)
          }
        }
      }
    }

    const { count: sessionsCount } = await supabase
      .from('game_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'active')

    const { count: rentalsCount } = await supabase
      .from('compute_rentals')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'active')

    const { count: gamesCount } = await supabase
      .from('user_games')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    const { count: streamsCount } = await supabase
      .from('streaming_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'live')

    const { count: listingsCount } = await supabase
      .from('marketplace_listings')
      .select('*', { count: 'exact', head: true })
      .eq('miner_id', user.id)
      .eq('status', 'available')

    const { count: equipmentRentalsCount } = await supabase
      .from('equipment_rentals')
      .select('*', { count: 'exact', head: true })
      .eq('renter_id', user.id)
      .eq('status', 'active')

    const { data: dl365Data } = await supabase
      .from('dl365_tokens')
      .select('balance')
      .eq('user_id', user.id)
      .maybeSingle()

    const { data: txData } = await supabase
      .from('transactions')
      .select('*')
      .or(`user_id.eq.${user.id},from_user_id.eq.${user.id},to_user_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(5)

    if (txData) {
      setRecentTransactions(txData)
    }

    setStats({
      activeSessions: sessionsCount || 0,
      activeRentals: rentalsCount || 0,
      totalEarnings: profile?.total_earnings || 0,
      dl365Balance: dl365Data?.balance || profile?.dl365_balance || 0,
      totalGames: gamesCount || 0,
      activeStreams: streamsCount || 0,
      marketplaceListings: listingsCount || 0,
      equipmentRentals: equipmentRentalsCount || 0
    })
    setLoading(false)
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  if (!user) {
    navigate('/login')
    return null
  }

  return (
    <div style={{ minHeight: '100vh' }}>
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
              fontSize: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}
          >
            <span>←</span>
            <span>Home</span>
          </button>
          {showInstallButton && (
            <button
              onClick={handleInstallClick}
              style={{
                background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
                color: 'white',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                boxShadow: '0 2px 4px rgba(59, 130, 246, 0.4)',
                fontSize: '0.9rem'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(59, 130, 246, 0.6)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(59, 130, 246, 0.4)';
              }}
            >
              Install App
            </button>
          )}
          <button
            onClick={() => navigate('/games')}
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
            Games
          </button>
          <button
            onClick={() => navigate('/streaming')}
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
            Streaming
          </button>
          <button
            onClick={() => navigate('/marketplace')}
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
            Marketplace
          </button>
          <button
            onClick={() => navigate('/wallet')}
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
            Wallet
          </button>
          <button
            onClick={() => navigate('/admin')}
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
            Admin
          </button>
          <button
            onClick={() => navigate('/downloads')}
            style={{
              padding: '0.5rem 1.5rem',
              borderRadius: '0.5rem',
              border: 'none',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '600',
              transition: 'all 0.2s',
              boxShadow: '0 2px 4px rgba(16, 185, 129, 0.3)'
            }}
          >
            📥 Desktop Apps
          </button>
          <button
            onClick={handleSignOut}
            style={{
              padding: '0.5rem 1.5rem',
              borderRadius: '0.5rem',
              border: '1px solid rgba(239, 68, 68, 0.5)',
              background: 'transparent',
              color: '#fca5a5',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '600',
              transition: 'all 0.2s'
            }}
          >
            Sign Out
          </button>
        </nav>
      </header>

      <main style={{ padding: '2rem', maxWidth: '1600px', margin: '0 auto' }}>
        <div style={{
          marginBottom: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start'
        }}>
          <div>
            <h1 style={{
              fontSize: '2.5rem',
              fontWeight: 'bold',
              marginBottom: '0.5rem',
              color: '#1f2937'
            }}>
              Welcome, {profileData?.display_name || userRole}!
            </h1>
            <p style={{
              color: '#475569',
              fontSize: '1.125rem',
              marginBottom: '0.5rem'
            }}>
              {user.email}
            </p>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              background: userRole === 'Miner' ? 'rgba(251, 146, 60, 0.1)' : 'rgba(59, 130, 246, 0.1)',
              border: `1px solid ${userRole === 'Miner' ? 'rgba(251, 146, 60, 0.2)' : 'rgba(59, 130, 246, 0.2)'}`,
              borderRadius: '0.5rem',
              marginBottom: '0.5rem'
            }}>
              <span style={{ fontSize: '1.25rem' }}>
                {userRole === 'Miner' ? '⛏️' : userRole === 'both' ? '⛏️🎮' : '🎮'}
              </span>
              <span style={{
                color: userRole === 'Miner' ? '#fb923c' : '#3b82f6',
                fontWeight: '600',
                fontSize: '0.875rem'
              }}>
                {userRole} Account
              </span>
            </div>

            {minerProfile && (
              <div style={{
                marginTop: '1rem',
                padding: '1rem',
                background: 'rgba(251, 146, 60, 0.05)',
                border: '1px solid rgba(251, 146, 60, 0.2)',
                borderRadius: '0.5rem'
              }}>
                <div style={{ fontSize: '0.875rem', color: '#fb923c', fontWeight: '600', marginBottom: '0.5rem' }}>
                  Your Miner Code
                </div>
                <div style={{
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  color: '#1f2937',
                  fontFamily: 'monospace',
                  letterSpacing: '0.1em'
                }}>
                  {minerProfile.miner_code}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                  Gamers use this code to connect to your equipment
                </div>
              </div>
            )}
          </div>

          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              style={{
                padding: '0.75rem',
                borderRadius: '0.5rem',
                border: notifications.length > 0 ? '2px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(148, 163, 184, 0.3)',
                background: notifications.length > 0 ? 'rgba(239, 68, 68, 0.1)' : 'white',
                cursor: 'pointer',
                fontSize: '1.5rem',
                position: 'relative'
              }}
            >
              🔔
              {notifications.length > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-5px',
                  right: '-5px',
                  background: '#ef4444',
                  color: 'white',
                  borderRadius: '50%',
                  width: '20px',
                  height: '20px',
                  fontSize: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '600'
                }}>
                  {notifications.length}
                </span>
              )}
            </button>

            {showNotifications && (
              <div style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '0.5rem',
                width: '350px',
                maxHeight: '400px',
                overflowY: 'auto',
                background: 'white',
                border: '1px solid rgba(148, 163, 184, 0.2)',
                borderRadius: '0.75rem',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                zIndex: 1000
              }}>
                <div style={{
                  padding: '1rem',
                  borderBottom: '1px solid rgba(148, 163, 184, 0.2)',
                  fontWeight: '600',
                  color: '#1f2937'
                }}>
                  Notifications
                </div>
                {notifications.length === 0 ? (
                  <div style={{
                    padding: '2rem',
                    textAlign: 'center',
                    color: '#64748b',
                    fontSize: '0.875rem'
                  }}>
                    No new notifications
                  </div>
                ) : (
                  notifications.map(notif => (
                    <div
                      key={notif.id}
                      onClick={() => markNotificationAsRead(notif.id)}
                      style={{
                        padding: '1rem',
                        borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
                        cursor: 'pointer',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                    >
                      <div style={{
                        fontWeight: '600',
                        color: '#1f2937',
                        fontSize: '0.875rem',
                        marginBottom: '0.25rem'
                      }}>
                        {notif.title}
                      </div>
                      <div style={{
                        fontSize: '0.75rem',
                        color: '#64748b'
                      }}>
                        {notif.message}
                      </div>
                      <div style={{
                        fontSize: '0.7rem',
                        color: '#94a3b8',
                        marginTop: '0.25rem'
                      }}>
                        {new Date(notif.created_at).toLocaleString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        <div style={{
          marginBottom: '2rem',
          padding: '1.5rem',
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(16, 185, 129, 0.05) 100%)',
          border: '1px solid rgba(59, 130, 246, 0.2)',
          borderRadius: '1rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: '600',
              color: '#1f2937'
            }}>
              🔗 Social Media Connections
            </h3>
            <button
              onClick={() => setShowSocialModal(true)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
                border: 'none',
                background: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
                color: 'white',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '600',
                transition: 'all 0.2s'
              }}
            >
              + Add Platform
            </button>
          </div>

          {socialConnections.length === 0 ? (
            <div style={{
              padding: '2rem',
              textAlign: 'center',
              background: 'white',
              borderRadius: '0.5rem',
              border: '1px solid rgba(148, 163, 184, 0.2)'
            }}>
              <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
                No social media accounts connected yet. Click "Add Platform" to connect your accounts.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
              {socialConnections.map(connection => (
                <div
                  key={connection.id}
                  style={{
                    padding: '1rem',
                    background: 'white',
                    borderRadius: '0.5rem',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                    <span style={{ fontSize: '1.5rem' }}>{getSocialPlatformIcon(connection.platform)}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: '#1f2937',
                        textTransform: 'capitalize'
                      }}>
                        {connection.platform}
                      </div>
                      <a
                        href={connection.profile_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontSize: '0.75rem',
                          color: '#3b82f6',
                          textDecoration: 'none'
                        }}
                      >
                        @{connection.platform_username}
                      </a>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveSocialConnection(connection.id)}
                    style={{
                      padding: '0.25rem 0.5rem',
                      borderRadius: '0.25rem',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      background: 'transparent',
                      color: '#ef4444',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent'
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {upcomingRentals.length > 0 && (
          <div style={{
            marginBottom: '2rem',
            padding: '1.5rem',
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(16, 185, 129, 0.05) 100%)',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            borderRadius: '1rem'
          }}>
            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: '600',
              marginBottom: '1rem',
              color: '#1f2937'
            }}>
              📅 Upcoming Rentals
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {upcomingRentals.map(rental => (
                <div
                  key={rental.id}
                  style={{
                    padding: '1rem',
                    background: 'white',
                    borderRadius: '0.5rem',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    display: 'grid',
                    gridTemplateColumns: '1fr auto',
                    gap: '1rem',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#1f2937',
                      marginBottom: '0.25rem'
                    }}>
                      {rental.equipment_tier} Equipment
                    </div>
                    <div style={{
                      fontSize: '0.75rem',
                      color: '#64748b'
                    }}>
                      {new Date(rental.scheduled_start).toLocaleString()} - {new Date(rental.scheduled_end).toLocaleString()}
                    </div>
                  </div>
                  <div style={{
                    padding: '0.5rem 1rem',
                    background: rental.status === 'confirmed' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(251, 146, 60, 0.1)',
                    border: `1px solid ${rental.status === 'confirmed' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(251, 146, 60, 0.3)'}`,
                    borderRadius: '0.5rem',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    color: rental.status === 'confirmed' ? '#10b981' : '#fb923c'
                  }}>
                    {rental.status.toUpperCase()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

{!showInstallButton && (
          <div style={{
            marginTop: '2rem',
            padding: '1.5rem',
            background: '#ffffff',
            borderRadius: '1rem',
            border: '2px solid rgba(59, 130, 246, 0.2)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
            textAlign: 'center'
          }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.75rem', color: '#3b82f6' }}>
              Install Daylight ES365 {userRole === 'Miner' ? 'Miner' : 'Gamer'} App
            </h3>
            <p style={{ color: '#334155', marginBottom: '1rem', fontSize: '0.95rem' }}>
              {userRole === 'Miner'
                ? 'Stream your mining rig and earn DL365 tokens!'
                : 'Play games on rented equipment or stream your gameplay!'}
            </p>

            <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
              <select
                value={selectedDevice}
                onChange={(e) => handleDeviceSelect(e.target.value)}
                style={{
                  padding: '0.75rem 2.5rem 0.75rem 1rem',
                  fontSize: '0.95rem',
                  fontWeight: '500',
                  color: '#1f2937',
                  background: '#f8fafc',
                  border: '2px solid #3b82f6',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  outline: 'none',
                  transition: 'all 0.2s',
                  appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%233b82f6'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 0.75rem center',
                  backgroundSize: '1.25rem'
                }}
              >
                <option value="">Select your device type</option>
                <option value="desktop">🖥️ Desktop (Windows/Mac/Linux)</option>
                <option value="iphone">📱 iPhone/iPad (iOS)</option>
                <option value="android">📱 Android Phone/Tablet</option>
              </select>
            </div>

            <div style={{ color: '#334155', fontSize: '0.875rem', textAlign: 'left', maxWidth: '650px', margin: '0 auto' }}>
              <div ref={desktopRef} style={{
                padding: '1.25rem',
                marginBottom: '1rem',
                background: selectedDevice === 'desktop' ? 'rgba(59, 130, 246, 0.08)' : 'rgba(241, 245, 249, 0.5)',
                border: selectedDevice === 'desktop' ? '2px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(203, 213, 225, 0.5)',
                borderRadius: '0.75rem',
                transition: 'all 0.3s'
              }}>
                <p style={{ marginBottom: '0.75rem', fontWeight: '600', color: '#1f2937', fontSize: '1rem' }}>
                  🖥️ Desktop App ({userRole === 'Miner' ? 'Miner Edition' : 'Gamer Edition'})
                </p>
                <p style={{ marginBottom: '0.5rem', color: '#475569', lineHeight: '1.6' }}>
                  <strong>Recommended for best performance!</strong> Download the dedicated desktop application for full access to:
                </p>
                <ul style={{ margin: '0.5rem 0 0.5rem 1.5rem', color: '#475569', lineHeight: '1.7' }}>
                  {userRole === 'Miner' ? (
                    <>
                      <li>Hardware detection and system monitoring</li>
                      <li>Screen/window capture for streaming your rig</li>
                      <li>Lower latency for remote connections</li>
                      <li>Full miner profile management</li>
                    </>
                  ) : (
                    <>
                      <li>Local game launching and management</li>
                      <li>Low-latency cloud gaming from miners</li>
                      <li>Screen capture for streaming gameplay</li>
                      <li>Full P2P connection support</li>
                    </>
                  )}
                </ul>
                <p style={{ marginTop: '0.75rem', marginBottom: '0', color: '#64748b', fontSize: '0.8rem' }}>
                  <strong>How to install:</strong> Visit the <button
                    onClick={() => navigate('/downloads')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#3b82f6',
                      textDecoration: 'underline',
                      cursor: 'pointer',
                      padding: 0,
                      font: 'inherit'
                    }}
                  >Downloads page</button> to get the {userRole === 'Miner' ? 'Miner' : 'Gamer'} desktop app for Windows, Mac, or Linux.
                </p>
              </div>

              <div ref={iphoneRef} style={{
                padding: '1.25rem',
                marginBottom: '1rem',
                background: selectedDevice === 'iphone' ? 'rgba(59, 130, 246, 0.08)' : 'rgba(241, 245, 249, 0.5)',
                border: selectedDevice === 'iphone' ? '2px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(203, 213, 225, 0.5)',
                borderRadius: '0.75rem',
                transition: 'all 0.3s'
              }}>
                <p style={{ marginBottom: '0.75rem', fontWeight: '600', color: '#1f2937', fontSize: '1rem' }}>
                  📱 iPhone/iPad (Mobile Web App)
                </p>
                <p style={{ marginBottom: '0.5rem', color: '#475569', lineHeight: '1.6' }}>
                  Install as a web app for quick access. Limited features compared to desktop:
                </p>
                <ul style={{ margin: '0.5rem 0 0.5rem 1.5rem', color: '#475569', lineHeight: '1.7' }}>
                  <li>View dashboard and manage your account</li>
                  <li>Browse games and marketplace</li>
                  <li>Wallet and transaction management</li>
                  <li>{userRole === 'Miner' ? 'Monitor your equipment rentals' : 'Reserve equipment for gaming sessions'}</li>
                </ul>
                <p style={{ marginTop: '0.75rem', marginBottom: '0', color: '#64748b', fontSize: '0.8rem' }}>
                  <strong>How to install:</strong> Tap the <strong>Share button</strong> (square with arrow), scroll down and tap <strong>"Add to Home Screen"</strong>
                </p>
              </div>

              <div ref={androidRef} style={{
                padding: '1.25rem',
                background: selectedDevice === 'android' ? 'rgba(59, 130, 246, 0.08)' : 'rgba(241, 245, 249, 0.5)',
                border: selectedDevice === 'android' ? '2px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(203, 213, 225, 0.5)',
                borderRadius: '0.75rem',
                transition: 'all 0.3s'
              }}>
                <p style={{ marginBottom: '0.75rem', fontWeight: '600', color: '#1f2937', fontSize: '1rem' }}>
                  📱 Android (Mobile Web App)
                </p>
                <p style={{ marginBottom: '0.5rem', color: '#475569', lineHeight: '1.6' }}>
                  Install as a web app for quick access. Limited features compared to desktop:
                </p>
                <ul style={{ margin: '0.5rem 0 0.5rem 1.5rem', color: '#475569', lineHeight: '1.7' }}>
                  <li>View dashboard and manage your account</li>
                  <li>Browse games and marketplace</li>
                  <li>Wallet and transaction management</li>
                  <li>{userRole === 'Miner' ? 'Monitor your equipment rentals' : 'Reserve equipment for gaming sessions'}</li>
                </ul>
                <p style={{ marginTop: '0.75rem', marginBottom: '0', color: '#64748b', fontSize: '0.8rem' }}>
                  <strong>How to install:</strong> Tap the <strong>3 dots menu</strong> (⋮), select <strong>"Add to Home screen"</strong> or <strong>"Install app"</strong>
                </p>
              </div>
            </div>
          </div>
        )}

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.5rem',
          marginTop: '2rem'
        }}>
          <div style={{
            background: '#ffffff',
            padding: '2rem',
            borderRadius: '1rem',
            border: '2px solid rgba(59, 130, 246, 0.15)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💰</div>
            <h3 style={{
              fontSize: '1rem',
              fontWeight: '500',
              marginBottom: '0.75rem',
              color: '#334155'
            }}>
              DL365 Balance
            </h3>
            <p style={{
              fontSize: '2rem',
              fontWeight: 'bold',
              color: '#3b82f6'
            }}>
              {loading ? '...' : `${stats.dl365Balance.toFixed(2)}`}
            </p>
          </div>

          <div style={{
            background: '#ffffff',
            padding: '2rem',
            borderRadius: '1rem',
            border: '2px solid rgba(20, 184, 166, 0.15)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💵</div>
            <h3 style={{
              fontSize: '1rem',
              fontWeight: '500',
              marginBottom: '0.75rem',
              color: '#334155'
            }}>
              USD Earnings
            </h3>
            <p style={{
              fontSize: '2rem',
              fontWeight: 'bold',
              color: '#14b8a6'
            }}>
              {loading ? '...' : `$${stats.totalEarnings.toFixed(2)}`}
            </p>
          </div>

          <div style={{
            background: '#ffffff',
            padding: '2rem',
            borderRadius: '1rem',
            border: '2px solid rgba(168, 85, 247, 0.15)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎮</div>
            <h3 style={{
              fontSize: '1rem',
              fontWeight: '500',
              marginBottom: '0.75rem',
              color: '#334155'
            }}>
              Game Library
            </h3>
            <p style={{
              fontSize: '2rem',
              fontWeight: 'bold',
              color: '#a855f7'
            }}>
              {loading ? '...' : stats.totalGames}
            </p>
          </div>

          <div style={{
            background: '#ffffff',
            padding: '2rem',
            borderRadius: '1rem',
            border: '2px solid rgba(239, 68, 68, 0.15)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📡</div>
            <h3 style={{
              fontSize: '1rem',
              fontWeight: '500',
              marginBottom: '0.75rem',
              color: '#334155'
            }}>
              Active Streams
            </h3>
            <p style={{
              fontSize: '2rem',
              fontWeight: 'bold',
              color: '#ef4444'
            }}>
              {loading ? '...' : stats.activeStreams}
            </p>
          </div>

          <div style={{
            background: '#ffffff',
            padding: '2rem',
            borderRadius: '1rem',
            border: '2px solid rgba(34, 197, 94, 0.15)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🖥️</div>
            <h3 style={{
              fontSize: '1rem',
              fontWeight: '500',
              marginBottom: '0.75rem',
              color: '#334155'
            }}>
              Equipment Rentals
            </h3>
            <p style={{
              fontSize: '2rem',
              fontWeight: 'bold',
              color: '#22c55e'
            }}>
              {loading ? '...' : stats.equipmentRentals}
            </p>
          </div>

          {userRole === 'Miner' && (
            <div style={{
              background: '#ffffff',
              padding: '2rem',
              borderRadius: '1rem',
              border: '2px solid rgba(251, 146, 60, 0.15)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)'
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🏪</div>
              <h3 style={{
                fontSize: '1rem',
                fontWeight: '500',
                marginBottom: '0.75rem',
                color: '#334155'
              }}>
                Marketplace Listings
              </h3>
              <p style={{
                fontSize: '2rem',
                fontWeight: 'bold',
                color: '#fb923c'
              }}>
                {loading ? '...' : stats.marketplaceListings}
              </p>
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem', marginTop: '3rem' }}>
          <div style={{
            background: '#ffffff',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
            padding: '2rem',
            borderRadius: '1rem',
            border: '1px solid rgba(148, 163, 184, 0.2)'
          }}>
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: '600',
              marginBottom: '1.5rem',
              color: '#1f2937'
            }}>
              Quick Actions
            </h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '1rem'
            }}>
              <button
                onClick={() => navigate('/streaming')}
                style={{
                  padding: '1.25rem',
                  borderRadius: '0.75rem',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  background: 'rgba(16, 185, 129, 0.1)',
                  color: '#10b981',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: '600',
                  transition: 'all 0.2s'
                }}
              >
                {userRole === 'Miner' ? '⛏️ Stream Mining Rig' : '🎮 Stream Gameplay'}
              </button>
              <button
                onClick={() => navigate('/games')}
                style={{
                  padding: '1.25rem',
                  borderRadius: '0.75rem',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  background: 'rgba(59, 130, 246, 0.1)',
                  color: '#3b82f6',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: '600',
                  transition: 'all 0.2s'
                }}
              >
                Browse Games
              </button>
              <button
                onClick={() => navigate('/marketplace')}
                style={{
                  padding: '1.25rem',
                  borderRadius: '0.75rem',
                  border: '1px solid rgba(168, 85, 247, 0.3)',
                  background: 'rgba(168, 85, 247, 0.1)',
                  color: '#a855f7',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: '600',
                  transition: 'all 0.2s'
                }}
              >
                🏪 Marketplace
              </button>
              <button
                onClick={() => navigate('/wallet')}
                style={{
                  padding: '1.25rem',
                  borderRadius: '0.75rem',
                  border: '1px solid rgba(20, 184, 166, 0.3)',
                  background: 'rgba(20, 184, 166, 0.1)',
                  color: '#14b8a6',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: '600',
                  transition: 'all 0.2s'
                }}
              >
                💰 View Wallet
              </button>
            </div>
          </div>

          <div style={{
            background: '#ffffff',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
            padding: '2rem',
            borderRadius: '1rem',
            border: '1px solid rgba(148, 163, 184, 0.2)'
          }}>
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: '600',
              marginBottom: '1.5rem',
              color: '#1f2937'
            }}>
              Recent Activity
            </h2>
            {recentTransactions.length === 0 ? (
              <p style={{ color: '#334155', fontSize: '0.875rem', textAlign: 'center', padding: '2rem 0' }}>
                No recent activity
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {recentTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    style={{
                      padding: '0.75rem',
                      background: '#f8fafc',
                      borderRadius: '0.5rem',
                      border: '1px solid rgba(0, 0, 0, 0.05)'
                    }}
                  >
                    <div style={{
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      marginBottom: '0.25rem',
                      color: '#1f2937'
                    }}>
                      {tx.description || tx.type}
                    </div>
                    <div style={{
                      fontSize: '0.75rem',
                      color: '#334155'
                    }}>
                      {tx.amount > 0 ? '+' : ''}{tx.amount.toFixed(2)} DL365
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{
          marginTop: '2rem',
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

      {showSocialModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            padding: '2rem',
            borderRadius: '1rem',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
          }}>
            <h3 style={{
              fontSize: '1.5rem',
              fontWeight: '600',
              marginBottom: '1.5rem',
              color: '#1f2937'
            }}>
              Connect Social Media Account
            </h3>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                Platform
              </label>
              <select
                value={newSocialPlatform}
                onChange={(e) => setNewSocialPlatform(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  fontSize: '0.95rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
              >
                <option value="">Select a platform</option>
                <option value="x">X (Twitter)</option>
                <option value="tiktok">TikTok</option>
                <option value="instagram">Instagram</option>
                <option value="youtube">YouTube</option>
                <option value="twitch">Twitch</option>
                <option value="facebook">Facebook</option>
                <option value="linkedin">LinkedIn</option>
                <option value="discord">Discord</option>
              </select>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#374151',
                cursor: 'pointer'
              }}>
                <input
                  type="checkbox"
                  checked={isCompanyLink}
                  onChange={(e) => setIsCompanyLink(e.target.checked)}
                  style={{
                    width: '1rem',
                    height: '1rem',
                    cursor: 'pointer'
                  }}
                />
                <span>This is a company-wide link (visible on homepage)</span>
              </label>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                Username/Handle
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute',
                  left: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#6b7280',
                  fontSize: '0.95rem'
                }}>
                  @
                </span>
                <input
                  type="text"
                  value={newSocialUsername}
                  onChange={(e) => setNewSocialUsername(e.target.value)}
                  placeholder="yourusername"
                  style={{
                    width: '100%',
                    padding: '0.75rem 0.75rem 0.75rem 2rem',
                    fontSize: '0.95rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    outline: 'none',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowSocialModal(false)
                  setNewSocialPlatform('')
                  setNewSocialUsername('')
                  setIsCompanyLink(false)
                }}
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #d1d5db',
                  background: 'white',
                  color: '#374151',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
              >
                Cancel
              </button>
              <button
                onClick={handleAddSocialConnection}
                disabled={!newSocialPlatform || !newSocialUsername}
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  background: (!newSocialPlatform || !newSocialUsername)
                    ? '#d1d5db'
                    : 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
                  color: 'white',
                  cursor: (!newSocialPlatform || !newSocialUsername) ? 'not-allowed' : 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  transition: 'all 0.2s',
                  opacity: (!newSocialPlatform || !newSocialUsername) ? 0.6 : 1
                }}
              >
                Connect Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
