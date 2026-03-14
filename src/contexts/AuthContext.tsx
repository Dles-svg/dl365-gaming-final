import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { detectHardwareSpecs } from '../lib/hardwareDetection'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, userRole?: 'Miner' | 'Gamer') => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    }).catch((error) => {
      console.error('Auth session error:', error)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        setSession(session)
        setUser(session?.user ?? null)
      })()
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const signUp = async (email: string, password: string, userRole: 'Miner' | 'Gamer' = 'Gamer') => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error

    if (data.user) {
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert([
          {
            id: data.user.id,
            username: email.split('@')[0],
            user_role: userRole,
            dl365_balance: 0,
            total_earnings: 0
          }
        ])

      if (profileError) {
        console.error('Error creating user profile:', profileError)
        return
      }

      if (userRole === 'Miner') {
        try {
          const hardwareSpecs = await detectHardwareSpecs()

          const equipmentType = 'gaming'
          const equipmentName = `${hardwareSpecs.tier.charAt(0).toUpperCase() + hardwareSpecs.tier.slice(1)} Gaming PC - ${hardwareSpecs.gpu.split(' ').slice(0, 2).join(' ')}`
          const equipmentDescription = `Automatically detected ${hardwareSpecs.tier} tier equipment. GPU: ${hardwareSpecs.gpu}, CPU: ${hardwareSpecs.cpu}, RAM: ${hardwareSpecs.ram}`

          const { error: equipmentError } = await supabase
            .from('equipment_listings')
            .insert([
              {
                owner_id: data.user.id,
                equipment_type: equipmentType,
                tier: hardwareSpecs.tier,
                name: equipmentName,
                description: equipmentDescription,
                specs: {
                  gpu: hardwareSpecs.gpu,
                  cpu: hardwareSpecs.cpu,
                  ram: hardwareSpecs.ram,
                  performance_score: hardwareSpecs.performanceScore
                },
                coins_per_hour: hardwareSpecs.coinsPerHour,
                available: false,
                image_url: 'https://images.pexels.com/photos/2582937/pexels-photo-2582937.jpeg'
              }
            ])

          if (equipmentError) {
            console.error('Error creating equipment listing:', equipmentError)
          }
        } catch (detectionError) {
          console.error('Hardware detection failed:', detectionError)
        }
      }
    }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut }}>
      {loading ? (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          color: '#f1f5f9'
        }}>
          Loading...
        </div>
      ) : children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
