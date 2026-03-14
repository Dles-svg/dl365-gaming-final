import { supabase } from './supabase'

export interface PeerConnection {
  id: string
  rental_id: string
  gamer_id: string
  miner_id: string
  connection_status: 'initiating' | 'connected' | 'disconnected' | 'failed'
  webrtc_offer: any
  webrtc_answer: any
  ice_candidates: any[]
  started_at: string | null
  ended_at: string | null
  created_at: string
}

export interface PeerMessage {
  id: string
  connection_id: string
  sender_id: string
  receiver_id: string
  message: string
  message_type: 'text' | 'system' | 'notification'
  created_at: string
}

export async function createPeerConnection(
  rentalId: string,
  gamerId: string,
  minerId: string
): Promise<PeerConnection | null> {
  try {
    const { data, error } = await supabase
      .from('peer_connections')
      .insert({
        rental_id: rentalId,
        gamer_id: gamerId,
        miner_id: minerId,
        connection_status: 'initiating',
        started_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error
    return data
  } catch (err) {
    console.error('Failed to create peer connection:', err)
    return null
  }
}

export async function updateConnectionStatus(
  connectionId: string,
  status: 'initiating' | 'connected' | 'disconnected' | 'failed',
  additionalData?: {
    webrtc_offer?: any
    webrtc_answer?: any
    ice_candidates?: any[]
  }
): Promise<boolean> {
  try {
    const updateData: any = { connection_status: status }

    if (status === 'disconnected' || status === 'failed') {
      updateData.ended_at = new Date().toISOString()
    }

    if (additionalData) {
      if (additionalData.webrtc_offer) updateData.webrtc_offer = additionalData.webrtc_offer
      if (additionalData.webrtc_answer) updateData.webrtc_answer = additionalData.webrtc_answer
      if (additionalData.ice_candidates) updateData.ice_candidates = additionalData.ice_candidates
    }

    const { error } = await supabase
      .from('peer_connections')
      .update(updateData)
      .eq('id', connectionId)

    if (error) throw error
    return true
  } catch (err) {
    console.error('Failed to update connection status:', err)
    return false
  }
}

export async function addICECandidate(
  connectionId: string,
  candidate: RTCIceCandidateInit
): Promise<boolean> {
  try {
    const { data: connection } = await supabase
      .from('peer_connections')
      .select('ice_candidates')
      .eq('id', connectionId)
      .single()

    if (!connection) return false

    const candidates = connection.ice_candidates || []
    candidates.push(candidate)

    const { error } = await supabase
      .from('peer_connections')
      .update({ ice_candidates: candidates })
      .eq('id', connectionId)

    if (error) throw error
    return true
  } catch (err) {
    console.error('Failed to add ICE candidate:', err)
    return false
  }
}

export async function getPeerConnection(connectionId: string): Promise<PeerConnection | null> {
  try {
    const { data, error } = await supabase
      .from('peer_connections')
      .select('*')
      .eq('id', connectionId)
      .single()

    if (error) throw error
    return data
  } catch (err) {
    console.error('Failed to get peer connection:', err)
    return null
  }
}

export async function getActiveConnectionForRental(rentalId: string): Promise<PeerConnection | null> {
  try {
    const { data, error } = await supabase
      .from('peer_connections')
      .select('*')
      .eq('rental_id', rentalId)
      .in('connection_status', ['initiating', 'connected'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error
    return data
  } catch (err) {
    console.error('Failed to get active connection:', err)
    return null
  }
}

export async function sendPeerMessage(
  connectionId: string,
  senderId: string,
  receiverId: string,
  message: string,
  messageType: 'text' | 'system' | 'notification' = 'text'
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('peer_messages')
      .insert({
        connection_id: connectionId,
        sender_id: senderId,
        receiver_id: receiverId,
        message,
        message_type: messageType
      })

    if (error) throw error
    return true
  } catch (err) {
    console.error('Failed to send message:', err)
    return false
  }
}

export async function getConnectionMessages(connectionId: string): Promise<PeerMessage[]> {
  try {
    const { data, error } = await supabase
      .from('peer_messages')
      .select('*')
      .eq('connection_id', connectionId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return data || []
  } catch (err) {
    console.error('Failed to get messages:', err)
    return []
  }
}

export function subscribeToConnectionUpdates(
  connectionId: string,
  callback: (connection: PeerConnection) => void
) {
  const channel = supabase
    .channel(`connection:${connectionId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'peer_connections',
        filter: `id=eq.${connectionId}`
      },
      (payload) => {
        callback(payload.new as PeerConnection)
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

export function subscribeToMessages(
  connectionId: string,
  callback: (message: PeerMessage) => void
) {
  const channel = supabase
    .channel(`messages:${connectionId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'peer_messages',
        filter: `connection_id=eq.${connectionId}`
      },
      (payload) => {
        callback(payload.new as PeerMessage)
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

export async function getUserActiveConnections(userId: string): Promise<PeerConnection[]> {
  try {
    const { data, error } = await supabase
      .from('peer_connections')
      .select('*')
      .or(`gamer_id.eq.${userId},miner_id.eq.${userId}`)
      .in('connection_status', ['initiating', 'connected'])
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (err) {
    console.error('Failed to get user connections:', err)
    return []
  }
}
