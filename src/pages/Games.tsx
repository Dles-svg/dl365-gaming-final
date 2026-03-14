import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { CloudGaming } from '../components/CloudGaming'

interface Game {
  id: string
  title: string
  description: string
  image_url: string
  blockchain: string
  genre: string
  price_per_hour: number
  cover_image?: string
  min_specs?: any
  recommended_specs?: any
  game_type?: 'local' | 'cloud' | 'both'
  executable_path?: string
}

interface UserGame {
  id: string
  game_id: string
  hours_played: number
  last_played: string
  game: Game
}

export default function Games() {
  const { user, signOut } = useAuth()
  const [games, setGames] = useState<Game[]>([])
  const [myLibrary, setMyLibrary] = useState<UserGame[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'all' | 'library'>('all')
  const [cloudGamingGame, setCloudGamingGame] = useState<{ id: string, name: string } | null>(null)

  useEffect(() => {
    loadGames()
    loadLibrary()
  }, [user])

  const loadGames = async () => {
    const { data } = await supabase
      .from('games')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (data) {
      setGames(data)
    }
    setLoading(false)
  }

  const loadLibrary = async () => {
    if (!user) return

    const { data } = await supabase
      .from('user_games')
      .select(`
        *,
        game:games(*)
      `)
      .eq('user_id', user.id)
      .order('last_played', { ascending: false, nullsFirst: false })

    if (data) {
      setMyLibrary(data as any)
    }
  }

  const addToLibrary = async (gameId: string) => {
    if (!user) return

    const { error } = await supabase
      .from('user_games')
      .insert({
        user_id: user.id,
        game_id: gameId,
        hours_played: 0
      })

    if (!error) {
      loadLibrary()
    }
  }

  const isInLibrary = (gameId: string) => {
    return myLibrary.some(ug => ug.game_id === gameId)
  }

  const startSession = async (gameId: string, sessionType: 'local' | 'cloud') => {
    if (!user) return

    const game = games.find(g => g.id === gameId) || myLibrary.find(ug => ug.game_id === gameId)?.game

    if (!game) return

    if (sessionType === 'local') {
      if (window.electronAPI?.launchLocalGame && game.executable_path) {
        const result = await window.electronAPI.launchLocalGame(game.executable_path)

        if (result.success) {
          const { error } = await supabase
            .from('game_sessions')
            .insert({
              user_id: user.id,
              game_id: gameId,
              status: 'active',
              session_type: 'local'
            })

          if (!error) {
            alert(`${game.title} launched successfully!`)
          }
        } else {
          alert(result.error || 'Failed to launch game. Make sure the game is installed.')
        }
      } else {
        alert('Local game launch is only available in the desktop app. Please download and install the Daylight ES365 desktop application.')
      }
    } else {
      setCloudGamingGame({ id: gameId, name: game.title })
    }
  }

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
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: 'bold',
            marginBottom: '0.5rem'
          }}>
            Game Library
          </h1>
          <p style={{
            color: '#94a3b8',
            fontSize: '1.125rem'
          }}>
            Browse games and manage your library
          </p>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
          <button
            onClick={() => setActiveTab('all')}
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '0.5rem',
              border: `1px solid ${activeTab === 'all' ? '#3b82f6' : 'rgba(148, 163, 184, 0.2)'}`,
              background: activeTab === 'all' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
              color: activeTab === 'all' ? '#3b82f6' : '#94a3b8',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: '600'
            }}
          >
            All Games ({games.length})
          </button>
          <button
            onClick={() => setActiveTab('library')}
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '0.5rem',
              border: `1px solid ${activeTab === 'library' ? '#3b82f6' : 'rgba(148, 163, 184, 0.2)'}`,
              background: activeTab === 'library' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
              color: activeTab === 'library' ? '#3b82f6' : '#94a3b8',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: '600'
            }}
          >
            My Library ({myLibrary.length})
          </button>
        </div>

        {loading ? (
          <p style={{ color: '#94a3b8' }}>Loading games...</p>
        ) : activeTab === 'all' ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
            gap: '2rem'
          }}>
            {games.map((game) => (
              <div
                key={game.id}
                style={{
                  background: 'rgba(30, 41, 59, 0.5)',
                  borderRadius: '1rem',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  overflow: 'hidden'
                }}
              >
                <img
                  src={game.image_url}
                  alt={game.title}
                  style={{
                    width: '100%',
                    height: '200px',
                    objectFit: 'cover'
                  }}
                />
                <div style={{ padding: '1.5rem' }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'start',
                    marginBottom: '1rem'
                  }}>
                    <h3 style={{
                      fontSize: '1.5rem',
                      fontWeight: '600',
                      marginBottom: '0.5rem'
                    }}>
                      {game.title}
                    </h3>
                    {game.blockchain && (
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '0.5rem',
                        background: 'rgba(59, 130, 246, 0.2)',
                        color: '#3b82f6',
                        fontSize: '0.75rem',
                        fontWeight: '600'
                      }}>
                        {game.blockchain}
                      </span>
                    )}
                  </div>
                  <p style={{
                    color: '#94a3b8',
                    marginBottom: '1rem',
                    fontSize: '0.875rem'
                  }}>
                    {game.description}
                  </p>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '1rem'
                  }}>
                    <span style={{
                      color: '#64748b',
                      fontSize: '0.875rem'
                    }}>
                      {game.genre || 'Action'}
                    </span>
                    {game.price_per_hour > 0 && (
                      <span style={{
                        color: '#14b8a6',
                        fontWeight: '600'
                      }}>
                        ${game.price_per_hour}/hr
                      </span>
                    )}
                  </div>
                  {isInLibrary(game.id) ? (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {(game.game_type === 'local' || game.game_type === 'both') && (
                        <button
                          onClick={() => startSession(game.id, 'local')}
                          style={{
                            flex: 1,
                            padding: '0.75rem',
                            borderRadius: '0.5rem',
                            border: 'none',
                            background: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            fontWeight: '600'
                          }}
                        >
                          Play Local
                        </button>
                      )}
                      {(game.game_type === 'cloud' || game.game_type === 'both') && (
                        <button
                          onClick={() => startSession(game.id, 'cloud')}
                          style={{
                            flex: 1,
                            padding: '0.75rem',
                            borderRadius: '0.5rem',
                            border: 'none',
                            background: 'linear-gradient(135deg, #14b8a6 0%, #06b6d4 100%)',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            fontWeight: '600'
                          }}
                        >
                          Cloud Play
                        </button>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => addToLibrary(game.id)}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        borderRadius: '0.5rem',
                        border: '1px solid rgba(59, 130, 246, 0.5)',
                        background: 'transparent',
                        color: '#3b82f6',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        fontWeight: '600'
                      }}
                    >
                      Add to Library
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          myLibrary.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '4rem 2rem',
              background: 'rgba(30, 41, 59, 0.5)',
              borderRadius: '1rem',
              border: '1px solid rgba(148, 163, 184, 0.2)'
            }}>
              <p style={{ color: '#94a3b8', fontSize: '1.125rem', marginBottom: '1rem' }}>
                Your library is empty
              </p>
              <button
                onClick={() => setActiveTab('all')}
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: '600'
                }}
              >
                Browse Games
              </button>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
              gap: '2rem'
            }}>
              {myLibrary.map((userGame) => (
                <div
                  key={userGame.id}
                  style={{
                    background: 'rgba(30, 41, 59, 0.5)',
                    borderRadius: '1rem',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    overflow: 'hidden'
                  }}
                >
                  <img
                    src={userGame.game.image_url}
                    alt={userGame.game.title}
                    style={{
                      width: '100%',
                      height: '200px',
                      objectFit: 'cover'
                    }}
                  />
                  <div style={{ padding: '1.5rem' }}>
                    <h3 style={{
                      fontSize: '1.5rem',
                      fontWeight: '600',
                      marginBottom: '0.5rem'
                    }}>
                      {userGame.game.title}
                    </h3>
                    <p style={{
                      color: '#94a3b8',
                      marginBottom: '1rem',
                      fontSize: '0.875rem'
                    }}>
                      {userGame.game.description}
                    </p>
                    <div style={{
                      display: 'flex',
                      gap: '1rem',
                      marginBottom: '1rem',
                      padding: '0.75rem',
                      background: 'rgba(59, 130, 246, 0.05)',
                      borderRadius: '0.5rem'
                    }}>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Playtime</div>
                        <div style={{ fontWeight: '600', color: '#3b82f6' }}>
                          {userGame.hours_played.toFixed(1)}h
                        </div>
                      </div>
                      {userGame.last_played && (
                        <div>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Last Played</div>
                          <div style={{ fontWeight: '600', color: '#cbd5e1', fontSize: '0.875rem' }}>
                            {new Date(userGame.last_played).toLocaleDateString()}
                          </div>
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {(userGame.game.game_type === 'local' || userGame.game.game_type === 'both') && (
                        <button
                          onClick={() => startSession(userGame.game_id, 'local')}
                          style={{
                            flex: 1,
                            padding: '0.75rem',
                            borderRadius: '0.5rem',
                            border: 'none',
                            background: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            fontWeight: '600'
                          }}
                        >
                          Play Local
                        </button>
                      )}
                      {(userGame.game.game_type === 'cloud' || userGame.game.game_type === 'both') && (
                        <button
                          onClick={() => startSession(userGame.game_id, 'cloud')}
                          style={{
                            flex: 1,
                            padding: '0.75rem',
                            borderRadius: '0.5rem',
                            border: 'none',
                            background: 'linear-gradient(135deg, #14b8a6 0%, #06b6d4 100%)',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            fontWeight: '600'
                          }}
                        >
                          Cloud Play
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        <div style={{
          marginTop: '3rem',
          paddingTop: '2rem',
          borderTop: '1px solid rgba(148, 163, 184, 0.2)',
          textAlign: 'center'
        }}>
          <p style={{ color: '#94a3b8', marginBottom: '1rem' }}>
            Cloud Play games are streamed from miners' equipment. Miners earn DL365 tokens when you rent their hardware.
          </p>
          <Link to="/wallet" style={{
            display: 'inline-block',
            padding: '0.75rem 1.5rem',
            borderRadius: '0.5rem',
            background: 'linear-gradient(135deg, #14b8a6 0%, #06b6d4 100%)',
            color: 'white',
            textDecoration: 'none',
            fontSize: '1rem',
            fontWeight: '600',
            boxShadow: '0 4px 6px rgba(20, 184, 166, 0.3)'
          }}>
            View Wallet Balance
          </Link>
        </div>
      </main>

      {cloudGamingGame && (
        <CloudGaming
          gameId={cloudGamingGame.id}
          gameName={cloudGamingGame.name}
          onClose={() => setCloudGamingGame(null)}
        />
      )}
    </div>
  )
}
