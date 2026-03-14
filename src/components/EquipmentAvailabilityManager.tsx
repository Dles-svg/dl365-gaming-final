import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface Equipment {
  id: string
  name: string
  tier: string
  coins_per_hour: number
}

interface Schedule {
  id: string
  equipment_id: string
  day_of_week: number
  start_hour: number
  end_hour: number
}

interface Booking {
  id: string
  equipment_id: string
  booking_date: string
  start_hour: number
  end_hour: number
  total_coins: number
  owner_confirmed: boolean
  renter_confirmed: boolean
  status: string
  equipment?: Equipment
  renter_id: string
  owner_id: string
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const HOURS = Array.from({ length: 25 }, (_, i) => i)

export default function EquipmentAvailabilityManager() {
  const { user } = useAuth()
  const [myEquipment, setMyEquipment] = useState<Equipment[]>([])
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null)
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [pendingBookings, setPendingBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)

  const [editingDay, setEditingDay] = useState<number | null>(null)
  const [startHour, setStartHour] = useState(9)
  const [endHour, setEndHour] = useState(17)

  useEffect(() => {
    fetchMyEquipment()
    fetchPendingBookings()
  }, [])

  useEffect(() => {
    if (selectedEquipment) {
      fetchSchedules()
    }
  }, [selectedEquipment])

  const fetchMyEquipment = async () => {
    if (!user) return

    const { data, error } = await supabase
      .from('equipment_listings')
      .select('id, name, tier, coins_per_hour')
      .eq('owner_id', user.id)

    if (!error && data) {
      setMyEquipment(data)
      if (data.length > 0 && !selectedEquipment) {
        setSelectedEquipment(data[0])
      }
    }
    setLoading(false)
  }

  const fetchSchedules = async () => {
    if (!selectedEquipment) return

    const { data, error } = await supabase
      .from('equipment_availability_schedule')
      .select('*')
      .eq('equipment_id', selectedEquipment.id)
      .order('day_of_week', { ascending: true })

    if (!error && data) {
      setSchedules(data)
    }
  }

  const fetchPendingBookings = async () => {
    if (!user) return

    const { data, error } = await supabase
      .from('equipment_hourly_bookings')
      .select(`
        *,
        equipment:equipment_listings(id, name, tier, coins_per_hour)
      `)
      .eq('owner_id', user.id)
      .eq('owner_confirmed', false)
      .gte('booking_date', new Date().toISOString().split('T')[0])
      .order('booking_date', { ascending: true })

    if (!error && data) {
      setPendingBookings(data)
    }
  }

  const saveSchedule = async (dayOfWeek: number) => {
    if (!selectedEquipment || !user) return

    const existing = schedules.find(s => s.day_of_week === dayOfWeek)

    if (existing) {
      const { error } = await supabase
        .from('equipment_availability_schedule')
        .update({
          start_hour: startHour,
          end_hour: endHour
        })
        .eq('id', existing.id)

      if (error) {
        alert('Failed to update schedule')
        return
      }
    } else {
      const { error } = await supabase
        .from('equipment_availability_schedule')
        .insert({
          equipment_id: selectedEquipment.id,
          owner_id: user.id,
          day_of_week: dayOfWeek,
          start_hour: startHour,
          end_hour: endHour
        })

      if (error) {
        alert('Failed to add schedule')
        return
      }
    }

    setEditingDay(null)
    fetchSchedules()
  }

  const deleteSchedule = async (scheduleId: string) => {
    const { error } = await supabase
      .from('equipment_availability_schedule')
      .delete()
      .eq('id', scheduleId)

    if (!error) {
      fetchSchedules()
    }
  }

  const confirmBooking = async (bookingId: string) => {
    const { error } = await supabase
      .from('equipment_hourly_bookings')
      .update({
        owner_confirmed: true,
        status: 'confirmed'
      })
      .eq('id', bookingId)

    if (!error) {
      alert('Booking confirmed!')
      fetchPendingBookings()
    }
  }

  const rejectBooking = async (bookingId: string) => {
    const booking = pendingBookings.find(b => b.id === bookingId)
    if (!booking) return

    const { error: updateError } = await supabase
      .from('equipment_hourly_bookings')
      .update({ status: 'cancelled' })
      .eq('id', bookingId)

    if (updateError) {
      alert('Failed to reject booking')
      return
    }

    const { data: renterProfile } = await supabase
      .from('user_profiles')
      .select('dl365_balance')
      .eq('id', booking.renter_id)
      .maybeSingle()

    if (renterProfile) {
      await supabase
        .from('user_profiles')
        .update({
          dl365_balance: renterProfile.dl365_balance + booking.total_coins
        })
        .eq('id', booking.renter_id)
    }

    alert('Booking rejected and refunded')
    fetchPendingBookings()
  }

  const formatHour = (hour: number) => {
    const period = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    return `${displayHour}:00 ${period}`
  }

  const getScheduleForDay = (dayOfWeek: number) => {
    return schedules.find(s => s.day_of_week === dayOfWeek)
  }

  const editDay = (dayOfWeek: number) => {
    const schedule = getScheduleForDay(dayOfWeek)
    if (schedule) {
      setStartHour(schedule.start_hour)
      setEndHour(schedule.end_hour)
    } else {
      setStartHour(9)
      setEndHour(17)
    }
    setEditingDay(dayOfWeek)
  }

  if (loading) {
    return <div className="text-white text-center py-8">Loading...</div>
  }

  if (myEquipment.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400 text-lg">You don't have any equipment listed yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {pendingBookings.length > 0 && (
        <div className="bg-gradient-to-br from-yellow-900/30 to-orange-900/30 backdrop-blur-sm rounded-lg p-6 border border-yellow-500/20">
          <h3 className="text-xl font-bold text-white mb-4">Pending Booking Confirmations</h3>
          <div className="space-y-3">
            {pendingBookings.map((booking) => (
              <div key={booking.id} className="bg-black/30 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-white font-semibold">{booking.equipment?.name}</h4>
                    <p className="text-sm text-gray-300">
                      {new Date(booking.booking_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </p>
                    <p className="text-sm text-gray-300">
                      {formatHour(booking.start_hour)} - {formatHour(booking.end_hour)}
                    </p>
                    <p className="text-sm text-green-400 font-semibold mt-1">
                      You'll earn: {booking.total_coins} DL365
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => confirmBooking(booking.id)}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-semibold"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => rejectBooking(booking.id)}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-semibold"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-xl font-bold text-white mb-4">Set Equipment Availability</h3>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-3">Select Equipment</label>
          <select
            value={selectedEquipment?.id || ''}
            onChange={(e) => {
              const eq = myEquipment.find(eq => eq.id === e.target.value)
              setSelectedEquipment(eq || null)
            }}
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
          >
            {myEquipment.map((eq) => (
              <option key={eq.id} value={eq.id}>
                {eq.name} - {eq.coins_per_hour} DL365/hour
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-3">
          {DAYS.map((day, index) => {
            const schedule = getScheduleForDay(index)
            const isEditing = editingDay === index

            return (
              <div key={index} className="bg-black/30 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="text-white font-semibold mb-1">{day}</h4>
                    {isEditing ? (
                      <div className="flex gap-3 items-center">
                        <div>
                          <label className="text-xs text-gray-400">Start</label>
                          <select
                            value={startHour}
                            onChange={(e) => setStartHour(Number(e.target.value))}
                            className="ml-2 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                          >
                            {HOURS.slice(0, 24).map((h) => (
                              <option key={h} value={h}>{formatHour(h)}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-gray-400">End</label>
                          <select
                            value={endHour}
                            onChange={(e) => setEndHour(Number(e.target.value))}
                            className="ml-2 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                          >
                            {HOURS.slice(startHour + 1).map((h) => (
                              <option key={h} value={h}>{formatHour(h)}</option>
                            ))}
                          </select>
                        </div>
                        <button
                          onClick={() => saveSchedule(index)}
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-semibold"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingDay(null)}
                          className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : schedule ? (
                      <p className="text-sm text-gray-300">
                        Available: {formatHour(schedule.start_hour)} - {formatHour(schedule.end_hour)}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-500">Not available</p>
                    )}
                  </div>
                  {!isEditing && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => editDay(index)}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-semibold"
                      >
                        {schedule ? 'Edit' : 'Set'}
                      </button>
                      {schedule && (
                        <button
                          onClick={() => deleteSchedule(schedule.id)}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-semibold"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
