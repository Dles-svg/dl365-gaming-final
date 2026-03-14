import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { transferTokens, getTransactionHistory, type Transaction } from '../lib/wallet'
import { detectAnyWallet, getAvailableWallets, connectWallet, getConnectedWallet, formatWalletAddress, switchToNetwork, BSC_CHAIN_ID, addBSCNetwork, type WalletProvider } from '../lib/web3wallet'
import { CardPurchase } from '../components/CardPurchase'
import { PurchaseHistory } from '../components/PurchaseHistory'
import { TokenPurchaseModal } from '../components/TokenPurchaseModal'

interface UserProfile {
  total_earnings: number
  wallet_address: string | null
  dl365_balance: number
}

export default function Wallet() {
  const { user, signOut } = useAuth()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [showSendModal, setShowSendModal] = useState(false)
  const [recipientEmail, setRecipientEmail] = useState('')
  const [sendAmount, setSendAmount] = useState('')
  const [sendDescription, setSendDescription] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [connectedWallet, setConnectedWallet] = useState<string | null>(null)
  const [connectingWallet, setConnectingWallet] = useState(false)
  const [showWalletDropdown, setShowWalletDropdown] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'buy' | 'history'>('overview')
  const [showTokenPurchaseModal, setShowTokenPurchaseModal] = useState(false)

  useEffect(() => {
    if (user) {
      loadWalletData()
      checkWalletConnection()
    } else {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    const handleClickOutside = () => {
      if (showWalletDropdown) {
        setShowWalletDropdown(false)
      }
    }

    if (showWalletDropdown) {
      document.addEventListener('click', handleClickOutside)
    }

    return () => {
      document.removeEventListener('click', handleClickOutside)
    }
  }, [showWalletDropdown])

  const checkWalletConnection = async () => {
    if (!detectAnyWallet()) {
      return
    }

    const wallet = await getConnectedWallet()
    if (wallet) {
      setConnectedWallet(wallet)
      await saveWalletAddress(wallet)
    }
  }

  const handleConnectWallet = async (provider?: WalletProvider) => {
    setConnectingWallet(true)
    setShowWalletDropdown(false)
    try {
      const wallet = await connectWallet(provider)
      if (wallet) {
        setConnectedWallet(wallet)
        await saveWalletAddress(wallet)

        try {
          await switchToNetwork(BSC_CHAIN_ID)
        } catch (err) {
          await addBSCNetwork()
        }
      }
    } catch (err) {
      console.error('Failed to connect wallet:', err)
    } finally {
      setConnectingWallet(false)
    }
  }

  const saveWalletAddress = async (walletAddress: string) => {
    if (!user) return

    try {
      await supabase
        .from('user_profiles')
        .update({ wallet_address: walletAddress })
        .eq('id', user.id)
    } catch (err) {
      console.error('Failed to save wallet address:', err)
    }
  }

  const loadWalletData = async () => {
    if (!user) {
      setLoading(false)
      return
    }

    try {
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('total_earnings, wallet_address, dl365_balance')
        .eq('id', user.id)
        .maybeSingle()

      if (profileError) {
        console.error('Error loading profile:', profileError)
      }

      if (!profileData) {
        await supabase
          .from('user_profiles')
          .insert({
            id: user.id,
            total_earnings: 0,
            dl365_balance: 0
          })
        setProfile({ total_earnings: 0, wallet_address: null, dl365_balance: 0 })
      } else {
        setProfile(profileData)
      }

      try {
        const txData = await getTransactionHistory(user.id)
        setTransactions(txData)
      } catch (err) {
        console.error('Error loading transactions:', err)
      }
    } catch (err) {
      console.error('Error loading wallet data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSendTokens = async () => {
    if (!user || !recipientEmail || !sendAmount) {
      setError('Please fill all fields')
      return
    }

    const amount = parseFloat(sendAmount)
    if (isNaN(amount) || amount <= 0) {
      setError('Invalid amount')
      return
    }

    if (!profile || profile.dl365_balance < amount) {
      setError('Insufficient balance')
      return
    }

    setSending(true)
    setError('')

    try {
      const { data: recipient } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', recipientEmail)
        .maybeSingle()

      if (!recipient) {
        setError('Recipient not found. Please enter a valid user ID.')
        setSending(false)
        return
      }

      await transferTokens(user.id, recipient.id, amount, sendDescription || 'Token transfer')

      setShowSendModal(false)
      setRecipientEmail('')
      setSendAmount('')
      setSendDescription('')
      await loadWalletData()
    } catch (err: any) {
      setError(err.message || 'Transfer failed')
    } finally {
      setSending(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'earning':
        return '#14b8a6'
      case 'payment':
        return '#ef4444'
      case 'withdrawal':
        return '#f59e0b'
      default:
        return '#94a3b8'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'earning':
        return '+'
      case 'payment':
        return '-'
      case 'withdrawal':
        return '↓'
      default:
        return '•'
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
          <Link to="/games" style={{
            color: '#f1f5f9',
            textDecoration: 'none',
            padding: '0.5rem 1rem'
          }}>
            Games
          </Link>
          <Link to="/compute" style={{
            color: '#f1f5f9',
            textDecoration: 'none',
            padding: '0.5rem 1rem'
          }}>
            Compute
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

      <main style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: 'bold',
            marginBottom: '0.5rem'
          }}>
            Your Wallet
          </h1>
          <p style={{
            color: '#94a3b8',
            fontSize: '1.125rem'
          }}>
            Manage your earnings and transactions
          </p>
        </div>

        <div style={{
          display: 'flex',
          gap: '1rem',
          marginBottom: '2rem',
          borderBottom: '1px solid rgba(148, 163, 184, 0.2)'
        }}>
          <button
            onClick={() => setActiveTab('overview')}
            style={{
              padding: '1rem 1.5rem',
              border: 'none',
              background: 'transparent',
              color: activeTab === 'overview' ? '#3b82f6' : '#94a3b8',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: '600',
              borderBottom: activeTab === 'overview' ? '2px solid #3b82f6' : 'none',
              transition: 'all 0.2s'
            }}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('buy')}
            style={{
              padding: '1rem 1.5rem',
              border: 'none',
              background: 'transparent',
              color: activeTab === 'buy' ? '#3b82f6' : '#94a3b8',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: '600',
              borderBottom: activeTab === 'buy' ? '2px solid #3b82f6' : 'none',
              transition: 'all 0.2s'
            }}
          >
            Buy DL365
          </button>
          <button
            onClick={() => setActiveTab('history')}
            style={{
              padding: '1rem 1.5rem',
              border: 'none',
              background: 'transparent',
              color: activeTab === 'history' ? '#3b82f6' : '#94a3b8',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: '600',
              borderBottom: activeTab === 'history' ? '2px solid #3b82f6' : 'none',
              transition: 'all 0.2s'
            }}
          >
            Purchase History
          </button>
        </div>

        {activeTab === 'buy' && (
          <CardPurchase />
        )}

        {activeTab === 'history' && (
          <PurchaseHistory />
        )}

        {activeTab === 'overview' && (loading ? (
          <p style={{ color: '#94a3b8' }}>Loading wallet data...</p>
        ) : !user ? (
          <div style={{
            background: 'rgba(30, 41, 59, 0.5)',
            borderRadius: '1rem',
            border: '1px solid rgba(148, 163, 184, 0.2)',
            padding: '3rem',
            textAlign: 'center'
          }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem' }}>
              Please Log In
            </h2>
            <p style={{ color: '#94a3b8', marginBottom: '2rem' }}>
              You need to be logged in to view your wallet
            </p>
            <Link
              to="/login"
              style={{
                display: 'inline-block',
                padding: '0.75rem 2rem',
                borderRadius: '0.5rem',
                background: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
                color: 'white',
                textDecoration: 'none',
                fontSize: '1rem',
                fontWeight: '600'
              }}
            >
              Go to Login
            </Link>
          </div>
        ) : (
          <>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '1.5rem',
              marginBottom: '2rem'
            }}>
              <div style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
                padding: '2rem',
                borderRadius: '1rem'
              }}>
                <div style={{
                  fontSize: '0.875rem',
                  opacity: 0.9,
                  marginBottom: '0.5rem'
                }}>
                  DL365 Balance
                </div>
                <div style={{
                  fontSize: '3rem',
                  fontWeight: 'bold',
                  marginBottom: '1rem'
                }}>
                  {profile?.dl365_balance.toFixed(2) || '0.00'} DL365
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.75rem'
                }}>
                  <button
                    onClick={() => setShowTokenPurchaseModal(true)}
                    style={{
                      padding: '0.75rem 1rem',
                      borderRadius: '0.5rem',
                      border: 'none',
                      background: 'rgba(255, 255, 255, 0.2)',
                      color: 'white',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    Buy Tokens
                  </button>
                  <button
                    onClick={() => setShowSendModal(true)}
                    style={{
                      padding: '0.75rem 1rem',
                      borderRadius: '0.5rem',
                      border: 'none',
                      background: 'rgba(255, 255, 255, 0.2)',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: '600'
                    }}
                  >
                    Send Tokens
                  </button>
                </div>
              </div>

              <div style={{
                background: 'linear-gradient(135deg, #14b8a6 0%, #10b981 100%)',
                padding: '2rem',
                borderRadius: '1rem'
              }}>
                <div style={{
                  fontSize: '0.875rem',
                  opacity: 0.9,
                  marginBottom: '0.5rem'
                }}>
                  USD Balance
                </div>
                <div style={{
                  fontSize: '3rem',
                  fontWeight: 'bold',
                  marginBottom: '1rem'
                }}>
                  ${profile?.total_earnings.toFixed(2) || '0.00'}
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.75rem'
                }}>
                  <button style={{
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    border: 'none',
                    background: 'rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '600'
                  }}>
                    Deposit
                  </button>
                  <button style={{
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    border: 'none',
                    background: 'rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '600'
                  }}>
                    Withdraw
                  </button>
                </div>
              </div>
            </div>

            <div style={{
              background: 'rgba(30, 41, 59, 0.5)',
              borderRadius: '1rem',
              border: '1px solid rgba(148, 163, 184, 0.2)',
              padding: '1.5rem'
            }}>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: '600',
                marginBottom: '1.5rem'
              }}>
                Transaction History
              </h2>

              {transactions.length === 0 ? (
                <p style={{
                  color: '#94a3b8',
                  textAlign: 'center',
                  padding: '2rem'
                }}>
                  No transactions yet. Start gaming or renting compute resources to see your activity here!
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {transactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '1rem',
                        background: 'rgba(15, 23, 42, 0.5)',
                        borderRadius: '0.5rem',
                        border: '1px solid rgba(148, 163, 184, 0.1)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          background: `${getTypeColor(transaction.type)}20`,
                          color: getTypeColor(transaction.type),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.25rem',
                          fontWeight: 'bold'
                        }}>
                          {getTypeIcon(transaction.type)}
                        </div>
                        <div>
                          <div style={{
                            fontWeight: '600',
                            marginBottom: '0.25rem'
                          }}>
                            {transaction.description}
                          </div>
                          <div style={{
                            fontSize: '0.75rem',
                            color: '#64748b'
                          }}>
                            {formatDate(transaction.created_at)}
                          </div>
                        </div>
                      </div>
                      <div style={{
                        fontSize: '1.25rem',
                        fontWeight: 'bold',
                        color: getTypeColor(transaction.type)
                      }}>
                        {getTypeIcon(transaction.type)}${transaction.amount.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{
              marginTop: '2rem',
              paddingTop: '2rem',
              borderTop: '1px solid rgba(148, 163, 184, 0.2)'
            }}>
              <div style={{
                background: 'rgba(30, 41, 59, 0.5)',
                borderRadius: '1rem',
                border: '1px solid rgba(148, 163, 184, 0.2)',
                padding: '2rem',
                textAlign: 'center'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                  <img src="/1000125978.jpg" alt="DL365" style={{ width: '200px', height: 'auto', objectFit: 'contain' }} />
                </div>

                <h3 style={{
                  fontSize: '1.5rem',
                  fontWeight: '600',
                  marginBottom: '1rem'
                }}>
                  Connect Your Web3 Wallet
                </h3>

                <p style={{
                  color: '#94a3b8',
                  marginBottom: '1.5rem',
                  fontSize: '0.95rem'
                }}>
                  Store your DL365 tokens securely in your personal Web3 wallet
                </p>

                {connectedWallet ? (
                  <div style={{
                    background: 'rgba(20, 184, 166, 0.1)',
                    border: '1px solid rgba(20, 184, 166, 0.3)',
                    borderRadius: '0.5rem',
                    padding: '1rem',
                    marginBottom: '1rem'
                  }}>
                    <div style={{
                      color: '#14b8a6',
                      fontSize: '0.875rem',
                      marginBottom: '0.5rem',
                      fontWeight: '600'
                    }}>
                      Wallet Connected
                    </div>
                    <div style={{
                      color: '#f1f5f9',
                      fontSize: '1rem',
                      fontFamily: 'monospace'
                    }}>
                      {formatWalletAddress(connectedWallet)}
                    </div>
                  </div>
                ) : (
                  <div style={{ position: 'relative', marginBottom: '1rem' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowWalletDropdown(!showWalletDropdown)
                      }}
                      disabled={connectingWallet}
                      style={{
                        width: '100%',
                        padding: '1rem 2rem',
                        borderRadius: '0.5rem',
                        border: 'none',
                        background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                        color: 'white',
                        cursor: connectingWallet ? 'not-allowed' : 'pointer',
                        fontSize: '1rem',
                        fontWeight: '600',
                        boxShadow: '0 4px 6px rgba(249, 115, 22, 0.3)',
                        opacity: connectingWallet ? 0.5 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem'
                      }}
                    >
                      {connectingWallet ? 'Connecting...' : 'Connect Wallet'}
                      <span style={{ fontSize: '0.75rem' }}>▼</span>
                    </button>

                    {showWalletDropdown && !connectingWallet && (
                      <div style={{
                        position: 'absolute',
                        top: 'calc(100% + 0.5rem)',
                        left: 0,
                        right: 0,
                        background: 'rgba(15, 23, 42, 0.95)',
                        border: '1px solid rgba(148, 163, 184, 0.2)',
                        borderRadius: '0.5rem',
                        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
                        zIndex: 100,
                        overflow: 'hidden'
                      }}>
                        {getAvailableWallets().map((wallet) => (
                          <div key={wallet.id}>
                            {wallet.detected ? (
                              <button
                                onClick={() => handleConnectWallet(wallet.id)}
                                style={{
                                  width: '100%',
                                  padding: '1rem',
                                  border: 'none',
                                  borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
                                  background: 'transparent',
                                  color: '#f1f5f9',
                                  cursor: 'pointer',
                                  fontSize: '1rem',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.75rem',
                                  textAlign: 'left',
                                  transition: 'background 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                              >
                                <span style={{ fontSize: '1.5rem' }}>{wallet.icon}</span>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontWeight: '600' }}>{wallet.name}</div>
                                  <div style={{ fontSize: '0.75rem', color: '#14b8a6' }}>Detected</div>
                                </div>
                              </button>
                            ) : (
                              <a
                                href={wallet.installUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  display: 'flex',
                                  width: '100%',
                                  padding: '1rem',
                                  borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
                                  background: 'transparent',
                                  color: '#f1f5f9',
                                  textDecoration: 'none',
                                  alignItems: 'center',
                                  gap: '0.75rem',
                                  transition: 'background 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(148, 163, 184, 0.05)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                              >
                                <span style={{ fontSize: '1.5rem' }}>{wallet.icon}</span>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontWeight: '600' }}>{wallet.name}</div>
                                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Click to install</div>
                                </div>
                                <span style={{ fontSize: '0.875rem', color: '#94a3b8' }}>↗</span>
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.75rem',
                  marginTop: '1rem'
                }}>
                  <a href="https://apespace.io/bsc/0xa768ed990313a08ab706fd245319531c31f7e83d" target="_blank" rel="noopener noreferrer" style={{
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
                    Trade on ApeSpace DEX
                  </a>
                  <p style={{
                    fontSize: '0.75rem',
                    color: '#94a3b8',
                    textAlign: 'center'
                  }}>
                    Or buy instantly with credit card at fixed $2.50 price
                  </p>
                </div>
              </div>
            </div>

            <div style={{
              marginTop: '2rem',
              paddingTop: '2rem',
              borderTop: '1px solid rgba(148, 163, 184, 0.2)'
            }}>
              <div style={{
                background: 'rgba(30, 41, 59, 0.5)',
                borderRadius: '1rem',
                border: '1px solid rgba(148, 163, 184, 0.2)',
                padding: '2rem'
              }}>
                <h3 style={{
                  fontSize: '1.5rem',
                  fontWeight: '600',
                  marginBottom: '1rem',
                  textAlign: 'center'
                }}>
                  Supported Wallets
                </h3>
                <p style={{
                  color: '#94a3b8',
                  marginBottom: '2rem',
                  fontSize: '0.95rem',
                  textAlign: 'center'
                }}>
                  Connect any of these wallets to manage your DL365 tokens
                </p>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                  gap: '1rem'
                }}>
                  {getAvailableWallets().map((wallet) => (
                    <div
                      key={wallet.id}
                      style={{
                        background: 'rgba(15, 23, 42, 0.5)',
                        border: wallet.detected ? '2px solid rgba(20, 184, 166, 0.3)' : '1px solid rgba(148, 163, 184, 0.2)',
                        borderRadius: '0.75rem',
                        padding: '1.5rem',
                        textAlign: 'center',
                        transition: 'all 0.3s'
                      }}
                    >
                      <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>{wallet.icon}</div>
                      <div style={{
                        fontSize: '1.125rem',
                        fontWeight: '600',
                        marginBottom: '0.5rem',
                        color: '#f1f5f9'
                      }}>
                        {wallet.name}
                      </div>
                      <div style={{
                        fontSize: '0.875rem',
                        color: wallet.detected ? '#14b8a6' : '#94a3b8',
                        marginBottom: '1rem',
                        fontWeight: '600'
                      }}>
                        {wallet.detected ? 'Detected' : 'Not Installed'}
                      </div>
                      {wallet.detected ? (
                        <button
                          onClick={() => handleConnectWallet(wallet.id)}
                          style={{
                            width: '100%',
                            padding: '0.75rem',
                            borderRadius: '0.5rem',
                            border: 'none',
                            background: 'linear-gradient(135deg, #14b8a6 0%, #10b981 100%)',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            fontWeight: '600'
                          }}
                        >
                          Connect
                        </button>
                      ) : (
                        <a
                          href={wallet.installUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'block',
                            width: '100%',
                            padding: '0.75rem',
                            borderRadius: '0.5rem',
                            border: '1px solid rgba(148, 163, 184, 0.3)',
                            background: 'rgba(148, 163, 184, 0.1)',
                            color: '#94a3b8',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            fontWeight: '600',
                            textDecoration: 'none'
                          }}
                        >
                          Install Wallet
                        </a>
                      )}
                    </div>
                  ))}
                </div>

                <div style={{
                  marginTop: '2rem',
                  paddingTop: '2rem',
                  borderTop: '1px solid rgba(148, 163, 184, 0.2)',
                  textAlign: 'center'
                }}>
                  <p style={{
                    color: '#94a3b8',
                    fontSize: '0.875rem',
                    marginBottom: '1rem'
                  }}>
                    Don't have an account yet?
                  </p>
                  <Link
                    to="/register"
                    style={{
                      display: 'inline-block',
                      padding: '0.75rem 2rem',
                      borderRadius: '0.5rem',
                      background: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
                      color: 'white',
                      textDecoration: 'none',
                      fontSize: '1rem',
                      fontWeight: '600',
                      boxShadow: '0 4px 6px rgba(59, 130, 246, 0.3)'
                    }}
                  >
                    Sign Up Now
                  </Link>
                </div>
              </div>
            </div>
          </>
        ))}


        {showTokenPurchaseModal && (
          <TokenPurchaseModal
            onClose={() => setShowTokenPurchaseModal(false)}
            onSelectPayment={(method) => {
              setShowTokenPurchaseModal(false)
              if (method === 'crypto') {
                window.open('https://apespace.io/bsc/0xa768ed990313a08ab706fd245319531c31f7e83d', '_blank')
              } else {
                setActiveTab('buy')
              }
            }}
          />
        )}

        {showSendModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              background: 'rgba(30, 41, 59, 0.95)',
              borderRadius: '1rem',
              border: '1px solid rgba(148, 163, 184, 0.2)',
              padding: '2rem',
              maxWidth: '500px',
              width: '90%'
            }}>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: '600',
                marginBottom: '1.5rem'
              }}>
                Send DL365 Tokens
              </h2>

              {error && (
                <div style={{
                  padding: '0.75rem',
                  borderRadius: '0.5rem',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#fca5a5',
                  marginBottom: '1rem'
                }}>
                  {error}
                </div>
              )}

              <div style={{ marginBottom: '1rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  color: '#94a3b8',
                  fontSize: '0.875rem'
                }}>
                  Recipient User ID
                </label>
                <input
                  type="text"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="Enter user ID"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    background: 'rgba(15, 23, 42, 0.5)',
                    color: '#f1f5f9',
                    fontSize: '1rem'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  color: '#94a3b8',
                  fontSize: '0.875rem'
                }}>
                  Amount (DL365)
                </label>
                <input
                  type="number"
                  value={sendAmount}
                  onChange={(e) => setSendAmount(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
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
                  color: '#94a3b8',
                  fontSize: '0.875rem'
                }}>
                  Description
                </label>
                <input
                  type="text"
                  value={sendDescription}
                  onChange={(e) => setSendDescription(e.target.value)}
                  placeholder="Payment for..."
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    background: 'rgba(15, 23, 42, 0.5)',
                    color: '#f1f5f9',
                    fontSize: '1rem'
                  }}
                />
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.75rem'
              }}>
                <button
                  onClick={() => {
                    setShowSendModal(false)
                    setError('')
                    setRecipientEmail('')
                    setSendAmount('')
                    setSendDescription('')
                  }}
                  disabled={sending}
                  style={{
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    background: 'transparent',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: '600'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendTokens}
                  disabled={sending}
                  style={{
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    border: 'none',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
                    color: 'white',
                    cursor: sending ? 'not-allowed' : 'pointer',
                    fontSize: '1rem',
                    fontWeight: '600',
                    opacity: sending ? 0.5 : 1
                  }}
                >
                  {sending ? 'Sending...' : 'Send Tokens'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
