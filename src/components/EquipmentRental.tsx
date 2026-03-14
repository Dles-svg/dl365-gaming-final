import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface Equipment {
  id: string
  owner_id: string
  equipment_type: 'mining' | 'computing' | 'gaming'
  tier: 'basic' | 'advanced' | 'professional' | 'elite'
  name: string
  description: string
  specs: Record<string, string>
  coins_per_hour: number
  available: boolean
  total_rentals: number
  rating: number
  image_url: string
}

interface Booking {
  id: string
  equipment_id: string
  booking_date: string
  start_hour: number
  end_hour: number
  coins_per_hour: number
  total_coins: number
  owner_confirmed: boolean
  renter_confirmed: boolean
  status: string
  equipment?: Equipment
  renter_id: string
  owner_id: string
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const HOURS = Array.from({ length: 24 }, (_, i) => i)

export default function EquipmentRental() {
  const { user } = useAuth()
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([])
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedHours, setSelectedHours] = useState<number[]>([])
  const [availableHours, setAvailableHours] = useState<number[]>([])
  const [bookedHours, setBookedHours] = useState<Set<number>>(new Set())
  const [myBookings, setMyBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTier, setSelectedTier] = useState<'basic' | 'advanced' | 'professional' | 'elite' | 'enthusiast' | 'extreme' | null>(null)
  const [myEquipmentTier, setMyEquipmentTier] = useState<'basic' | 'advanced' | 'professional' | 'elite' | 'enthusiast' | 'extreme' | null>(null)

  useEffect(() => {
    fetchEquipment()
    fetchMyBookings()
    fetchMyEquipmentTier()
  }, [])

  useEffect(() => {
    if (selectedEquipment) {
      fetchAvailabilityAndBookings()
    }
  }, [selectedEquipment, selectedDate])

  const fetchEquipment = async () => {
    const { data, error } = await supabase
      .from('equipment_listings')
      .select('*')
      .eq('available', true)
      .order('coins_per_hour', { ascending: true })

    if (!error && data) {
      setEquipmentList(data)
    }
    setLoading(false)
  }

  const fetchMyEquipmentTier = async () => {
    if (!user) return

    const { data, error } = await supabase
      .from('equipment_listings')
      .select('tier')
      .eq('owner_id', user.id)
      .maybeSingle()

    if (!error && data) {
      setMyEquipmentTier(data.tier as typeof myEquipmentTier)
    }
  }

  const fetchMyBookings = async () => {
    if (!user) return

    const { data, error } = await supabase
      .from('equipment_hourly_bookings')
      .select(`
        *,
        equipment:equipment_listings(*)
      `)
      .eq('renter_id', user.id)
      .gte('booking_date', new Date().toISOString().split('T')[0])
      .order('booking_date', { ascending: true })

    if (!error && data) {
      setMyBookings(data)
    }
  }

  const fetchAvailabilityAndBookings = async () => {
    if (!selectedEquipment) return

    const dayOfWeek = selectedDate.getDay()
    const dateStr = selectedDate.toISOString().split('T')[0]

    const { data: schedules } = await supabase
      .from('equipment_availability_schedule')
      .select('*')
      .eq('equipment_id', selectedEquipment.id)
      .eq('day_of_week', dayOfWeek)

    const { data: bookings } = await supabase
      .from('equipment_hourly_bookings')
      .select('start_hour, end_hour')
      .eq('equipment_id', selectedEquipment.id)
      .eq('booking_date', dateStr)
      .neq('status', 'cancelled')

    const available: number[] = []
    if (schedules && schedules.length > 0) {
      schedules.forEach(schedule => {
        for (let h = schedule.start_hour; h < schedule.end_hour; h++) {
          available.push(h)
        }
      })
    }

    const booked = new Set<number>()
    if (bookings) {
      bookings.forEach(booking => {
        for (let h = booking.start_hour; h < booking.end_hour; h++) {
          booked.add(h)
        }
      })
    }

    setAvailableHours(available.filter(h => !booked.has(h)))
    setBookedHours(booked)
  }

  const toggleHourSelection = (hour: number) => {
    if (bookedHours.has(hour) || !availableHours.includes(hour)) return

    setSelectedHours(prev => {
      if (prev.includes(hour)) {
        return prev.filter(h => h !== hour)
      } else {
        return [...prev, hour].sort((a, b) => a - b)
      }
    })
  }

  const createBooking = async () => {
    if (!user || !selectedEquipment || selectedHours.length === 0) return

    const startHour = Math.min(...selectedHours)
    const endHour = Math.max(...selectedHours) + 1
    const totalHours = selectedHours.length
    const totalCost = selectedEquipment.coins_per_hour * totalHours

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('dl365_balance')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile || profile.dl365_balance < totalCost) {
      alert(`Insufficient DL365 coins! You need ${totalCost} coins for this booking.`)
      return
    }

    const { error: bookingError } = await supabase
      .from('equipment_hourly_bookings')
      .insert({
        equipment_id: selectedEquipment.id,
        owner_id: selectedEquipment.owner_id,
        renter_id: user.id,
        booking_date: selectedDate.toISOString().split('T')[0],
        start_hour: startHour,
        end_hour: endHour,
        coins_per_hour: selectedEquipment.coins_per_hour,
        total_coins: totalCost,
        renter_confirmed: true,
        status: 'pending'
      })

    if (bookingError) {
      alert('Failed to create booking. Please try again.')
      return
    }

    const { error: deductError } = await supabase
      .from('user_profiles')
      .update({ dl365_balance: profile.dl365_balance - totalCost })
      .eq('id', user.id)

    if (deductError) {
      alert('Payment failed. Please contact support.')
      return
    }

    alert(`Booking created! ${totalHours} hour(s) reserved for ${totalCost} DL365. NO REFUNDS if you miss your time slot.`)
    setSelectedEquipment(null)
    setSelectedHours([])
    fetchMyBookings()
  }

  const formatHour = (hour: number) => {
    const period = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    return `${displayHour}:00 ${period}`
  }

  if (loading) {
    return <div className="text-white text-center py-8">Loading equipment...</div>
  }

  return (
    <div className="space-y-8">
      <div style={{
        background: 'linear-gradient(135deg, rgba(26, 84, 144, 0.08) 0%, rgba(230, 117, 39, 0.08) 100%)',
        backdropFilter: 'blur(12px)',
        borderRadius: '1.5rem',
        padding: '2.5rem',
        border: '2px solid rgba(230, 117, 39, 0.15)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
      }}>
        <h2 style={{
          fontSize: '2rem',
          fontWeight: '700',
          marginBottom: '2rem',
          background: 'linear-gradient(135deg, #1a5490 0%, #e67527 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          Equipment Tiers
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.5rem'
        }}>
          <div
            onClick={() => setSelectedTier(selectedTier === 'basic' ? null : 'basic')}
            style={{
            background: 'linear-gradient(135deg, rgba(219, 234, 254, 0.95) 0%, rgba(191, 219, 254, 0.90) 100%)',
            borderRadius: '1rem',
            padding: '1.75rem',
            border: selectedTier === 'basic' ? '3px solid #3d8ed9' : myEquipmentTier === 'basic' ? '3px solid #10b981' : '2px solid rgba(61, 142, 217, 0.3)',
            transition: 'all 0.3s ease',
            cursor: 'pointer',
            transform: selectedTier === 'basic' ? 'scale(1.02)' : 'scale(1)',
            boxShadow: selectedTier === 'basic' ? '0 8px 32px rgba(61, 142, 217, 0.5)' : myEquipmentTier === 'basic' ? '0 8px 32px rgba(16, 185, 129, 0.5)' : 'none',
            position: 'relative'
          }}>
            {myEquipmentTier === 'basic' && (
              <div style={{
                position: 'absolute',
                top: '-12px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                padding: '0.4rem 1rem',
                borderRadius: '1rem',
                fontSize: '0.75rem',
                fontWeight: '700',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.5)',
                whiteSpace: 'nowrap'
              }}>
                ★ YOUR TIER ★
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1e3a8a' }}>Tier 1: Entry-Level</h3>
              <span style={{
                background: 'linear-gradient(135deg, #3d8ed9 0%, #2c6fb0 100%)',
                color: 'white',
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
                fontWeight: '700',
                fontSize: '0.95rem',
                boxShadow: '0 4px 12px rgba(61, 142, 217, 0.4)'
              }}>
                1 DL365/hr ($2.50)
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <p style={{ color: '#1e40af', fontWeight: '700', fontSize: '0.9rem', marginBottom: '0.35rem' }}>CPU:</p>
                <p style={{ color: '#1e3a8a', fontSize: '0.8rem', fontWeight: '500', lineHeight: '1.5' }}>
                  Intel i3-10100 • AMD Ryzen 3 3200G • Intel i5-10210U • AMD Ryzen 3 3100 • Pentium Gold G6400
                </p>
              </div>
              <div>
                <p style={{ color: '#1e40af', fontWeight: '700', fontSize: '0.9rem', marginBottom: '0.35rem' }}>GPU:</p>
                <p style={{ color: '#1e3a8a', fontSize: '0.8rem', fontWeight: '500', lineHeight: '1.5' }}>
                  GTX 1650 • RX 5600 XT • GTX 1660 Super • RX 5500 XT • Quadro P400
                </p>
              </div>
            </div>
          </div>

          <div
            onClick={() => setSelectedTier(selectedTier === 'advanced' ? null : 'advanced')}
            style={{
            background: 'linear-gradient(135deg, rgba(209, 250, 229, 0.95) 0%, rgba(167, 243, 208, 0.90) 100%)',
            borderRadius: '1rem',
            padding: '1.75rem',
            border: selectedTier === 'advanced' ? '3px solid #10b981' : myEquipmentTier === 'advanced' ? '3px solid #10b981' : '2px solid rgba(16, 185, 129, 0.3)',
            transition: 'all 0.3s ease',
            cursor: 'pointer',
            transform: selectedTier === 'advanced' ? 'scale(1.02)' : 'scale(1)',
            boxShadow: selectedTier === 'advanced' ? '0 8px 32px rgba(16, 185, 129, 0.5)' : myEquipmentTier === 'advanced' ? '0 8px 32px rgba(16, 185, 129, 0.5)' : 'none',
            position: 'relative'
          }}>
            {myEquipmentTier === 'advanced' && (
              <div style={{
                position: 'absolute',
                top: '-12px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                padding: '0.4rem 1rem',
                borderRadius: '1rem',
                fontSize: '0.75rem',
                fontWeight: '700',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.5)',
                whiteSpace: 'nowrap'
              }}>
                ★ YOUR TIER ★
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#065f46' }}>Tier 2: Mid-Range</h3>
              <span style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
                fontWeight: '700',
                fontSize: '0.95rem',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)'
              }}>
                2 DL365/hr ($5.00)
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <p style={{ color: '#047857', fontWeight: '700', fontSize: '0.9rem', marginBottom: '0.35rem' }}>CPU:</p>
                <p style={{ color: '#065f46', fontSize: '0.8rem', fontWeight: '500', lineHeight: '1.5' }}>
                  Intel i5-11400 • AMD Ryzen 5 5600X • Intel i7-10700T • AMD Ryzen 5 3600 • Intel i5-1135G7
                </p>
              </div>
              <div>
                <p style={{ color: '#047857', fontWeight: '700', fontSize: '0.9rem', marginBottom: '0.35rem' }}>GPU:</p>
                <p style={{ color: '#065f46', fontSize: '0.8rem', fontWeight: '500', lineHeight: '1.5' }}>
                  RTX 3060 • RX 6700 XT • RTX 2060 Super • RX 6600 XT • Quadro RTX A2000
                </p>
              </div>
            </div>
          </div>

          <div
            onClick={() => setSelectedTier(selectedTier === 'professional' ? null : 'professional')}
            style={{
            background: 'linear-gradient(135deg, rgba(254, 215, 170, 0.95) 0%, rgba(253, 186, 116, 0.90) 100%)',
            borderRadius: '1rem',
            padding: '1.75rem',
            border: selectedTier === 'professional' ? '3px solid #e67527' : myEquipmentTier === 'professional' ? '3px solid #10b981' : '2px solid rgba(230, 117, 39, 0.3)',
            transition: 'all 0.3s ease',
            cursor: 'pointer',
            transform: selectedTier === 'professional' ? 'scale(1.02)' : 'scale(1)',
            boxShadow: selectedTier === 'professional' ? '0 8px 32px rgba(230, 117, 39, 0.5)' : myEquipmentTier === 'professional' ? '0 8px 32px rgba(16, 185, 129, 0.5)' : 'none',
            position: 'relative'
          }}>
            {myEquipmentTier === 'professional' && (
              <div style={{
                position: 'absolute',
                top: '-12px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                padding: '0.4rem 1rem',
                borderRadius: '1rem',
                fontSize: '0.75rem',
                fontWeight: '700',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.5)',
                whiteSpace: 'nowrap'
              }}>
                ★ YOUR TIER ★
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#7c2d12' }}>Tier 3: Performance</h3>
              <span style={{
                background: 'linear-gradient(135deg, #e67527 0%, #ff9447 100%)',
                color: 'white',
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
                fontWeight: '700',
                fontSize: '0.95rem',
                boxShadow: '0 4px 12px rgba(230, 117, 39, 0.4)'
              }}>
                3 DL365/hr ($7.50)
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <p style={{ color: '#9a3412', fontWeight: '700', fontSize: '0.9rem', marginBottom: '0.35rem' }}>CPU:</p>
                <p style={{ color: '#7c2d12', fontSize: '0.8rem', fontWeight: '500', lineHeight: '1.5' }}>
                  Intel i7-11700K • AMD Ryzen 7 5800X • Intel i9-10850K • AMD Ryzen 7 3700X • Xeon E5-1650 v3
                </p>
              </div>
              <div>
                <p style={{ color: '#9a3412', fontWeight: '700', fontSize: '0.9rem', marginBottom: '0.35rem' }}>GPU:</p>
                <p style={{ color: '#7c2d12', fontSize: '0.8rem', fontWeight: '500', lineHeight: '1.5' }}>
                  RTX 3070 • RX 6800 XT • RTX 3070 Ti • RX 6700 XT 12GB • Quadro RTX A4000
                </p>
              </div>
            </div>
          </div>

          <div
            onClick={() => setSelectedTier(selectedTier === 'elite' ? null : 'elite')}
            style={{
            background: 'linear-gradient(135deg, rgba(233, 213, 255, 0.95) 0%, rgba(216, 180, 254, 0.90) 100%)',
            borderRadius: '1rem',
            padding: '1.75rem',
            border: selectedTier === 'elite' ? '3px solid #9333ea' : myEquipmentTier === 'elite' ? '3px solid #10b981' : '2px solid rgba(147, 51, 234, 0.3)',
            transition: 'all 0.3s ease',
            cursor: 'pointer',
            transform: selectedTier === 'elite' ? 'scale(1.02)' : 'scale(1)',
            boxShadow: selectedTier === 'elite' ? '0 8px 32px rgba(147, 51, 234, 0.5)' : myEquipmentTier === 'elite' ? '0 8px 32px rgba(16, 185, 129, 0.5)' : 'none',
            position: 'relative'
          }}>
            {myEquipmentTier === 'elite' && (
              <div style={{
                position: 'absolute',
                top: '-12px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                padding: '0.4rem 1rem',
                borderRadius: '1rem',
                fontSize: '0.75rem',
                fontWeight: '700',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.5)',
                whiteSpace: 'nowrap'
              }}>
                ★ YOUR TIER ★
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#581c87' }}>Tier 4: High-End</h3>
              <span style={{
                background: 'linear-gradient(135deg, #9333ea 0%, #7e22ce 100%)',
                color: 'white',
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
                fontWeight: '700',
                fontSize: '0.95rem',
                boxShadow: '0 4px 12px rgba(147, 51, 234, 0.4)'
              }}>
                4 DL365/hr ($10.00)
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <p style={{ color: '#6b21a8', fontWeight: '700', fontSize: '0.9rem', marginBottom: '0.35rem' }}>CPU:</p>
                <p style={{ color: '#581c87', fontSize: '0.8rem', fontWeight: '500', lineHeight: '1.5' }}>
                  Intel i9-11900K • AMD Ryzen 9 5900X • Intel i9-11980HK • AMD Ryzen 9 3950X • Xeon W-2295
                </p>
              </div>
              <div>
                <p style={{ color: '#6b21a8', fontWeight: '700', fontSize: '0.9rem', marginBottom: '0.35rem' }}>GPU:</p>
                <p style={{ color: '#581c87', fontSize: '0.8rem', fontWeight: '500', lineHeight: '1.5' }}>
                  RTX 3080 • RX 6900 XT • RTX 3080 Ti • RX 6800 XT 16GB • Quadro RTX A5000
                </p>
              </div>
            </div>
          </div>

          <div
            onClick={() => setSelectedTier(selectedTier === 'enthusiast' ? null : 'enthusiast')}
            style={{
            background: 'linear-gradient(135deg, rgba(254, 202, 202, 0.95) 0%, rgba(252, 165, 165, 0.90) 100%)',
            borderRadius: '1rem',
            padding: '1.75rem',
            border: selectedTier === 'enthusiast' ? '3px solid #dc2626' : myEquipmentTier === 'enthusiast' ? '3px solid #10b981' : '2px solid rgba(220, 38, 38, 0.3)',
            transition: 'all 0.3s ease',
            cursor: 'pointer',
            transform: selectedTier === 'enthusiast' ? 'scale(1.02)' : 'scale(1)',
            boxShadow: selectedTier === 'enthusiast' ? '0 8px 32px rgba(220, 38, 38, 0.5)' : myEquipmentTier === 'enthusiast' ? '0 8px 32px rgba(16, 185, 129, 0.5)' : 'none',
            position: 'relative'
          }}>
            {myEquipmentTier === 'enthusiast' && (
              <div style={{
                position: 'absolute',
                top: '-12px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                padding: '0.4rem 1rem',
                borderRadius: '1rem',
                fontSize: '0.75rem',
                fontWeight: '700',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.5)',
                whiteSpace: 'nowrap'
              }}>
                ★ YOUR TIER ★
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#7f1d1d' }}>Tier 5: Enthusiast</h3>
              <span style={{
                background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                color: 'white',
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
                fontWeight: '700',
                fontSize: '0.95rem',
                boxShadow: '0 4px 12px rgba(220, 38, 38, 0.4)'
              }}>
                5 DL365/hr ($12.50)
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <p style={{ color: '#991b1b', fontWeight: '700', fontSize: '0.9rem', marginBottom: '0.35rem' }}>CPU:</p>
                <p style={{ color: '#7f1d1d', fontSize: '0.8rem', fontWeight: '500', lineHeight: '1.5' }}>
                  Intel i9-12900K • AMD Ryzen 9 5950X • Xeon E5-2699 v4 • AMD EPYC 7742 • Xeon W-3275
                </p>
              </div>
              <div>
                <p style={{ color: '#991b1b', fontWeight: '700', fontSize: '0.9rem', marginBottom: '0.35rem' }}>GPU:</p>
                <p style={{ color: '#7f1d1d', fontSize: '0.8rem', fontWeight: '500', lineHeight: '1.5' }}>
                  RTX 4080 • RX 7900 XTX • RTX 4080 Ti • RX 7800 XT • Quadro RTX A6000
                </p>
              </div>
            </div>
          </div>

          <div
            onClick={() => setSelectedTier(selectedTier === 'extreme' ? null : 'extreme')}
            style={{
            background: 'linear-gradient(135deg, rgba(255, 237, 213, 0.95) 0%, rgba(254, 215, 170, 0.90) 100%)',
            borderRadius: '1rem',
            padding: '1.75rem',
            border: selectedTier === 'extreme' ? '3px solid #ea580c' : myEquipmentTier === 'extreme' ? '3px solid #10b981' : '2px solid rgba(234, 88, 12, 0.3)',
            transition: 'all 0.3s ease',
            cursor: 'pointer',
            transform: selectedTier === 'extreme' ? 'scale(1.02)' : 'scale(1)',
            boxShadow: selectedTier === 'extreme' ? '0 8px 32px rgba(234, 88, 12, 0.5)' : myEquipmentTier === 'extreme' ? '0 8px 32px rgba(16, 185, 129, 0.5)' : 'none',
            position: 'relative'
          }}>
            {myEquipmentTier === 'extreme' && (
              <div style={{
                position: 'absolute',
                top: '-12px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                padding: '0.4rem 1rem',
                borderRadius: '1rem',
                fontSize: '0.75rem',
                fontWeight: '700',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.5)',
                whiteSpace: 'nowrap'
              }}>
                ★ YOUR TIER ★
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#7c2d12' }}>Tier 6: Extreme</h3>
              <span style={{
                background: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)',
                color: 'white',
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
                fontWeight: '700',
                fontSize: '0.95rem',
                boxShadow: '0 4px 12px rgba(234, 88, 12, 0.4)'
              }}>
                6 DL365/hr ($15.00)
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <p style={{ color: '#9a3412', fontWeight: '700', fontSize: '0.9rem', marginBottom: '0.35rem' }}>CPU:</p>
                <p style={{ color: '#7c2d12', fontSize: '0.8rem', fontWeight: '500', lineHeight: '1.5' }}>
                  Xeon Platinum 8380 • AMD EPYC 7763 • Xeon W-3375 • AMD EPYC 7713 • Xeon Platinum 8360Y
                </p>
              </div>
              <div>
                <p style={{ color: '#9a3412', fontWeight: '700', fontSize: '0.9rem', marginBottom: '0.35rem' }}>GPU:</p>
                <p style={{ color: '#7c2d12', fontSize: '0.8rem', fontWeight: '500', lineHeight: '1.5' }}>
                  RTX 4090 • RX 7990 XTX • RTX 4090 Ti • RX 7950 XTX • Quadro RTX A8000
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {myBookings.length > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(26, 84, 144, 0.1) 0%, rgba(61, 142, 217, 0.05) 100%)',
          backdropFilter: 'blur(12px)',
          borderRadius: '1.5rem',
          padding: '2rem',
          border: '2px solid rgba(61, 142, 217, 0.2)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
        }}>
          <h3 style={{
            fontSize: '1.5rem',
            fontWeight: '700',
            color: '#fff',
            marginBottom: '1.5rem'
          }}>
            My Upcoming Bookings
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {myBookings.map((booking) => (
              <div key={booking.id} style={{
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '1rem',
                padding: '1.5rem',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                transition: 'all 0.3s ease'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                  <div style={{ flex: '1', minWidth: '200px' }}>
                    <h4 style={{ color: '#fff', fontWeight: '600', fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                      {booking.equipment?.name}
                    </h4>
                    <p style={{ fontSize: '0.9rem', color: '#cbd5e1', marginBottom: '0.25rem' }}>
                      {new Date(booking.booking_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </p>
                    <p style={{ fontSize: '0.9rem', color: '#cbd5e1', marginBottom: '0.5rem' }}>
                      {formatHour(booking.start_hour)} - {formatHour(booking.end_hour)}
                    </p>
                    <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                      Total: <span style={{ color: '#3d8ed9', fontWeight: '600' }}>{booking.total_coins} DL365</span> • {booking.status.toUpperCase()}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {booking.owner_confirmed && booking.renter_confirmed ? (
                      <span style={{
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: 'white',
                        padding: '0.5rem 1rem',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        display: 'inline-block',
                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                      }}>
                        CONFIRMED
                      </span>
                    ) : (
                      <span style={{
                        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                        color: 'white',
                        padding: '0.5rem 1rem',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        display: 'inline-block',
                        boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
                      }}>
                        PENDING
                      </span>
                    )}
                    <p style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.5rem', fontWeight: '500' }}>
                      NO REFUNDS
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{
        background: 'linear-gradient(135deg, rgba(26, 84, 144, 0.08) 0%, rgba(230, 117, 39, 0.08) 100%)',
        backdropFilter: 'blur(12px)',
        borderRadius: '1.5rem',
        padding: '2.5rem',
        border: '2px solid rgba(230, 117, 39, 0.15)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
      }}>
        <h2 style={{
          fontSize: '1.75rem',
          fontWeight: '700',
          color: '#1e293b',
          marginBottom: '2rem'
        }}>
          All Available Equipment
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {(['basic', 'advanced', 'professional', 'elite', 'enthusiast', 'extreme'] as const).map((tier) => {
            const tierEquipment = equipmentList.filter(eq => eq.tier === tier)
            const tierInfo = {
              basic: { name: 'Tier 1: Entry-Level', color: '#3d8ed9', bgGradient: 'linear-gradient(135deg, rgba(219, 234, 254, 0.95) 0%, rgba(191, 219, 254, 0.90) 100%)' },
              advanced: { name: 'Tier 2: Mid-Range', color: '#10b981', bgGradient: 'linear-gradient(135deg, rgba(209, 250, 229, 0.95) 0%, rgba(167, 243, 208, 0.90) 100%)' },
              professional: { name: 'Tier 3: Performance', color: '#e67527', bgGradient: 'linear-gradient(135deg, rgba(254, 215, 170, 0.95) 0%, rgba(253, 186, 116, 0.90) 100%)' },
              elite: { name: 'Tier 4: High-End', color: '#9333ea', bgGradient: 'linear-gradient(135deg, rgba(233, 213, 255, 0.95) 0%, rgba(216, 180, 254, 0.90) 100%)' },
              enthusiast: { name: 'Tier 5: Enthusiast', color: '#dc2626', bgGradient: 'linear-gradient(135deg, rgba(254, 202, 202, 0.95) 0%, rgba(252, 165, 165, 0.90) 100%)' },
              extreme: { name: 'Tier 6: Extreme', color: '#ea580c', bgGradient: 'linear-gradient(135deg, rgba(255, 237, 213, 0.95) 0%, rgba(254, 215, 170, 0.90) 100%)' }
            }
            const info = tierInfo[tier]

            return (
              <div key={tier} style={{ width: '100%' }}>
                <div
                  onClick={() => setSelectedTier(selectedTier === tier ? null : tier)}
                  style={{
                    background: info.bgGradient,
                    borderRadius: '1rem',
                    padding: '1.5rem',
                    border: `2px solid ${info.color}40`,
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = `0 8px 24px ${info.color}40`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{
                      fontSize: '1.5rem',
                      color: '#1e293b',
                      fontWeight: '700'
                    }}>
                      {selectedTier === tier ? '▼' : '▶'}
                    </span>
                    <h3 style={{ fontSize: '1.35rem', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                      {info.name}
                    </h3>
                  </div>
                  <span style={{ fontSize: '0.95rem', color: '#475569', fontWeight: '600' }}>
                    {tierEquipment.length} item{tierEquipment.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {selectedTier === tier && (
                  <div style={{
                    marginTop: '1.5rem',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                    gap: '1.5rem',
                    paddingLeft: '2rem'
                  }}>
                    {tierEquipment.length === 0 ? (
                      <div style={{
                        gridColumn: '1 / -1',
                        textAlign: 'center',
                        padding: '3rem 2rem',
                        color: '#64748b',
                        fontSize: '1rem'
                      }}>
                        No equipment available in this tier yet. Check back soon!
                      </div>
                    ) : (
                      tierEquipment.map((equipment) => (
          <div
            key={equipment.id}
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
              borderRadius: '1.25rem',
              overflow: 'hidden',
              border: '2px solid rgba(230, 117, 39, 0.2)',
              transition: 'all 0.3s ease',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.borderColor = 'rgba(61, 142, 217, 0.5)';
              e.currentTarget.style.boxShadow = '0 12px 32px rgba(61, 142, 217, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = 'rgba(230, 117, 39, 0.2)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={{ position: 'relative', height: '160px', overflow: 'hidden' }}>
              <img
                src={equipment.image_url}
                alt={equipment.name}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  opacity: 0.85
                }}
              />
              <div style={{
                position: 'absolute',
                top: '0.75rem',
                right: '0.75rem',
                background: 'linear-gradient(135deg, #3d8ed9 0%, #2c6fb0 100%)',
                backdropFilter: 'blur(8px)',
                padding: '0.5rem 0.75rem',
                borderRadius: '0.5rem',
                color: 'white',
                fontSize: '0.875rem',
                fontWeight: '700',
                boxShadow: '0 4px 12px rgba(61, 142, 217, 0.5)'
              }}>
                {equipment.coins_per_hour} DL365/hr
              </div>
              <div style={{
                position: 'absolute',
                bottom: '0.75rem',
                left: '0.75rem',
                background: 'rgba(0, 0, 0, 0.7)',
                backdropFilter: 'blur(8px)',
                padding: '0.4rem 0.75rem',
                borderRadius: '0.5rem',
                color: 'white',
                fontSize: '0.8rem',
                textTransform: 'capitalize',
                fontWeight: '500'
              }}>
                {equipment.equipment_type}
              </div>
            </div>

            <div style={{ padding: '1.25rem' }}>
              <h3 style={{
                fontSize: '1.05rem',
                fontWeight: '600',
                color: '#1e293b',
                marginBottom: '0.5rem',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {equipment.name}
              </h3>
              <p style={{
                fontSize: '0.85rem',
                color: '#475569',
                marginBottom: '1rem',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                minHeight: '2.5rem'
              }}>
                {equipment.description}
              </p>

              <div style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {equipment.specs.gpu && (
                  <div style={{ fontSize: '0.85rem', color: '#334155' }}>
                    <span style={{ color: '#475569', fontWeight: '600' }}>GPU:</span> {equipment.specs.gpu}
                  </div>
                )}
                {equipment.specs.cpu && (
                  <div style={{ fontSize: '0.85rem', color: '#334155' }}>
                    <span style={{ color: '#475569', fontWeight: '600' }}>CPU:</span> {equipment.specs.cpu}
                  </div>
                )}
                {equipment.specs.ram && (
                  <div style={{ fontSize: '0.85rem', color: '#334155' }}>
                    <span style={{ color: '#475569', fontWeight: '600' }}>RAM:</span> {equipment.specs.ram}
                  </div>
                )}
                {equipment.specs.hashrate && (
                  <div style={{ fontSize: '0.85rem', color: '#334155' }}>
                    <span style={{ color: '#475569', fontWeight: '600' }}>Hash:</span> {equipment.specs.hashrate}
                  </div>
                )}
                {equipment.specs.fps && (
                  <div style={{ fontSize: '0.85rem', color: '#334155' }}>
                    <span style={{ color: '#475569', fontWeight: '600' }}>FPS:</span> {equipment.specs.fps}
                  </div>
                )}
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1rem'
              }}>
                <span style={{
                  fontSize: '0.8rem',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '0.5rem',
                  fontWeight: '600',
                  background: equipment.available
                    ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.1) 100%)'
                    : 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(220, 38, 38, 0.1) 100%)',
                  color: equipment.available ? '#10b981' : '#ef4444',
                  border: equipment.available ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)'
                }}>
                  {equipment.available ? 'Available' : 'Unavailable'}
                </span>
                {equipment.rating > 0 && (
                  <span style={{ fontSize: '0.85rem', color: '#475569' }}>
                    ★ {equipment.rating.toFixed(1)} ({equipment.total_rentals})
                  </span>
                )}
              </div>

              <button
                onClick={() => setSelectedEquipment(equipment)}
                disabled={!equipment.available}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: equipment.available
                    ? 'linear-gradient(135deg, #e67527 0%, #ff9447 100%)'
                    : 'rgba(100, 116, 139, 0.3)',
                  color: 'white',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  borderRadius: '0.75rem',
                  border: 'none',
                  cursor: equipment.available ? 'pointer' : 'not-allowed',
                  transition: 'all 0.3s ease',
                  opacity: equipment.available ? 1 : 0.5,
                  boxShadow: equipment.available ? '0 4px 12px rgba(230, 117, 39, 0.4)' : 'none'
                }}
                onMouseEnter={(e) => {
                  if (equipment.available) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(230, 117, 39, 0.6)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (equipment.available) {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(230, 117, 39, 0.4)';
                  }
                }}
              >
                Book Now
              </button>
            </div>
          </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {selectedEquipment && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.98) 0%, rgba(15, 23, 42, 0.98) 100%)',
            borderRadius: '1.5rem',
            maxWidth: '900px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '2rem',
            border: '2px solid rgba(61, 142, 217, 0.3)',
            boxShadow: '0 24px 48px rgba(0, 0, 0, 0.4)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '2rem',
              paddingBottom: '1.5rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <div>
                <h3 style={{
                  fontSize: '1.75rem',
                  fontWeight: '700',
                  color: '#fff',
                  marginBottom: '0.5rem'
                }}>
                  {selectedEquipment.name}
                </h3>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{
                    background: 'linear-gradient(135deg, #3d8ed9 0%, #2c6fb0 100%)',
                    color: 'white',
                    padding: '0.5rem 1rem',
                    borderRadius: '0.5rem',
                    fontWeight: '700',
                    fontSize: '1.1rem',
                    boxShadow: '0 4px 12px rgba(61, 142, 217, 0.4)'
                  }}>
                    {selectedEquipment.coins_per_hour} DL365/hour
                  </span>
                  <span style={{
                    background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(220, 38, 38, 0.1) 100%)',
                    color: '#ef4444',
                    padding: '0.5rem 1rem',
                    borderRadius: '0.5rem',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    border: '1px solid rgba(239, 68, 68, 0.3)'
                  }}>
                    NO REFUNDS
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedEquipment(null)
                  setSelectedHours([])
                }}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '2rem',
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  lineHeight: '1'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                  e.currentTarget.style.color = '#ef4444';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.color = '#94a3b8';
                }}
              >
                ×
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '1rem',
                  fontWeight: '600',
                  color: '#cbd5e1',
                  marginBottom: '0.75rem'
                }}>
                  Select Date
                </label>
                <input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={selectedDate.toISOString().split('T')[0]}
                  onChange={(e) => {
                    setSelectedDate(new Date(e.target.value))
                    setSelectedHours([])
                  }}
                  style={{
                    width: '100%',
                    padding: '0.875rem 1rem',
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '2px solid rgba(148, 163, 184, 0.3)',
                    borderRadius: '0.75rem',
                    color: '#fff',
                    fontSize: '1rem',
                    fontWeight: '500',
                    transition: 'all 0.2s'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#3d8ed9';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(61, 142, 217, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.3)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
                <p style={{
                  fontSize: '0.9rem',
                  color: '#94a3b8',
                  marginTop: '0.5rem',
                  fontWeight: '500'
                }}>
                  {DAYS[selectedDate.getDay()]}, {selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '1rem',
                  fontWeight: '600',
                  color: '#cbd5e1',
                  marginBottom: '0.75rem'
                }}>
                  Select Time Slots
                </label>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
                  gap: '0.75rem',
                  maxHeight: '400px',
                  overflowY: 'auto',
                  padding: '1rem',
                  background: 'rgba(0, 0, 0, 0.3)',
                  borderRadius: '1rem',
                  border: '1px solid rgba(148, 163, 184, 0.2)'
                }}>
                  {HOURS.map((hour) => {
                    const isAvailable = availableHours.includes(hour)
                    const isBooked = bookedHours.has(hour)
                    const isSelected = selectedHours.includes(hour)

                    let buttonStyle: React.CSSProperties = {
                      padding: '0.875rem 0.5rem',
                      borderRadius: '0.75rem',
                      border: '2px solid',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      transition: 'all 0.2s',
                      cursor: 'pointer',
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.25rem',
                      minHeight: '70px',
                      justifyContent: 'center'
                    }

                    if (isBooked) {
                      buttonStyle = {
                        ...buttonStyle,
                        background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(220, 38, 38, 0.1) 100%)',
                        borderColor: 'rgba(239, 68, 68, 0.4)',
                        color: '#ef4444',
                        cursor: 'not-allowed',
                        opacity: 0.6
                      }
                    } else if (!isAvailable) {
                      buttonStyle = {
                        ...buttonStyle,
                        background: 'rgba(30, 41, 59, 0.5)',
                        borderColor: 'rgba(71, 85, 105, 0.3)',
                        color: '#475569',
                        cursor: 'not-allowed',
                        opacity: 0.5
                      }
                    } else if (isSelected) {
                      buttonStyle = {
                        ...buttonStyle,
                        background: 'linear-gradient(135deg, #3d8ed9 0%, #2c6fb0 100%)',
                        borderColor: '#3d8ed9',
                        color: 'white',
                        boxShadow: '0 4px 12px rgba(61, 142, 217, 0.4)',
                        transform: 'scale(1.02)'
                      }
                    } else {
                      buttonStyle = {
                        ...buttonStyle,
                        background: 'rgba(30, 41, 59, 0.6)',
                        borderColor: 'rgba(148, 163, 184, 0.3)',
                        color: '#cbd5e1'
                      }
                    }

                    return (
                      <button
                        key={hour}
                        onClick={() => toggleHourSelection(hour)}
                        disabled={!isAvailable || isBooked}
                        style={buttonStyle}
                        onMouseEnter={(e) => {
                          if (isAvailable && !isBooked && !isSelected) {
                            e.currentTarget.style.borderColor = '#3d8ed9';
                            e.currentTarget.style.background = 'rgba(61, 142, 217, 0.1)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (isAvailable && !isBooked && !isSelected) {
                            e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.3)';
                            e.currentTarget.style.background = 'rgba(30, 41, 59, 0.6)';
                          }
                        }}
                      >
                        <div style={{ fontSize: '0.95rem', fontWeight: '700' }}>{formatHour(hour)}</div>
                        <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                          {isBooked ? '✕ Booked' : !isAvailable ? '✕ N/A' : isSelected ? '✓ Selected' : `to ${formatHour(hour + 1)}`}
                        </div>
                      </button>
                    )
                  })}
                </div>
                <div style={{
                  display: 'flex',
                  gap: '1.5rem',
                  marginTop: '1rem',
                  flexWrap: 'wrap',
                  fontSize: '0.85rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '4px',
                      background: 'linear-gradient(135deg, #3d8ed9 0%, #2c6fb0 100%)'
                    }} />
                    <span style={{ color: '#cbd5e1' }}>Selected</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '4px',
                      background: 'rgba(30, 41, 59, 0.6)',
                      border: '2px solid rgba(148, 163, 184, 0.3)'
                    }} />
                    <span style={{ color: '#cbd5e1' }}>Available</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '4px',
                      background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(220, 38, 38, 0.1) 100%)',
                      border: '2px solid rgba(239, 68, 68, 0.4)'
                    }} />
                    <span style={{ color: '#cbd5e1' }}>Booked</span>
                  </div>
                </div>
              </div>

              {selectedHours.length > 0 && (
                <div style={{
                  background: 'linear-gradient(135deg, rgba(61, 142, 217, 0.15) 0%, rgba(44, 111, 176, 0.1) 100%)',
                  borderRadius: '1rem',
                  padding: '1.5rem',
                  border: '2px solid rgba(61, 142, 217, 0.3)',
                  boxShadow: '0 4px 16px rgba(61, 142, 217, 0.2)'
                }}>
                  <h4 style={{
                    color: '#fff',
                    fontWeight: '700',
                    marginBottom: '1rem',
                    fontSize: '1.1rem'
                  }}>
                    Booking Summary
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.95rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#94a3b8', fontWeight: '500' }}>Selected hours:</span>
                      <span style={{ color: '#fff', fontWeight: '600' }}>{selectedHours.length} hour{selectedHours.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#94a3b8', fontWeight: '500' }}>Rate per hour:</span>
                      <span style={{ color: '#fff', fontWeight: '600' }}>{selectedEquipment.coins_per_hour} DL365</span>
                    </div>
                    <div style={{
                      borderTop: '1px solid rgba(148, 163, 184, 0.3)',
                      paddingTop: '0.75rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span style={{ color: '#fff', fontWeight: '700', fontSize: '1.05rem' }}>Total Cost:</span>
                      <span style={{
                        background: 'linear-gradient(135deg, #3d8ed9 0%, #2c6fb0 100%)',
                        color: 'white',
                        padding: '0.5rem 1rem',
                        borderRadius: '0.5rem',
                        fontWeight: '700',
                        fontSize: '1.2rem',
                        boxShadow: '0 4px 12px rgba(61, 142, 217, 0.4)'
                      }}>
                        {selectedEquipment.coins_per_hour * selectedHours.length} DL365
                      </span>
                    </div>
                    <p style={{
                      color: '#ef4444',
                      fontSize: '0.8rem',
                      marginTop: '0.5rem',
                      fontWeight: '600',
                      textAlign: 'center',
                      padding: '0.5rem',
                      background: 'rgba(239, 68, 68, 0.1)',
                      borderRadius: '0.5rem',
                      border: '1px solid rgba(239, 68, 68, 0.3)'
                    }}>
                      ⚠️ NO REFUNDS if you miss your reserved time slot!
                    </p>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button
                  onClick={() => {
                    setSelectedEquipment(null)
                    setSelectedHours([])
                  }}
                  style={{
                    flex: 1,
                    padding: '1rem',
                    background: 'rgba(71, 85, 105, 0.3)',
                    border: '2px solid rgba(148, 163, 184, 0.3)',
                    color: '#cbd5e1',
                    fontWeight: '600',
                    borderRadius: '0.75rem',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(71, 85, 105, 0.5)';
                    e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.5)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(71, 85, 105, 0.3)';
                    e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.3)';
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={createBooking}
                  disabled={selectedHours.length === 0}
                  style={{
                    flex: 2,
                    padding: '1rem',
                    background: selectedHours.length === 0
                      ? 'rgba(71, 85, 105, 0.3)'
                      : 'linear-gradient(135deg, #e67527 0%, #ff9447 100%)',
                    border: 'none',
                    color: 'white',
                    fontWeight: '700',
                    borderRadius: '0.75rem',
                    cursor: selectedHours.length === 0 ? 'not-allowed' : 'pointer',
                    fontSize: '1.05rem',
                    transition: 'all 0.2s',
                    opacity: selectedHours.length === 0 ? 0.5 : 1,
                    boxShadow: selectedHours.length === 0 ? 'none' : '0 4px 16px rgba(230, 117, 39, 0.4)'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedHours.length > 0) {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 6px 20px rgba(230, 117, 39, 0.6)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedHours.length > 0) {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 16px rgba(230, 117, 39, 0.4)';
                    }
                  }}
                >
                  {selectedHours.length === 0
                    ? 'Select Time Slots'
                    : `Reserve ${selectedHours.length} Hour${selectedHours.length !== 1 ? 's' : ''}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
