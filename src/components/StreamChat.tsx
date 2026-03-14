import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface ChatMessage {
  id: string
  user_id: string
  message: string
  created_at: string
  user_email?: string
}

interface StreamChatProps {
  sessionId: string
}

export default function StreamChat({ sessionId }: StreamChatProps) {
  const { user } = useAuth()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadMessages()
    subscribeToMessages()
  }, [sessionId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const loadMessages = async () => {
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(100)

    if (data) {
      setMessages(data)
    }
  }

  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`chat:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `session_id=eq.${sessionId}`
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as ChatMessage])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !newMessage.trim()) return

    setSending(true)

    await supabase.from('chat_messages').insert({
      session_id: sessionId,
      user_id: user.id,
      message: newMessage.trim()
    })

    setNewMessage('')
    setSending(false)
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getUserDisplay = (userId: string) => {
    return userId.substring(0, 8)
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'rgba(15, 23, 42, 0.5)',
      borderRadius: '0.5rem',
      border: '1px solid rgba(148, 163, 184, 0.2)'
    }}>
      <div style={{
        padding: '1rem',
        borderBottom: '1px solid rgba(148, 163, 184, 0.2)',
        fontWeight: '600'
      }}>
        Stream Chat
      </div>

      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem'
      }}>
        {messages.length === 0 ? (
          <p style={{ color: '#64748b', textAlign: 'center', padding: '2rem' }}>
            No messages yet. Be the first to chat!
          </p>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <span style={{
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: msg.user_id === user?.id ? '#3b82f6' : '#06b6d4'
                }}>
                  {msg.user_id === user?.id ? 'You' : getUserDisplay(msg.user_id)}
                </span>
                <span style={{
                  fontSize: '0.75rem',
                  color: '#64748b'
                }}>
                  {formatTime(msg.created_at)}
                </span>
              </div>
              <div style={{
                background: msg.user_id === user?.id
                  ? 'rgba(59, 130, 246, 0.1)'
                  : 'rgba(30, 41, 59, 0.5)',
                padding: '0.5rem 0.75rem',
                borderRadius: '0.5rem',
                color: '#f1f5f9',
                fontSize: '0.875rem',
                wordBreak: 'break-word'
              }}>
                {msg.message}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} style={{
        padding: '1rem',
        borderTop: '1px solid rgba(148, 163, 184, 0.2)',
        display: 'flex',
        gap: '0.5rem'
      }}>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          disabled={sending}
          style={{
            flex: 1,
            padding: '0.75rem',
            borderRadius: '0.5rem',
            border: '1px solid rgba(148, 163, 184, 0.2)',
            background: 'rgba(15, 23, 42, 0.5)',
            color: '#f1f5f9',
            fontSize: '0.875rem'
          }}
        />
        <button
          type="submit"
          disabled={sending || !newMessage.trim()}
          style={{
            padding: '0.75rem 1.5rem',
            borderRadius: '0.5rem',
            border: 'none',
            background: sending || !newMessage.trim()
              ? 'rgba(148, 163, 184, 0.2)'
              : 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
            color: 'white',
            cursor: sending || !newMessage.trim() ? 'not-allowed' : 'pointer',
            fontWeight: '600',
            fontSize: '0.875rem'
          }}
        >
          Send
        </button>
      </form>
    </div>
  )
}
