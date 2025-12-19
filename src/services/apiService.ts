/**
 * API Service for Owner App
 * Provides authenticated API calls with JWT token management and caching
 */

import { API_CONFIG } from '../config/api'
import { cacheService } from './cacheService'

const API_BASE_URL = API_CONFIG.API_BASE_URL

interface CacheOptions {
  enabled?: boolean
  ttl?: number // Time to live in milliseconds
  tags?: string[] // Tags for cache invalidation
  key?: string // Custom cache key (default: endpoint + params)
}

class ApiService {
  private baseURL: string

  constructor(baseURL: string) {
    this.baseURL = baseURL
  }

  /**
   * Get JWT access token from localStorage
   */
  private getAccessToken(): string | null {
    return localStorage.getItem('access_token')
  }

  /**
   * Get JWT refresh token from localStorage
   */
  private getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token')
  }

  // Removed unused getOwnerIdFromToken method

  /**
   * Refresh access token using refresh token
   */
  private async refreshAccessToken(): Promise<string | null> {
    const refreshToken = this.getRefreshToken()
    if (!refreshToken) {
      return null
    }

    try {
      const response = await fetch(`${this.baseURL}/auth/token/refresh/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh: refreshToken }),
      })

      if (response.ok) {
        const data = await response.json()
        const newAccessToken = data.access
        localStorage.setItem('access_token', newAccessToken)
        return newAccessToken
      } else {
        // Refresh failed, clear tokens
        this.clearTokens()
        return null
      }
    } catch (error) {
      console.error('Token refresh failed:', error)
      this.clearTokens()
      return null
    }
  }

  /**
   * Clear JWT tokens from localStorage
   */
  private clearTokens(): void {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
  }

  /**
   * Generate cache key from endpoint and params
   */
  private getCacheKey(endpoint: string, params?: string, customKey?: string): string {
    if (customKey) {
      return customKey
    }
    
    const baseKey = endpoint.replace(/\//g, '_').replace(/^_/, '').replace(/\?/g, '_')
    if (params) {
      return `${baseKey}_${params}`
    }
    return baseKey
  }

  /**
   * Make authenticated API request with automatic token refresh and caching
   */
  async request<T>(
    endpoint: string,
    options: RequestInit = {},
    requireAuth: boolean = true,
    cacheOptions?: CacheOptions
  ): Promise<T> {
    // Remove leading slash if present to avoid double slashes, then add it back
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint
    const url = `${this.baseURL}/${cleanEndpoint}`
    
    // Check cache for GET requests if caching is enabled
    const isGetRequest = !options.method || options.method === 'GET'
    const cacheEnabled = cacheOptions?.enabled !== false && isGetRequest
    
    if (cacheEnabled) {
      const urlObj = new URL(url)
      const params = urlObj.searchParams.toString()
      const cacheKey = this.getCacheKey(endpoint, params, cacheOptions?.key)
      const cached = cacheService.get<T>(cacheKey)
      if (cached !== null) {
        return cached
      }
    }
    
    let headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    
    if (options.headers) {
      Object.assign(headers, options.headers as Record<string, string>)
    }

    if (requireAuth) {
      let accessToken = this.getAccessToken()
      if (!accessToken) {
        // Try to refresh if no access token is present
        accessToken = await this.refreshAccessToken()
        if (!accessToken) {
          // If refresh fails, user is not authenticated
          throw new Error('Authentication required: No valid access token.')
        }
      }
      headers['Authorization'] = `Bearer ${accessToken}`
    }

    const config: RequestInit = {
      headers,
      ...options,
    }

    try {
      let response = await fetch(url, config)
      
      // If unauthorized and we have a refresh token, try to refresh
      if (response.status === 401 && requireAuth && this.getRefreshToken()) {
        const newAccessToken = await this.refreshAccessToken()
        if (newAccessToken) {
          // Retry the request with the new access token
          headers['Authorization'] = `Bearer ${newAccessToken}`
          config.headers = headers
          response = await fetch(url, config)
        } else {
          // If refresh failed, clear tokens and throw error
          this.clearTokens()
          throw new Error('Authentication failed: Could not refresh token.')
        }
      }
      
      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`
        
        try {
          const errorData = await response.json()
          console.error('API Error Response:', errorData)
          
          // Handle different types of error responses
          if (errorData.error) {
            errorMessage = errorData.error
          } else if (errorData.detail) {
            errorMessage = errorData.detail
          } else if (errorData.message) {
            errorMessage = errorData.message
          } else if (Array.isArray(errorData) && errorData.length > 0) {
            // Handle validation errors array
            errorMessage = errorData.map(err => typeof err === 'string' ? err : err.message || err.toString()).join(', ')
          } else if (typeof errorData === 'object' && Object.keys(errorData).length > 0) {
            // Handle object with field errors
            const fieldErrors = Object.entries(errorData)
              .map(([field, errors]) => `${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}`)
              .join('; ')
            errorMessage = fieldErrors
          }
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError)
          // Try to get text response
          try {
            const textResponse = await response.text()
            console.error('Raw error response:', textResponse)
            if (textResponse) {
              errorMessage = `Server error: ${textResponse}`
            } else {
              errorMessage = `Server returned ${response.status} ${response.statusText}`
            }
          } catch (textError) {
            console.error('Failed to get text response:', textError)
            errorMessage = `Server returned ${response.status} ${response.statusText}`
          }
        }
        
        throw new Error(errorMessage)
      }

      // Handle empty responses (like DELETE requests that return 204 No Content)
      const contentType = response.headers.get('content-type')
      let result: T
      if (contentType && contentType.includes('application/json')) {
        result = await response.json()
      } else {
        // For non-JSON responses (like empty DELETE responses), return null
        result = null as T
      }
      
      // Cache the response if enabled and it's a GET request
      if (cacheEnabled && result !== null) {
        const urlObj = new URL(url)
        const params = urlObj.searchParams.toString()
        const cacheKey = this.getCacheKey(endpoint, params, cacheOptions?.key)
        if (cacheOptions?.tags && cacheOptions.tags.length > 0) {
          cacheService.setWithTags(cacheKey, result, cacheOptions.tags, cacheOptions?.ttl)
        } else {
          cacheService.set(cacheKey, result, cacheOptions?.ttl)
        }
      }
      
      return result
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error)
      throw error
    }
  }

  /**
   * Invalidate cache by tag
   */
  invalidateCacheByTag(tag: string): number {
    return cacheService.invalidateTag(tag)
  }

  /**
   * Invalidate cache by pattern
   */
  invalidateCacheByPattern(pattern: string | RegExp): number {
    return cacheService.deletePattern(pattern)
  }

  /**
   * Clear all API cache
   */
  clearCache(): void {
    cacheService.clear()
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return cacheService.getStats()
  }

  // Convenience methods for common HTTP verbs
  async get<T>(endpoint: string, requireAuth: boolean = true, cacheOptions?: CacheOptions): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' }, requireAuth, cacheOptions)
  }

  async post<T>(endpoint: string, data?: any, requireAuth: boolean = true, invalidateCache?: string[]): Promise<T> {
    const result = await this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }, requireAuth)
    
    // Invalidate cache after successful POST
    if (invalidateCache && invalidateCache.length > 0) {
      invalidateCache.forEach(tag => this.invalidateCacheByTag(tag))
    } else {
      // Default: invalidate cache for the endpoint pattern
      this.invalidateCacheByPattern(endpoint.replace(/\//g, '_'))
    }
    
    return result
  }

  async put<T>(endpoint: string, data?: any, requireAuth: boolean = true, invalidateCache?: string[]): Promise<T> {
    const result = await this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }, requireAuth)
    
    // Invalidate cache after successful PUT
    if (invalidateCache && invalidateCache.length > 0) {
      invalidateCache.forEach(tag => this.invalidateCacheByTag(tag))
    } else {
      this.invalidateCacheByPattern(endpoint.replace(/\//g, '_'))
    }
    
    return result
  }

  async patch<T>(endpoint: string, data?: any, requireAuth: boolean = true, invalidateCache?: string[]): Promise<T> {
    const result = await this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    }, requireAuth)
    
    // Invalidate cache after successful PATCH
    if (invalidateCache && invalidateCache.length > 0) {
      invalidateCache.forEach(tag => this.invalidateCacheByTag(tag))
    } else {
      this.invalidateCacheByPattern(endpoint.replace(/\//g, '_'))
    }
    
    return result
  }

  async delete<T>(endpoint: string, requireAuth: boolean = true, invalidateCache?: string[]): Promise<T> {
    const result = await this.request<T>(endpoint, { method: 'DELETE' }, requireAuth)
    
    // Invalidate cache after successful DELETE
    if (invalidateCache && invalidateCache.length > 0) {
      invalidateCache.forEach(tag => this.invalidateCacheByTag(tag))
    } else {
      this.invalidateCacheByPattern(endpoint.replace(/\//g, '_'))
    }
    
    return result
  }

  // Specific API methods for Owner App with caching
  async getEvents(ownerId?: string): Promise<any> {
    const endpoint = ownerId 
      ? `/events/by_owner/?owner_id=${ownerId}`
      : '/events/'
    return this.get(endpoint, true, {
      enabled: true,
      ttl: 3 * 60 * 1000, // 3 minutes (events change frequently)
      tags: ['events', 'events_list', ownerId ? `owner_${ownerId}` : 'all'],
    })
  }

  async getReservations(eventId?: string, status?: string): Promise<any> {
    let endpoint = '/reservations/by_owner/'
    const params = new URLSearchParams()
    
    if (eventId) {
      params.append('event_id', eventId)
    }
    if (status) {
      params.append('status', status)
    }
    
    if (params.toString()) {
      endpoint += `?${params.toString()}`
    }
    
    return this.get(endpoint, true, {
      enabled: true,
      ttl: 2 * 60 * 1000, // 2 minutes (reservations change frequently)
      tags: ['reservations', 'reservations_list', eventId ? `event_${eventId}` : 'all'],
    })
  }

  async getCartItems(ownerId?: string): Promise<any> {
    const endpoint = ownerId 
      ? `/cart-items/by_owner/?owner_id=${ownerId}`
      : '/cart-items/'
    console.log('Fetching cart items from endpoint:', endpoint)
    return this.get(endpoint, true, {
      enabled: true,
      ttl: 2 * 60 * 1000, // 2 minutes
      tags: ['cart_items', ownerId ? `owner_${ownerId}` : 'all'],
    })
  }

  async createEvent(eventData: any): Promise<any> {
    // Owner ID will be extracted from JWT token by the backend
    // No need to send owner field in the request
    
    // Check if eventData is FormData (for file uploads)
    if (eventData instanceof FormData) {
      // For FormData, don't set Content-Type header and don't stringify
      const url = `${this.baseURL}/events/`
      const accessToken = this.getAccessToken()
      
      if (!accessToken) {
        throw new Error('Authentication required: No valid access token.')
      }
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          // Don't set Content-Type for FormData - let browser set it with boundary
        },
        body: eventData
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }
      
      const result = await response.json()
      
      // Invalidate cache after successful creation
      this.invalidateCacheByTag('events')
      this.invalidateCacheByTag('events_list')
      
      return result
    } else {
      // For regular JSON data, use the normal post method
      return this.post('/events/', eventData, true, ['events', 'events_list'])
    }
  }

  async getEvent(eventId: string): Promise<any> {
    return this.get(`/events/${eventId}/`, true, {
      enabled: true,
      ttl: 3 * 60 * 1000, // 3 minutes
      tags: ['events', `event_${eventId}`],
    })
  }

  async checkEventConflicts(ownerId: string, startTime: string, endTime: string, excludeEventId?: string): Promise<any> {
    const params = new URLSearchParams({
      owner_id: ownerId,
      start_time: startTime,
      end_time: endTime
    })
    
    if (excludeEventId) {
      params.append('exclude_event_id', excludeEventId)
    }
    
    return this.get(`/events/check_conflicts/?${params.toString()}`, true, {
      enabled: true,
      ttl: 1 * 60 * 1000, // 1 minute (conflicts check is time-sensitive)
      tags: ['events', 'conflicts'],
    })
  }

  async updateEvent(eventId: string, eventData: any): Promise<any> {
    return this.put(`/events/${eventId}/`, eventData, true, ['events', 'events_list', `event_${eventId}`])
  }

  async deleteEvent(eventId: string): Promise<any> {
    const url = `${this.baseURL}/events/${eventId}/`
    const accessToken = this.getAccessToken()
    
    if (!accessToken) {
      throw new Error('Authentication required: No valid access token.')
    }
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    })
    
    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`
      
      try {
        const errorData = await response.json()
        if (errorData.error) {
          errorMessage = errorData.error
        } else if (errorData.detail) {
          errorMessage = errorData.detail
        } else if (errorData.message) {
          errorMessage = errorData.message
        }
      } catch (parseError) {
        // If we can't parse the error response, use the status text
        errorMessage = `Server returned ${response.status} ${response.statusText}`
      }
      
      throw new Error(errorMessage)
    }
    
    // For successful DELETE requests, the response might be empty (204 No Content)
    // Try to parse JSON, but don't fail if the response is empty
    let result: any
    try {
      const text = await response.text()
      if (text) {
        result = JSON.parse(text)
      } else {
        result = { success: true, message: 'Event deleted successfully' }
      }
    } catch (parseError) {
      // If parsing fails, return a success response since the HTTP status was OK
      result = { success: true, message: 'Event deleted successfully' }
    }
    
    // Invalidate cache after successful deletion
    this.invalidateCacheByTag('events')
    this.invalidateCacheByTag('events_list')
    this.invalidateCacheByTag(`event_${eventId}`)
    
    return result
  }

  async getVenues(ownerId?: string): Promise<any> {
    const endpoint = ownerId 
      ? `/social-hubs/?owner_id=${ownerId}`
      : '/social-hubs/'
    // Disable caching for venues in owner app so changes appear immediately
    return this.get(endpoint, true, {
      enabled: false,
    })
  }

  async getVenue(venueId: string): Promise<any> {
    // Disable caching for single venue as well
    return this.get(`/social-hubs/${venueId}/`, true, {
      enabled: false,
    })
  }

  async createVenue(venueData: any): Promise<any> {
    // Owner ID will be extracted from JWT token by the backend
    // No need to send owner field in the request
    return this.post('/social-hubs/', venueData, true, ['social_hubs', 'social_hubs_list'])
  }

  async updateVenue(venueId: string, venueData: any): Promise<any> {
    return this.put(`/social-hubs/${venueId}/`, venueData, true, ['social_hubs', 'social_hubs_list', `social_hub_${venueId}`])
  }

  async deleteVenue(venueId: string): Promise<any> {
    return this.delete(`/social-hubs/${venueId}/`, true, ['social_hubs', 'social_hubs_list', `social_hub_${venueId}`])
  }

  async getEventCategories(): Promise<any> {
    return this.get('/event-categories/', true, {
      enabled: true,
      ttl: 10 * 60 * 1000, // 10 minutes (categories change rarely)
      tags: ['event_categories', 'event_categories_list'],
    })
  }

  async getUserProfile(): Promise<any> {
    return this.get('/auth/profile/', true, {
      enabled: true,
      ttl: 5 * 60 * 1000, // 5 minutes
      tags: ['profile', 'user_profile'],
    })
  }

  async updateUserProfile(profileData: any): Promise<any> {
    return this.post('/auth/profile/update/', profileData, true, ['profile', 'user_profile'])
  }

  async logout(): Promise<any> {
    const refreshToken = this.getRefreshToken()
    if (refreshToken) {
      try {
        await this.post('/auth/logout/', { refresh_token: refreshToken })
      } catch (error) {
        console.error('Logout API call failed:', error)
      }
    }
    this.clearTokens()
  }

  // Comments API methods
  async getCommentsByOwner(ownerId: string): Promise<any> {
    return this.get(`/comments/by_owner/?owner_id=${ownerId}`, true, {
      enabled: true,
      ttl: 3 * 60 * 1000, // 3 minutes
      tags: ['comments', `owner_${ownerId}`],
    })
  }

  async getCommentsBySocialHub(socialHubId: string): Promise<any> {
    return this.get(`/comments/by_social_hub/?social_hub_id=${socialHubId}`, true, {
      enabled: true,
      ttl: 3 * 60 * 1000, // 3 minutes
      tags: ['comments', `social_hub_${socialHubId}`],
    })
  }

  async getCommentsByEvent(eventId: string): Promise<any> {
    return this.get(`/comments/by_event/?event_id=${eventId}`, true, {
      enabled: true,
      ttl: 3 * 60 * 1000, // 3 minutes
      tags: ['comments', `event_${eventId}`],
    })
  }

  // Reply to a comment (owner's answer)
  async replyToComment(commentId: string, replyText: string, ownerId: string): Promise<any> {
    try {
      // Create a new comment as a reply
      // The backend will automatically inherit event and social_hub from parent comment
      // and set the customer from the authenticated owner user
      const replyData: any = {
        comment: replyText,
        parent_comment_id: commentId, // Set parent comment to make this a reply
      }
      
      // Use the standard comment creation endpoint
      // The backend will handle setting the customer from the authenticated owner
      // and inherit event/social_hub from parent comment
      // Invalidate cache for comments, the specific comment, and replies
      return await this.post('/comments/', replyData, true, [
        'comments', 
        `comment_${commentId}`, 
        'replies',
        `comment_${commentId}_replies`
      ])
    } catch (error: any) {
      console.error('Error in replyToComment:', error)
      throw error // Re-throw to let the caller handle it
    }
  }

  // Get replies for a comment
  async getCommentReplies(commentId: string, useCache: boolean = true): Promise<any> {
    // Try using query parameter on the comments list endpoint
    // If the backend doesn't support this, it will need a custom /comments/by_parent/ endpoint
    try {
      return this.get(`/comments/?parent_comment=${commentId}`, true, {
        enabled: useCache,
        ttl: useCache ? 3 * 60 * 1000 : 0, // 3 minutes if caching, 0 if not
        tags: ['comments', `comment_${commentId}`, 'replies'],
      })
    } catch (error) {
      // Fallback to by_parent endpoint
      return this.get(`/comments/by_parent/?parent_comment_id=${commentId}`, true, {
        enabled: useCache,
        ttl: useCache ? 3 * 60 * 1000 : 0, // 3 minutes if caching, 0 if not
        tags: ['comments', `comment_${commentId}`, 'replies'],
      })
    }
  }

  // Ratings API methods
  async getRatingsByOwner(ownerId: string): Promise<any> {
    return this.get(`/ratings/by_owner/?owner_id=${ownerId}`, true, {
      enabled: true,
      ttl: 5 * 60 * 1000, // 5 minutes
      tags: ['ratings', `owner_${ownerId}`],
    })
  }

  async getRatingsByEvent(eventId: string): Promise<any> {
    return this.get(`/ratings/by_event/?event_id=${eventId}`, true, {
      enabled: true,
      ttl: 5 * 60 * 1000, // 5 minutes
      tags: ['ratings', `event_${eventId}`],
    })
  }

  async getRatingsBySocialHub(socialHubId: string): Promise<any> {
    return this.get(`/ratings/by_social_hub/?social_hub_id=${socialHubId}`, true, {
      enabled: true,
      ttl: 5 * 60 * 1000, // 5 minutes
      tags: ['ratings', `social_hub_${socialHubId}`],
    })
  }

  // Top events by rating (رویدادهای برتر)
  async getTopEventsByRating(ownerId: string, limit: number = 10): Promise<any> {
    return this.get(`/ratings/top_events_by_rating/?owner_id=${ownerId}&limit=${limit}`, true, {
      enabled: true,
      ttl: 5 * 60 * 1000, // 5 minutes
      tags: ['ratings', 'top_events', `owner_${ownerId}`],
    })
  }

  // Event status update
  async updateEventStatuses(): Promise<any> {
    const result = await this.post('/events/update_statuses/')
    // Invalidate events cache after status update
    this.invalidateCacheByTag('events')
    this.invalidateCacheByTag('events_list')
    return result
  }

  // Support Tickets API methods
  async getSupportTickets(params?: Record<string, any>): Promise<any> {
    const queryParams = params ? new URLSearchParams(params as any).toString() : ''
    const endpoint = `/support/tickets/${queryParams ? `?${queryParams}` : ''}`
    return this.get(endpoint, true, {
      enabled: true,
      ttl: 2 * 60 * 1000, // 2 minutes
      tags: ['support', 'support_tickets'],
    })
  }

  async getSupportTicket(ticketId: string): Promise<any> {
    return this.get(`/support/tickets/${ticketId}/`, true, {
      enabled: true,
      ttl: 2 * 60 * 1000, // 2 minutes
      tags: ['support', `support_ticket_${ticketId}`],
    })
  }

  async createSupportTicket(data: { title: string; description: string; category: string; priority?: string }): Promise<any> {
    return this.post('/support/tickets/', data, true, ['support', 'support_tickets'])
  }

  async addTicketComment(ticketId: string, content: string): Promise<any> {
    return this.post(`/support/tickets/${ticketId}/add-comment/`, { content }, true, ['support', `support_ticket_${ticketId}`, 'support_tickets'])
  }

  async updateTicketStatus(ticketId: string, status: string): Promise<any> {
    return this.patch(`/support/tickets/${ticketId}/update-status/`, { status }, true, ['support', `support_ticket_${ticketId}`, 'support_tickets'])
  }

  async getSupportUnreadCount(): Promise<{ unread_count: number }> {
    return this.get('/support/tickets/unread-count/', true, {
      enabled: true,
      ttl: 30 * 1000, // 30 seconds
      tags: ['support', 'support_unread_count'],
    })
  }

  async markTicketAsRead(ticketId: string): Promise<any> {
    return this.post(`/support/tickets/${ticketId}/mark-as-read/`, {}, true, ['support', `support_ticket_${ticketId}`, 'support_tickets'])
  }

  async getSupportTicketStats(): Promise<any> {
    return this.get('/support/tickets/stats/', true, {
      enabled: true,
      ttl: 1 * 60 * 1000, // 1 minute
      tags: ['support', 'support_stats'],
    })
  }

  // Wallet API methods
  async getWalletBalance(): Promise<any> {
    return this.get('/owners/wallet/balance/', true, {
      enabled: true,
      ttl: 1 * 60 * 1000, // 1 minute (balance changes frequently)
      tags: ['wallet', 'balance'],
    })
  }

  async depositToWallet(amount: number, description?: string): Promise<any> {
    const result = await this.post('/owners/wallet/deposit/', {
      amount,
      description: description || 'واریز به کیف پول',
    }, true, ['wallet', 'balance', 'transactions'])
    
    return result
  }

  async withdrawFromWallet(amount: number, description?: string): Promise<any> {
    const result = await this.post('/owners/wallet/withdraw/', {
      amount,
      description: description || 'برداشت از کیف پول',
    }, true, ['wallet', 'balance', 'transactions'])
    
    return result
  }

  async getTransactions(type?: string, status?: string, limit?: number): Promise<any> {
    const params = new URLSearchParams()
    
    if (type) {
      params.append('type', type)
    }
    if (status) {
      params.append('status', status)
    }
    if (limit) {
      params.append('limit', limit.toString())
    }
    
    const endpoint = `/owners/wallet/transactions/${params.toString() ? `?${params.toString()}` : ''}`
    
    return this.get(endpoint, true, {
      enabled: true,
      ttl: 2 * 60 * 1000, // 2 minutes
      tags: ['wallet', 'transactions'],
    })
  }
}

// Export singleton instance
export const apiService = new ApiService(API_BASE_URL)
export default apiService