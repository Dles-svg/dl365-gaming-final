import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export interface Stream {
  id: string
  user_id: string
  session_name: string
  stream_title: string
  stream_description: string
  stream_type: 'mining' | 'gaming'
  status: string
  viewers: number
  started_at: string | null
  created_at: string
}

export function useStreaming() {
  const { user } = useAuth()
  const [myStream, setMyStream] = useState<Stream | null>(null)
  const [liveStreams, setLiveStreams] = useState<Stream[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    fetchMyStream()
    fetchLiveStreams()

    const channel = supabase
      .channel('streaming_updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'streaming_sessions'
      }, () => {
        fetchMyStream()
        fetchLiveStreams()
      })
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [user])

  const fetchMyStream = async () => {
    if (!user) return

    const { data, error } = await supabase
      .from('streaming_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!error && data) {
      setMyStream(data)
    } else {
      setMyStream(null)
    }
    setLoading(false)
  }

  const fetchLiveStreams = async () => {
    const { data, error } = await supabase
      .from('streaming_sessions')
      .select('*')
      .eq('status', 'live')
      .order('viewers', { ascending: false })

    if (!error && data) {
      setLiveStreams(data)
    }
  }

  const createStream = async (title: string, description: string, streamType: 'mining' | 'gaming') => {
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('streaming_sessions')
      .insert([
        {
          user_id: user.id,
          session_name: title,
          stream_title: title,
          stream_description: description,
          stream_type: streamType,
          status: 'offline',
          viewers: 0
        }
      ])
      .select()
      .single()

    if (error) throw error
    setMyStream(data)
    return data
  }

  const startStream = async (streamId: string) => {
    const { data, error } = await supabase
      .from('streaming_sessions')
      .update({
        status: 'live',
        started_at: new Date().toISOString()
      })
      .eq('id', streamId)
      .select()
      .single()

    if (error) throw error
    setMyStream(data)
    return data
  }

  const stopStream = async (streamId: string) => {
    const { data, error } = await supabase
      .from('streaming_sessions')
      .update({
        status: 'offline',
        ended_at: new Date().toISOString(),
        viewers: 0
      })
      .eq('id', streamId)
      .select()
      .single()

    if (error) throw error
    setMyStream(data)
    return data
  }

  const updateViewerCount = async (streamId: string, count: number) => {
    const { error } = await supabase
      .from('streaming_sessions')
      .update({ viewers: count })
      .eq('id', streamId)

    if (error) console.error('Error updating viewer count:', error)
  }

  const saveSignal = async (streamId: string, toUserId: string | null, signalType: string, signalData: unknown) => {
    if (!user) throw new Error('Not authenticated')

    const { error } = await supabase
      .from('webrtc_signals')
      .insert([
        {
          stream_id: streamId,
          from_user_id: user.id,
          to_user_id: toUserId,
          signal_type: signalType,
          signal_data: signalData
        }
      ])

    if (error) throw error
  }

  const subscribeToSignals = (streamId: string, callback: (signal: any) => void) => {
    const channel = supabase
      .channel(`signals_${streamId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'webrtc_signals',
        filter: `stream_id=eq.${streamId}`
      }, (payload) => {
        callback(payload.new)
      })
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }

  return {
    myStream,
    liveStreams,
    loading,
    createStream,
    startStream,
    stopStream,
    updateViewerCount,
    saveSignal,
    subscribeToSignals
  }
}
