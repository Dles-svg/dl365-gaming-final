import { useState, useRef, useEffect } from 'react'
import { WebRTCViewer } from '../lib/webrtc'
import { useStreaming } from '../hooks/useStreaming'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import StreamChat from './StreamChat'
import { InputCapture, type RemoteInputEvent } from '../lib/remoteInput'

interface Stream {
  id: string
  user_id: string
  session_name: string
  stream_title: string
  stream_description: string
  stream_type: 'mining' | 'gaming'
  status: string
  viewers: number
}

interface Props {
  stream: Stream
  onBack: () => void
}

export default function StreamViewer({ stream, onBack }: Props) {
  const { user } = useAuth()
  const videoRef = useRef<HTMLVideoElement>(null)
  const videoContainerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<WebRTCViewer | null>(null)
  const inputCaptureRef = useRef<InputCapture | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState('')
  const [viewerCount, setViewerCount] = useState(stream.viewers)
  const [quality, setQuality] = useState('1080p')
  const [viewerId, setViewerId] = useState<string | null>(null)
  const [connectionState, setConnectionState] = useState<string>('new')
  const [remoteControlEnabled, setRemoteControlEnabled] = useState(false)

  const { saveSignal, subscribeToSignals } = useStreaming()

  useEffect(() => {
    connectToStream()
    trackViewer()

    const viewerSubscription = supabase
      .channel(`viewers:${stream.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stream_viewers',
          filter: `session_id=eq.${stream.id}`
        },
        async () => {
          const { count } = await supabase
            .from('stream_viewers')
            .select('*', { count: 'exact', head: true })
            .eq('session_id', stream.id)
            .is('left_at', null)

          if (count !== null) {
            setViewerCount(count)
            await supabase
              .from('streaming_sessions')
              .update({ viewers: count })
              .eq('id', stream.id)
          }
        }
      )
      .subscribe()

    const checkConnectionState = setInterval(() => {
      if (viewerRef.current) {
        const state = viewerRef.current.getConnectionState()
        if (state) {
          setConnectionState(state)
        }
      }
    }, 1000)

    return () => {
      if (viewerRef.current) {
        viewerRef.current.stopViewing()
      }
      if (inputCaptureRef.current) {
        inputCaptureRef.current.stopCapture()
      }
      saveSignal(stream.id, stream.user_id, 'viewer-left', {})
      leaveStream()
      supabase.removeChannel(viewerSubscription)
      clearInterval(checkConnectionState)
    }
  }, [])

  const toggleRemoteControl = () => {
    if (!videoContainerRef.current || !viewerRef.current) return

    if (remoteControlEnabled) {
      if (inputCaptureRef.current) {
        inputCaptureRef.current.stopCapture()
        inputCaptureRef.current = null
      }
      setRemoteControlEnabled(false)
    } else {
      inputCaptureRef.current = new InputCapture(videoContainerRef.current)
      inputCaptureRef.current.startCapture((event: RemoteInputEvent) => {
        if (viewerRef.current) {
          viewerRef.current.sendInput(event)
        }
      })
      setRemoteControlEnabled(true)
    }
  }

  const trackViewer = async () => {
    if (!user) return

    const { data } = await supabase
      .from('stream_viewers')
      .insert({
        session_id: stream.id,
        viewer_id: user.id
      })
      .select()
      .single()

    if (data) {
      setViewerId(data.id)
    }
  }

  const leaveStream = async () => {
    if (!viewerId) return

    await supabase
      .from('stream_viewers')
      .update({ left_at: new Date().toISOString() })
      .eq('id', viewerId)
  }

  const connectToStream = async () => {
    try {
      setError('')

      await saveSignal(stream.id, stream.user_id, 'viewer-joined', {})

      const unsubscribe = subscribeToSignals(stream.id, async (signal) => {
        if (signal.signal_type === 'offer' && signal.from_user_id === stream.user_id) {
          viewerRef.current = new WebRTCViewer()

          viewerRef.current.onAnswer(async (answer) => {
            await saveSignal(stream.id, stream.user_id, 'answer', answer)
          })

          viewerRef.current.onIceCandidate(async (candidate) => {
            await saveSignal(stream.id, stream.user_id, 'ice-candidate', candidate)
          })

          if (videoRef.current) {
            await viewerRef.current.startViewing(videoRef.current, signal.signal_data)
            setIsConnected(true)
          }
        } else if (signal.signal_type === 'ice-candidate' && signal.from_user_id === stream.user_id && viewerRef.current) {
          await viewerRef.current.addIceCandidate(signal.signal_data)
        }
      })

      return unsubscribe
    } catch (err: any) {
      setError(err.message || 'Failed to connect to stream')
      console.error('Viewer error:', err)
    }
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
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
        ← Back to Streams
      </button>

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
        gridTemplateColumns: '2.5fr 1fr',
        gap: '2rem'
      }}>
        <div>
          <div
            ref={videoContainerRef}
            style={{
              background: '#000',
              borderRadius: '1rem',
              overflow: 'hidden',
              marginBottom: '1.5rem',
              aspectRatio: '16/9',
              position: 'relative',
              outline: remoteControlEnabled ? '3px solid #10b981' : 'none',
              cursor: remoteControlEnabled ? 'crosshair' : 'default'
            }}
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                pointerEvents: remoteControlEnabled ? 'none' : 'auto'
              }}
            />
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
            <div style={{
              position: 'absolute',
              top: '1rem',
              right: '1rem',
              display: 'flex',
              gap: '0.5rem'
            }}>
              <div style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
                background: 'rgba(0, 0, 0, 0.7)',
                color: 'white',
                fontSize: '0.875rem',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                👁 {viewerCount}
              </div>
              <select
                value={quality}
                onChange={(e) => setQuality(e.target.value)}
                style={{
                  padding: '0.5rem',
                  borderRadius: '0.5rem',
                  background: 'rgba(0, 0, 0, 0.7)',
                  color: 'white',
                  border: 'none',
                  fontSize: '0.875rem',
                  cursor: 'pointer'
                }}
              >
                <option value="720p">720p</option>
                <option value="1080p">1080p</option>
                <option value="1440p">1440p</option>
                <option value="4k">4K</option>
              </select>
            </div>
            {!isConnected && (
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                color: '#94a3b8',
                fontSize: '1.125rem'
              }}>
                Connecting to stream...
              </div>
            )}
            {remoteControlEnabled && (
              <div style={{
                position: 'absolute',
                bottom: '1rem',
                left: '50%',
                transform: 'translateX(-50%)',
                padding: '0.75rem 1.5rem',
                borderRadius: '0.5rem',
                background: 'rgba(16, 185, 129, 0.9)',
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
                  background: 'white',
                  animation: 'pulse 1.5s infinite'
                }} />
                Remote Control Active
              </div>
            )}
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <button
              onClick={toggleRemoteControl}
              disabled={!isConnected}
              style={{
                width: '100%',
                padding: '1rem',
                borderRadius: '0.5rem',
                border: 'none',
                background: remoteControlEnabled
                  ? 'linear-gradient(135deg, #ef4444 0%, #f97316 100%)'
                  : 'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)',
                color: 'white',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: isConnected ? 'pointer' : 'not-allowed',
                opacity: isConnected ? 1 : 0.5
              }}
            >
              {remoteControlEnabled ? '🎮 Stop Remote Control' : '🎮 Enable Remote Control'}
            </button>
            {remoteControlEnabled && (
              <div style={{
                marginTop: '0.5rem',
                padding: '0.75rem',
                background: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                color: '#94a3b8'
              }}>
                Click on the video to control the remote computer. Use your keyboard and mouse as normal.
              </div>
            )}
          </div>

          <div style={{
            background: 'rgba(30, 41, 59, 0.5)',
            padding: '1.5rem',
            borderRadius: '1rem',
            border: '1px solid rgba(148, 163, 184, 0.2)'
          }}>
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: '600',
              marginBottom: '0.5rem'
            }}>
              {stream.stream_title}
            </h2>
            <p style={{
              color: '#94a3b8',
              fontSize: '0.875rem',
              marginBottom: '1rem'
            }}>
              {stream.stream_description || 'No description'}
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{
                padding: '0.75rem 1rem',
                background: 'rgba(59, 130, 246, 0.1)',
                borderRadius: '0.5rem',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                fontSize: '0.875rem'
              }}>
                <span style={{ color: '#94a3b8' }}>Type: </span>
                <span style={{ fontWeight: '600' }}>
                  {stream.stream_type === 'mining' ? '⛏️ Mining' : '🎮 Gaming'}
                </span>
              </div>
              <div style={{
                padding: '0.75rem 1rem',
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
                fontSize: '0.875rem'
              }}>
                <span style={{ color: '#94a3b8' }}>Status: </span>
                <span style={{
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
                  {connectionState === 'failed' && '✗ Failed'}
                  {connectionState === 'disconnected' && '○ Disconnected'}
                  {connectionState === 'new' && '○ Initializing'}
                </span>
              </div>
              <div style={{
                padding: '0.75rem 1rem',
                background: 'rgba(16, 185, 129, 0.1)',
                borderRadius: '0.5rem',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                fontSize: '0.875rem'
              }}>
                <span style={{ color: '#10b981', fontWeight: '600' }}>
                  FREE BETA TEST
                </span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', height: '800px' }}>
          <StreamChat sessionId={stream.id} />
        </div>
      </div>
    </div>
  )
}
