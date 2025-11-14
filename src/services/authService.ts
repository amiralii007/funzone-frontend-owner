// Authentication service for owner app
import { API_CONFIG } from '../config/api'

const API_BASE_URL = API_CONFIG.API_BASE_URL

export interface AuthResponse {
  message: string
  access: string
  refresh: string
  owner_id: string
  phone_number: string
  is_first_time: boolean
  needs_complete_profile: boolean
  role: string
  username?: string
  f_name?: string
  l_name?: string
  national_code?: string
}

export interface VerificationResponse {
  message: string
  phone_number: string
  verification_code: string
  expires_in_minutes: number
}

export interface ProfileCompletionResponse {
  message: string
  owner_id: string
  username: string
  f_name: string
  l_name: string
  phone_number: string
  national_code: string
  role: string
}

class AuthService {
  private baseURL: string
  private accessToken: string | null = null
  private refreshToken: string | null = null

  constructor(baseURL: string) {
    this.baseURL = baseURL
    this.loadTokensFromStorage()
  }

  private loadTokensFromStorage() {
    this.accessToken = localStorage.getItem('access_token')
    this.refreshToken = localStorage.getItem('refresh_token')
  }

  private saveTokensToStorage(accessToken: string, refreshToken: string) {
    this.accessToken = accessToken
    this.refreshToken = refreshToken
    localStorage.setItem('access_token', accessToken)
    localStorage.setItem('refresh_token', refreshToken)
  }

  private clearTokensFromStorage() {
    this.accessToken = null
    this.refreshToken = null
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
  }

  private async refreshAccessToken(): Promise<string | null> {
    if (!this.refreshToken) {
      return null
    }

    try {
      const response = await fetch(`${this.baseURL}/auth/token/refresh/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh: this.refreshToken }),
      })

      if (response.ok) {
        const data = await response.json()
        this.accessToken = data.access
        localStorage.setItem('access_token', data.access)
        return data.access
      } else {
        // Refresh token is invalid, clear all tokens
        this.clearTokensFromStorage()
        return null
      }
    } catch (error) {
      console.error('Token refresh failed:', error)
      this.clearTokensFromStorage()
      return null
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    requireAuth: boolean = false
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`
    
    let headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    
    if (options.headers) {
      Object.assign(headers, options.headers as Record<string, string>)
    }

    // Add authorization header if required and token is available
    if (requireAuth && this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`
    }

    const config: RequestInit = {
      headers,
      ...options,
    }

    try {
      let response = await fetch(url, config)
      
      // If unauthorized and we have a refresh token, try to refresh
      if (response.status === 401 && requireAuth && this.refreshToken) {
        const newAccessToken = await this.refreshAccessToken()
        if (newAccessToken) {
          // Retry the request with the new access token
          headers['Authorization'] = `Bearer ${newAccessToken}`
          config.headers = headers
          response = await fetch(url, config)
        }
      }
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error(`Auth request failed for ${endpoint}:`, error)
      throw error
    }
  }

  async sendVerificationCode(phoneNumber: string): Promise<VerificationResponse> {
    return this.request<VerificationResponse>('/auth/send-verification-code/', {
      method: 'POST',
      body: JSON.stringify({ phone_number: phoneNumber }),
    })
  }

  async verifyPhoneAndLogin(phoneNumber: string, verificationCode: string): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/auth/verify-phone-login/', {
      method: 'POST',
      body: JSON.stringify({ 
        phone_number: phoneNumber, 
        verification_code: verificationCode 
      }),
    })
    
    // Save JWT tokens to storage
    if (response.access && response.refresh) {
      this.saveTokensToStorage(response.access, response.refresh)
    }
    
    return response
  }

  async completeProfile(
    ownerId: string, 
    firstName: string, 
    lastName: string, 
    username: string,
    nationalCode: string
  ): Promise<ProfileCompletionResponse> {
    return this.request<ProfileCompletionResponse>('/auth/complete-profile/', {
      method: 'POST',
      body: JSON.stringify({
        owner_id: ownerId,
        f_name: firstName,
        l_name: lastName,
        username: username,
        national_code: nationalCode,
      }),
    })
  }

  // JWT Authentication methods
  async logout(): Promise<void> {
    if (this.refreshToken) {
      try {
        await this.request('/auth/logout/', {
          method: 'POST',
          body: JSON.stringify({ refresh_token: this.refreshToken }),
        }, true)
      } catch (error) {
        console.error('Logout request failed:', error)
      }
    }
    this.clearTokensFromStorage()
  }

  async getProfile(): Promise<any> {
    return this.request('/auth/profile/', {
      method: 'GET',
    }, true)
  }

  async updateProfile(profileData: any): Promise<any> {
    return this.request('/auth/profile/update/', {
      method: 'POST',
      body: JSON.stringify(profileData),
    }, true)
  }

  isAuthenticated(): boolean {
    return !!this.accessToken
  }

  getAccessToken(): string | null {
    return this.accessToken
  }

  getRefreshToken(): string | null {
    return this.refreshToken
  }

  // Legacy login method for backward compatibility
  async login(usernameOrEmail: string, password: string): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/login/', {
      method: 'POST',
      body: JSON.stringify({
        username_or_email: usernameOrEmail,
        password: password,
      }),
    })
  }
}

// Create auth service instance
export const authService = new AuthService(API_BASE_URL)

// Utility functions for phone number validation
export const phoneUtils = {
  validatePhoneNumber: (phoneNumber: string): boolean => {
    // Remove any spaces or special characters
    const phone = phoneNumber.replace(/[^\d+]/g, '')
    
    // Check if it starts with +98
    if (phone.startsWith('+98')) {
      const number = phone.slice(3)
      return number.length === 10 && number.startsWith('9')
    }
    
    // Check if it starts with 98
    if (phone.startsWith('98')) {
      const number = phone.slice(2)
      return number.length === 10 && number.startsWith('9')
    }
    
    // Check if it starts with 0
    if (phone.startsWith('0')) {
      const number = phone.slice(1)
      return number.length === 10 && number.startsWith('9')
    }
    
    // Check if it's just 10 digits starting with 9
    return phone.length === 10 && phone.startsWith('9')
  },

  formatPhoneNumber: (phoneNumber: string): string => {
    const phone = phoneNumber.replace(/[^\d+]/g, '')
    
    if (phone.startsWith('+98')) {
      return phone
    }
    
    if (phone.startsWith('98')) {
      return `+${phone}`
    }
    
    if (phone.startsWith('0')) {
      return `+98${phone.slice(1)}`
    }
    
    if (phone.length === 10 && phone.startsWith('9')) {
      return `+98${phone}`
    }
    
    return phone
  },

  normalizePhoneNumber: (phoneNumber: string): string => {
    const phone = phoneNumber.replace(/[^\d+]/g, '')
    
    if (phone.startsWith('+98')) {
      return phone.slice(3)
    }
    
    if (phone.startsWith('98')) {
      return phone.slice(2)
    }
    
    if (phone.startsWith('0')) {
      return phone.slice(1)
    }
    
    return phone
  }
}

export default authService


