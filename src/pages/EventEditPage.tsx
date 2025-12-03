import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../state/authStore'
import { useLanguage } from '../contexts/LanguageContext'
import { apiService } from '../services/apiService'
import { toPersianNumbers, toEnglishNumbers, formatPersianTime, formatNumberWithCommas } from '../utils/persianNumbers'
import SolarHijriDatePicker from '../components/SolarHijriDatePicker'
import EventConflictDialog from '../components/EventConflictDialog'
import TimePicker from '../components/TimePicker'
import type { Event } from '../types/owner'
import { ImageUploadService } from '../services/imageUploadService'

export default function EventEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { state } = useAuth()
  const { t } = useLanguage()
  
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingEvent, setIsLoadingEvent] = useState(true)
  const [event, setEvent] = useState<Event | null>(null)
  const [socialHubs, setSocialHubs] = useState<any[]>([])
  const [isLoadingSocialHubs, setIsLoadingSocialHubs] = useState(false)
  const [eventCategories, setEventCategories] = useState<any[]>([])
  const [isLoadingCategories, setIsLoadingCategories] = useState(false)

  // Conflict detection state
  const [showConflictDialog, setShowConflictDialog] = useState(false)
  const [conflictingEvents, setConflictingEvents] = useState<any[]>([])
  const [pendingEventData, setPendingEventData] = useState<any>(null)

  // Photo upload state
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [previewImages, setPreviewImages] = useState<string[]>([])
  const [uploadingImages, setUploadingImages] = useState(false)
  
  // Form state - pre-filled with event data
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    date: '',
    time: '',
    duration: '2',
    capacity: '',
    price: '',
    minimum_players: '',
    minimum_seats: '',
    social_hub: '',
    requirements: [] as string[],
    ticket_closing_timer: '',
    images: [] as File[]
  })

  // Available requirements options with translation keys
  const requirementOptions = [
    { key: 'generalRulesRequired', label: t('owner.requirements.generalRulesRequired') },
    { key: 'smokingAllowedWithRestrictions', label: t('owner.requirements.smokingAllowedWithRestrictions') },
    { key: 'smokingProhibited', label: t('owner.requirements.smokingProhibited') },
    { key: 'alcoholDrugsProhibited', label: t('owner.requirements.alcoholDrugsProhibited') },
    { key: 'intoxicatedNotAllowed', label: t('owner.requirements.intoxicatedNotAllowed') },
    { key: 'publicEvent', label: t('owner.requirements.publicEvent') },
    { key: 'menOnly', label: t('owner.requirements.menOnly') },
    { key: 'womenOnly', label: t('owner.requirements.womenOnly') },
    { key: 'familyOnly', label: t('owner.requirements.familyOnly') },
    { key: 'minAge13', label: t('owner.requirements.minAge13') },
    { key: 'minAge15', label: t('owner.requirements.minAge15') },
    { key: 'minAge18', label: t('owner.requirements.minAge18') },
    { key: 'allAges', label: t('owner.requirements.allAges') },
    { key: 'menuOrderRequired', label: t('owner.requirements.menuOrderRequired') },
    { key: 'reservationCodeRequired', label: t('owner.requirements.reservationCodeRequired') },
    { key: 'arrive15MinEarly', label: t('owner.requirements.arrive15MinEarly') },
    { key: 'noLateEntry', label: t('owner.requirements.noLateEntry') },
    { key: 'capacityLimited', label: t('owner.requirements.capacityLimited') },
    { key: 'cancellationPolicy', label: t('owner.requirements.cancellationPolicy') },
    { key: 'gameManagementResponsibility', label: t('owner.requirements.gameManagementResponsibility') },
    { key: 'noBettingOrCheating', label: t('owner.requirements.noBettingOrCheating') },
    { key: 'photoVideoWithPermission', label: t('owner.requirements.photoVideoWithPermission') },
    { key: 'silenceOrOrderRequired', label: t('owner.requirements.silenceOrOrderRequired') },
    { key: 'organizerCancellationRights', label: t('owner.requirements.organizerCancellationRights') },
    { key: 'guestBehaviorResponsibility', label: t('owner.requirements.guestBehaviorResponsibility') },
    { key: 'additionalRulesInDescription', label: t('owner.requirements.additionalRulesInDescription') }
  ]

  // Helper function to format time consistently
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    })
  }


  // Fetch event data
  const fetchEvent = async () => {
    if (!id) return
    
    setIsLoadingEvent(true)
    try {
      const eventData = await apiService.getEvent(id)
      console.log('Fetched event data:', eventData)
      
      // Convert API response to Event format
      const formattedEvent: Event = {
        id: eventData.id,
        name: eventData.name,
        description: eventData.description || '',
        date: eventData.date,
        time: eventData.start_time || eventData.time,
        duration: eventData.duration || 2,
        capacity: eventData.capacity || 0,
        price: eventData.price || 0,
        category: eventData.category?.name || eventData.category || 'General',
        minimum_players: eventData.minimum_players || 0,
        minimum_seats: eventData.minimum_seats || 0,
        status: eventData.event_status || 'upcoming',
        venue_id: eventData.social_hub?.id || eventData.social_hub_id || eventData.social_hub || eventData.venue_id,
        owner_id: eventData.owner || eventData.owner_id,
        created_at: eventData.created_at || new Date().toISOString(),
        updated_at: eventData.updated_at || new Date().toISOString(),
        images: eventData.images || [],
        requirements: eventData.requirements || [],
        total_bookings: eventData.total_bookings || 0,
        total_revenue: eventData.total_revenue || 0,
        rating: eventData.rating || 0,
        total_reviews: eventData.total_reviews || 0
      }
      
      setEvent(formattedEvent)
      
      // Pre-fill form with event data
      const startTime = new Date(eventData.start_time || eventData.time)
      const dateStr = startTime.toISOString().split('T')[0]
      const timeStr = formatTime(startTime)
      
      const venueId = String(eventData.social_hub?.id || eventData.social_hub_id || eventData.social_hub || eventData.venue_id || '')
      console.log('=== INITIAL FORM DATA SETTING ===')
      console.log('Raw event data:', eventData)
      console.log('Event venue data:', {
        social_hub_id: eventData.social_hub_id,
        social_hub: eventData.social_hub,
        venue_id: eventData.venue_id,
        final_venue_id: venueId
      })
      console.log('Setting formData.social_hub to:', venueId)
      
      setFormData({
        name: eventData.name || '',
        description: eventData.description || '',
        category: eventData.category?.id || eventData.category || '',
        date: dateStr,
        time: timeStr,
        duration: String(eventData.duration || 2),
        capacity: String(eventData.capacity || 0),
        price: String(eventData.price || 0),
        minimum_players: String(eventData.minimum_players || 0),
        minimum_seats: String(eventData.minimum_seats || 0),
        social_hub: venueId,
        requirements: eventData.requirements || [],
        ticket_closing_timer: String(eventData.ticket_closing_timer || ''),
        images: [] // New images will be added here
      })
      
    } catch (error) {
      console.error('Error fetching event:', error)
      alert(`Error loading event: ${error instanceof Error ? error.message : 'Unknown error'}`)
      navigate('/events')
    } finally {
      setIsLoadingEvent(false)
    }
  }

  // Fetch social hubs for the current owner
  const fetchSocialHubs = async () => {
    setIsLoadingSocialHubs(true)
    try {
      const ownerId = state.auth.user?.id
      if (ownerId) {
        const responseData = await apiService.getVenues(ownerId)
        const socialHubsData = responseData.results || responseData
        // Filter out any null/undefined entries and ensure proper structure
        const validSocialHubs = Array.isArray(socialHubsData) 
          ? socialHubsData.filter(hub => {
              return hub && 
                     typeof hub === 'object' && 
                     hub.id && 
                     typeof hub.id === 'string' &&
                     hub.name && 
                     typeof hub.name === 'string' &&
                     hub.address &&
                     typeof hub.address === 'string'
            }).map(hub => ({
              id: String(hub.id),
              name: String(hub.name),
              address: String(hub.address)
            }))
          : []
        setSocialHubs(validSocialHubs)
        console.log('Fetched social hubs (raw):', socialHubsData)
        console.log('Valid social hubs (filtered):', validSocialHubs)
        console.log('Social hubs structure:', validSocialHubs.map((hub: any) => ({ 
          id: hub.id, 
          name: hub.name, 
          address: hub.address,
          idType: typeof hub.id,
          nameType: typeof hub.name,
          addressType: typeof hub.address
        })))
      }
    } catch (error) {
      console.error('Error fetching social hubs:', error)
    } finally {
      setIsLoadingSocialHubs(false)
    }
  }

  // Fetch event categories
  const fetchEventCategories = async () => {
    setIsLoadingCategories(true)
    try {
      const responseData = await apiService.getEventCategories()
      const categoriesData = responseData.results || responseData
      setEventCategories(categoriesData)
      console.log('Fetched event categories:', categoriesData)
    } catch (error) {
      console.error('Error fetching event categories:', error)
      // Fallback to hardcoded categories if API fails
      setEventCategories([
        { id: '1', name: 'Gaming', description: 'Gaming events and tournaments' },
        { id: '2', name: 'Sports', description: 'Sports activities and competitions' },
        { id: '3', name: 'Music', description: 'Music events and concerts' },
        { id: '4', name: 'Study', description: 'Study groups and educational events' },
        { id: '5', name: 'Food', description: 'Food and dining events' },
        { id: '6', name: 'Other', description: 'Other types of events' }
      ])
    } finally {
      setIsLoadingCategories(false)
    }
  }

  // Load data on component mount
  useEffect(() => {
    fetchEvent()
    fetchSocialHubs()
    fetchEventCategories()
  }, [id])

  // Update form data when both event and social hubs are loaded
  useEffect(() => {
    if (event && socialHubs.length > 0) {
      console.log('=== VENUE SELECTION DEBUG ===')
      console.log('Event data:', event)
      console.log('Event venue_id:', event.venue_id)
      console.log('Social hubs:', socialHubs)
      console.log('Current formData.social_hub:', formData.social_hub)
      
      // Try multiple possible venue ID sources
      const possibleVenueIds = [
        event.venue_id,
        (event as any).social_hub_id,
        (event as any).social_hub,
        formData.social_hub
      ].filter(Boolean).map(String)
      
      console.log('Possible venue IDs:', possibleVenueIds)
      
      let matchedVenueId = null
      let matchedVenue = null
      
      // Try to find a matching venue
      for (const venueId of possibleVenueIds) {
        const venue = socialHubs.find(hub => String(hub.id) === String(venueId))
        if (venue) {
          matchedVenueId = String(venueId)
          matchedVenue = venue
          break
        }
      }
      
      if (matchedVenue && matchedVenueId) {
        console.log('✅ Found matching venue:', matchedVenue)
        setFormData(prev => ({
          ...prev,
          social_hub: String(matchedVenueId)
        }))
        console.log('Updated social_hub field to:', matchedVenueId)
      } else {
        console.warn('❌ No matching venue found')
        console.log('Available venue IDs:', socialHubs.map((hub: any) => ({ id: hub.id, name: hub.name })))
        console.log('Tried to match against:', possibleVenueIds)
      }
    }
  }, [event, socialHubs])

  // Handle form input changes
  const handleInputChange = (field: string, value: string) => {
    // Convert Persian numbers to English for numeric fields
    const numericFields = ['capacity', 'price', 'minimum_players', 'minimum_seats', 'ticket_closing_timer']
    let processedValue = numericFields.includes(field) ? toEnglishNumbers(value.replace(/,/g, '')) : value
    
    // Handle social_hub field specially - keep as string for UUID
    if (field === 'social_hub' && value) {
      // Keep as string for UUID validation
      processedValue = String(value) // Ensure it's a string
      console.log('Social hub UUID:', processedValue)
    }
    
    setFormData(prev => ({
      ...prev,
      [field]: processedValue
    }))
  }

  // Handle photo upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    
    // Validate files
    const validFiles = files.filter(file => {
      const isValidType = file.type.startsWith('image/')
      const isValidSize = file.size <= 10 * 1024 * 1024 // 10MB
      return isValidType && isValidSize
    })
    
    if (validFiles.length !== files.length) {
      alert('Some files were skipped. Please ensure all files are images under 10MB.')
    }
    
    // Store files for upload
    setUploadedFiles(prev => [...prev, ...validFiles])
    
    // Create preview URLs
    const newPreviews = validFiles.map(file => URL.createObjectURL(file))
    setPreviewImages(prev => [...prev, ...newPreviews])
    
    // Save to localStorage for persistence
    const storedImages = JSON.parse(localStorage.getItem(`event_${id}_images`) || '[]')
    const newStoredImages = [...storedImages, ...validFiles.map(file => ({
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    }))]
    localStorage.setItem(`event_${id}_images`, JSON.stringify(newStoredImages))
  }

  // Remove photo
  const removePhoto = (index: number) => {
    // Remove from uploaded files
    setUploadedFiles(prev => prev.filter((_, i) => i !== index))
    
    // Remove from preview images
    setPreviewImages(prev => {
      const newPreviews = prev.filter((_, i) => i !== index)
      // Revoke the URL to free memory
      URL.revokeObjectURL(prev[index])
      return newPreviews
    })
    
    // Update localStorage
    const storedImages = JSON.parse(localStorage.getItem(`event_${id}_images`) || '[]')
    const updatedStoredImages = storedImages.filter((_: any, i: number) => i !== index)
    localStorage.setItem(`event_${id}_images`, JSON.stringify(updatedStoredImages))
  }

  // Check for event conflicts
  const checkEventConflicts = async (startTime: string, endTime: string) => {
    try {
      const ownerId = state.auth.user?.id
      if (!ownerId) {
        throw new Error('User not authenticated')
      }
      
      console.log('=== CONFLICT CHECK DEBUG (EDIT) ===')
      console.log('Owner ID:', ownerId)
      console.log('Event ID to exclude:', id)
      console.log('Start time:', startTime)
      console.log('End time:', endTime)
      
      const conflicts = await apiService.checkEventConflicts(ownerId, startTime, endTime, id)
      console.log('Conflict check response:', conflicts)
      
      return conflicts.conflicting_events || []
    } catch (error) {
      console.error('Error checking conflicts:', error)
      // If conflict check fails, we'll proceed without checking
      return []
    }
  }

  // Handle conflict dialog actions
  const handleConflictProceed = async () => {
    setShowConflictDialog(false)
    if (pendingEventData) {
      await updateEvent(pendingEventData)
    }
  }

  const handleConflictEdit = () => {
    setShowConflictDialog(false)
    // Keep the form open for editing
  }

  const handleConflictClose = () => {
    setShowConflictDialog(false)
    setPendingEventData(null)
    setConflictingEvents([])
  }

  // Update event after conflict check
  const updateEvent = async (eventData: any) => {
    if (!id) return
    
    setIsLoading(true)
    try {
      // Upload images first if there are any
      let uploadedImageUrls: string[] = []
      if (uploadedFiles.length > 0) {
        setUploadingImages(true)
        try {
          const imageUploadService = new ImageUploadService()
          const uploadPromises = uploadedFiles.map(file => 
            imageUploadService.uploadImage(file, {
              imageType: 'event_gallery',
              title: `${eventData.name} - ${file.name}`,
              description: `Gallery image for ${eventData.name}`,
              isPublic: true,
              relatedEventId: id
            })
          )
          
          const uploadResults = await Promise.all(uploadPromises)
          uploadedImageUrls = uploadResults.map(result => result.original_file)
        } catch (uploadError) {
          console.error('Error uploading images:', uploadError)
          alert('Failed to upload images. Please try again.')
          setUploadingImages(false)
          setIsLoading(false)
          return
        } finally {
          setUploadingImages(false)
        }
      }

      // Add uploaded image URLs to event data
      const eventDataWithImages = {
        ...eventData,
        images: uploadedImageUrls
      }

      console.log('Sending event data to API:', eventDataWithImages)
      console.log('Social hub ID type:', typeof eventDataWithImages.social_hub)
      console.log('Social hub ID value:', eventDataWithImages.social_hub)

      // Update event via API
      const response = await apiService.updateEvent(id, eventDataWithImages)
      console.log('Event updated successfully:', response)
      
      // Clear uploaded files and localStorage
      setUploadedFiles([])
      setPreviewImages([])
      localStorage.removeItem(`event_${id}_images`)
      
      alert(t('owner.eventUpdatedSuccessfully'))
      navigate('/events')
      
    } catch (error) {
      console.error('Error updating event:', error)
      alert(`Error updating event: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Handle form submission
  const handleUpdateEvent = async () => {
    if (!id) return
    
    // Debug form data before validation
    console.log('=== FORM UPDATE DEBUG ===')
    console.log('Form data:', formData)
    console.log('Event ID:', id)

    // Validate required fields
    if (!formData.name.trim()) {
      alert(t('owner.eventNameRequired'))
      return
    }
    
    if (!formData.description.trim()) {
      alert(t('owner.eventDescriptionRequired'))
      return
    }
    
    if (!formData.category) {
      alert(t('owner.selectCategoryForEvent'))
      return
    }
    
    if (!formData.social_hub) {
      alert('Please select a venue for the event')
      return
    }
    
    // Additional validation: check if selected social hub exists
    const selectedHub = socialHubs.find(hub => hub.id == formData.social_hub)
    if (!selectedHub) {
      alert('Selected venue is not valid. Please select a different venue.')
      return
    }
    
    try {
      // Combine date and time for start_time and calculate end_time based on duration
      const startDateTime = `${formData.date.trim()}T${formData.time.trim()}:00`
      
      // Calculate end time by adding duration to start time
      const startTime = new Date(startDateTime)
      const durationHours = parseInt(formData.duration.trim())
      
      // Ensure we have a valid duration
      if (isNaN(durationHours) || durationHours <= 0) {
        alert('Please select a valid duration')
        return
      }
      
      // Validate that the start time is not in the past
      const now = new Date()
      if (startTime < now) {
        alert('Event start time cannot be in the past. Please select a future date and time.')
        return
      }
      
      const endTime = new Date(startTime.getTime() + (durationHours * 60 * 60 * 1000))
      
      // Double check that end time is after start time
      if (endTime <= startTime) {
        alert('End time must be after start time. Please check your duration selection.')
        return
      }
      
      // Format times properly for the API - use ISO string format with explicit timezone
      const startDateTimeFormatted = startTime.toISOString()
      const endDateTimeFormatted = endTime.toISOString()
      
      console.log('Time calculation debug:',
        'Start:', startDateTimeFormatted,
        'End:', endDateTimeFormatted,
        'Duration:', durationHours, 'hours'
      )

      // Prepare form data for API
      const eventData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        category: formData.category,
        start_time: startDateTimeFormatted,
        end_time: endDateTimeFormatted,
        duration: durationHours,
        capacity: parseInt(formData.capacity) || 0,
        price: parseFloat(formData.price) || 0,
        minimum_players: parseInt(formData.minimum_players) || 0,
        minimum_seats: parseInt(formData.minimum_seats) || 0,
        social_hub: formData.social_hub, // Keep as string for UUID
        requirements: formData.requirements,
        ticket_closing_timer: parseInt(formData.ticket_closing_timer) || null
      }

      // Check for conflicts before updating the event
      const conflicts = await checkEventConflicts(startDateTimeFormatted, endDateTimeFormatted)
      
      if (conflicts.length > 0) {
        // Show conflict dialog
        setConflictingEvents(conflicts)
        setPendingEventData(eventData)
        setShowConflictDialog(true)
        return
      }
      
      // No conflicts, proceed with update
      await updateEvent(eventData)
      
    } catch (error) {
      console.error('Error in event update process:', error)
      alert(`Error updating event: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Handle cancel
  const handleCancel = () => {
    navigate('/events')
  }

  if (isLoadingEvent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
        <div className="glass-card p-6 text-center">
          <div className="text-slate-400">{t('common.loading')}...</div>
        </div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
        <div className="glass-card p-6 text-center">
          <div className="text-slate-400">{t('owner.eventNotFound')}</div>
          <button 
            onClick={() => navigate('/events')}
            className="btn-primary mt-4"
          >
            {t('common.backToEvents')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="glass-card p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-responsive-xl font-bold text-white">
                {t('owner.editEvent')}
              </h1>
              <p className="text-responsive-sm text-slate-400 mt-1">
                {t('owner.editEventDescription')}
              </p>
            </div>
            <button 
              onClick={handleCancel}
              className="btn-ghost hover-scale"
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>

        {/* Edit Event Form */}
        <div className="glass-card p-4 sm:p-6 space-y-6">
          <div className="space-y-4">
            {/* Category Selection - Moved to top and made prominent */}
            <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
              <label htmlFor="event-category" className="text-responsive-sm font-medium text-slate-300 flex items-center gap-2">
                <span className="text-yellow-400">⭐</span>
                {t('owner.eventCategory')} <span className="text-red-400">*</span>
              </label>
              <select 
                id="event-category"
                className="input-field w-full mt-2 text-lg"
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                disabled={isLoadingCategories}
              >
                <option value="">{isLoadingCategories ? t('common.loading') : t('owner.selectCategory')}</option>
                {eventCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              {!formData.category && (
                <p className="text-red-400 text-xs mt-1">{t('owner.categorySelectionRequired')}</p>
              )}
              {eventCategories.length === 0 && !isLoadingCategories && (
                <p className="text-yellow-400 text-xs mt-1">{t('owner.noCategoriesAvailable')}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="event-name" className="text-responsive-sm font-medium text-slate-300">{t('owner.eventName')}</label>
              <input 
                id="event-name"
                type="text" 
                className="input-field w-full mt-1"
                placeholder={t('owner.eventName')}
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
              />
            </div>
            
            <div>
              <label htmlFor="event-description" className="text-responsive-sm font-medium text-slate-300">{t('owner.eventDescription')}</label>
              <textarea 
                id="event-description"
                className="input-field w-full mt-1 h-20 resize-none"
                placeholder={t('owner.eventDescription')}
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
              />
            </div>
            
            <div>
              <label htmlFor="event-social-hub" className="text-responsive-sm font-medium text-slate-300">{t('owner.selectVenue')}</label>
              <select 
                id="event-social-hub"
                className="input-field w-full mt-1"
                value={formData.social_hub}
                onChange={(e) => {
                  console.log('Social hub dropdown changed:', e.target.value)
                  handleInputChange('social_hub', e.target.value)
                }}
                disabled={isLoadingSocialHubs}
              >
                <option value="">{isLoadingSocialHubs ? t('common.loading') : t('owner.selectVenue')}</option>
                {socialHubs.map((hub) => (
                  <option key={hub.id} value={hub.id}>
                    {hub.name} - {hub.address}
                  </option>
                ))}
              </select>
              {socialHubs.length === 0 && !isLoadingSocialHubs && (
                <p className="text-red-400 text-xs mt-1">
                  {t('owner.noVenuesAvailable')} <a href="/venues" className="underline">{t('owner.createVenue')}</a>
                </p>
              )}
              {/* Debug display temporarily removed to isolate the issue */}
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label htmlFor="event-date" className="text-responsive-sm font-medium text-slate-300">{t('owner.eventDate')}</label>
                <SolarHijriDatePicker
                  value={formData.date}
                  onChange={(value) => handleInputChange('date', value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div>
                <label className="text-responsive-sm font-medium text-slate-300">{t('owner.eventTime')}</label>
                <TimePicker
                  value={formData.time}
                  onChange={(value) => {
                    console.log('Time input changed:', value)
                    handleInputChange('time', value)
                  }}
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-1">
                <label htmlFor="event-duration" className="text-responsive-sm font-medium text-slate-300">{t('owner.duration')} (ساعت)</label>
                <select 
                  id="event-duration"
                  className="input-field w-full mt-1"
                  value={formData.duration}
                  onChange={(e) => handleInputChange('duration', e.target.value)}
                >
                  <option value="1">۱ ساعت</option>
                  <option value="2">۲ ساعت</option>
                  <option value="3">۳ ساعت</option>
                  <option value="4">۴ ساعت</option>
                  <option value="6">۶ ساعت</option>
                  <option value="8">۸ ساعت</option>
                  <option value="12">۱۲ ساعت</option>
                  <option value="24">۲۴ ساعت</option>
                </select>
                {formData.date && formData.time && formData.duration && (
                  <div className="text-xs mt-1">
                    {(() => {
                      try {
                        const startDateTime = `${formData.date}T${formData.time}:00`
                        const startTime = new Date(startDateTime)
                        const durationHours = parseInt(formData.duration)
                        const endTime = new Date(startTime.getTime() + (durationHours * 60 * 60 * 1000))
                        const now = new Date()
                        
                        const endTimeString = formatPersianTime(endTime.toTimeString().slice(0, 5))
                        
                        // Check for validation issues
                        if (startTime < now) {
                          return <span className="text-red-400">⚠️ Start time is in the past</span>
                        } else if (endTime <= startTime) {
                          return <span className="text-red-400">⚠️ Invalid time calculation</span>
                        } else {
                          return <span className="text-green-400">✓ رویداد در ساعت {endTimeString} به پایان می‌رسد</span>
                        }
                      } catch (e) {
                        return <span className="text-red-400">⚠️ Invalid time format</span>
                      }
                    })()}
                  </div>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="event-capacity" className="text-responsive-sm font-medium text-slate-300">{t('owner.eventCapacity')}</label>
                <input 
                  id="event-capacity"
                  type="text" 
                  className="input-field w-full mt-1"
                  placeholder="۵۰"
                  value={toPersianNumbers(formData.capacity)}
                  onChange={(e) => handleInputChange('capacity', e.target.value)}
                  dir="ltr"
                />
              </div>
              <div>
                <label htmlFor="event-price" className="text-responsive-sm font-medium text-slate-300">{t('owner.eventPrice')}</label>
                <div className="relative mt-1">
                  <input 
                    id="event-price"
                    type="text" 
                    className="input-field w-full pr-16"
                    value={toPersianNumbers(formatNumberWithCommas(formData.price))}
                    onChange={(e) => handleInputChange('price', e.target.value)}
                    dir="ltr"
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 text-sm pointer-events-none">
                    تومان
                  </div>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="event-minimum-players" className="text-responsive-sm font-medium text-slate-300">حداقل تعداد تیم</label>
                <input 
                  id="event-minimum-players"
                  type="text" 
                  className="input-field w-full mt-1"
                  placeholder="۴"
                  value={toPersianNumbers(formData.minimum_players)}
                  onChange={(e) => handleInputChange('minimum_players', e.target.value)}
                  dir="ltr"
                />
              </div>
              <div>
                <label htmlFor="event-minimum-seats" className="text-responsive-sm font-medium text-slate-300">حداقل ظرفیت</label>
                <input 
                  id="event-minimum-seats"
                  type="text" 
                  className="input-field w-full mt-1"
                  placeholder="۱۰"
                  value={toPersianNumbers(formData.minimum_seats)}
                  onChange={(e) => handleInputChange('minimum_seats', e.target.value)}
                  dir="ltr"
                  required
                />
                <p className="text-xs text-slate-400 mt-1">{t('owner.minimumSeatsDescription')}</p>
              </div>
            </div>

            {/* Ticket Closing Timer */}
            <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
              <label htmlFor="event-ticket-closing-timer" className="text-responsive-sm font-medium text-slate-300 flex items-center gap-2 mb-3">
                <span className="text-yellow-400">⏰</span>
                {t('owner.ticketClosingTimer')}
              </label>
              <select 
                id="event-ticket-closing-timer"
                className="input-field w-full"
                value={formData.ticket_closing_timer}
                onChange={(e) => handleInputChange('ticket_closing_timer', e.target.value)}
              >
                <option value="">{t('owner.selectClosingTime')}</option>
                <option value="2">۲ ساعت قبل از شروع</option>
                <option value="4">۴ ساعت قبل از شروع</option>
                <option value="8">۸ ساعت قبل از شروع</option>
                <option value="12">۱۲ ساعت قبل از شروع</option>
                <option value="24">۲۴ ساعت قبل از شروع</option>
              </select>
              <p className="text-xs text-slate-400 mt-1">{t('owner.whenToCloseTickets')}</p>
            </div>

            {/* Event Requirements Selection */}
            <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
              <label className="text-responsive-sm font-medium text-slate-300 flex items-center gap-2 mb-3">
                <span className="text-yellow-400">⭐</span>
                {t('owner.eventRequirements')}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {requirementOptions.map((requirement) => (
                  <label key={requirement.key} className="flex items-center gap-2 cursor-pointer hover:bg-slate-700/50 p-2 rounded transition-colors">
                    <input
                      type="checkbox"
                      checked={formData.requirements.includes(requirement.key)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData(prev => ({
                            ...prev,
                            requirements: [...prev.requirements, requirement.key]
                          }))
                        } else {
                          setFormData(prev => ({
                            ...prev,
                            requirements: prev.requirements.filter(r => r !== requirement.key)
                          }))
                        }
                      }}
                      className="w-4 h-4 text-purple-600 bg-slate-700 border-slate-600 rounded focus:ring-purple-500 focus:ring-2"
                    />
                    <span className="text-responsive-xs text-slate-300">{requirement.label}</span>
                  </label>
                ))}
              </div>
              {formData.requirements.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs text-slate-400 mb-2">{t('owner.selectedRequirements')}:</p>
                  <div className="flex flex-wrap gap-1">
                    {formData.requirements.map((requirementKey) => {
                      const requirement = requirementOptions.find(r => r.key === requirementKey)
                      return (
                        <span key={requirementKey} className="chip bg-purple-500/20 text-purple-400 text-xs">
                          {requirement?.label || requirementKey}
                        </span>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Photo Upload Section */}
            <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
              <label className="text-responsive-sm font-medium text-slate-300 flex items-center gap-2 mb-3">
                <span className="text-yellow-400">📸</span>
                {t('owner.eventPhotos')}
              </label>
              <div className="space-y-4">
                {/* Upload Button */}
                <div className="flex items-center justify-center w-full">
                  <label htmlFor="photo-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-600 rounded-lg cursor-pointer bg-slate-700/50 hover:bg-slate-700/70 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <svg className="w-8 h-8 mb-4 text-slate-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.5C5.137 5.5 5.071 5.5 5 5.5a5 5 0 0 0 0 10h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
                      </svg>
                      <p className="mb-2 text-sm text-slate-400">
                        <span className="font-semibold">{t('owner.clickToUpload')}</span> {t('owner.orDragAndDrop')}
                      </p>
                      <p className="text-xs text-slate-500">{t('owner.supportedFormats')}</p>
                    </div>
                    <input 
                      id="photo-upload" 
                      type="file" 
                      className="hidden" 
                      multiple 
                      accept="image/*"
                      onChange={handlePhotoUpload}
                    />
                  </label>
                </div>
                
                {/* Preview Uploaded Photos */}
                {previewImages.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {previewImages.map((previewUrl, index) => (
                      <div key={index} className="relative group">
                        <img 
                          src={previewUrl} 
                          alt={`Preview ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg border border-slate-600"
                        />
                        <button
                          onClick={() => removePhoto(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          ×
                        </button>
                        <div className="absolute bottom-1 left-1 right-1 bg-black/50 text-white text-xs p-1 rounded truncate">
                          {uploadedFiles[index]?.name}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {previewImages.length > 0 && (
                  <p className="text-xs text-slate-400">
                    {t('owner.uploadedPhotos')}: {previewImages.length}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Save Buttons - Bottom of Page */}
      <div className="flex flex-col sm:flex-row gap-3 mt-8">
        <button 
          onClick={handleCancel}
          className="btn-ghost flex-1 order-2 sm:order-1"
          disabled={isLoading}
        >
          {t('common.cancel')}
        </button>
        <button 
          onClick={handleUpdateEvent}
          className="btn-primary flex-1 order-1 sm:order-2"
          disabled={isLoading || uploadingImages}
        >
          {uploadingImages ? t('common.uploading') : isLoading ? t('common.saving') : t('common.update')}
        </button>
      </div>

      {/* Event Conflict Dialog */}
      <EventConflictDialog
        isOpen={showConflictDialog}
        onClose={handleConflictClose}
        onProceed={handleConflictProceed}
        onEdit={handleConflictEdit}
        conflictingEvents={conflictingEvents}
      />
    </div>
  )
}
