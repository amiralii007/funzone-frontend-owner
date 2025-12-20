import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../state/authStore'
import { useLanguage } from '../contexts/LanguageContext'
import { apiService } from '../services/apiService'
import { API_CONFIG } from '../config/api'
import VenueLocationMap from '../components/VenueLocationMap'
import { formatNumber, formatCurrency, toPersianNumbers, toEnglishNumbers } from '../utils/persianNumbers'
import type { Venue } from '../types/owner'
import { ImageUploadService } from '../services/imageUploadService'
import { getErrorMessage } from '../utils/errorTranslator'

export default function VenuesPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { state } = useAuth()
  const { t, isRTL, language } = useLanguage()
  const [showAddForm, setShowAddForm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [uploadingImages, setUploadingImages] = useState(false)
  const [venues, setVenues] = useState<Venue[]>([])
  const [isLoadingVenues, setIsLoadingVenues] = useState(true)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [venueToDelete, setVenueToDelete] = useState<Venue | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [togglingVenue, setTogglingVenue] = useState<string | null>(null)
  const [hasCheckedStatus, setHasCheckedStatus] = useState(false)

  // Check if owner is deactivated - fetch fresh data from API
  useEffect(() => {
    if (hasCheckedStatus) return // Prevent duplicate checks

    const checkOwnerStatus = async () => {
      try {
        const token = localStorage.getItem('access_token')
        if (!token) return

        const response = await fetch(`${API_CONFIG.API_BASE_URL}/auth/profile/`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        setHasCheckedStatus(true) // Mark as checked

        if (response.status === 403) {
          // Owner is deactivated, backend returned forbidden
          alert(t('owner.accountDeactivated') || 'You are deactivated by support. Call support for more details.')
          navigate('/')
          return
        }

        if (response.ok) {
          const userData = await response.json()
          if (userData.is_active === false) {
            alert(t('owner.accountDeactivated') || 'You are deactivated by support. Call support for more details.')
            navigate('/')
          }
        }
      } catch (error) {
        console.error('Error checking owner status:', error)
        setHasCheckedStatus(true) // Mark as checked even on error
      }
    }

    checkOwnerStatus()
  }, [navigate, t, hasCheckedStatus])
  
  // Check if user is admin (staff or superuser)
  const isAdmin = () => {
    // Check JWT token for admin claims
    try {
      const token = localStorage.getItem('access_token')
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]))
        return payload.is_staff === true || payload.is_superuser === true
      }
    } catch (e) {
      console.error('Error checking admin status:', e)
    }
    return false
  }
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    postal_code: '',
    latitude: 35.7219, // Default to Tehran coordinates
    longitude: 51.3347,
    amenities: [] as string[]
  })

  // Field errors state
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({})

  // Photo upload state
  const [selectedImages, setSelectedImages] = useState<File[]>([])
  const [previewImages, setPreviewImages] = useState<string[]>([])

  // Available amenities options with translation keys
  const amenityOptions = [
    { key: 'parking', label: t('owner.amenities.parking') },
    { key: 'nearMetro', label: t('owner.amenities.nearMetro') },
    { key: 'groupWatching', label: t('owner.amenities.groupWatching') },
    { key: 'restrooms', label: t('owner.amenities.restrooms') },
    { key: 'airConditioning', label: t('owner.amenities.airConditioning') },
    { key: 'wifi', label: t('owner.amenities.wifi') },
    { key: 'privateParking', label: t('owner.amenities.privateParking') },
    { key: 'projector', label: t('owner.amenities.projector') },
    { key: 'tvScreens', label: t('owner.amenities.tvScreens') },
    { key: 'soundSystem', label: t('owner.amenities.soundSystem') },
    { key: 'outdoorSpace', label: t('owner.amenities.outdoorSpace') },
    { key: 'library', label: t('owner.amenities.library') }
  ]

  // Map state
  const [mapCenter, setMapCenter] = useState<[number, number]>([35.7219, 51.3347])
  const [selectedLocation, setSelectedLocation] = useState<[number, number]>([35.7219, 51.3347])

  // Fetch events for a specific venue
  const fetchEventsForVenue = async (venueId: string) => {
    try {
      const response = await apiService.get(`/events/?social_hub_id=${venueId}`) as any
      const eventsData = response.results || response
      return eventsData
    } catch (error) {
      console.error(`Error fetching events for venue ${venueId}:`, error)
      return []
    }
  }

  // Calculate totals for a venue from its events
  const calculateVenueTotals = (events: any[]) => {
    let totalBookings = 0
    let totalRevenue = 0

    events.forEach(event => {
      // Add total reserved people (bookings)
      totalBookings += event.total_reserved_people || 0
      
      // Add total revenue from the event
      totalRevenue += event.total_revenue || 0
    })

    return { totalBookings, totalRevenue }
  }

  // Fetch کافه‌ها (social hubs) from backend
  const fetchVenues = async () => {
    setIsLoadingVenues(true)
    try {
      // Real API call to fetch کافه‌ها for current owner
      const ownerId = state.auth.user?.id
      console.log('Current user ID:', ownerId)
      
      const url = ownerId 
        ? `${API_CONFIG.API_BASE_URL}/social-hubs/?owner_id=${ownerId}`
        : `${API_CONFIG.API_BASE_URL}/social-hubs/`
      
      console.log('Fetching venues from:', url)
      
      const responseData = await apiService.getVenues(ownerId)
      console.log('Received data:', responseData)
      
      // Handle paginated response from Django REST Framework
      const socialHubsData = responseData.results || responseData
      console.log('Social hubs data:', socialHubsData)
      
      // Convert SocialHub data to Venue format and fetch events for each venue
      const venuesData = await Promise.all(
        socialHubsData.map(async (hub: any) => {
          // Fetch events for this venue
          const events = await fetchEventsForVenue(hub.id)
          const { totalBookings, totalRevenue } = calculateVenueTotals(events)
          
          return {
            id: hub.id,
            name: hub.name,
            description: hub.description || '',
            address: hub.address,
            postal_code: hub.postal_code || 0,
            amenities: [], // SocialHub doesn't have amenities field
            images: hub.image_url ? [hub.image_url] : [],
            category: 'General', // Default category
            status: hub.is_active !== false ? 'active' : 'inactive',
            is_active: hub.is_active !== false, // Default to true if not specified
            owner_id: hub.owner,
            created_at: new Date().toISOString(), // SocialHub doesn't have created_at
            updated_at: new Date().toISOString(), // SocialHub doesn't have updated_at
            latitude: hub.latitude || 35.7219,
            longitude: hub.longitude || 51.3347,
            rating: hub.average_rating || 0,
            total_reviews: 0, // SocialHub doesn't have this field
            total_bookings: totalBookings, // Calculate from events
            total_revenue: totalRevenue // Calculate from events
          }
        })
      )
      
      setVenues(venuesData)
      console.log('Successfully loaded venues with calculated totals:', venuesData.length)
    } catch (error: unknown) {
      console.error('Error fetching venues:', error)
      console.log('No venues found')
      // Set empty array on error
      setVenues([])
      
      // Show more specific error message
      if (error instanceof TypeError && error.message.includes('fetch')) {
        alert('Backend connection failed. Please check if Django server is running on port 8000.')
      } else {
        const message = error instanceof Error ? error.message : String(error)
        alert(`Error loading venues: ${message}`)
      }
    } finally {
      setIsLoadingVenues(false)
    }
  }

  // Load venues on component mount
  useEffect(() => {
    fetchVenues()
  }, [])

  // Check if we should show the add form based on URL parameters
  useEffect(() => {
    const action = searchParams.get('action')
    if (action === 'add') {
      setShowAddForm(true)
    }
  }, [searchParams])

  // Handle form input changes
  const handleInputChange = (field: string, value: string) => {
    // Clear error for this field when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
    
    // Convert Persian numbers to English for numeric fields
    const processedValue = field === 'postal_code' ? toEnglishNumbers(value) : value
    
    // For postal code, ensure it is exactly 10 digits
    if (field === 'postal_code') {
      const numericValue = processedValue.replace(/\D/g, '')
      if (numericValue.length > 10) {
        return // Don't update if more than 10 digits
      }
      setFormData(prev => ({
        ...prev,
        [field]: numericValue
      }))
      return
    }
    
    setFormData(prev => ({
      ...prev,
      [field]: processedValue
    }))
  }

  // Handle map click for location selection
  const handleMapClick = (lat: number, lng: number) => {
    setSelectedLocation([lat, lng])
    setFormData(prev => ({
      ...prev,
      latitude: lat,
      longitude: lng
    }))
  }

  // Handle current location button
  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          setSelectedLocation([latitude, longitude])
          setMapCenter([latitude, longitude])
          setFormData(prev => ({
            ...prev,
            latitude,
            longitude
          }))
        },
        (error) => {
          console.error('Error getting location:', error)
          alert(t('owner.errorGettingLocation') || 'Unable to get your current location. Please select manually on the map.')
        }
      )
    } else {
      alert(t('owner.geolocationNotSupported') || 'Geolocation is not supported by this browser.')
    }
  }

  // Handle form submission
  const handleSaveVenue = async () => {
    // Validate all required fields and collect missing fields
    const missingFields: string[] = []
    const errors: Record<string, boolean> = {}
    
    if (!formData.name.trim()) {
      missingFields.push(t('owner.venueName'))
      errors.name = true
    }
    if (!formData.description.trim()) {
      missingFields.push(t('owner.venueDescription'))
      errors.description = true
    }
    if (!formData.address.trim()) {
      missingFields.push(t('owner.venueAddress'))
      errors.address = true
    }
    if (!formData.postal_code.trim()) {
      missingFields.push(t('owner.venuePostalCode'))
      errors.postal_code = true
    } else if (formData.postal_code.length !== 10) {
      // Postal code validation error
      errors.postal_code = true
      setFieldErrors(errors)
      alert(t('owner.postalCodeMustBe10Digits'))
      return
    }
    
    if (missingFields.length > 0) {
      setFieldErrors(errors)
      const errorMessage = language === 'fa' 
        ? `لطفا فیلدهای زیر را پر کنید:\n${missingFields.map(field => `• ${field}`).join('\n')}`
        : `Please fill in the following fields:\n${missingFields.map(field => `• ${field}`).join('\n')}`
      alert(errorMessage)
      return
    }
    
    // Clear any previous errors
    setFieldErrors({})

    setIsLoading(true)
    try {
      // Upload images first if there are any
      let uploadedImageUrls: string[] = []
      if (selectedImages.length > 0) {
        setUploadingImages(true)
        try {
          const imageUploadService = new ImageUploadService()
          const uploadPromises = selectedImages.map(file => 
            imageUploadService.uploadImage(file, {
              imageType: 'venue_gallery',
              title: `${formData.name} - ${file.name}`,
              description: `Gallery image for ${formData.name}`,
              isPublic: true
            })
          )
          
          const uploadResults = await Promise.all(uploadPromises)
          uploadedImageUrls = uploadResults.map(result => result.original_file)
        } catch (uploadError) {
          console.error('Error uploading images:', uploadError)
          const translatedError = getErrorMessage(uploadError, language)
          alert(translatedError || t('owner.imageUploadError'))
          setUploadingImages(false)
          setIsLoading(false)
          return
        } finally {
          setUploadingImages(false)
        }
      }
      
      // Real API call to create venue
      console.log('Creating venue with data:', {
        name: formData.name.trim(),
        description: formData.description.trim(),
        address: formData.address.trim(),
        postal_code: parseInt(formData.postal_code.trim()),
        owner: state.auth.user?.id,
        latitude: formData.latitude,
        longitude: formData.longitude,
        amenities: formData.amenities,
        gallery_images: uploadedImageUrls,
        average_rating: 0
      })
      
      const responseData = await apiService.createVenue({
        name: formData.name.trim(),
        description: formData.description.trim(),
        address: formData.address.trim(),
        postal_code: parseInt(formData.postal_code.trim()),
        latitude: formData.latitude, // Use coordinates from map selection
        longitude: formData.longitude,
        amenities: formData.amenities, // Include amenities
        gallery_images: uploadedImageUrls, // Include uploaded images
        average_rating: 0
        // owner ID will be automatically added from JWT token
      })
      
      console.log('Created کافه response:', responseData)
      
      // Convert the created SocialHub to Venue format
      const createdVenue: Venue = {
        id: responseData.id,
        name: responseData.name,
        description: responseData.description || '',
        address: responseData.address,
        postal_code: responseData.postal_code || 0,
        amenities: [],
        images: [...uploadedImageUrls, ...(responseData.gallery_images || []), ...(responseData.image_url ? [responseData.image_url] : [])],
        category: 'General',
        status: 'active',
        owner_id: responseData.owner,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        latitude: responseData.latitude || 35.7219,
        longitude: responseData.longitude || 51.3347,
        rating: responseData.average_rating || 0,
        total_reviews: 0,
        total_bookings: 0,
        total_revenue: 0
      }
      
      // Add the created venue from backend to the list
      setVenues(prevVenues => [createdVenue, ...prevVenues])
      
      // Reset form and close modal
      setFormData({
        name: '',
        description: '',
        address: '',
        postal_code: '',
        latitude: 35.7219,
        longitude: 51.3347,
        amenities: []
      })
      setFieldErrors({})
      setSelectedLocation([35.7219, 51.3347])
      setSelectedImages([])
      setPreviewImages([])
      setShowAddForm(false)
      
      // Show success message
      alert(t('owner.venueCreatedSuccessfully'))
      
      // Optionally refresh the venues list from backend
      // fetchVenues()
    } catch (error: unknown) {
      console.error('Error creating venue:', error)
      const translatedError = getErrorMessage(error, language)
      alert(translatedError || t('common.errorCreatingVenue'))
    } finally {
      setIsLoading(false)
    }
  }

  // Handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      const maxFileSize = 10 * 1024 * 1024 // 10 MB per file in bytes
      const maxTotalSize = 50 * 1024 * 1024 // 50 MB total in bytes
      
      // Calculate current total size of already selected images
      const currentTotalSize = selectedImages.reduce((sum, file) => sum + file.size, 0)
      
      const validFiles: File[] = []
      const invalidFiles: string[] = []
      let cumulativeSize = currentTotalSize
      
      files.forEach(file => {
        // Check individual file size (10 MB limit per file)
        if (file.size > maxFileSize) {
          invalidFiles.push(`${file.name} (${(file.size / (1024 * 1024)).toFixed(2)}MB > 10MB)`)
        } else {
          // Check if adding this file would exceed total limit (50 MB)
          const newTotalSize = cumulativeSize + file.size
          if (newTotalSize > maxTotalSize) {
            invalidFiles.push(`${file.name} (${t('owner.totalSizeExceeded') || 'Total size limit exceeded'})`)
          } else {
            validFiles.push(file)
            cumulativeSize = newTotalSize
          }
        }
      })
      
      if (invalidFiles.length > 0) {
        alert(`${t('owner.imageUploadError') || 'Image upload error'}:\n${invalidFiles.join('\n')}\n\n${t('owner.maxSize') || 'Max size'}: 10MB ${t('owner.perFile') || 'per file'}\n${t('owner.totalMaxSize') || 'Total max'}: 50MB`)
      }
      
      if (validFiles.length > 0) {
        const newImages = [...selectedImages, ...validFiles]
        setSelectedImages(newImages)
        
        // Create preview URLs
        const newPreviews = validFiles.map(file => URL.createObjectURL(file))
        setPreviewImages(prev => [...prev, ...newPreviews])
      }
    }
  }

  // Remove image
  const removeImage = (index: number) => {
    const newImages = selectedImages.filter((_, i) => i !== index)
    const newPreviews = previewImages.filter((_, i) => i !== index)
    
    // Revoke the URL to free memory
    URL.revokeObjectURL(previewImages[index])
    
    setSelectedImages(newImages)
    setPreviewImages(newPreviews)
  }

  // Handle form reset
  const handleCancel = () => {
    setFormData({
      name: '',
      description: '',
      address: '',
      postal_code: '',
      latitude: 35.7219,
      longitude: 51.3347,
      amenities: []
    })
    setFieldErrors({})
    setSelectedLocation([35.7219, 51.3347])
    setSelectedImages([])
    setPreviewImages([])
    setShowAddForm(false)
  }

  // Check if venue has upcoming events
  const checkUpcomingEvents = async (venueId: string) => {
    try {
      const events = await fetchEventsForVenue(venueId)
      const now = new Date()
      const upcomingEvents = events.filter((event: any) => {
        const eventDate = new Date(event.start_time)
        return eventDate > now && event.event_status === 'upcoming'
      })
      return upcomingEvents.length > 0
    } catch (error) {
      console.error('Error checking upcoming events:', error)
      return false
    }
  }

  // Handle delete venue
  const handleDeleteVenue = async (venue: Venue) => {
    setVenueToDelete(venue)
    setShowDeleteModal(true)
  }

  // Confirm delete venue
  const confirmDeleteVenue = async () => {
    if (!venueToDelete) return

    setIsDeleting(true)
    try {
      // Check for upcoming events first
      const hasUpcomingEvents = await checkUpcomingEvents(venueToDelete.id)
      
      if (hasUpcomingEvents) {
        alert(t('owner.cannotDeleteVenueWithUpcomingEvents'))
        setShowDeleteModal(false)
        setVenueToDelete(null)
        setIsDeleting(false)
        return
      }

      // Delete the venue (this will cascade delete related events)
      const deleteResponse = await apiService.deleteVenue(venueToDelete.id)
      console.log('Delete response:', deleteResponse)
      
      // Remove venue from local state
      setVenues(prevVenues => prevVenues.filter(v => v.id !== venueToDelete.id))
      
      // Show success message
      alert(t('owner.venueDeletedSuccessfully'))
      
    } catch (error: unknown) {
      console.error('Error deleting venue:', error)
      
      if (error instanceof Error) {
        if (error.message.includes('HTTP error! status: 400')) {
          alert(t('owner.cannotDeleteVenueWithUpcomingEvents'))
        } else if (error.message.includes('HTTP error! status: 403')) {
          alert(t('common.accessDenied'))
        } else {
          alert(`${t('common.errorDeletingVenue')}: ${error.message}`)
        }
      } else {
        alert(`${t('common.errorDeletingVenue')}: ${String(error)}`)
      }
    } finally {
      setIsDeleting(false)
      setShowDeleteModal(false)
      setVenueToDelete(null)
    }
  }

  // Cancel delete
  const cancelDelete = () => {
    setShowDeleteModal(false)
    setVenueToDelete(null)
  }

  // Toggle venue active status (admin only)
  const handleToggleVenueStatus = async (venue: Venue) => {
    if (!isAdmin()) {
      alert(t('common.accessDenied') || 'Access denied. Admin privileges required.')
      return
    }

    setTogglingVenue(venue.id)
    try {
      const newStatus = !venue.is_active
      await apiService.updateVenue(venue.id, { is_active: newStatus })
      
      // Update local state - ensure both is_active and status are updated
      setVenues(prevVenues => 
        prevVenues.map(v => 
          v.id === venue.id 
            ? { 
                ...v, 
                is_active: newStatus, 
                status: newStatus ? 'active' : 'inactive' 
              }
            : v
        )
      )
      
      alert(newStatus 
        ? (t('owner.venueActivated') || 'Venue activated successfully')
        : (t('owner.venueDeactivated') || 'Venue deactivated. Users will see "Call Support" message.')
      )
      
      // Refresh venues list to ensure data is in sync with backend
      await fetchVenues()
    } catch (error: unknown) {
      console.error('Error toggling venue status:', error)
      const message = error instanceof Error ? error.message : String(error)
      alert(t('common.error') || 'Error: ' + message)
    } finally {
      setTogglingVenue(null)
    }
  }


  return (
    <div className={`container-responsive p-responsive space-responsive ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-responsive-xl font-bold">{t('owner.myVenues')}</h1>
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={fetchVenues}
            disabled={isLoadingVenues}
            className="btn-ghost hover-scale text-sm px-3 py-2"
            title={t('common.refresh')}
          >
            {isLoadingVenues ? '⟳' : '↻'}
          </button>
          <button 
            onClick={() => setShowAddForm(true)}
            className="btn-primary hover-scale text-sm px-4 py-2"
          >
            {t('owner.addVenue')}
          </button>
        </div>
      </div>

      {/* Venues List */}
      <div className="space-y-4">
        {isLoadingVenues ? (
          <div className="glass-card p-6 text-center">
            <div className="text-slate-400">{t('common.loading')}...</div>
          </div>
        ) : venues.length === 0 ? (
          <div className="glass-card p-6 text-center">
            <div className="text-slate-400">{t('owner.noVenuesFound')}</div>
            <button 
              onClick={() => setShowAddForm(true)}
              className="btn-primary mt-4"
            >
              {t('owner.addYourFirstVenue')}
            </button>
          </div>
        ) : (
          venues.map((venue) => (
          <div key={venue.id} className={`glass-card p-4 sm:p-6 space-y-4 ${venue.is_active === false ? 'opacity-60 bg-slate-800/50' : 'opacity-100'}`}>
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-responsive-lg font-semibold">{venue.name}</h3>
                  {venue.is_active === false && (
                    <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs font-medium">
                      {t('owner.callSupport') || 'Call Support'}
                    </span>
                  )}
                </div>
                <p className="text-responsive-sm text-slate-400 line-clamp-2">{venue.description}</p>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-responsive-xs text-slate-500">
                  <span className="flex items-center gap-1">📍 {venue.address}</span>
                  <span className="flex items-center gap-1">📮 {formatNumber(venue.postal_code, language)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {isAdmin() ? (
                  <button
                    onClick={() => handleToggleVenueStatus(venue)}
                    disabled={togglingVenue === venue.id}
                    className={`text-xs px-3 py-1.5 hover-scale transition-all ${
                      venue.is_active !== false
                        ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                        : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                    } ${togglingVenue === venue.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title={venue.is_active !== false ? t('owner.deactivateVenue') || 'Deactivate Venue' : t('owner.activateVenue') || 'Activate Venue'}
                  >
                    {togglingVenue === venue.id ? '⟳' : venue.is_active !== false ? '✓ Active' : '✗ Inactive'}
                  </button>
                ) : (
                  <span className={`chip text-xs ${
                    venue.status === 'active' ? 'bg-green-500/20 text-green-400' : 
                    venue.status === 'inactive' ? 'bg-red-500/20 text-red-400' : 
                    'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {venue.is_active === false ? (t('owner.callSupport') || 'Call Support') : t(`owner.${venue.status}`)}
                  </span>
                )}
                <div className="flex gap-2">
                  <button 
                    onClick={() => navigate(`/venues/${venue.id}/edit`)}
                    className="btn-primary text-xs px-3 py-1.5 hover-scale"
                    title={t('common.edit')}
                  >
                    ✏️ {t('common.edit')}
                  </button>
                  <button 
                    onClick={() => handleDeleteVenue(venue)}
                    className="btn-danger text-xs px-3 py-1.5"
                    title={t('common.delete')}
                  >
                    🗑️ {t('common.delete')}
                  </button>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
              <div className="bg-slate-800/30 rounded-lg p-3">
                <div className="text-responsive-lg font-bold text-purple-400">{formatNumber(venue.total_bookings, language)}</div>
                <div className="text-responsive-xs text-slate-400">{t('owner.totalBookings')}</div>
              </div>
              <div className="bg-slate-800/30 rounded-lg p-3">
                <div className="text-responsive-lg font-bold text-green-400">{formatCurrency(venue.total_revenue, language, t('common.currency'))}</div>
                <div className="text-responsive-xs text-slate-400">{t('owner.totalEarnings')}</div>
              </div>
              <div className="bg-slate-800/30 rounded-lg p-3">
                <div className="text-responsive-lg font-bold text-yellow-400">
                  {venue.rating && venue.rating > 0 ? formatNumber(venue.rating, language, 1) : '⭐'}
                </div>
                <div className="text-responsive-xs text-slate-400">{t('owner.averageRating')}</div>
              </div>
            </div>
          </div>
          ))
        )}
      </div>

      {/* Add Venue Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
          <div className="glass-card p-3 sm:p-6 max-w-2xl w-full max-h-[95vh] overflow-y-auto space-y-4 animate-scale-in my-2 sm:my-4">
            <div className="flex items-center justify-between">
              <h2 className="text-responsive-lg font-bold">{t('owner.addNewVenue')}</h2>
              <button 
                onClick={() => setShowAddForm(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="venue-name" className="text-responsive-sm font-medium text-slate-300">{t('owner.venueName')}</label>
                <input 
                  id="venue-name"
                  type="text" 
                  className={`input-field w-full mt-1 ${fieldErrors.name ? 'border-red-500 border-2' : ''}`}
                  placeholder={t('owner.venueName')}
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                />
              </div>
              
              <div>
                <label htmlFor="venue-description" className="text-responsive-sm font-medium text-slate-300">{t('owner.venueDescription')}</label>
                <textarea 
                  id="venue-description"
                  className={`input-field w-full mt-1 h-20 resize-none ${fieldErrors.description ? 'border-red-500 border-2' : ''}`}
                  placeholder={t('owner.venueDescription')}
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                />
              </div>
              
              <div>
                <label htmlFor="venue-address" className="text-responsive-sm font-medium text-slate-300">{t('owner.venueAddress')}</label>
                <input 
                  id="venue-address"
                  type="text" 
                  className={`input-field w-full mt-1 ${fieldErrors.address ? 'border-red-500 border-2' : ''}`}
                  placeholder={t('owner.venueAddress')}
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                />
              </div>
              
              <div>
                <label htmlFor="venue-postal-code" className="text-responsive-sm font-medium text-slate-300">{t('owner.venuePostalCode')}</label>
                <input 
                  id="venue-postal-code"
                  type="text" 
                  className={`input-field w-full mt-1 ${fieldErrors.postal_code ? 'border-red-500 border-2' : ''}`}
                  placeholder={language === 'fa' ? "۱۲۳۴۵۶۷۸۹۰" : "1234567890"}
                  value={language === 'fa' ? toPersianNumbers(formData.postal_code) : formData.postal_code}
                  onChange={(e) => handleInputChange('postal_code', e.target.value)}
                  dir="ltr"
                />
              </div>

              {/* Amenities Selection */}
              <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                <label className="text-responsive-sm font-medium text-slate-300 flex items-center gap-2 mb-3">
                  <span className="text-yellow-400">⭐</span>
                  {t('owner.venueAmenities')}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {amenityOptions.map((amenity) => (
                    <label key={amenity.key} className="flex items-center gap-2 cursor-pointer hover:bg-slate-700/50 p-2 rounded transition-colors">
                      <input
                        type="checkbox"
                        checked={formData.amenities.includes(amenity.key)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData(prev => ({
                              ...prev,
                              amenities: [...prev.amenities, amenity.key]
                            }))
                          } else {
                            setFormData(prev => ({
                              ...prev,
                              amenities: prev.amenities.filter(a => a !== amenity.key)
                            }))
                          }
                        }}
                        className="w-4 h-4 text-purple-600 bg-slate-700 border-slate-600 rounded focus:ring-purple-500 focus:ring-2"
                      />
                      <span className="text-responsive-xs text-slate-300">{amenity.label}</span>
                    </label>
                  ))}
                </div>
                {formData.amenities.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-slate-400 mb-2">{t('owner.selectedAmenities')}:</p>
                    <div className="flex flex-wrap gap-1">
                      {formData.amenities.map((amenityKey) => {
                        const amenity = amenityOptions.find(a => a.key === amenityKey)
                        return (
                          <span key={amenityKey} className="chip bg-purple-500/20 text-purple-400 text-xs">
                            {amenity?.label || amenityKey}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Photo Upload */}
              <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                <label className="text-responsive-sm font-medium text-slate-300 flex items-center gap-2 mb-3">
                  <span className="text-yellow-400">📸</span>
                  {t('owner.uploadPhotos')}
                </label>
                
                {/* File Input */}
                <input 
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="venue-image-upload"
                />
                <label 
                  htmlFor="venue-image-upload"
                  className="group relative block w-full cursor-pointer"
                >
                  <div className="border-2 border-dashed border-slate-600 group-hover:border-purple-400 group-hover:bg-purple-500/5 transition-all duration-200 rounded-xl p-6 text-center">
                    <div className="space-y-3">
                      <div className="mx-auto w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-responsive-sm font-semibold text-slate-200 mb-1">
                          {t('owner.dragDropOrClick')}
                        </h3>
                        <p className="text-responsive-xs text-slate-400">
                          JPG, PNG, WEBP • {t('owner.maxSize')} 10MB {t('owner.perFile') || 'per file'} • {t('owner.totalMaxSize') || 'Total max'} 50MB
                        </p>
                      </div>
                    </div>
                  </div>
                </label>

                {/* Image Previews */}
                {previewImages.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs text-slate-400 mb-3">{t('owner.newPhotos')} ({previewImages.length})</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {previewImages.map((preview, index) => (
                        <div key={index} className="relative group">
                          <div className="aspect-square rounded-lg overflow-hidden bg-slate-800">
                            <img 
                              src={preview} 
                              alt={`Preview ${index + 1}`}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            />
                          </div>
                          <button 
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600 transition-colors shadow-lg"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Map for location selection */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-2">
                  <label className="text-responsive-sm font-medium text-slate-300">
                    {t('owner.selectLocationOnMap')}
                  </label>
                  <button
                    type="button"
                    onClick={handleUseCurrentLocation}
                    className="btn-ghost text-xs px-3 py-1 hover-scale self-start sm:self-auto"
                    title="Use your current location"
                  >
                    📍 {t('owner.useCurrentLocation')}
                  </button>
                </div>
                <VenueLocationMap
                  center={mapCenter}
                  selectedLocation={selectedLocation}
                  onLocationSelect={handleMapClick}
                  height="200px"
                />
                <div className="mt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-responsive-xs text-slate-400">
                  <span className="break-all">
                    {t('owner.currentLocation')}: {selectedLocation[0].toFixed(4)}, {selectedLocation[1].toFixed(4)}
                  </span>
                  <span className="bg-purple-500/20 text-purple-400 px-2 py-1 rounded self-start sm:self-auto">
                    📍 {t('owner.selectedLocation')}
                  </span>
                </div>
                <p className="text-responsive-xs text-slate-400 mt-2">
                  {t('owner.mapInstructions')}
                </p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button 
                onClick={handleCancel}
                className="btn-ghost flex-1"
                disabled={isLoading}
              >
                {t('common.cancel')}
              </button>
              <button 
                onClick={handleSaveVenue}
                className="btn-primary flex-1"
                disabled={isLoading || uploadingImages}
              >
                {uploadingImages ? t('common.uploadingImages') : isLoading ? t('common.saving') : t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && venueToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="glass-card p-6 max-w-md w-full space-y-4 animate-scale-in">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
                <span className="text-2xl">⚠️</span>
              </div>
              <h2 className="text-lg font-bold text-red-400 mb-2">
                {t('owner.deleteVenueConfirmation')}
              </h2>
              <p className="text-slate-300 mb-4">
                {t('owner.deleteVenueWarning').replace('{venueName}', venueToDelete.name)}
              </p>
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-4">
                <p className="text-yellow-400 text-sm">
                  ⚠️ {t('owner.deleteVenueNote')}
                </p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button 
                onClick={cancelDelete}
                className="btn-ghost flex-1"
                disabled={isDeleting}
              >
                {t('common.cancel')}
              </button>
              <button 
                onClick={confirmDeleteVenue}
                className="btn-danger flex-1"
                disabled={isDeleting}
              >
                {isDeleting ? t('common.deleting') : t('common.confirmDelete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
