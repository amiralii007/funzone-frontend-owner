import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../state/authStore'

interface ProfileCompletionGuardProps {
  children: React.ReactNode
}

export default function ProfileCompletionGuard({ children }: ProfileCompletionGuardProps) {
  const { state } = useAuth()
  const [isChecking, setIsChecking] = useState(true)
  const location = useLocation()

  useEffect(() => {
    // Check if user profile is complete
    const checkProfileCompletion = () => {
      if (state.auth.user) {
        const user = state.auth.user
        const isProfileComplete = !!(
          user.f_name && 
          user.l_name && 
          user.username && 
          user.national_code
        )
        
        setIsChecking(false)
        return isProfileComplete
      }
      setIsChecking(false)
      return false
    }

    checkProfileCompletion()
  }, [state.auth.user])

  // Show loading while checking
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto"></div>
          <p className="text-slate-400">Checking profile completion...</p>
        </div>
      </div>
    )
  }

  // If user is not authenticated, let AuthGuard handle it
  if (!state.auth.isAuthenticated || !state.auth.user) {
    return <>{children}</>
  }

  // Check if profile is complete
  const user = state.auth.user
  const isProfileComplete = !!(
    user.f_name && 
    user.l_name && 
    user.username && 
    user.national_code
  )

  // If profile is incomplete, redirect to login page
  if (!isProfileComplete) {
    return <Navigate to="/login" state={{ from: location, incompleteProfile: true, user: state.auth.user }} replace />
  }

  // If profile is complete, render the protected content
  return <>{children}</>
}
