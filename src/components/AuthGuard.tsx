import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../state/authStore'

interface AuthGuardProps {
  children: React.ReactNode
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { state, checkAuthStatus } = useAuth()
  const [isChecking, setIsChecking] = useState(true)
  const location = useLocation()
  useEffect(() => {
    const checkAuth = async () => {
      setIsChecking(true)
      
      try {
        await checkAuthStatus()
      } catch (error) {
        console.error('Auth check failed:', error)
      } finally {
        setIsChecking(false)
      }
    }

    // Only check auth if we have a token
    const token = localStorage.getItem('access_token')
    if (token) {
      checkAuth()
    } else {
      setIsChecking(false)
    }
  }, []) // Empty dependency array - only run once on mount

  // Show loading while checking authentication
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto"></div>
          <p className="text-slate-400">Checking authentication...</p>
        </div>
      </div>
    )
  }

  // If not authenticated, redirect to login
  if (!state.auth.isAuthenticated || !state.auth.user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // If authenticated, render the protected content
  return <>{children}</>
}
