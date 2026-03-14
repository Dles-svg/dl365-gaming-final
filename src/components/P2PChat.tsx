import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import {
  type PeerMessage,
  getConnectionMessages,
  sendPeerMessage,
  subscribeToMessages,
  type PeerConnection
} from '../lib/peerConnection'

interface P2PChatProps {
  connection: PeerConnection
  otherUserId: string
  otherUserName?: string
}

export function P2PChat({ connection, otherUserId, otherUserName }: P2PChatProps) {
  const { user } = useAuth()
  const [messages, setMessages] = useState<PeerMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadMessages()
    const unsubscribe = subscribeToMessages(connection.id, handleNewMessage)
    return unsubscribe
  }, [connection.id])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const loadMessages = async () => {
    const msgs = await getConnectionMessages(connection.id)
    setMessages(msgs)
  }

  const handleNewMessage = (message: PeerMessage) => {
    setMessages((prev) => [...prev, message])
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !user) return

    setSending(true)
    const success = await sendPeerMessage(
      connection.id,
      user.id,
      otherUserId,
      newMessage.trim(),
      'text'
    )

    if (success) {
      setNewMessage('')
    }
    setSending(false)
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getConnectionStatusColor = () => {
    switch (connection.connection_status) {
      case 'connected':
        return '#10b981'
      case 'initiating':
        return '#f59e0b'
      case 'disconnected':
        return '#6b7280'
      case 'failed':
        return '#ef4444'
      default:
        return '#6b7280'
    }
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'rgba(15, 23, 42, 0.5)',
      borderRadius: '1rem',
      border: '1px solid rgba(148, 163, 184, 0.2)',
      overflow: 'hidden'
    }}>
      <div style={{
        padding: '1rem',
        borderBottom: '1px solid rgba(148, 163, 184, 0.2)',
        background: 'rgba(30, 41, 59, 0.5)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{
              fontSize: '1.125rem',
              fontWeight: '600',
              color: '#f1f5f9',
              marginBottom: '0.25rem'
            }}>
              {otherUserName || 'User'}
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.875rem'
            }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: getConnectionStatusColor(),
                boxShadow: `0 0 10px ${getConnectionStatusColor()}`
              }} />
              <span style={{ color: '#94a3b8' }}>
                {connection.connection_status}
              </span>
            </div>
          </div>
        </div>
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
          <div style={{
            textAlign: 'center',
            color: '#64748b',
            padding: '2rem',
            fontSize: '0.875rem'
          }}>
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((msg) => {
            const isOwnMessage = msg.sender_id === user?.id
            const isSystem = msg.message_type === 'system' || msg.message_type === 'notification'

            if (isSystem) {
              return (
                <div
                  key={msg.id}
                  style={{
                    textAlign: 'center',
                    fontSize: '0.75rem',
                    color: '#64748b',
                    padding: '0.5rem',
                    background: 'rgba(100, 116, 139, 0.1)',
                    borderRadius: '0.5rem'
                  }}
                >
                  {msg.message}
                </div>
              )
            }

            return (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  justifyContent: isOwnMessage ? 'flex-end' : 'flex-start'
                }}
              >
                <div style={{
                  maxWidth: '70%',
                  padding: '0.75rem 1rem',
                  borderRadius: isOwnMessage ? '1rem 1rem 0.25rem 1rem' : '1rem 1rem 1rem 0.25rem',
                  background: isOwnMessage
                    ? 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)'
                    : 'rgba(30, 41, 59, 0.8)',
                  border: isOwnMessage ? 'none' : '1px solid rgba(148, 163, 184, 0.2)',
                  color: '#f1f5f9'
                }}>
                  <div style={{
                    fontSize: '0.9375rem',
                    lineHeight: '1.5',
                    wordWrap: 'break-word'
                  }}>
                    {msg.message}
                  </div>
                  <div style={{
                    fontSize: '0.6875rem',
                    marginTop: '0.25rem',
                    opacity: 0.7,
                    textAlign: 'right'
                  }}>
                    {formatTime(msg.created_at)}
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <form
        onSubmit={handleSendMessage}
        style={{
          padding: '1rem',
          borderTop: '1px solid rgba(148, 163, 184, 0.2)',
          background: 'rgba(30, 41, 59, 0.5)'
        }}
      >
        <div style={{
          display: 'flex',
          gap: '0.75rem'
        }}>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            disabled={sending || connection.connection_status !== 'connected'}
            style={{
              flex: 1,
              padding: '0.75rem 1rem',
              borderRadius: '0.5rem',
              border: '1px solid rgba(148, 163, 184, 0.2)',
              background: 'rgba(15, 23, 42, 0.5)',
              color: '#f1f5f9',
              fontSize: '0.9375rem',
              outline: 'none'
            }}
          />
          <button
            type="submit"
            disabled={sending || !newMessage.trim() || connection.connection_status !== 'connected'}
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '0.5rem',
              border: 'none',
              background: sending ? 'rgba(59, 130, 246, 0.5)' : 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
              color: 'white',
              cursor: sending || connection.connection_status !== 'connected' ? 'not-allowed' : 'pointer',
              fontSize: '0.9375rem',
              fontWeight: '600',
              opacity: sending || !newMessage.trim() ? 0.5 : 1
            }}
          >
            {sending ? 'Sending...' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  )
}
