// Configuration for API integration
// Read from environment variables with fallback defaults

const getApiBaseUrl = () => {
  // Support both Vite env vars and standard env vars
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL
  }
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL
  }
  // Fallback to default localhost for development
  return 'http://localhost:8000/api'
}

export const API_CONFIG = {
  // Django API base URL - read from environment variable
  API_BASE_URL: getApiBaseUrl(),
  
  // API endpoints
  ENDPOINTS: {
    OWNERS: '/owners/',
    EVENTS: '/events/',
    SOCIAL_HUBS: '/social-hubs/',
    RESERVATIONS: '/reservations/',
    RATINGS: '/ratings/',
    COMMENTS: '/comments/',
    AUTH: {
      SEND_VERIFICATION_CODE: '/owners/auth/send-verification-code/',
      VERIFY_PHONE_LOGIN: '/owners/auth/verify-phone-login/',
      COMPLETE_PROFILE: '/owners/auth/complete-profile/',
      UPDATE_PROFILE: '/owners/auth/update-profile/',
    },
  },
  
  // Default pagination
  DEFAULT_PAGE_SIZE: 20,
  
  // Request timeout (ms)
  REQUEST_TIMEOUT: 10000,
}

export default API_CONFIG

