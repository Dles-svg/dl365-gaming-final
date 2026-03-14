import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

interface CloudGamingProps {
  gameId: string
  gameName: string
  onClose: () => void
}

interface EquipmentProfile {
  id: string
  profile_name: string
  tier: string
  hourly_rate: number
  specs: any
  availability_status: string
}

export function CloudGaming({ gameId, gameName, onClose }: CloudGamingProps) {
  const { user } = useAuth()
  const [equipment, setEquipment] = useState<EquipmentProfile[]>([])
  const [selectedEquipment, setSelectedEquipment] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [connected, setConnected] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)

  useEffect(() => {
    loadAvailableEquipment()
  }, [])

  const loadAvailableEquipment = async () => {
    const { data } = await supabase
      .from('miner_profiles')
      .select('*')
      .eq('availability_status', 'available')
      .eq('is_accepting_rentals', true)
      .order('hourly_rate', { ascending: true })

    if (data) {
      setEquipment(data)
    }
    setLoading(false)
  }

  const startCloudSession = async () => {
    if (!selectedEquipment || !user) return

    setConnecting(true)

    try {
      const selectedEq = equipment.find(e => e.id === selectedEquipment)
      const totalCost = selectedEq?.hourly_rate || 0
      const platformFee = totalCost * 0.20
      const minerPayout = totalCost * 0.80

      const rentalData = {
        gamer_id: user.id,
        miner_profile_id: selectedEquipment,
        start_time: new Date().toISOString(),
        end_time: new Date(Date.now() + 3600000).toISOString(),
        duration_hours: 1,
        total_cost: totalCost,
        platform_fee: platformFee,
        miner_payout: minerPayout,
        status: 'active'
      }

      const { data: rental, error: rentalError } = await supabase
        .from('equipment_rentals_v2')
        .insert(rentalData)
        .select()
        .single()

      if (rentalError) throw rentalError

      await supabase.rpc('deduct_balance', {
        user_id: user.id,
        amount: totalCost
      })

      const { data: minerProfile } = await supabase
        .from('miner_profiles')
        .select('miner_id')
        .eq('id', selectedEquipment)
        .single()

      if (minerProfile?.miner_id) {
        await supabase.rpc('add_balance', {
          user_id: minerProfile.miner_id,
          amount: minerPayout
        })
      }

      const { error: sessionError } = await supabase
        .from('game_sessions')
        .insert({
          user_id: user.id,
          game_id: gameId,
          status: 'active',
          session_type: 'cloud',
          equipment_rental_id: rental.id
        })

      if (sessionError) throw sessionError

      await initializeWebRTC(rental.id)

      setConnected(true)
      setConnecting(false)
    } catch (error) {
      console.error('Failed to start cloud session:', error)
      alert('Failed to start cloud gaming session. Please try again.')
      setConnecting(false)
    }
  }

  const initializeWebRTC = async (rentalId: string) => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    })

    pc.ontrack = (event) => {
      if (videoRef.current && event.streams[0]) {
        videoRef.current.srcObject = event.streams[0]
      }
    }

    pc.onicecandidate = async (event) => {
      if (event.candidate) {
        await supabase
          .from('peer_connections')
          .update({
            ice_candidates: event.candidate
          })
          .eq('rental_id', rentalId)
      }
    }

    peerConnectionRef.current = pc
  }

  const endSession = async () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
    }

    setConnected(false)
    onClose()
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.9)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        borderRadius: '1rem',
        padding: '2rem',
        maxWidth: '900px',
        width: '90%',
        maxHeight: '90vh',
        overflow: 'auto',
        border: '1px solid rgba(148, 163, 184, 0.2)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem'
        }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
            Cloud Gaming: {gameName}
          </h2>
          <button
            onClick={endSession}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              border: '1px solid rgba(239, 68, 68, 0.5)',
              background: 'transparent',
              color: '#fca5a5',
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>

        {!connected ? (
          <>
            <p style={{ color: '#94a3b8', marginBottom: '1.5rem' }}>
              Select a miner's equipment to stream this game. Miners earn 80% of the rental fee (platform takes 20% commission).
            </p>

            {loading ? (
              <p style={{ color: '#94a3b8' }}>Loading available equipment...</p>
            ) : equipment.length === 0 ? (
              <p style={{ color: '#94a3b8' }}>No equipment available right now. Please try again later.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                {equipment.map((eq) => (
                  <div
                    key={eq.id}
                    onClick={() => setSelectedEquipment(eq.id)}
                    style={{
                      padding: '1rem',
                      borderRadius: '0.5rem',
                      border: `2px solid ${selectedEquipment === eq.id ? '#3b82f6' : 'rgba(148, 163, 184, 0.2)'}`,
                      background: selectedEquipment === eq.id ? 'rgba(59, 130, 246, 0.1)' : 'rgba(30, 41, 59, 0.5)',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ fontWeight: '600' }}>{eq.profile_name}</span>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '0.5rem',
                        background: 'rgba(59, 130, 246, 0.2)',
                        color: '#3b82f6',
                        fontSize: '0.75rem',
                        fontWeight: '600'
                      }}>
                        {eq.tier.toUpperCase()}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
                        {eq.specs?.cpu || 'N/A'} | {eq.specs?.gpu || 'N/A'}
                      </span>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ color: '#14b8a6', fontWeight: '600' }}>
                          ${eq.hourly_rate}/hr
                        </div>
                        <div style={{ color: '#64748b', fontSize: '0.75rem' }}>
                          Miner earns ${(eq.hourly_rate * 0.8).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={startCloudSession}
              disabled={!selectedEquipment || connecting}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '0.5rem',
                border: 'none',
                background: selectedEquipment && !connecting
                  ? 'linear-gradient(135deg, #14b8a6 0%, #06b6d4 100%)'
                  : 'rgba(148, 163, 184, 0.2)',
                color: 'white',
                cursor: selectedEquipment && !connecting ? 'pointer' : 'not-allowed',
                fontSize: '1rem',
                fontWeight: '600'
              }}
            >
              {connecting ? 'Connecting...' : 'Start Cloud Gaming Session'}
            </button>
          </>
        ) : (
          <div>
            <div style={{
              background: '#000',
              borderRadius: '0.5rem',
              overflow: 'hidden',
              marginBottom: '1rem'
            }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                style={{
                  width: '100%',
                  height: 'auto',
                  minHeight: '400px'
                }}
              />
            </div>
            <p style={{ color: '#14b8a6', textAlign: 'center' }}>
              Game stream connected! Use your keyboard and mouse to play.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
