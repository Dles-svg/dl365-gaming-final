import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import EquipmentRental from '../components/EquipmentRental'
import EquipmentAvailabilityManager from '../components/EquipmentAvailabilityManager'

interface Listing {
  id: string
  miner_id: string
  listing_type: string
  title: string
  description: string
  price_per_hour: number
  specs: any
  status: string
  rating: number
  total_rentals: number
  created_at: string
}

interface Rental {
  id: string
  listing_id: string
  start_time: string
  end_time?: string
  hourly_rate: number
  total_cost: number
  status: string
  listing: Listing
}

export default function Marketplace() {
  const { user, signOut } = useAuth()
  const [listings, setListings] = useState<Listing[]>([])
  const [myListings, setMyListings] = useState<Listing[]>([])
  const [myRentals, setMyRentals] = useState<Rental[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [filter, setFilter] = useState<'all' | 'compute' | 'streaming' | 'both'>('all')
  const [userRole, setUserRole] = useState<string>('')
  const [marketView, setMarketView] = useState<'custom' | 'equipment' | 'availability'>('equipment')

  const [newListing, setNewListing] = useState({
    title: '',
    description: '',
    listing_type: 'compute',
    price_per_hour: '',
    gpu: '',
    cpu: '',
    ram: '',
    storage: ''
  })

  useEffect(() => {
    loadMarketplace()
  }, [user, filter])

  const loadMarketplace = async () => {
    if (!user) return

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('user_role')
      .eq('id', user.id)
      .maybeSingle()

    setUserRole(profile?.user_role || '')

    let query = supabase
      .from('marketplace_listings')
      .select('*')
      .eq('status', 'available')
      .order('created_at', { ascending: false })

    if (filter !== 'all') {
      query = query.eq('listing_type', filter)
    }

    const { data: listingsData } = await query

    if (listingsData) {
      setListings(listingsData.filter(l => l.miner_id !== user.id))
      setMyListings(listingsData.filter(l => l.miner_id === user.id))
    }

    const { data: rentalsData } = await supabase
      .from('marketplace_rentals')
      .select(`
        *,
        listing:marketplace_listings(*)
      `)
      .eq('gamer_id', user.id)
      .order('created_at', { ascending: false })

    if (rentalsData) {
      setMyRentals(rentalsData as any)
    }

    setLoading(false)
  }

  const createListing = async () => {
    if (!user || !newListing.title || !newListing.price_per_hour) return

    const specs = {
      gpu: newListing.gpu,
      cpu: newListing.cpu,
      ram: newListing.ram,
      storage: newListing.storage
    }

    const { error } = await supabase.from('marketplace_listings').insert({
      miner_id: user.id,
      title: newListing.title,
      description: newListing.description,
      listing_type: newListing.listing_type,
      price_per_hour: parseFloat(newListing.price_per_hour),
      specs,
      status: 'available'
    })

    if (!error) {
      setShowCreateModal(false)
      setNewListing({
        title: '',
        description: '',
        listing_type: 'compute',
        price_per_hour: '',
        gpu: '',
        cpu: '',
        ram: '',
        storage: ''
      })
      loadMarketplace()
    }
  }

  const rentResource = async (listing: Listing) => {
    if (!user) return

    const { error } = await supabase.from('marketplace_rentals').insert({
      listing_id: listing.id,
      gamer_id: user.id,
      hourly_rate: listing.price_per_hour,
      status: 'active'
    })

    if (!error) {
      await supabase
        .from('marketplace_listings')
        .update({ status: 'rented' })
        .eq('id', listing.id)

      loadMarketplace()
    }
  }

  const endRental = async (rentalId: string, listingId: string) => {
    const rental = myRentals.find(r => r.id === rentalId)
    if (!rental) return

    const duration = (Date.now() - new Date(rental.start_time).getTime()) / 3600000
    const totalCost = duration * rental.hourly_rate

    await supabase
      .from('marketplace_rentals')
      .update({
        end_time: new Date().toISOString(),
        total_cost: totalCost,
        status: 'completed'
      })
      .eq('id', rentalId)

    await supabase
      .from('marketplace_listings')
      .update({ status: 'available' })
      .eq('id', listingId)

    loadMarketplace()
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
          <Link to="/" style={{ color: '#f1f5f9', textDecoration: 'none', padding: '0.5rem 1rem', fontWeight: '600' }}>
            ← Home
          </Link>
          <Link to="/dashboard" style={{ color: '#f1f5f9', textDecoration: 'none', padding: '0.5rem 1rem' }}>
            Dashboard
          </Link>
          <Link to="/wallet" style={{ color: '#f1f5f9', textDecoration: 'none', padding: '0.5rem 1rem' }}>
            Wallet
          </Link>
          <Link to="/streaming" style={{ color: '#f1f5f9', textDecoration: 'none', padding: '0.5rem 1rem' }}>
            Streaming
          </Link>
          <button
            onClick={signOut}
            style={{
              padding: '0.5rem 1.5rem',
              borderRadius: '0.5rem',
              border: '1px solid rgba(239, 68, 68, 0.5)',
              background: 'transparent',
              color: '#fca5a5',
              cursor: 'pointer'
            }}
          >
            Sign Out
          </button>
        </nav>
      </header>

      <main style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
              Marketplace
            </h1>
            <p style={{ color: '#94a3b8', fontSize: '1.125rem' }}>
              Equipment Rental
            </p>
          </div>

          {userRole === 'Miner' && marketView === 'custom' && (
            <button
              onClick={() => setShowCreateModal(true)}
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '0.5rem',
                border: 'none',
                background: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
                color: 'white',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: '600'
              }}
            >
              Create Listing
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid rgba(148, 163, 184, 0.2)', paddingBottom: '1rem' }}>
          <button
            onClick={() => setMarketView('equipment')}
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '0.5rem 0.5rem 0 0',
              border: 'none',
              borderBottom: marketView === 'equipment' ? '3px solid #3b82f6' : 'none',
              background: marketView === 'equipment' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
              color: marketView === 'equipment' ? '#3b82f6' : '#94a3b8',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: '600',
              transition: 'all 0.2s'
            }}
          >
            Equipment Rental
          </button>
          {userRole === 'Miner' && (
            <button
              onClick={() => setMarketView('availability')}
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '0.5rem 0.5rem 0 0',
                border: 'none',
                borderBottom: marketView === 'availability' ? '3px solid #3b82f6' : 'none',
                background: marketView === 'availability' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                color: marketView === 'availability' ? '#3b82f6' : '#94a3b8',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: '600',
                transition: 'all 0.2s'
              }}
            >
              My Availability
            </button>
          )}
          <button
            onClick={() => setMarketView('custom')}
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '0.5rem 0.5rem 0 0',
              border: 'none',
              borderBottom: marketView === 'custom' ? '3px solid #3b82f6' : 'none',
              background: marketView === 'custom' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
              color: marketView === 'custom' ? '#3b82f6' : '#94a3b8',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: '600',
              transition: 'all 0.2s'
            }}
          >
            Custom Listings
          </button>
        </div>

        {marketView === 'equipment' ? (
          <EquipmentRental />
        ) : marketView === 'availability' ? (
          <EquipmentAvailabilityManager />
        ) : (
          <>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
              {['all', 'compute', 'streaming', 'both'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f as any)}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '0.5rem',
                    border: `1px solid ${filter === f ? '#3b82f6' : 'rgba(148, 163, 184, 0.2)'}`,
                    background: filter === f ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                    color: filter === f ? '#3b82f6' : '#94a3b8',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    textTransform: 'capitalize'
                  }}
                >
                  {f}
                </button>
              ))}
            </div>

        {myListings.length > 0 && (
          <div style={{ marginBottom: '3rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem' }}>
              My Listings
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
              {myListings.map((listing) => (
                <div
                  key={listing.id}
                  style={{
                    background: 'rgba(30, 41, 59, 0.5)',
                    borderRadius: '1rem',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    padding: '1.5rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '0.25rem',
                      background: 'rgba(59, 130, 246, 0.1)',
                      color: '#3b82f6',
                      fontSize: '0.75rem',
                      fontWeight: '600'
                    }}>
                      {listing.listing_type}
                    </span>
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '0.25rem',
                      background: listing.status === 'available' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(251, 191, 36, 0.1)',
                      color: listing.status === 'available' ? '#22c55e' : '#fbbf24',
                      fontSize: '0.75rem',
                      fontWeight: '600'
                    }}>
                      {listing.status}
                    </span>
                  </div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                    {listing.title}
                  </h3>
                  <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '1rem' }}>
                    {listing.description}
                  </p>
                  <div style={{ marginBottom: '1rem' }}>
                    {listing.specs.gpu && <div style={{ fontSize: '0.875rem', color: '#cbd5e1' }}>GPU: {listing.specs.gpu}</div>}
                    {listing.specs.cpu && <div style={{ fontSize: '0.875rem', color: '#cbd5e1' }}>CPU: {listing.specs.cpu}</div>}
                    {listing.specs.ram && <div style={{ fontSize: '0.875rem', color: '#cbd5e1' }}>RAM: {listing.specs.ram}</div>}
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#3b82f6' }}>
                    {listing.price_per_hour} DL365/hr
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {myRentals.filter(r => r.status === 'active').length > 0 && (
          <div style={{ marginBottom: '3rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem' }}>
              Active Rentals
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
              {myRentals.filter(r => r.status === 'active').map((rental) => (
                <div
                  key={rental.id}
                  style={{
                    background: 'rgba(30, 41, 59, 0.5)',
                    borderRadius: '1rem',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    padding: '1.5rem'
                  }}
                >
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                    {rental.listing.title}
                  </h3>
                  <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '1rem' }}>
                    Started: {new Date(rental.start_time).toLocaleString()}
                  </p>
                  <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#22c55e', marginBottom: '1rem' }}>
                    {rental.hourly_rate} DL365/hr
                  </div>
                  <button
                    onClick={() => endRental(rental.id, rental.listing_id)}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '0.5rem',
                      border: 'none',
                      background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                      color: 'white',
                      cursor: 'pointer',
                      fontWeight: '600'
                    }}
                  >
                    End Rental
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem' }}>
            Available Resources
          </h2>
          {loading ? (
            <p style={{ color: '#94a3b8' }}>Loading marketplace...</p>
          ) : listings.length === 0 ? (
            <p style={{ color: '#94a3b8' }}>No listings available</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
              {listings.map((listing) => (
                <div
                  key={listing.id}
                  style={{
                    background: 'rgba(30, 41, 59, 0.5)',
                    borderRadius: '1rem',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    padding: '1.5rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '0.25rem',
                      background: 'rgba(59, 130, 246, 0.1)',
                      color: '#3b82f6',
                      fontSize: '0.75rem',
                      fontWeight: '600'
                    }}>
                      {listing.listing_type}
                    </span>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <span style={{ color: '#fbbf24' }}>★</span>
                      <span style={{ color: '#cbd5e1', fontSize: '0.875rem' }}>
                        {listing.rating.toFixed(1)} ({listing.total_rentals})
                      </span>
                    </div>
                  </div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                    {listing.title}
                  </h3>
                  <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '1rem' }}>
                    {listing.description}
                  </p>
                  <div style={{ marginBottom: '1rem' }}>
                    {listing.specs.gpu && <div style={{ fontSize: '0.875rem', color: '#cbd5e1' }}>GPU: {listing.specs.gpu}</div>}
                    {listing.specs.cpu && <div style={{ fontSize: '0.875rem', color: '#cbd5e1' }}>CPU: {listing.specs.cpu}</div>}
                    {listing.specs.ram && <div style={{ fontSize: '0.875rem', color: '#cbd5e1' }}>RAM: {listing.specs.ram}</div>}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#3b82f6' }}>
                      {listing.price_per_hour} DL365/hr
                    </div>
                    <button
                      onClick={() => rentResource(listing)}
                      style={{
                        padding: '0.75rem 1.5rem',
                        borderRadius: '0.5rem',
                        border: 'none',
                        background: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
                        color: 'white',
                        cursor: 'pointer',
                        fontWeight: '600'
                      }}
                    >
                      Rent Now
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
          </>
        )}

        {showCreateModal && (
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
              maxWidth: '600px',
              width: '90%',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1.5rem' }}>
                Create New Listing
              </h2>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8', fontSize: '0.875rem' }}>
                  Title
                </label>
                <input
                  type="text"
                  value={newListing.title}
                  onChange={(e) => setNewListing({ ...newListing, title: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    background: 'rgba(15, 23, 42, 0.5)',
                    color: '#f1f5f9'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8', fontSize: '0.875rem' }}>
                  Description
                </label>
                <textarea
                  value={newListing.description}
                  onChange={(e) => setNewListing({ ...newListing, description: e.target.value })}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    background: 'rgba(15, 23, 42, 0.5)',
                    color: '#f1f5f9',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8', fontSize: '0.875rem' }}>
                  Type
                </label>
                <select
                  value={newListing.listing_type}
                  onChange={(e) => setNewListing({ ...newListing, listing_type: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    background: 'rgba(15, 23, 42, 0.5)',
                    color: '#f1f5f9'
                  }}
                >
                  <option value="compute">Compute</option>
                  <option value="streaming">Streaming</option>
                  <option value="both">Both</option>
                </select>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8', fontSize: '0.875rem' }}>
                  Price per Hour (DL365)
                </label>
                <input
                  type="number"
                  value={newListing.price_per_hour}
                  onChange={(e) => setNewListing({ ...newListing, price_per_hour: e.target.value })}
                  min="0"
                  step="0.01"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    background: 'rgba(15, 23, 42, 0.5)',
                    color: '#f1f5f9'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8', fontSize: '0.875rem' }}>
                    GPU
                  </label>
                  <input
                    type="text"
                    value={newListing.gpu}
                    onChange={(e) => setNewListing({ ...newListing, gpu: e.target.value })}
                    placeholder="RTX 4090"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '0.5rem',
                      border: '1px solid rgba(148, 163, 184, 0.2)',
                      background: 'rgba(15, 23, 42, 0.5)',
                      color: '#f1f5f9'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8', fontSize: '0.875rem' }}>
                    CPU
                  </label>
                  <input
                    type="text"
                    value={newListing.cpu}
                    onChange={(e) => setNewListing({ ...newListing, cpu: e.target.value })}
                    placeholder="i9-13900K"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '0.5rem',
                      border: '1px solid rgba(148, 163, 184, 0.2)',
                      background: 'rgba(15, 23, 42, 0.5)',
                      color: '#f1f5f9'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8', fontSize: '0.875rem' }}>
                    RAM
                  </label>
                  <input
                    type="text"
                    value={newListing.ram}
                    onChange={(e) => setNewListing({ ...newListing, ram: e.target.value })}
                    placeholder="32GB DDR5"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '0.5rem',
                      border: '1px solid rgba(148, 163, 184, 0.2)',
                      background: 'rgba(15, 23, 42, 0.5)',
                      color: '#f1f5f9'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8', fontSize: '0.875rem' }}>
                    Storage
                  </label>
                  <input
                    type="text"
                    value={newListing.storage}
                    onChange={(e) => setNewListing({ ...newListing, storage: e.target.value })}
                    placeholder="2TB NVMe"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '0.5rem',
                      border: '1px solid rgba(148, 163, 184, 0.2)',
                      background: 'rgba(15, 23, 42, 0.5)',
                      color: '#f1f5f9'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <button
                  onClick={() => setShowCreateModal(false)}
                  style={{
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    background: 'transparent',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={createListing}
                  style={{
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    border: 'none',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
                    color: 'white',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  Create Listing
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
