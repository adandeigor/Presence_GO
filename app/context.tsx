import { createContext, useContext, ReactNode } from 'react'
import { Role } from '@prisma/client'

interface User {
  id: string
  name: string | null
  email: string
  role: Role
}

interface Session {
  apiKey: string
  user: User | null
}

interface AuthContextType {
  session: Session | null
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children, session }: { children: ReactNode, session: Session | null }) {
  return (
    <AuthContext.Provider value={{ session }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuthContext doit être utilisé dans un AuthProvider')
  }
  return context
} 