import { useState } from 'react'

interface TokenPurchaseModalProps {
  onClose: () => void
  onSelectPayment: (method: 'crypto' | 'card') => void
}

export function TokenPurchaseModal({ onClose, onSelectPayment }: TokenPurchaseModalProps) {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null)
  const [customAmount, setCustomAmount] = useState<string>('')
  const [isCustom, setIsCustom] = useState(false)

  const tokenPackages = [
    { amount: 10, price: 2500, bonus: 0, label: 'Starter' },
    { amount: 50, price: 12500, bonus: 0, label: 'Standard', highlight: true },
    { amount: 100, price: 25000, bonus: 0, label: 'Premium' }
  ]

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      backdropFilter: 'blur(10px)'
    }}>
      <div style={{
        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.98) 0%, rgba(15, 23, 42, 0.98) 100%)',
        borderRadius: '1.5rem',
        border: '1px solid rgba(59, 130, 246, 0.3)',
        padding: '2.5rem',
        maxWidth: '900px',
        width: '90%',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem'
        }}>
          <h2 style={{
            fontSize: '2rem',
            fontWeight: 'bold',
            background: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            Buy DL365 Tokens
          </h2>
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              border: '1px solid rgba(148, 163, 184, 0.3)',
              background: 'transparent',
              color: '#94a3b8',
              cursor: 'pointer',
              fontSize: '1.5rem',
              lineHeight: '1'
            }}
          >
            ×
          </button>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          {tokenPackages.map((pkg) => (
            <div
              key={pkg.amount}
              onClick={() => {
                setSelectedAmount(pkg.amount)
                setIsCustom(false)
              }}
              style={{
                perspective: '1000px',
                cursor: 'pointer'
              }}
            >
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  height: '220px',
                  transformStyle: 'preserve-3d',
                  transition: 'transform 0.6s',
                  transform: selectedAmount === pkg.amount && !isCustom ? 'rotateY(180deg)' : 'rotateY(0deg)'
                }}
              >
                <div style={{
                  position: 'absolute',
                  width: '100%',
                  height: '100%',
                  backfaceVisibility: 'hidden',
                  background: pkg.highlight
                    ? 'linear-gradient(135deg, rgba(251, 146, 60, 0.3) 0%, rgba(249, 115, 22, 0.3) 100%)'
                    : selectedAmount === pkg.amount && !isCustom
                    ? 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)'
                    : 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(6, 182, 212, 0.2) 100%)',
                  border: pkg.highlight
                    ? '2px solid #f97316'
                    : selectedAmount === pkg.amount && !isCustom
                    ? '2px solid #3b82f6'
                    : '1px solid rgba(148, 163, 184, 0.2)',
                  borderRadius: '1rem',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  transition: 'all 0.3s'
                }}>
                  {pkg.highlight && (
                    <div style={{
                      position: 'absolute',
                      top: '-10px',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '0.25rem',
                      background: '#f97316',
                      color: '#fff',
                      fontSize: '0.625rem',
                      fontWeight: '700',
                      textTransform: 'uppercase'
                    }}>
                      Best Value
                    </div>
                  )}
                  <div style={{
                    fontSize: '0.75rem',
                    color: '#94a3b8',
                    fontWeight: '600',
                    marginBottom: '0.25rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    {pkg.label}
                  </div>
                  <div style={{
                    fontSize: '2.5rem',
                    fontWeight: 'bold',
                    marginBottom: '0.25rem',
                    color: '#f1f5f9'
                  }}>
                    {pkg.amount}
                  </div>
                  <div style={{
                    fontSize: '0.875rem',
                    color: '#94a3b8',
                    marginBottom: '0.75rem'
                  }}>
                    DL365 Tokens
                  </div>
                  {pkg.bonus > 0 && (
                    <div style={{
                      padding: '0.25rem 0.5rem',
                      borderRadius: '0.25rem',
                      background: 'rgba(16, 185, 129, 0.2)',
                      color: '#10b981',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      marginBottom: '0.75rem'
                    }}>
                      +{pkg.bonus} FREE
                    </div>
                  )}
                  <div style={{
                    fontSize: '1.5rem',
                    fontWeight: 'bold',
                    color: '#f1f5f9'
                  }}>
                    ${(pkg.price / 100).toFixed(2)}
                  </div>
                  <div style={{
                    fontSize: '0.75rem',
                    color: '#64748b',
                    marginTop: '0.25rem'
                  }}>
                    ${(pkg.price / pkg.amount / 100).toFixed(2)} per token
                  </div>
                </div>

                <div style={{
                  position: 'absolute',
                  width: '100%',
                  height: '100%',
                  backfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                  background: 'linear-gradient(135deg, #14b8a6 0%, #10b981 100%)',
                  border: '2px solid #14b8a6',
                  borderRadius: '1rem',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}>
                  <div style={{
                    fontSize: '2rem',
                    marginBottom: '0.5rem'
                  }}>
                    ✓
                  </div>
                  <div style={{
                    fontSize: '1.25rem',
                    fontWeight: 'bold',
                    color: '#f1f5f9',
                    textAlign: 'center'
                  }}>
                    Selected
                  </div>
                  <div style={{
                    fontSize: '0.875rem',
                    color: '#f1f5f9',
                    opacity: 0.9,
                    marginTop: '0.5rem',
                    textAlign: 'center'
                  }}>
                    {pkg.amount + pkg.bonus} Total Tokens
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)',
          border: '1px solid rgba(139, 92, 246, 0.3)',
          borderRadius: '1rem',
          padding: '1.5rem',
          marginBottom: '2rem'
        }}>
          <h3 style={{
            fontSize: '1rem',
            fontWeight: '600',
            marginBottom: '1rem',
            color: '#f1f5f9'
          }}>
            Custom Amount
          </h3>
          <div style={{
            display: 'flex',
            gap: '1rem',
            alignItems: 'flex-start'
          }}>
            <div style={{ flex: 1 }}>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                color: '#94a3b8',
                marginBottom: '0.5rem'
              }}>
                Enter number of tokens (minimum 10)
              </label>
              <input
                type="number"
                min="10"
                step="1"
                value={customAmount}
                onChange={(e) => {
                  const value = e.target.value
                  setCustomAmount(value)
                  if (value && parseInt(value) >= 10) {
                    setSelectedAmount(parseInt(value))
                    setIsCustom(true)
                  }
                }}
                placeholder="Enter amount..."
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '0.5rem',
                  border: '1px solid rgba(148, 163, 184, 0.3)',
                  background: 'rgba(15, 23, 42, 0.8)',
                  color: '#f1f5f9',
                  fontSize: '1rem'
                }}
              />
            </div>
            <div style={{
              flex: 1,
              padding: '0.75rem',
              borderRadius: '0.5rem',
              background: 'rgba(99, 102, 241, 0.1)',
              border: '1px solid rgba(99, 102, 241, 0.2)'
            }}>
              <div style={{
                fontSize: '0.875rem',
                color: '#94a3b8',
                marginBottom: '0.5rem'
              }}>
                Total Price
              </div>
              <div style={{
                fontSize: '1.5rem',
                fontWeight: 'bold',
                color: '#f1f5f9'
              }}>
                {customAmount && parseInt(customAmount) > 0
                  ? `$${(parseInt(customAmount) * 2.50).toFixed(2)}`
                  : '$0.00'}
              </div>
              <div style={{
                fontSize: '0.75rem',
                color: '#64748b',
                marginTop: '0.25rem'
              }}>
                $2.50 per token
              </div>
            </div>
          </div>
        </div>

        {selectedAmount && selectedAmount >= 10 && (
          <div style={{
            padding: '2rem',
            background: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: '1rem',
            marginBottom: '2rem'
          }}>
            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: '600',
              marginBottom: '1.5rem',
              textAlign: 'center',
              color: '#f1f5f9'
            }}>
              Choose Payment Method
            </h3>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1rem'
            }}>
              <button
                onClick={() => onSelectPayment('crypto')}
                style={{
                  padding: '1.5rem',
                  borderRadius: '0.75rem',
                  border: '2px solid rgba(20, 184, 166, 0.5)',
                  background: 'linear-gradient(135deg, rgba(20, 184, 166, 0.2) 0%, rgba(6, 182, 212, 0.2) 100%)',
                  color: '#f1f5f9',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: '600',
                  transition: 'all 0.3s',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.75rem'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)'
                  e.currentTarget.style.boxShadow = '0 10px 25px rgba(20, 184, 166, 0.3)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                <div style={{ fontSize: '2rem' }}>🦍</div>
                <div>ApeSpace DEX</div>
                <div style={{
                  fontSize: '0.75rem',
                  color: '#94a3b8'
                }}>
                  Pay with Crypto
                </div>
              </button>

              <button
                onClick={() => onSelectPayment('card')}
                style={{
                  padding: '1.5rem',
                  borderRadius: '0.75rem',
                  border: '2px solid rgba(59, 130, 246, 0.5)',
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(99, 102, 241, 0.2) 100%)',
                  color: '#f1f5f9',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: '600',
                  transition: 'all 0.3s',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.75rem'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)'
                  e.currentTarget.style.boxShadow = '0 10px 25px rgba(59, 130, 246, 0.3)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                <div style={{ fontSize: '2rem' }}>💳</div>
                <div>Credit Card</div>
                <div style={{
                  fontSize: '0.75rem',
                  color: '#94a3b8'
                }}>
                  $2.50 per token
                </div>
              </button>
            </div>
          </div>
        )}

        <div style={{
          textAlign: 'center',
          fontSize: '0.875rem',
          color: '#64748b',
          paddingTop: '1.5rem',
          borderTop: '1px solid rgba(148, 163, 184, 0.2)'
        }}>
          <p>Secure payment processing • Instant delivery • 24/7 support</p>
          <p style={{ marginTop: '0.5rem' }}>
            DL365 tokens are stored in your account and can be transferred to any Web3 wallet
          </p>
        </div>
      </div>
    </div>
  )
}
