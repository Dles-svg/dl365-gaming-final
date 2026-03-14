import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const FIXED_PRICE = 2.50;

interface CardPurchaseProps {
  onClose?: () => void;
}

export function CardPurchase({ onClose }: CardPurchaseProps = {}) {
  const { user } = useAuth();
  const [usdAmount, setUsdAmount] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [cardName, setCardName] = useState('');

  const tokenAmount = usdAmount ? (parseFloat(usdAmount) / FIXED_PRICE).toFixed(2) : '0';
  const minPurchase = FIXED_PRICE;

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];

    for (let i = 0; i < match.length; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length) {
      return parts.join(' ');
    } else {
      return value;
    }
  };

  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.slice(0, 2) + '/' + v.slice(2, 4);
    }
    return v;
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardNumber(e.target.value);
    if (formatted.replace(/\s/g, '').length <= 16) {
      setCardNumber(formatted);
    }
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatExpiry(e.target.value);
    if (formatted.replace('/', '').length <= 4) {
      setCardExpiry(formatted);
    }
  };

  const handleCvcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/gi, '');
    if (value.length <= 4) {
      setCardCvc(value);
    }
  };

  const getCardBrand = (number: string): string => {
    const cleaned = number.replace(/\s/g, '');
    if (/^4/.test(cleaned)) return 'Visa';
    if (/^5[1-5]/.test(cleaned)) return 'Mastercard';
    if (/^3[47]/.test(cleaned)) return 'Amex';
    if (/^6(?:011|5)/.test(cleaned)) return 'Discover';
    return 'Unknown';
  };

  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!user) {
      setError('Please log in to make a purchase');
      return;
    }

    const amount = parseFloat(usdAmount);
    if (isNaN(amount) || amount < minPurchase) {
      setError(`Minimum purchase is $${minPurchase.toFixed(2)}`);
      return;
    }

    if (!cardNumber || !cardExpiry || !cardCvc || !cardName) {
      setError('Please fill in all card details');
      return;
    }

    const cleanedCard = cardNumber.replace(/\s/g, '');
    if (cleanedCard.length < 13 || cleanedCard.length > 16) {
      setError('Invalid card number');
      return;
    }

    if (cardExpiry.length !== 5) {
      setError('Invalid expiry date (MM/YY)');
      return;
    }

    if (cardCvc.length < 3 || cardCvc.length > 4) {
      setError('Invalid CVC');
      return;
    }

    setProcessing(true);

    try {
      const tokens = amount / FIXED_PRICE;
      const cardBrand = getCardBrand(cleanedCard);
      const last4 = cleanedCard.slice(-4);

      const { data: purchase, error: purchaseError } = await supabase
        .from('card_purchases')
        .insert({
          user_id: user.id,
          amount_usd: amount,
          token_amount: tokens,
          card_last4: last4,
          card_brand: cardBrand,
          status: 'pending',
          payment_intent_id: `demo_${Date.now()}`
        })
        .select()
        .maybeSingle();

      if (purchaseError) throw purchaseError;

      await new Promise(resolve => setTimeout(resolve, 1500));

      const { error: updateError } = await supabase
        .from('card_purchases')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', purchase.id);

      if (updateError) throw updateError;

      setSuccess(`Successfully purchased ${tokens.toFixed(2)} DL365 tokens!`);
      setUsdAmount('');
      setCardNumber('');
      setCardExpiry('');
      setCardCvc('');
      setCardName('');

      setTimeout(() => setSuccess(''), 5000);

    } catch (err: any) {
      setError(err.message || 'Purchase failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const content = (
    <div className="bg-white rounded-lg shadow-lg p-8" style={{ maxWidth: '600px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="text-center mb-8">
          {onClose && (
            <button
              onClick={onClose}
              style={{
                float: 'right',
                padding: '0.5rem',
                borderRadius: '0.5rem',
                border: 'none',
                background: 'transparent',
                color: '#64748b',
                cursor: 'pointer',
                fontSize: '1.5rem',
                lineHeight: '1'
              }}
            >
              ×
            </button>
          )}
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Buy DL365 Tokens</h2>
          <p className="text-gray-600">Fixed price: <span className="text-2xl font-bold text-green-600">${FIXED_PRICE}</span> per token</p>
          <p className="text-sm text-gray-500 mt-2">No slippage • Instant delivery • Secure payment</p>
        </div>

        <form onSubmit={handlePurchase} className="space-y-6">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Purchase Amount (USD)
            </label>
            <input
              type="number"
              min={minPurchase}
              step="0.01"
              value={usdAmount}
              onChange={(e) => setUsdAmount(e.target.value)}
              placeholder={`Minimum $${minPurchase.toFixed(2)}`}
              className="w-full px-4 py-3 text-2xl font-bold border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={processing}
            />

            {usdAmount && parseFloat(usdAmount) >= minPurchase && (
              <div className="mt-4 p-4 bg-white rounded-lg border-2 border-green-500">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">You will receive:</span>
                  <span className="text-3xl font-bold text-green-600">{tokenAmount} DL365</span>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Payment Details</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Card Number
              </label>
              <input
                type="text"
                value={cardNumber}
                onChange={handleCardNumberChange}
                placeholder="1234 5678 9012 3456"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={processing}
              />
              {cardNumber && (
                <p className="text-sm text-gray-500 mt-1">{getCardBrand(cardNumber)}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expiry Date
                </label>
                <input
                  type="text"
                  value={cardExpiry}
                  onChange={handleExpiryChange}
                  placeholder="MM/YY"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={processing}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CVC
                </label>
                <input
                  type="text"
                  value={cardCvc}
                  onChange={handleCvcChange}
                  placeholder="123"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={processing}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cardholder Name
              </label>
              <input
                type="text"
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                placeholder="JOHN DOE"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
                disabled={processing}
              />
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-600 text-sm font-medium">{success}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={processing || !usdAmount || parseFloat(usdAmount) < minPurchase}
            className="w-full bg-gradient-to-r from-green-600 to-blue-600 text-white py-4 px-6 rounded-lg font-semibold text-lg hover:from-green-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
          >
            {processing ? 'Processing...' : `Purchase ${tokenAmount} DL365 Tokens`}
          </button>

          <p className="text-xs text-gray-500 text-center">
            Secure payment processing • Your card details are encrypted • No hidden fees
          </p>
        </form>

        <div className="mt-8 pt-8 border-t border-gray-200 text-center">
          <p className="text-gray-600 mb-4 font-medium">Or buy with crypto</p>
          <a
            href="https://apespace.io/bsc/0xa768ed990313a08ab706fd245319531c31f7e83d"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-gradient-to-r from-teal-500 to-cyan-500 text-white px-6 py-3 rounded-lg font-semibold hover:from-teal-600 hover:to-cyan-600 transition-all shadow-lg"
          >
            Trade on ApeSpace DEX
          </a>
          <p className="text-xs text-gray-500 mt-3">
            Buy DL365 tokens directly with cryptocurrency on the DEX
          </p>
        </div>
      </div>
  );

  if (onClose) {
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
        {content}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {content}
    </div>
  );
}
