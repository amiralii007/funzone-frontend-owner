import { createContext, useContext, useReducer, useCallback, useRef } from 'react'
import type { Owner, AppState } from '../types/owner'
import type { ReactNode } from 'react'
import { API_CONFIG } from '../config/api'

// Action types
type AuthAction =
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; owner: Owner }
  | { type: 'LOGIN_FAILURE' }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_OWNER'; owner: Owner }

// Initial state
const initialState: AppState = {
  auth: {
    user: null,
    isAuthenticated: false,
    isLoading: false,
  },
  venues: [],
  events: [],
  bookings: [],
  transactions: [],
}

// Reducer
function authReducer(state: AppState, action: AuthAction): AppState {
  switch (action.type) {
    case 'LOGIN_START':
      return {
        ...state,
        auth: {
          ...state.auth,
          isLoading: true,
        },
      }
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        auth: {
          user: action.owner,
          isAuthenticated: true,
          isLoading: false,
        },
      }
    case 'LOGIN_FAILURE':
      return {
        ...state,
        auth: {
          ...state.auth,
          isLoading: false,
        },
      }
    case 'LOGOUT':
      return {
        ...state,
        auth: {
          user: null,
          isAuthenticated: false,
          isLoading: false,
        },
      }
    case 'UPDATE_OWNER':
      return {
        ...state,
        auth: {
          ...state.auth,
          user: action.owner,
        },
      }
    default:
      return state
  }
}

// Context
interface AuthContextType {
  state: AppState
  dispatch: React.Dispatch<AuthAction>
  sendVerificationCode: (phone: string) => Promise<any>
  login: (phone: string, code: string) => Promise<any>
  completeProfile: (ownerId: string, firstName: string, lastName: string, username: string, nationalCode: string) => Promise<void>
  logout: () => Promise<void>
  checkAuthStatus: () => Promise<void>
  authenticatedFetch: (url: string, options?: RequestInit) => Promise<Response>
  updateOwner: (owner: Owner) => void
  updateProfile: (profileData: {
    f_name?: string
    l_name?: string
    email?: string
    address?: string
    iban?: string
  }) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Provider
interface AuthProviderProps {
  children: ReactNode
}

// Global flag to prevent multiple auth checks
let globalAuthCheckInProgress = false

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, dispatch] = useReducer(authReducer, initialState)
  const authCheckInProgress = useRef(false)

  const sendVerificationCode = async (phone: string): Promise<any> => {
    try {
      const response = await fetch(`${API_CONFIG.API_BASE_URL}/owners/auth/send-verification-code/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone_number: phone }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send verification code')
      }

      return await response.json()
    } catch (error) {
      console.error('Send verification code error:', error)
      throw error
    }
  }

  const login = async (phone: string, code: string): Promise<any> => {
    dispatch({ type: 'LOGIN_START' })
    
    try {
      const response = await fetch(`${API_CONFIG.API_BASE_URL}/owners/auth/verify-phone-login/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          phone_number: phone, 
          verification_code: code 
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to verify phone number')
      }

      const authData = await response.json()
      
      // Store JWT tokens if available
      if (authData.access && authData.refresh) {
        localStorage.setItem('access_token', authData.access)
        localStorage.setItem('refresh_token', authData.refresh)
        localStorage.setItem('token_timestamp', Date.now().toString())
      }
      
      // If it's a first-time user, return the auth data for profile completion
      if (authData.is_first_time) {
        dispatch({ type: 'LOGIN_FAILURE' })
        return authData
      }

      // For existing users, fetch their full profile using JWT
      const ownerResponse = await fetch(`${API_CONFIG.API_BASE_URL}/auth/profile/`, {
        headers: {
          'Authorization': `Bearer ${authData.access}`,
          'Content-Type': 'application/json',
        },
      })
      
      if (ownerResponse.ok) {
        const ownerData = await ownerResponse.json()
        // Map credit_number to iban for frontend compatibility
        if (ownerData.credit_number) {
          ownerData.iban = ownerData.credit_number
        }
        dispatch({ type: 'LOGIN_SUCCESS', owner: ownerData })
        return authData
      } else {
        throw new Error('Failed to fetch owner profile')
      }
    } catch (error) {
      dispatch({ type: 'LOGIN_FAILURE' })
      throw error
    }
  }

  const logout = async () => {
    try {
      // Import and use API service for logout
      const { apiService } = await import('../services/apiService')
      await apiService.logout()
    } catch (error) {
      console.error('Logout API call failed:', error)
      // Clear tokens even if API call fails
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('token_timestamp')
    } finally {
      // Clear auth state
      dispatch({ type: 'LOGOUT' })
    }
  }

  const checkAuthStatus = useCallback(async () => {
    // Prevent multiple simultaneous auth checks globally
    if (globalAuthCheckInProgress || authCheckInProgress.current) {
      return
    }
    
    globalAuthCheckInProgress = true
    authCheckInProgress.current = true
    
    try {
      const accessToken = localStorage.getItem('access_token')
      const tokenTimestamp = localStorage.getItem('token_timestamp')
      
      if (accessToken && tokenTimestamp) {
        // Check if token is older than 5 days (5 * 24 * 60 * 60 * 1000 milliseconds)
        const fiveDaysInMs = 5 * 24 * 60 * 60 * 1000
        const tokenAge = Date.now() - parseInt(tokenTimestamp)
        
        if (tokenAge > fiveDaysInMs) {
          // Token is too old, clear it
          console.log('Token expired (older than 5 days), clearing...')
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          localStorage.removeItem('token_timestamp')
          return
        }
        
        try {
          const response = await fetch(`${API_CONFIG.API_BASE_URL}/auth/profile/`, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          })
          
          if (response.ok) {
            const userData = await response.json()
            // Map credit_number to iban for frontend compatibility
            if (userData.credit_number) {
              userData.iban = userData.credit_number
            }
            dispatch({ type: 'LOGIN_SUCCESS', owner: userData })
          } else {
            // Token is invalid, clear it
            localStorage.removeItem('access_token')
            localStorage.removeItem('refresh_token')
            localStorage.removeItem('token_timestamp')
          }
        } catch (error) {
          console.error('Auth check failed:', error)
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          localStorage.removeItem('token_timestamp')
        }
      }
    } finally {
      globalAuthCheckInProgress = false
      authCheckInProgress.current = false
    }
  }, [])

  // Helper function for authenticated API calls
  const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
    const accessToken = localStorage.getItem('access_token')
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    
    if (options.headers) {
      Object.assign(headers, options.headers as Record<string, string>)
    }
    
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`
    }
    
    return fetch(url, {
      ...options,
      headers,
    })
  }

  const completeProfile = async (
    ownerId: string, 
    firstName: string, 
    lastName: string, 
    username: string,
    nationalCode: string
  ): Promise<void> => {
    try {
      const response = await fetch(`${API_CONFIG.API_BASE_URL}/owners/auth/complete-profile/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          owner_id: ownerId,
          f_name: firstName,
          l_name: lastName,
          username: username,
          national_code: nationalCode,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to complete profile')
      }

      // const profileData = await response.json() // Unused for now
      
      // Fetch the complete owner data
      const ownerResponse = await fetch(`${API_CONFIG.API_BASE_URL}/owners/${ownerId}/`)
      if (ownerResponse.ok) {
        const ownerData = await ownerResponse.json()
        // Map credit_number to iban for frontend compatibility
        if (ownerData.credit_number) {
          ownerData.iban = ownerData.credit_number
        }
        dispatch({ type: 'LOGIN_SUCCESS', owner: ownerData })
      }
    } catch (error) {
      console.error('Complete profile error:', error)
      throw error
    }
  }

  const updateOwner = (owner: Owner) => {
    dispatch({ type: 'UPDATE_OWNER', owner })
  }

  const updateProfile = async (profileData: {
    f_name?: string
    l_name?: string
    email?: string
    address?: string
    iban?: string
  }): Promise<void> => {
    try {
      const response = await authenticatedFetch(`${API_CONFIG.API_BASE_URL}/owners/auth/update-profile/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update profile')
      }

      const updatedOwner = await response.json()
      dispatch({ type: 'UPDATE_OWNER', owner: updatedOwner })
    } catch (error) {
      console.error('Update profile error:', error)
      throw error
    }
  }

  return (
    <AuthContext.Provider value={{ 
      state, 
      dispatch, 
      sendVerificationCode,
      login, 
      completeProfile,
      logout, 
      checkAuthStatus,
      authenticatedFetch,
      updateOwner,
      updateProfile
    }}>
      {children}
    </AuthContext.Provider>
  )
}

// Hook
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
