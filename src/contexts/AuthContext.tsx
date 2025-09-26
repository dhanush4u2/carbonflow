import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signUp: (email: string, password: string, industryName?: string) => Promise<{ error: any }>
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
        if (session?.user) {
          ensureProfileForUser(session.user).catch(() => {})
        }
      }
    )

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
      if (session?.user) {
        ensureProfileForUser(session.user).catch(() => {})
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signUp = async (email: string, password: string, industryName?: string) => {
    try {
      const redirectUrl = `${window.location.origin}/`
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: industryName ? { industry_name: industryName } : undefined
        }
      })
      
      if (error) {
        toast({
          title: "Sign up failed",
          description: error.message,
          variant: "destructive"
        })
      } else {
        toast({
          title: "Check your email",
          description: "Please check your email for a confirmation link",
        })
      }
      
      return { error }
    } catch (err: any) {
      toast({
        title: "Sign up failed",
        description: err.message,
        variant: "destructive"
      })
      return { error: err }
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      
      if (error) {
        toast({
          title: "Sign in failed",
          description: error.message,
          variant: "destructive"
        })
      }
      
      return { error }
    } catch (err: any) {
      toast({
        title: "Sign in failed",
        description: err.message,
        variant: "destructive"
      })
      return { error: err }
    }
  }

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      toast({
        title: "Signed out",
        description: "You have been signed out successfully",
      })
    } catch (err: any) {
      toast({
        title: "Sign out failed",
        description: err.message,
        variant: "destructive"
      })
    }
  }

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      signUp,
      signIn,
      signOut
    }}>
      {children}
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

async function ensureProfileForUser(user: User) {
  try {
    const { data: existing, error: fetchError } = await supabase
      .from('profiles')
      .select('id, industry_name')
      .eq('id', user.id)
      .maybeSingle()

    if (fetchError) {
      return
    }

    const metadataIndustry = (user.user_metadata as any)?.industry_name as string | undefined

    if (!existing) {
      await supabase.from('profiles').insert({ id: user.id, industry_name: metadataIndustry ?? null })
      return
    }

    if (!existing.industry_name && metadataIndustry) {
      await supabase.from('profiles').update({ industry_name: metadataIndustry }).eq('id', user.id)
    }
  } catch {
    // no-op
  }
}