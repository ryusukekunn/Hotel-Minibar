import React, { createContext, useContext, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { User, UserRole } from '../types'

interface AuthContextType {
  session: Session | null
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  isRole: (role: UserRole | UserRole[]) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Inicijalna sesija
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Slušaj promene autentifikacije
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session)
        if (session?.user) {
          await fetchProfile(session.user.id)
        } else {
          setUser(null)
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error
      
      setUser({
        id: data.id,
        email: data.email,
        full_name: data.full_name,
        role: data.role as UserRole,
        created_at: data.created_at,
      })
    } catch (error) {
      console.error('Greška pri učitavanju profila:', error)
    } finally {
      setLoading(false)
    }
  }

  async function signIn(email: string, password: string): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) return { error: error.message }
      return { error: null }
    } catch {
      return { error: 'Greška pri prijavi. Pokušajte ponovo.' }
    }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  function isRole(role: UserRole | UserRole[]): boolean {
    if (!user) return false
    if (Array.isArray(role)) return role.includes(user.role)
    return user.role === role
  }

  return (
    <AuthContext.Provider value={{ session, user, loading, signIn, signOut, isRole }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth mora biti korišćen unutar AuthProvider-a')
  }
  return context
}
