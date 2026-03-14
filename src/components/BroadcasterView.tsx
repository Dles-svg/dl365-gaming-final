import { useState, useRef, useEffect } from 'react'
import { WebRTCBroadcaster } from '../lib/webrtc'
import { useStreaming } from '../hooks/useStreaming'
import { InputExecutor, type RemoteInputEvent } from '../lib/remoteInput'

interface Props {
  streamType: 'mining' | 'gaming'
  onBack: () => void
}

export default function BroadcasterView({ streamType, onBack }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const broadcasterRef = useRef<WebRTCBroadcaster | null>(null)
  const inputExecutorRef = useRef<InputExecutor | null>(null)
  const [isLive, setIsLive] = useState(false)
  const [streamTitle, setStreamTitle] = useState('')
  const [streamDescription, setStreamDescription] = useState('')
  const [currentStreamId, setCurrentStreamId] = useState<string | null>(null)
  const [viewerCount, setViewerCount] = useState(0)
  const [error, setError] = useState('')
  const [sources, setSources] = useState<Array<{id: string, name: string, thumbnail: string}>>([])
  const [selectedSource, setSelectedSource] = useState<string | null>(null)
  const [isElectron, setIsElectron] = useState(false)
  const [connectionState, setConnectionState] = useState<string>('new')
  const [remoteInputActive, setRemoteInputActive] = useState(false)
  const [lastInputEvent, setLastInputEvent] = useState<string>('')

  const { createStream, startStream, stopStream, saveSignal, subscribeToSignals } = useStreaming()

  useEffect(() => {
    inputExecutorRef.current = new InputExecutor()
    inputExecutorRef.current.onInput((event: RemoteInputEvent) => {
      setLastInputEvent(`${event.type} at ${new Date().toLocaleTimeString()}`)
    })
  }, [])

  useEffect(() => {
    if (window.electronAPI?.isElectron) {
      setIsElectron(true)
      loadSources()
    }
  }, [])

  const loadSources = async () => {
    if (window.electronAPI?.getSources) {
      const availableSources = await window.electronAPI.getSources()
      setSources(availableSources)
    }
  }

  useEffect(() => {
    return () => {
      if (broadcasterRef.current) {
        broadcasterRef.current.stopBroadcast()
      }
    }
  }, [])

  useEffect(() => {
    if (!currentStreamId) return

    const unsubscribe = subscribeToSignals(currentStreamId, async (signal) => {
      if (signal.signal_type === 'answer' && broadcasterRef.current) {
        await broadcasterRef.current.handleAnswer(signal.signal_data)
      } else if (signal.signal_type === 'ice-candidate' && broadcasterRef.current) {
        await broadcasterRef.current.addIceCandidate(signal.signal_data)
      } else if (signal.signal_type === 'viewer-joined') {
        setViewerCount(prev => prev + 1)
      } else if (signal.signal_type === 'viewer-left') {
        setViewerCount(prev => Math.max(0, prev - 1))
      }
    })

    const checkConnectionState = setInterval(() => {
      if (broadcasterRef.current) {
        const state = broadcasterRef.current.getConnectionState()
        if (state) {
          setConnectionState(state)
        }
      }
    }, 1000)

    return () => {
      unsubscribe()
      clearInterval(checkConnectionState)
    }
  }, [currentStreamId])

  const handleStartBroadcast = async () => {
    if (!streamTitle.trim()) {
      setError('Please enter a stream title')
      return
    }

    try {
      setError('')

      const stream = await createStream(streamTitle, streamDescription, streamType)
      setCurrentStreamId(stream.id)

      broadcasterRef.current = new WebRTCBroadcaster()

      broadcasterRef.current.onOffer(async (offer) => {
        await saveSignal(stream.id, null, 'offer', offer)
      })

      broadcasterRef.current.onIceCandidate(async (candidate) => {
        await saveSignal(stream.id, null, 'ice-candidate', candidate)
      })

      broadcasterRef.current.onRemoteInput((inputData) => {
        if (inputExecutorRef.current) {
          inputExecutorRef.current.executeInput(inputData)
          setRemoteInputActive(true)
          setTimeout(() => setRemoteInputActive(false), 100)
        }
      })

      if (videoRef.current) {
        if (isElectron && selectedSource) {
          const mediaStream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
              mandatory: {
                chromeMediaSource: 'desktop',
                chromeMediaSourceId: selectedSource
              }
            } as any
          })
          videoRef.current.srcObject = mediaStream
          await broadcasterRef.current.startBroadcastWithStream(mediaStream)
        } else {
          await broadcasterRef.current.startBroadcast(
            videoRef.current,
            streamType === 'mining' ? 'screen' : 'camera'
          )
        }

        await startStream(stream.id)
        setIsLive(true)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to start broadcast')
      console.error('Broadcast error:', err)
    }
  }

  const handleStopBroadcast = async () => {
    if (broadcasterRef.current) {
      broadcasterRef.current.stopBroadcast()
      broadcasterRef.current = null
    }

    if (currentStreamId) {
      await stopStream(currentStreamId)
      setCurrentStreamId(null)
    }

    setIsLive(false)
    setStreamTitle('')
    setStreamDescription('')
    setViewerCount(0)
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <button
        onClick={onBack}
        style={{
          marginBottom: '2rem',
          padding: '0.5rem 1rem',
          borderRadius: '0.5rem',
          border: '1px solid rgba(148, 163, 184, 0.3)',
          background: 'transparent',
          color: '#94a3b8',
          cursor: 'pointer',
          fontSize: '0.875rem'
        }}
      >
        ← Back
      </button>

      <h1 style={{
        fontSize: '2rem',
        fontWeight: 'bold',
        marginBottom: '0.5rem'
      }}>
        {streamType === 'mining' ? 'Stream Your Mining Rig' : 'Stream Your Gameplay'}
      </h1>
      <div style={{
        marginBottom: '2rem',
        padding: '1rem',
        background: 'rgba(16, 185, 129, 0.1)',
        border: '1px solid rgba(16, 185, 129, 0.2)',
        borderRadius: '0.5rem'
      }}>
        <div style={{ color: '#10b981', fontWeight: '600', marginBottom: '0.25rem' }}>
          BETA TESTING MODE
        </div>
        <div style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
          Streaming is currently FREE for testing. No DL365 coins will be charged.
        </div>
      </div>

      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#fca5a5',
          padding: '1rem',
          borderRadius: '0.5rem',
          marginBottom: '1.5rem'
        }}>
          {error}
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: isLive ? '2fr 1fr' : '1fr',
        gap: '2rem'
      }}>
        <div>
          <div style={{
            background: '#000',
            borderRadius: '1rem',
            overflow: 'hidden',
            marginBottom: '1.5rem',
            aspectRatio: '16/9',
            position: 'relative'
          }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain'
              }}
            />
            {isLive && (
              <div style={{
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
              </div>
            )}
          </div>

          {!isLive ? (
            <div>
              {isElectron && sources.length > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontSize: '0.875rem',
                    fontWeight: '500'
                  }}>
                    Select Screen/Window to Share
                  </label>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                    gap: '0.5rem',
                    marginBottom: '1rem'
                  }}>
                    {sources.map(source => (
                      <div
                        key={source.id}
                        onClick={() => setSelectedSource(source.id)}
                        style={{
                          padding: '0.5rem',
                          borderRadius: '0.5rem',
                          border: selectedSource === source.id
                            ? '2px solid #10b981'
                            : '1px solid rgba(148, 163, 184, 0.3)',
                          background: 'rgba(15, 23, 42, 0.5)',
                          cursor: 'pointer',
                          textAlign: 'center'
                        }}
                      >
                        <img
                          src={source.thumbnail}
                          alt={source.name}
                          style={{
                            width: '100%',
                            height: '80px',
                            objectFit: 'cover',
                            borderRadius: '0.25rem',
                            marginBottom: '0.25rem'
                          }}
                        />
                        <div style={{
                          fontSize: '0.75rem',
                          color: '#94a3b8',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {source.name}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}>
                  Stream Title
                </label>
                <input
                  type="text"
                  value={streamTitle}
                  onChange={(e) => setStreamTitle(e.target.value)}
                  placeholder={streamType === 'mining' ? 'My Mining Rig' : 'Epic Gaming Session'}
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
                  Description
                </label>
                <textarea
                  value={streamDescription}
                  onChange={(e) => setStreamDescription(e.target.value)}
                  placeholder="Tell viewers what you're streaming..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    border: '1px solid rgba(148, 163, 184, 0.3)',
                    background: 'rgba(15, 23, 42, 0.5)',
                    color: '#f1f5f9',
                    fontSize: '1rem',
                    resize: 'vertical'
                  }}
                />
              </div>
              <button
                onClick={handleStartBroadcast}
                style={{
                  width: '100%',
                  padding: '1rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  background: 'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)',
                  color: 'white',
                  fontSize: '1.125rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Start Broadcasting
              </button>
            </div>
          ) : (
            <button
              onClick={handleStopBroadcast}
              style={{
                width: '100%',
                padding: '1rem',
                borderRadius: '0.5rem',
                border: 'none',
                background: 'linear-gradient(135deg, #ef4444 0%, #f97316 100%)',
                color: 'white',
                fontSize: '1.125rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Stop Broadcasting
            </button>
          )}
        </div>

        {isLive && (
          <div>
            <div style={{
              background: 'rgba(30, 41, 59, 0.5)',
              padding: '1.5rem',
              borderRadius: '1rem',
              border: '1px solid rgba(148, 163, 184, 0.2)'
            }}>
              <h2 style={{
                fontSize: '1.25rem',
                fontWeight: '600',
                marginBottom: '1rem'
              }}>
                Stream Info
              </h2>
              <div style={{ marginBottom: '1rem' }}>
                <div style={{
                  fontSize: '2.5rem',
                  fontWeight: 'bold',
                  color: '#3b82f6',
                  marginBottom: '0.25rem'
                }}>
                  {viewerCount}
                </div>
                <div style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
                  Current Viewers
                </div>
              </div>
              <div style={{
                padding: '1rem',
                background: connectionState === 'connected'
                  ? 'rgba(16, 185, 129, 0.1)'
                  : connectionState === 'failed'
                  ? 'rgba(239, 68, 68, 0.1)'
                  : 'rgba(59, 130, 246, 0.1)',
                borderRadius: '0.5rem',
                border: connectionState === 'connected'
                  ? '1px solid rgba(16, 185, 129, 0.2)'
                  : connectionState === 'failed'
                  ? '1px solid rgba(239, 68, 68, 0.2)'
                  : '1px solid rgba(59, 130, 246, 0.2)',
                marginTop: '1rem'
              }}>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem' }}>
                  Connection Status
                </div>
                <div style={{
                  color: connectionState === 'connected'
                    ? '#10b981'
                    : connectionState === 'failed'
                    ? '#ef4444'
                    : '#3b82f6',
                  fontWeight: '600',
                  textTransform: 'capitalize'
                }}>
                  {connectionState === 'connected' && '✓ Connected'}
                  {connectionState === 'connecting' && '⟳ Connecting...'}
                  {connectionState === 'failed' && '✗ Connection Failed'}
                  {connectionState === 'disconnected' && '○ Disconnected'}
                  {connectionState === 'new' && '○ Ready'}
                </div>
              </div>
              <div style={{
                padding: '1rem',
                background: remoteInputActive
                  ? 'rgba(16, 185, 129, 0.2)'
                  : 'rgba(30, 41, 59, 0.5)',
                borderRadius: '0.5rem',
                border: remoteInputActive
                  ? '1px solid rgba(16, 185, 129, 0.4)'
                  : '1px solid rgba(148, 163, 184, 0.2)',
                marginTop: '1rem',
                transition: 'all 0.2s ease'
              }}>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem' }}>
                  Remote Control Status
                </div>
                <div style={{
                  color: remoteInputActive ? '#10b981' : '#94a3b8',
                  fontWeight: '600',
                  fontSize: '0.875rem'
                }}>
                  {remoteInputActive ? '🎮 Input Received' : '⏸ Waiting for input...'}
                </div>
                {lastInputEvent && (
                  <div style={{
                    fontSize: '0.75rem',
                    color: '#64748b',
                    marginTop: '0.5rem'
                  }}>
                    Last: {lastInputEvent}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
