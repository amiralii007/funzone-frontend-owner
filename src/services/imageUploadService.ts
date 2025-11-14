/**
 * Image Upload Service for Owner App
 * Handles image uploads to the backend API
 */

import { API_CONFIG } from '../config/api'

const API_BASE_URL = API_CONFIG.API_BASE_URL

export interface UploadOptions {
  imageType?: 'profile' | 'event_banner' | 'event_gallery' | 'venue_logo' | 'venue_gallery' | 'document' | 'other'
  title?: string
  description?: string
  isPublic?: boolean
  tags?: string[]
  relatedEventId?: string
  relatedSocialHubId?: string
  onProgress?: (progress: number) => void
  onSuccess?: (data: any) => void
  onError?: (error: string) => void
}

export interface ImageData {
  id: string
  original_file: string
  thumbnail: string
  optimized_file: string
  image_type: string
  title: string
  description: string
  status: string
  uploaded_at: string
}

class ImageUploadService {
  private baseUrl: string

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl
  }

  /**
   * Get JWT access token from localStorage
   */
  private getAccessToken(): string | null {
    return localStorage.getItem('access_token')
  }

  /**
   * Upload a single image
   */
  async uploadImage(file: File, options: UploadOptions = {}): Promise<ImageData> {
    const formData = new FormData()
    formData.append('original_file', file)
    formData.append('image_type', options.imageType || 'other')
    formData.append('title', options.title || file.name.split('.')[0])
    formData.append('description', options.description || '')
    formData.append('is_public', options.isPublic !== false ? 'true' : 'false')
    
    if (options.tags && options.tags.length > 0) {
      formData.append('tags', JSON.stringify(options.tags))
    }
    
    if (options.relatedEventId) {
      formData.append('related_event', options.relatedEventId)
    }
    
    if (options.relatedSocialHubId) {
      formData.append('related_social_hub', options.relatedSocialHubId)
    }

    const accessToken = this.getAccessToken()
    if (!accessToken) {
      throw new Error('Authentication required: No valid access token.')
    }

    try {
      const response = await fetch(`${this.baseUrl}/images/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          // Don't set Content-Type for FormData - let browser set it with boundary
        },
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const imageData = await response.json()
      
      if (options.onSuccess) {
        options.onSuccess(imageData)
      }

      return imageData
    } catch (error: any) {
      if (options.onError) {
        options.onError(error.message)
      }
      throw error
    }
  }

  /**
   * Upload multiple images
   */
  async uploadMultipleImages(files: File[], options: UploadOptions = {}): Promise<ImageData[]> {
    const uploadPromises = files.map(file => this.uploadImage(file, options))
    return Promise.all(uploadPromises)
  }

  /**
   * Get images by venue ID
   */
  async getImagesByVenue(venueId: string): Promise<ImageData[]> {
    const accessToken = this.getAccessToken()
    if (!accessToken) {
      throw new Error('Authentication required: No valid access token.')
    }

    const response = await fetch(`${this.baseUrl}/images/?related_social_hub=${venueId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      }
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(errorData.error || `HTTP ${response.status}`)
    }

    return response.json()
  }

  /**
   * Delete an image
   */
  async deleteImage(imageId: string): Promise<void> {
    const accessToken = this.getAccessToken()
    if (!accessToken) {
      throw new Error('Authentication required: No valid access token.')
    }

    const response = await fetch(`${this.baseUrl}/images/${imageId}/`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      }
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(errorData.error || `HTTP ${response.status}`)
    }
  }
}

export { ImageUploadService }
