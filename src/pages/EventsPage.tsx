import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../state/authStore'
import { useLanguage } from '../contexts/LanguageContext'
import { apiService } from '../services/apiService'
import { API_CONFIG } from '../config/api'
import { formatPersianCurrency, formatPersianNumber, toPersianNumbers, toEnglishNumbers, formatPersianTime, formatPersianTimeFriendly, formatTimeSmart, formatCurrency, formatTime, formatNumber, formatDate, formatTime24, formatNumberWithCommas, parseFormattedNumber } from '../utils/persianNumbers'
import { formatEventDate } from '../utils/solarHijriCalendar'
import SolarHijriDatePicker from '../components/SolarHijriDatePicker'
import EventConflictDialog from '../components/EventConflictDialog'
import TimePicker from '../components/TimePicker'
import { getEventStatusColorClass, getEventStatusTextColorClass, shouldShowEventAsCompleted, shouldShowEventAsCancelled, getCorrectEventStatus, isEventCompleted, isEventCancelled, isTicketSalesClosed, isTicketClosingWithin24Hours, triggerEventStatusUpdate } from '../utils/eventStatusUpdater'
import Timer from '../components/Timer'
import type { Event } from '../types/owner'
import { ImageUploadService } from '../services/imageUploadService'
import { getErrorMessage } from '../utils/errorTranslator'

export default function EventsPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { state } = useAuth()
  const { t, isRTL, language } = useLanguage()
  const [showAddForm, setShowAddForm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [events, setEvents] = useState<Event[]>([])
  const [isLoadingEvents, setIsLoadingEvents] = useState(true)
  const [socialHubs, setSocialHubs] = useState<any[]>([])
  const [isLoadingSocialHubs, setIsLoadingSocialHubs] = useState(false)
  const [eventCategories, setEventCategories] = useState<any[]>([])
  const [isLoadingCategories, setIsLoadingCategories] = useState(false)
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
  
  // Filter state
  const [filters, setFilters] = useState({
    category: '',
    venueFilter: '', // Venue ID filter
    statusFilter: 'all' // 'all', 'completed', 'cancelled', 'upcoming'
  })
  const [showFilters, setShowFilters] = useState(false)

  // Conflict detection state
  const [showConflictDialog, setShowConflictDialog] = useState(false)
  const [conflictingEvents, setConflictingEvents] = useState<any[]>([])
  const [pendingEventData, setPendingEventData] = useState<any>(null)
  
  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [eventToDelete, setEventToDelete] = useState<Event | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Photo upload state
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [previewImages, setPreviewImages] = useState<string[]>([])
  const [uploadingImages, setUploadingImages] = useState(false)


  // Helper function to get category name safely
  const getCategoryName = (category: any): string => {
    if (typeof category === 'string') {
      return category;
    }
    if (typeof category === 'object' && category?.name) {
      return category.name;
    }
    return 'General';
  }

  // Helper function to translate category name based on language
  const translateCategoryName = (categoryName: string): string => {
    if (language === 'fa') {
      return categoryName; // Return as-is for Persian
    }
    
    // Translate Persian category names to English
    const categoryTranslations: Record<string, string> = {
      'مافیا': 'Mafia',
      'تماشای فیلم': 'Movie Watching',
      'تماشای ورزش': 'Sports Watching',
      'تماشای مسابقات ورزشی': 'Sports Watching',
      'گیمینگ گروهی': 'Group Gaming',
      'بازی های گروهی': 'Group Gaming',
      'بازی‌های گروهی': 'Group Gaming',
      'بازی های رومیزی': 'Board Games',
      'بازی‌های رومیزی': 'Board Games',
      'موسیقی زنده': 'Live Music',
      'مطالعه کتاب': 'Book Reading',
      'کتابخوانی': 'Book Reading',
      'تظاهر': 'Pretentious',
      'ادایی': 'Pretentious',
      'Gaming': 'Gaming',
      'Sports': 'Sports',
      'Music': 'Music',
      'Study': 'Study',
      'Food': 'Food',
      'Other': 'Other'
    }
    
    return categoryTranslations[categoryName] || categoryName
  }

  // Function to navigate to reservations page
  const handleViewReservations = (eventId: string) => {
    navigate(`/reservations?event_id=${eventId}`)
  }


  // Helper function to determine event time status
  const getEventTimeStatus = (event: Event) => {
    const now = new Date()
    
    // Parse event start time
    let eventStartTime: Date
    let eventEndTime: Date
    
    try {
      // Handle different time formats
      if (event.time.includes(' - ')) {
        const [startTime, endTime] = event.time.split(' - ')
        eventStartTime = new Date(`${event.date}T${startTime.trim()}`)
        eventEndTime = new Date(`${event.date}T${endTime.trim()}`)
      } else if (event.time.includes(':')) {
        // Single time format, assume 2 hours duration
        eventStartTime = new Date(`${event.date}T${event.time.trim()}`)
        eventEndTime = new Date(eventStartTime.getTime() + (2 * 60 * 60 * 1000))
      } else {
        // Fallback: try to parse as is
        eventStartTime = new Date(`${event.date}T${event.time}`)
        eventEndTime = new Date(eventStartTime.getTime() + (2 * 60 * 60 * 1000))
      }
      
      // Check if event has ended (past)
      if (eventEndTime < now) {
        return 'past'
      }
      // Check if event has started (current or future)
      else if (eventStartTime <= now) {
        return 'current'
      }
      // Event hasn't started yet (future)
      else {
        return 'future'
      }
    } catch (error) {
      console.error('Error parsing event time:', error, event)
      // Fallback: treat as future if we can't parse
      return 'future'
    }
  }

  // Filter events based on current filters
  const getFilteredEvents = () => {
    let filteredEvents = [...events]

    // Filter by category
    if (filters.category) {
      const selectedCategory = eventCategories.find(cat => cat.id === filters.category)
      if (selectedCategory) {
        filteredEvents = filteredEvents.filter(event => {
          // Check if event category matches the selected category
          return event.category === selectedCategory.name || 
                 event.category === selectedCategory.id
        })
      }
    }

    // Filter by venue
    if (filters.venueFilter) {
      filteredEvents = filteredEvents.filter(event => {
        return event.venue_id === filters.venueFilter || 
               String(event.venue_id) === String(filters.venueFilter)
      })
    }

    // Filter by status (use backend status directly)
    if (filters.statusFilter !== 'all') {
      filteredEvents = filteredEvents.filter(event => {
        return event.status === filters.statusFilter
      })
    }

    return filteredEvents
  }

  // Get active filters count
  const getActiveFiltersCount = () => {
    let count = 0
    if (filters.category) count++
    if (filters.venueFilter) count++
    if (filters.statusFilter !== 'all') count++
    return count
  }

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      category: '',
      venueFilter: '',
      statusFilter: 'all'
    })
  }
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    date: '',
    time: '',
    duration: '2', // Default duration in hours
    capacity: '',
    price: '',
    minimum_players: '1',
    minimum_seats: '', // Minimum seats (MS) field
    social_hub: '',
    requirements: [] as string[],
    ticket_closing_timer: '', // Ticket closing timer in hours
    images: [] as File[] // Photo uploads
  })

  // Field errors state
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({})

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

  // Fetch کافه‌ها for the current owner
  const fetchSocialHubs = async () => {
    setIsLoadingSocialHubs(true)
    try {
      const ownerId = state.auth.user?.id
      if (ownerId) {
        const responseData = await apiService.getVenues(ownerId)
        const socialHubsData = responseData.results || responseData
        setSocialHubs(socialHubsData)
        console.log('Fetched کافه‌ها:', socialHubsData)
      console.log('Social hubs count:', socialHubsData.length)
      if (socialHubsData.length > 0) {
        console.log('First کافه:', socialHubsData[0])
      }
      }
    } catch (error) {
      console.error('Error fetching کافه‌ها:', error)
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

  // Fetch events from backend
  const fetchEvents = async () => {
    setIsLoadingEvents(true)
    try {
      // Real API call to fetch events for current owner
      const ownerId = state.auth.user?.id
      console.log('Current user ID:', ownerId)
      
      const url = ownerId 
        ? `${API_CONFIG.API_BASE_URL}/events/by_owner/?owner_id=${ownerId}`
        : `${API_CONFIG.API_BASE_URL}/events/`
      
      console.log('Fetching events from:', url)
      
      const responseData = await apiService.getEvents(ownerId)
      console.log('Received data:', responseData)
      
      // Handle paginated response from Django REST Framework
      const eventsData = responseData.results || responseData
      console.log('Events data:', eventsData)
      
      // Convert Event data to Event format for compatibility
      const formattedEvents = eventsData.map((event: any) => ({
          id: event.id,
          name: event.name,
          description: event.description || '',
          date: event.date,
          time: event.start_time || event.time,
          duration: event.duration || 2,
          capacity: event.capacity || 0,
          price: event.price || 0,
          category: getCategoryName(event.category),
          category_id: event.category?.id || event.category,
          minimum_players: event.minimum_players || event.minimum_group_size || event.MS || 0,
          minimum_seats: event.minimum || event.minimum_seats || event.minimum_group_size || event.MS || 0,
          status: event.event_status || 'upcoming',
          venue_id: event.social_hub?.id || event.social_hub || event.venue_id,
          owner_id: event.owner || event.owner_id,
          created_at: event.created_at || new Date().toISOString(),
          updated_at: event.updated_at || new Date().toISOString(),
          images: event.images || [],
          requirements: event.requirements || [],
          // Show number of tickets reserved (people), not number of reservations
          total_bookings: (event.total_reserved_people ?? event.total_bookings ?? 0) || 0,
          // Fallback: compute revenue when API doesn't provide it
          total_revenue: (event.total_revenue ?? ((event.price || 0) * (event.total_reserved_people ?? 0))) || 0,
          rating: event.average_rating || 0,
          total_reviews: event.ratings_count || 0
      }))
      
      setEvents(formattedEvents)
      console.log('Successfully loaded events:', formattedEvents.length)
      console.log('Sample event category:', formattedEvents[0]?.category)
      console.log('Events with ratings:', formattedEvents.filter((e: Event) => e.rating > 0).length)
      console.log('Sample events with ratings:', formattedEvents.filter((e: Event) => e.rating > 0).slice(0, 3))
      console.log('Available categories:', eventCategories)
    } catch (error) {
      console.error('Error fetching events:', error)
      console.log('No events found')
      // Set empty array on error
      setEvents([])
      
      // Show more specific error message
      const translatedError = getErrorMessage(error, language)
      alert(translatedError || t('owner.errorLoadingEvents'))
    } finally {
      setIsLoadingEvents(false)
    }
  }

  // Load events, کافه‌ها, and categories on component mount
  useEffect(() => {
    // Trigger event status updates first
    console.log('Triggering event status update...')
    triggerEventStatusUpdate().then(result => {
      console.log('Status update result:', result)
      if (result.success) {
        console.log('Event statuses updated:', result.output)
        // Refresh events after status update
        fetchEvents()
      } else {
        console.warn('Failed to update event statuses:', result.message)
        // Still fetch events even if status update failed
        fetchEvents()
      }
    }).catch(error => {
      console.error('Error in status update:', error)
      // Still fetch events even if status update failed
      fetchEvents()
    })
    
    fetchSocialHubs()
    fetchEventCategories()
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
    const numericFields = ['capacity', 'price', 'minimum_players', 'minimum_seats', 'ticket_closing_timer']
    let processedValue = numericFields.includes(field) ? toEnglishNumbers(value.replace(/,/g, '')) : value
    
    // For integer-only fields, ensure only integers are accepted
    const integerFields = ['capacity', 'minimum_players', 'minimum_seats']
    if (integerFields.includes(field)) {
      // Remove any non-digit characters
      processedValue = processedValue.replace(/[^\d]/g, '')
      // Ensure it's a valid integer (empty string is allowed for clearing the field)
      if (processedValue && !/^\d+$/.test(processedValue)) {
        return // Don't update if invalid
      }
    }
    
    // For price field, also ensure it's an integer
    if (field === 'price') {
      // Remove any non-digit characters
      processedValue = processedValue.replace(/[^\d]/g, '')
      // Ensure it's a valid integer (empty string is allowed for clearing the field)
      if (processedValue && !/^\d+$/.test(processedValue)) {
        return // Don't update if invalid
      }
    }
    
    // Handle social_hub field specially - keep as string for UUID
    if (field === 'social_hub' && value) {
      // Keep as string for UUID validation
      processedValue = String(value) // Ensure it's a string
      console.log('Social hub UUID:', processedValue)
    }
    
    // Debug time input
    if (field === 'time') {
      console.log('Time input value:', value)
    }
    
    // Debug کافه input
    if (field === 'social_hub') {
      console.log('=== SOCIAL HUB SELECTION DEBUG ===')
      console.log('Social hub input value:', value)
      console.log('Social hub processed value:', processedValue)
      console.log('Social hub type:', typeof processedValue)
      console.log('Available کافه‌ها:', socialHubs)
      console.log('Selected hub details:', socialHubs.find(hub => hub.id == value))
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
    const storedImages = JSON.parse(localStorage.getItem('event_images') || '[]')
    const newStoredImages = [...storedImages, ...validFiles.map(file => ({
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    }))]
    localStorage.setItem('event_images', JSON.stringify(newStoredImages))
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
    const storedImages = JSON.parse(localStorage.getItem('event_images') || '[]')
    const updatedStoredImages = storedImages.filter((_: any, i: number) => i !== index)
    localStorage.setItem('event_images', JSON.stringify(updatedStoredImages))
  }

  // Simple time formatter to "HH:MM"
  const formatTime = (date: Date): string => {
    try {
      return date.toTimeString().slice(0, 5)
    } catch {
      return ''
    }
  }

  // Check for event conflicts
  const checkEventConflicts = async (startTime: string, endTime: string) => {
    try {
      const ownerId = state.auth.user?.id
      if (!ownerId) {
        throw new Error('User not authenticated')
      }
      
      console.log('=== CONFLICT CHECK DEBUG ===')
      console.log('Owner ID:', ownerId)
      console.log('Start time:', startTime)
      console.log('End time:', endTime)
      
      // First, let's check if we have any existing events for this owner
      console.log('=== CHECKING EXISTING EVENTS ===')
      const existingEvents = await apiService.getEvents(ownerId)
      console.log('Existing events for owner:', existingEvents)
      
      const conflicts = await apiService.checkEventConflicts(ownerId, startTime, endTime)
      console.log('Conflict check response:', conflicts)
      console.log('Conflicting events array:', conflicts.conflicting_events)
      
      return conflicts.conflicting_events || []
    } catch (error) {
      console.error('Error checking conflicts:', error)
      console.error('Error details:', error)
      // If conflict check fails, we'll proceed without checking
      return []
    }
  }

  // Handle conflict dialog actions
  const handleConflictProceed = async () => {
    setShowConflictDialog(false)
    if (pendingEventData) {
      await createEvent(pendingEventData)
    }
  }

  const handleConflictEdit = () => {
    setShowConflictDialog(false)
    // Keep the form open for editing
    // Reset loading state so user can try again
    setIsLoading(false)
  }

  const handleConflictClose = () => {
    setShowConflictDialog(false)
    setPendingEventData(null)
    setConflictingEvents([])
    // Reset loading state when user cancels
    setIsLoading(false)
  }

  // Handle delete event
  const handleDeleteEvent = async (event: Event) => {
    // Check if event is completed
    if (isEventCompleted(event)) {
      alert(t('owner.cannotDeleteCompletedEvent'))
      return
    }
    
    // Check if event is cancelled
    if (isEventCancelled(event)) {
      alert(t('owner.cannotDeleteCancelledEvent'))
      return
    }
    
    // Check if tickets have been sold
    if (event.total_bookings > 0) {
      alert(t('owner.cannotDeleteEventWithSoldTickets'))
      return
    }
    
    setEventToDelete(event)
    setShowDeleteConfirm(true)
  }

  const confirmDeleteEvent = async () => {
    if (!eventToDelete) return
    
    setIsDeleting(true)
    try {
      await apiService.deleteEvent(eventToDelete.id)
      
      // Remove the event from the local state
      setEvents(prevEvents => prevEvents.filter(e => e.id !== eventToDelete.id))
      
      // Show success message
      alert(t('owner.eventDeletedSuccessfully'))
      
    } catch (error) {
      console.error('Error deleting event:', error)
      const translatedError = getErrorMessage(error, language)
      alert(translatedError || t('owner.errorDeletingEvent'))
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
      setEventToDelete(null)
    }
  }

  const cancelDeleteEvent = () => {
    setShowDeleteConfirm(false)
    setEventToDelete(null)
  }

  // Create event after conflict check
  const createEvent = async (eventData: any) => {
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

      // Add uploaded image URLs to event data
      const eventDataWithImages = {
        ...eventData,
        images: uploadedImageUrls
      }
      
      const responseData = await apiService.createEvent(eventDataWithImages)
      
      console.log('Created event response:', responseData)
      
      // Convert the created Event to Event format
      const createdEvent: Event = {
        id: responseData.id,
        name: responseData.name,
        description: responseData.description || '',
        date: responseData.date,
        time: responseData.start_time || responseData.time,
        duration: responseData.duration || 2,
        capacity: responseData.capacity || 0,
        price: responseData.price || 0,
        category: responseData.category || 'General',
        minimum_players: responseData.minimum_players || 0,
        minimum_seats: responseData.minimum_seats || 0,
        status: responseData.event_status || 'upcoming',
        venue_id: responseData.social_hub || responseData.venue_id,
        owner_id: responseData.owner || responseData.owner_id,
        created_at: responseData.created_at || new Date().toISOString(),
        updated_at: responseData.updated_at || new Date().toISOString(),
        images: responseData.images || [],
        documents: responseData.documents || [],
        requirements: responseData.requirements || [],
        total_bookings: responseData.total_bookings || 0,
        total_revenue: responseData.total_revenue || 0,
        rating: responseData.rating || 0,
        total_reviews: responseData.total_reviews || 0
      }
      
      // Add the created event from backend to the list
      setEvents(prevEvents => [createdEvent, ...prevEvents])
      
      // Clear uploaded files and localStorage
      setUploadedFiles([])
      setPreviewImages([])
      localStorage.removeItem('event_images')
      
      // Reset form and close modal
      setFormData({
        name: '',
        description: '',
        category: '',
        date: '',
        time: '',
        duration: '2',
        capacity: '',
        price: '',
        minimum_players: '1',
        minimum_seats: '',
        social_hub: '',
        requirements: [],
        ticket_closing_timer: '',
        images: []
      })
      setFieldErrors({})
      setShowAddForm(false)
      
      // Show success message
      alert(t('owner.eventCreatedSuccessfully'))
      
    } catch (error) {
      console.error('Error creating event:', error)
      let errorMessage = getErrorMessage(error, language)
      
      // Check for specific venue deactivated error
      const errorStr = typeof error === 'string' ? error : 
                      (error instanceof Error ? error.message : 
                      (typeof error === 'object' && error?.error ? String(error.error) : ''))
      
      if (errorStr.includes('VENUE_DEACTIVATED_CALL_SUPPORT') || 
          errorMessage.includes('VENUE_DEACTIVATED_CALL_SUPPORT')) {
        errorMessage = t('owner.venueDeactivatedCannotCreateEvent')
      }
      
      alert(errorMessage || t('owner.errorCreatingEvent'))
    } finally {
      setIsLoading(false)
    }
  }

  // Handle form submission
  const handleSaveEvent = async () => {
    // Prevent double-clicking: if already loading, return early
    if (isLoading || uploadingImages) {
      return
    }
    
    // Set loading state immediately to prevent multiple clicks
    setIsLoading(true)
    
    // Debug form data before validation
    console.log('=== FORM SUBMISSION DEBUG ===')
    console.log('Form data:', formData)
    console.log('Social hub value:', formData.social_hub)
    console.log('Social hub type:', typeof formData.social_hub)
    console.log('Social hub truthy:', !!formData.social_hub)
    console.log('Available social hubs:', socialHubs)
    console.log('Social hubs count:', socialHubs.length)
    
    // Validate all required fields and collect missing fields
    const missingFields: string[] = []
    const errors: Record<string, boolean> = {}
    
    if (!formData.name.trim()) {
      missingFields.push(t('owner.eventName'))
      errors.name = true
    }
    if (!formData.description.trim()) {
      missingFields.push(t('owner.eventDescription'))
      errors.description = true
    }
    if (!formData.category.trim()) {
      missingFields.push(t('owner.eventCategory'))
      errors.category = true
    }
    if (!formData.date.trim()) {
      missingFields.push(t('owner.eventDate'))
      errors.date = true
    }
    if (!formData.time.trim()) {
      missingFields.push(t('owner.eventTime'))
      errors.time = true
    }
    if (!formData.duration.trim()) {
      missingFields.push(t('owner.duration'))
      errors.duration = true
    }
    if (!formData.capacity.trim()) {
      missingFields.push(t('owner.eventCapacity'))
      errors.capacity = true
    }
    if (!formData.price.trim()) {
      missingFields.push(t('owner.eventPrice'))
      errors.price = true
    }
    if (!formData.minimum_players.trim()) {
      missingFields.push(t('owner.minimumTeams'))
      errors.minimum_players = true
    }
    if (!formData.minimum_seats.trim()) {
      missingFields.push(t('owner.minimumCapacity'))
      errors.minimum_seats = true
    }
    if (!formData.social_hub) {
      missingFields.push(t('owner.selectVenue'))
      errors.social_hub = true
    }
    if (!formData.ticket_closing_timer.trim()) {
      missingFields.push(t('owner.ticketClosingTimer'))
      errors.ticket_closing_timer = true
    }
    
    if (missingFields.length > 0) {
      setFieldErrors(errors)
      const errorMessage = language === 'fa' 
        ? `لطفا فیلدهای زیر را پر کنید:\n${missingFields.map(field => `• ${field}`).join('\n')}`
        : `Please fill in the following fields:\n${missingFields.map(field => `• ${field}`).join('\n')}`
      alert(errorMessage)
      setIsLoading(false)
      return
    }
    
    // Clear any previous errors
    setFieldErrors({})

    // Validate category selection
    if (!formData.category.trim()) {
      alert(t('owner.selectCategoryForEvent'))
      setIsLoading(false)
      return
    }
    
    // Validate social hub selection
    if (!formData.social_hub) {
      alert(t('owner.pleaseSelectVenue') || 'Please select a venue for the event')
      setIsLoading(false)
      return
    }
    
    // Additional validation: check if selected social hub exists
    const selectedHub = socialHubs.find(hub => hub.id == formData.social_hub)
    if (!selectedHub) {
      alert(t('owner.selectedVenueInvalid') || 'Selected venue is not valid. Please select a different venue.')
      setIsLoading(false)
      return
    }
    
    console.log('Selected social hub details:', selectedHub)

    try {
      // Real API call to create event
      // Combine date and time for start_time and calculate end_time based on duration
      const startDateTime = `${formData.date.trim()}T${formData.time.trim()}:00`
      
      // Calculate end time by adding duration to start time
      const startTime = new Date(startDateTime)
      const durationHours = parseInt(formData.duration.trim())
      
      // Ensure we have a valid duration
      if (isNaN(durationHours) || durationHours <= 0) {
        alert(t('owner.pleaseSelectValidDuration') || 'Please select a valid duration')
        setIsLoading(false)
        return
      }
      
      // Validate that the start time is not in the past
      const now = new Date()
      if (startTime < now) {
        alert(t('owner.eventStartTimeCannotBePast') || 'Event start time cannot be in the past. Please select a future date and time.')
        setIsLoading(false)
        return
      }
      
      const endTime = new Date(startTime.getTime() + (durationHours * 60 * 60 * 1000))
      
      // Double check that end time is after start time
      if (endTime <= startTime) {
        alert(t('owner.endTimeMustBeAfterStartTime') || 'End time must be after start time. Please check your duration selection.')
        setIsLoading(false)
        return
      }
      
      // Format times properly for the API - use ISO string format with explicit timezone
      const startDateTimeFormatted = startTime.toISOString()
      const endDateTimeFormatted = endTime.toISOString()
      
      console.log('Time calculation debug:', {
        startDateTime,
        startDateTimeFormatted,
        endDateTimeFormatted,
        durationHours,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        timeDifference: endTime.getTime() - startTime.getTime(),
        hoursDifference: (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60),
        isValid: endTime > startTime
      })
      
      // Use the selected category ID directly
      const selectedCategory = eventCategories.find(cat => cat.id === formData.category.trim())
      if (!selectedCategory) {
        alert(t('owner.pleaseSelectValidCategory') || 'Please select a valid category')
        setIsLoading(false)
        return
      }
      
      // Create event data object for JSON API call
      const eventData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        category: formData.category.trim(), // Use the actual category ID
        date: formData.date.trim(),
        start_time: startDateTimeFormatted,
        end_time: endDateTimeFormatted,
        time: `${formData.time.trim()} - ${formatTime(endTime)}`, // Time range as string
        capacity: parseInt(formData.capacity.trim()),
        price: parseFloat(formData.price.trim()),
        minimum: parseInt(formData.minimum_seats.trim()), // Use minimum_seats for MS field
        minimum_group_size: parseInt(formData.minimum_players.trim()), // Use minimum_players for minimum group size
        social_hub: formData.social_hub, // Selected social hub from dropdown (keep as string for UUID)
        ticket_closing_timer: parseInt(formData.ticket_closing_timer.trim()), // Ticket closing timer in hours
        requirements: formData.requirements, // Include requirements
        event_status: 'upcoming'
        // owner ID will be automatically added from JWT token
      }
      
      console.log('Event data being sent:', eventData)
      console.log('Social hub ID type:', typeof eventData.social_hub)
      console.log('Social hub ID value:', eventData.social_hub)
      
      // Check for conflicts before creating the event
      console.log('=== CHECKING FOR CONFLICTS ===')
      const conflicts = await checkEventConflicts(startDateTimeFormatted, endDateTimeFormatted)
      console.log('Conflicts found:', conflicts)
      console.log('Conflicts length:', conflicts.length)
      
      if (conflicts.length > 0) {
        console.log('=== SHOWING CONFLICT DIALOG ===')
        // Show conflict dialog
        setConflictingEvents(conflicts)
        setPendingEventData(eventData)
        setShowConflictDialog(true)
        console.log('Conflict dialog state set to true')
        // Don't reset isLoading here - it will be reset when user proceeds or cancels
        return
      }
      
      console.log('=== NO CONFLICTS, PROCEEDING WITH CREATION ===')
      // No conflicts, proceed with creation
      // Note: createEvent will handle setIsLoading(false) in its finally block
      await createEvent(eventData)
      
    } catch (error) {
      console.error('Error in event creation process:', error)
      const translatedError = getErrorMessage(error, language)
      alert(translatedError || t('owner.errorCreatingEvent'))
      // Reset loading state on error
      setIsLoading(false)
    }
  }

  // Handle form reset
  const handleCancel = () => {
    setFormData({
      name: '',
      description: '',
      category: '',
      date: '',
      time: '',
      duration: '2',
      capacity: '',
      price: '',
      minimum_players: '1',
      minimum_seats: '',
      social_hub: '',
      requirements: [],
      ticket_closing_timer: '',
      images: []
    })
    setFieldErrors({})
    // Clear uploaded files and localStorage
    setUploadedFiles([])
    setPreviewImages([])
    localStorage.removeItem('event_images')
    setShowAddForm(false)
  }


  return (
    <div className={`container-responsive p-responsive space-responsive ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-responsive-xl font-bold">{t('owner.myEvents')}</h1>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <button 
            onClick={fetchEvents}
            disabled={isLoadingEvents}
            className="btn-ghost hover-scale text-sm sm:text-base"
            title={t('common.refresh')}
          >
            {isLoadingEvents ? '⟳' : '↻'}
          </button>
          <button 
            onClick={() => setShowAddForm(true)}
            className="btn-primary hover-scale text-sm sm:text-base flex-1 sm:flex-none"
          >
            {t('owner.addEvent')}
          </button>
        </div>
      </div>

      {/* Filters Section */}
      <div className="glass-card p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-responsive-lg font-semibold flex items-center gap-2">
            <span className="text-yellow-400">🔍</span>
            {t('owner.filters')}
            {getActiveFiltersCount() > 0 && (
              <span className="chip bg-purple-500/20 text-purple-400 text-xs">
                {getActiveFiltersCount()}
              </span>
            )}
          </h2>
          <div className="flex gap-2">
            {getActiveFiltersCount() > 0 && (
              <button 
                onClick={clearFilters}
                className="btn-ghost text-xs hover-scale"
              >
                {t('owner.clearFilters')}
              </button>
            )}
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className="btn-ghost text-xs hover-scale"
            >
              {showFilters ? t('common.hide') : t('common.show')} {t('owner.filters')}
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Category Filter */}
            <div>
              <label className="text-responsive-sm font-medium text-slate-300 mb-2 block">
                {t('owner.filterByCategory')}
              </label>
              <select 
                className="input-field w-full"
                value={filters.category}
                onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
              >
                <option value="">{t('owner.allCategories')}</option>
                {eventCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {translateCategoryName(category.name)}
                  </option>
                ))}
              </select>
            </div>

            {/* Venue Filter */}
            <div>
              <label className="text-responsive-sm font-medium text-slate-300 mb-2 block">
                {t('owner.filterByVenue')}
              </label>
              <select 
                className="input-field w-full"
                value={filters.venueFilter}
                onChange={(e) => setFilters(prev => ({ ...prev, venueFilter: e.target.value }))}
                disabled={isLoadingSocialHubs}
              >
                <option value="">{t('owner.allVenues')}</option>
                {socialHubs.map((hub) => (
                  <option key={hub.id} value={hub.id}>
                    {hub.name} - {hub.address}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="text-responsive-sm font-medium text-slate-300 mb-2 block">
                {t('owner.filterByStatus')}
              </label>
              <select 
                className="input-field w-full"
                value={filters.statusFilter}
                onChange={(e) => setFilters(prev => ({ ...prev, statusFilter: e.target.value }))}
              >
                <option value="all">{t('owner.allEvents')}</option>
                <option value="upcoming">{t('owner.upcomingEvents')}</option>
                <option value="completed">{t('owner.completedEvents')}</option>
                <option value="cancelled">{t('owner.cancelledEvents')}</option>
              </select>
            </div>
          </div>
        )}

        {/* Active Filters Display */}
        {getActiveFiltersCount() > 0 && (
          <div className="flex flex-wrap gap-2">
            <span className="text-responsive-xs text-slate-400">{t('owner.activeFilters')}:</span>
            {filters.category && (
              <span className="chip bg-blue-500/20 text-blue-400 text-xs">
                {eventCategories.find(cat => cat.id === filters.category)?.name ? translateCategoryName(eventCategories.find(cat => cat.id === filters.category)!.name) : filters.category}
              </span>
            )}
            {filters.venueFilter && (
              <span className="chip bg-green-500/20 text-green-400 text-xs">
                {socialHubs.find(hub => hub.id === filters.venueFilter)?.name || filters.venueFilter}
              </span>
            )}
            {filters.statusFilter !== 'all' && (
              <span className="chip bg-purple-500/20 text-purple-400 text-xs">
                {filters.statusFilter === 'completed' ? t('owner.completedEvents') :
                 filters.statusFilter === 'cancelled' ? t('owner.cancelledEvents') :
                 filters.statusFilter === 'upcoming' ? t('owner.upcomingEvents') : ''}
              </span>
            )}
          </div>
        )}

      </div>

      {/* Events List */}
      <div className="space-y-4">
        {isLoadingEvents ? (
          <div className="glass-card p-6 text-center">
            <div className="text-slate-400">{t('common.loading')}...</div>
          </div>
        ) : getFilteredEvents().length === 0 ? (
          <div className="glass-card p-6 text-center">
            <div className="text-slate-400">
              {getActiveFiltersCount() > 0 ? t('owner.noEventsMatchFilters') : t('owner.noEventsFound')}
            </div>
            {getActiveFiltersCount() > 0 ? (
              <button 
                onClick={clearFilters}
                className="btn-primary mt-4"
              >
                {t('owner.clearFilters')}
              </button>
            ) : (
              <button 
                onClick={() => setShowAddForm(true)}
                className="btn-primary mt-4"
              >
                {t('owner.addYourFirstEvent')}
              </button>
            )}
          </div>
        ) : (
          getFilteredEvents().map((event) => {
            // Use centralized event status logic
            const correctStatus = getCorrectEventStatus(event)
            const isCompleted = isEventCompleted(event)
            const isCancelled = isEventCancelled(event)
            const statusColorClass = getEventStatusColorClass(event)
            const statusTextColorClass = getEventStatusTextColorClass(event)
            const showTimer = !isTicketSalesClosed(event) && isTicketClosingWithin24Hours(event)
            
            return (
            <div key={event.id} className={`glass-card p-3 sm:p-4 space-y-3 border-2 ${statusColorClass}`}>
              {/* Status Indicator Banner */}
              {(isCompleted || isCancelled) && (
                <div className={`p-2 rounded-lg text-center font-semibold text-sm ${
                  isCompleted ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 
                  'bg-red-500/20 text-red-400 border border-red-500/30'
                }`}>
                  {isCompleted ? `✅ ${t('owner.eventCompleted')}` : `❌ ${t('owner.eventCancelled')}`}
                </div>
              )}
              
              {/* Timer for ticket closing (24 hours before) */}
              {showTimer && (
                <div className="p-2 rounded-lg bg-orange-500/20 border border-orange-500/30">
                  <Timer event={event} />
                </div>
              )}
              
              {/* Header Section */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="text-sm sm:text-base font-semibold text-white break-words leading-tight">{String(event.name || '')}</h3>
                    <span className={`chip text-xs whitespace-nowrap flex-shrink-0 ${
                      correctStatus === 'upcoming' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 
                      correctStatus === 'ongoing' ? 'bg-green-500/20 text-green-400 border-green-500/30' : 
                      correctStatus === 'completed' ? 'bg-green-500/20 text-green-400 border-green-500/30' : 
                      'bg-red-500/20 text-red-400 border-red-500/30'
                    }`}>
                      {t(`owner.${String(correctStatus || 'upcoming')}`)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 break-words leading-relaxed line-clamp-1">{String(event.description || '')}</p>
                </div>
              </div>

            {/* Event Details Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {/* Date & Time */}
              <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/20 border border-blue-500/20 rounded-lg p-2">
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-blue-400 text-xs">📅</span>
                  <span className="text-blue-400 text-xs font-medium">{t('common.date')}</span>
                </div>
                <div className="text-xs font-semibold text-white mb-0.5">{formatDate(event.date || '', language)}</div>
                <div className="text-xs text-blue-300">
                  {event.time ? (() => {
                    // Extract time from ISO datetime string if present (start_time from backend)
                    let timeToFormat = event.time;
                    if (timeToFormat.includes('T')) {
                      // It's an ISO datetime string, extract just the time part
                      try {
                        const date = new Date(timeToFormat);
                        if (!isNaN(date.getTime())) {
                          const hours = date.getHours().toString().padStart(2, '0');
                          const minutes = date.getMinutes().toString().padStart(2, '0');
                          timeToFormat = `${hours}:${minutes}`;
                        }
                      } catch (e) {
                        // If parsing fails, try to extract time from string directly
                        const timeMatch = timeToFormat.match(/T(\d{2}):(\d{2})/);
                        if (timeMatch) {
                          timeToFormat = `${timeMatch[1]}:${timeMatch[2]}`;
                        }
                      }
                    }
                    // Handle time ranges (e.g., "14:00 - 16:00") - extract just start time
                    if (timeToFormat.includes(' - ')) {
                      timeToFormat = timeToFormat.split(' - ')[0].trim();
                    }
                    return formatTime24(timeToFormat, language);
                  })() : ''}
                </div>
              </div>

              {/* Capacity */}
              <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/20 border border-purple-500/20 rounded-lg p-2">
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-purple-400 text-xs">👥</span>
                  <span className="text-purple-400 text-xs font-medium">{t('common.capacity')}</span>
                </div>
                <div className="text-xs font-semibold text-white mb-0.5">{formatNumber(event.capacity || 0, language)}</div>
                <div className="text-xs text-purple-300">{formatNumber(event.minimum_seats || 0, language)} {t('owner.minPlayers')}</div>
              </div>

              {/* Price */}
              <div className="bg-gradient-to-br from-green-500/10 to-green-600/20 border border-green-500/20 rounded-lg p-2">
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-green-400 text-xs">💰</span>
                  <span className="text-green-400 text-xs font-medium">{t('common.price')}</span>
                </div>
                <div className="text-xs font-semibold text-white">{formatCurrency(event.price || 0, language, t('common.currency'))}</div>
              </div>

              {/* Category */}
              <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/20 border border-orange-500/20 rounded-lg p-2">
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-orange-400 text-xs">🎯</span>
                  <span className="text-orange-400 text-xs font-medium">{t('common.category')}</span>
                </div>
                <div className="text-xs font-semibold text-white">{translateCategoryName(getCategoryName(event.category))}</div>
              </div>
            </div>
            
            {/* Statistics Section */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 border border-purple-500/30 rounded-lg p-2 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <span className="text-purple-400 text-xs">📊</span>
                  <span className="text-purple-400 text-xs font-medium">{t('owner.totalReservations')}</span>
                </div>
                <div className="text-sm font-bold text-purple-300">{formatNumber(event.total_bookings || 0, language)}</div>
              </div>
              <div className="bg-gradient-to-br from-green-600/20 to-green-800/20 border border-green-500/30 rounded-lg p-2 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <span className="text-green-400 text-xs">💵</span>
                  <span className="text-green-400 text-xs font-medium">{t('owner.totalEarnings')}</span>
                </div>
                <div className="text-sm font-bold text-green-400">{formatCurrency(event.total_revenue || 0, language, t('common.currency'))}</div>
              </div>
              <div className="bg-gradient-to-br from-yellow-600/20 to-yellow-800/20 border border-yellow-500/30 rounded-lg p-2 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <span className="text-yellow-400 text-xs">⭐</span>
                  <span className="text-yellow-400 text-xs font-medium">{t('owner.averageRating')}</span>
                </div>
                <div className="text-sm font-bold text-yellow-400">
                  {event.rating && event.rating > 0 ? formatNumber(event.rating, language, 1) : '—'}
                </div>
              </div>
            </div>

            {/* Ticket Closing Status */}
            {event.ticket_closing_timer && (
              <div className={`p-2 rounded-lg text-center text-sm ${
                isCancelled ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                isCompleted ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                'bg-blue-500/10 text-blue-400 border border-blue-500/20'
              }`}>
                <div className="flex items-center justify-center gap-2">
                  <span>🎫</span>
                  <span>
                    {isCancelled ? t('owner.ticketSalesClosed') :
                     isCompleted ? t('owner.ticketSalesClosedSuccess') :
                     `${t('owner.ticketSalesWillClose')} ${formatNumber(event.ticket_closing_timer || 0, language)} ${language === 'fa' ? 'ساعت' : 'hours'}`}
                  </span>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-700/50">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>🕒 {formatDate(event.created_at || '', language)}</span>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handleViewReservations(event.id)}
                  className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1"
                >
                  <span>👁️</span>
                  {t('owner.viewDetails')}
                </button>
                <button 
                  onClick={() => handleDeleteEvent(event)}
                  className={`btn-danger text-xs px-3 py-1.5 flex items-center gap-1 ${
                    (isDeleting || event.total_bookings > 0 || isCompleted || isCancelled) 
                      ? 'bg-red-800/60 hover:bg-red-800/60 cursor-not-allowed opacity-60 hover:scale-100 hover:shadow-lg' 
                      : ''
                  }`}
                  disabled={isDeleting || (event.total_bookings > 0) || isCompleted || isCancelled}
                  title={
                    isCompleted ? t('owner.cannotDeleteCompletedEvent') :
                    isCancelled ? t('owner.cannotDeleteCancelledEvent') :
                    event.total_bookings > 0 ? t('owner.cannotDeleteEventWithSoldTickets') : ''
                  }
                >
                  <span>🗑️</span>
                  {t('common.delete')}
                </button>
              </div>
            </div>
            </div>
            )
          })
        )}
      </div>

      {/* Add Event Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
          <div className="glass-card p-4 sm:p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-4 animate-scale-in my-4">
            <div className="flex items-center justify-between">
              <h2 className="text-responsive-lg font-bold">{t('owner.addNewEvent')}</h2>
              <button 
                onClick={() => setShowAddForm(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Category Selection - Moved to top and made prominent */}
              <div className={`bg-slate-800/50 p-4 rounded-lg border ${fieldErrors.category ? 'border-red-500' : 'border-slate-700'}`}>
                <label htmlFor="event-category" className="text-responsive-sm font-medium text-slate-300 flex items-center gap-2">
                  <span className="text-yellow-400">⭐</span>
                  {t('owner.eventCategory')} <span className="text-red-400">*</span>
                </label>
                <select 
                  id="event-category"
                  className={`input-field w-full mt-2 text-lg ${fieldErrors.category ? 'border-red-500 border-2' : ''}`}
                  value={formData.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  disabled={isLoadingCategories}
                >
                  <option value="">{isLoadingCategories ? t('common.loading') : t('owner.selectCategory')}</option>
                  {eventCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {translateCategoryName(category.name)}
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
                <label htmlFor="event-name" className="text-responsive-sm font-medium text-slate-300">{t('owner.eventName')} <span className="text-red-400">*</span></label>
                <input 
                  id="event-name"
                  type="text" 
                  className={`input-field w-full mt-1 ${fieldErrors.name ? 'border-red-500 border-2' : ''}`}
                  placeholder={t('owner.eventName')}
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  required
                />
              </div>
              
              <div>
                <label htmlFor="event-description" className="text-responsive-sm font-medium text-slate-300">{t('owner.eventDescription')} <span className="text-red-400">*</span></label>
                <textarea 
                  id="event-description"
                  className={`input-field w-full mt-1 h-20 resize-none ${fieldErrors.description ? 'border-red-500 border-2' : ''}`}
                  placeholder={t('owner.eventDescription')}
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  required
                />
              </div>
              
              <div>
                <label htmlFor="event-social-hub" className="text-responsive-sm font-medium text-slate-300">{t('owner.selectVenue')} <span className="text-red-400">*</span></label>
                <select 
                  id="event-social-hub"
                  className={`input-field w-full mt-1 ${fieldErrors.social_hub ? 'border-red-500 border-2' : ''}`}
                  value={formData.social_hub}
                  onChange={(e) => {
                    console.log('Social hub dropdown changed:', e.target.value)
                    handleInputChange('social_hub', e.target.value)
                  }}
                  disabled={isLoadingSocialHubs}
                  required
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
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="event-date" className="text-responsive-sm font-medium text-slate-300">{t('owner.eventDate')} <span className="text-red-400">*</span></label>
                  <div className={fieldErrors.date ? 'border-2 border-red-500 rounded-lg' : ''}>
                    <SolarHijriDatePicker
                      value={formData.date}
                      onChange={(value) => handleInputChange('date', value)}
                      min={new Date().toISOString().split('T')[0]}
                      max={(() => {
                        const maxDate = new Date()
                        maxDate.setMonth(maxDate.getMonth() + 3)
                        return maxDate.toISOString().split('T')[0]
                      })()}
                      required
                      language={language}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-responsive-sm font-medium text-slate-300">{t('owner.eventTime')} <span className="text-red-400">*</span></label>
                  <div className={fieldErrors.time ? 'border-2 border-red-500 rounded-lg' : ''}>
                    <TimePicker
                      value={formData.time}
                      onChange={(value) => {
                        console.log('Time input changed:', value)
                        handleInputChange('time', value)
                      }}
                      required
                      language={language}
                    />
                  </div>
                </div>
                <div className="sm:col-span-2 lg:col-span-1">
                  <label htmlFor="event-duration" className="text-responsive-sm font-medium text-slate-300">{t('owner.duration')} {language === 'fa' ? '(ساعت)' : '(hours)'} <span className="text-red-400">*</span></label>
                  <select 
                    id="event-duration"
                    className={`input-field w-full mt-1 ${fieldErrors.duration ? 'border-red-500 border-2' : ''}`}
                    value={formData.duration}
                    onChange={(e) => handleInputChange('duration', e.target.value)}
                    required
                  >
                    <option value="1">{language === 'fa' ? '۱ ساعت' : '1 hour'}</option>
                    <option value="2">{language === 'fa' ? '۲ ساعت' : '2 hours'}</option>
                    <option value="3">{language === 'fa' ? '۳ ساعت' : '3 hours'}</option>
                    <option value="4">{language === 'fa' ? '۴ ساعت' : '4 hours'}</option>
                    <option value="6">{language === 'fa' ? '۶ ساعت' : '6 hours'}</option>
                    <option value="8">{language === 'fa' ? '۸ ساعت' : '8 hours'}</option>
                    <option value="12">{language === 'fa' ? '۱۲ ساعت' : '12 hours'}</option>
                    <option value="24">{language === 'fa' ? '۲۴ ساعت' : '24 hours'}</option>
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
                          
                          const endTimeString = language === 'fa' ? formatPersianTime(endTime.toTimeString().slice(0, 5)) : formatTime24(endTime.toTimeString().slice(0, 5), language)
                          
                          // Check for validation issues
                          if (startTime < now) {
                            return <span className="text-red-400">⚠️ {t('owner.startTimeInPast')}</span>
                          } else if (endTime <= startTime) {
                            return <span className="text-red-400">⚠️ {t('owner.invalidTimeCalculation')}</span>
                          } else {
                            return <span className="text-green-400">✓ {language === 'fa' ? `رویداد در ساعت ${endTimeString} به پایان می‌رسد` : `${t('owner.eventEndsAt')} ${endTimeString}`}</span>
                          }
                        } catch (e) {
                          return <span className="text-red-400">⚠️ {t('owner.invalidTimeFormat')}</span>
                        }
                      })()}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="event-capacity" className="text-responsive-sm font-medium text-slate-300">{t('owner.eventCapacity')} <span className="text-red-400">*</span></label>
                  <input 
                    id="event-capacity"
                    type="text" 
                    className={`input-field w-full mt-1 ${fieldErrors.capacity ? 'border-red-500 border-2' : ''}`}
                    placeholder={language === 'fa' ? '۵۰' : '50'}
                    value={language === 'fa' ? toPersianNumbers(formData.capacity) : formData.capacity}
                    onChange={(e) => {
                      const value = e.target.value
                      // Convert Persian numbers to English and validate
                      const englishValue = toEnglishNumbers(value.replace(/,/g, ''))
                      // Only allow positive integers
                      if (englishValue === '' || /^\d+$/.test(englishValue)) {
                        handleInputChange('capacity', englishValue)
                      }
                    }}
                    onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => {
                      // Allow English digits, Persian digits, and control keys
                      const persianDigits = /[\u06F0-\u06F9]/
                      if (!/[0-9]/.test(e.key) && !persianDigits.test(e.key) && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Tab') {
                        e.preventDefault()
                      }
                    }}
                    dir="ltr"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="event-price" className="text-responsive-sm font-medium text-slate-300">{t('owner.eventPrice')} <span className="text-red-400">*</span></label>
                  <div className="relative mt-1">
                    <input 
                      id="event-price"
                      type="text" 
                      className={`input-field w-full pr-16 ${fieldErrors.price ? 'border-red-500 border-2' : ''}`}
                      value={language === 'fa' ? toPersianNumbers(formatNumberWithCommas(formData.price)) : formatNumberWithCommas(formData.price)}
                      onChange={(e) => {
                        const value = e.target.value
                        // Convert Persian numbers to English and validate
                        const englishValue = toEnglishNumbers(value.replace(/,/g, ''))
                        // Only allow positive integers
                        if (englishValue === '' || /^\d+$/.test(englishValue)) {
                          handleInputChange('price', englishValue)
                        }
                      }}
                      onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => {
                        // Allow English digits, Persian digits, and control keys
                        const persianDigits = /[\u06F0-\u06F9]/
                        if (!/[0-9]/.test(e.key) && !persianDigits.test(e.key) && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Tab') {
                          e.preventDefault()
                        }
                      }}
                      dir="ltr"
                      required
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 text-sm pointer-events-none">
                      تومان
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="event-minimum-players" className="text-responsive-sm font-medium text-slate-300">{t('owner.minimumTeams')} <span className="text-red-400">*</span></label>
                  <input 
                    id="event-minimum-players"
                    type="text" 
                    className={`input-field w-full mt-1 ${fieldErrors.minimum_players ? 'border-red-500 border-2' : ''}`}
                    placeholder={language === 'fa' ? '۱' : '1'}
                    value={language === 'fa' ? toPersianNumbers(formData.minimum_players) : formData.minimum_players}
                    onChange={(e) => {
                      const value = e.target.value
                      // Convert Persian numbers to English and validate
                      const englishValue = toEnglishNumbers(value.replace(/,/g, ''))
                      // Only allow positive integers
                      if (englishValue === '' || /^\d+$/.test(englishValue)) {
                        handleInputChange('minimum_players', englishValue)
                      }
                    }}
                    onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => {
                      // Allow English digits, Persian digits, and control keys
                      const persianDigits = /[\u06F0-\u06F9]/
                      if (!/[0-9]/.test(e.key) && !persianDigits.test(e.key) && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Tab') {
                        e.preventDefault()
                      }
                    }}
                    dir="ltr"
                    required
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    {language === 'fa' 
                      ? 'حداقل تعداد خرید بلیط توسط کاربر کمتر از این تعداد کاربر مجاز به خرید بلیط نمیباشد'
                      : 'Minimum number of ticket purchases by user - if less than this number, the user is not allowed to purchase tickets'}
                  </p>
                </div>
                <div>
                  <label htmlFor="event-minimum-seats" className="text-responsive-sm font-medium text-slate-300">{t('owner.minimumCapacity')} <span className="text-red-400">*</span></label>
                  <input 
                    id="event-minimum-seats"
                    type="text" 
                    className={`input-field w-full mt-1 ${fieldErrors.minimum_seats ? 'border-red-500 border-2' : ''}`}
                    placeholder={language === 'fa' ? '۱۰' : '10'}
                    value={language === 'fa' ? toPersianNumbers(formData.minimum_seats) : formData.minimum_seats}
                    onChange={(e) => {
                      const value = e.target.value
                      // Convert Persian numbers to English and validate
                      const englishValue = toEnglishNumbers(value.replace(/,/g, ''))
                      // Only allow positive integers
                      if (englishValue === '' || /^\d+$/.test(englishValue)) {
                        handleInputChange('minimum_seats', englishValue)
                      }
                    }}
                    onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => {
                      // Allow English digits, Persian digits, and control keys
                      const persianDigits = /[\u06F0-\u06F9]/
                      if (!/[0-9]/.test(e.key) && !persianDigits.test(e.key) && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Tab') {
                        e.preventDefault()
                      }
                    }}
                    dir="ltr"
                    required
                  />
                  <p className="text-xs text-slate-400 mt-1">{t('owner.minimumSeatsDescription')}</p>
                </div>
              </div>

              {/* Ticket Closing Timer */}
              <div className={`bg-slate-800/50 p-4 rounded-lg border ${fieldErrors.ticket_closing_timer ? 'border-red-500' : 'border-slate-700'}`}>
                <label htmlFor="event-ticket-closing-timer" className="text-responsive-sm font-medium text-slate-300 flex items-center gap-2 mb-3">
                  <span className="text-yellow-400">⏰</span>
                  {t('owner.ticketClosingTimer')} <span className="text-red-400">*</span>
                </label>
                <select 
                  id="event-ticket-closing-timer"
                  className={`input-field w-full ${fieldErrors.ticket_closing_timer ? 'border-red-500 border-2' : ''}`}
                  value={formData.ticket_closing_timer}
                  onChange={(e) => handleInputChange('ticket_closing_timer', e.target.value)}
                  required
                >
                  <option value="">{t('owner.selectClosingTime')}</option>
                  <option value="2">{language === 'fa' ? '۲ ساعت قبل از شروع' : '2 hours before start'}</option>
                  <option value="4">{language === 'fa' ? '۴ ساعت قبل از شروع' : '4 hours before start'}</option>
                  <option value="8">{language === 'fa' ? '۸ ساعت قبل از شروع' : '8 hours before start'}</option>
                  <option value="12">{language === 'fa' ? '۱۲ ساعت قبل از شروع' : '12 hours before start'}</option>
                  <option value="24">{language === 'fa' ? '۲۴ ساعت قبل از شروع' : '24 hours before start'}</option>
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
            
            <div className="flex flex-col sm:flex-row gap-3">
              <button 
                onClick={handleCancel}
                className="btn-ghost flex-1 order-2 sm:order-1"
                disabled={isLoading}
              >
                {t('common.cancel')}
              </button>
              <button 
                onClick={handleSaveEvent}
                className="btn-primary flex-1 order-1 sm:order-2"
                disabled={isLoading || uploadingImages}
              >
                {uploadingImages ? t('common.uploading') : isLoading ? t('common.saving') : t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Event Conflict Dialog */}
      <EventConflictDialog
        isOpen={showConflictDialog}
        onClose={handleConflictClose}
        onProceed={handleConflictProceed}
        onEdit={handleConflictEdit}
        conflictingEvents={conflictingEvents}
      />

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="glass-card p-6 max-w-md w-full space-y-4 animate-scale-in">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-red-400 text-2xl">⚠️</span>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">
                {t('owner.deleteEvent')}
              </h3>
              <p className="text-slate-400 text-sm">
                {t('owner.deleteEventConfirmation')}
              </p>
              {eventToDelete && (
                <div className="mt-3 p-3 bg-slate-800/50 rounded-lg">
                  <p className="text-white font-medium">{eventToDelete.name}</p>
                  <p className="text-slate-400 text-xs mt-1">
                    {(() => {
                      let formattedDate = ''
                      if (eventToDelete.date) {
                        formattedDate = formatDate(eventToDelete.date, language, {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })
                      }
                      let formattedTime = ''
                      if (eventToDelete.time) {
                        if (eventToDelete.time.includes('T') || eventToDelete.time.includes('Z')) {
                          const timeDate = new Date(eventToDelete.time)
                          formattedTime = formatTime24(timeDate.toTimeString().slice(0, 5), language)
                        } else if (eventToDelete.time.includes(' - ')) {
                          const [startTime, endTime] = eventToDelete.time.split(' - ')
                          const formattedStart = formatTime24(startTime.trim(), language)
                          const formattedEnd = formatTime24(endTime.trim(), language)
                          formattedTime = `${formattedStart} - ${formattedEnd}`
                        } else {
                          formattedTime = formatTime24(eventToDelete.time, language)
                        }
                      }
                      return formattedDate && formattedTime
                        ? `${formattedDate} - ${formattedTime}`
                        : formattedDate || formattedTime || `${eventToDelete.date} - ${eventToDelete.time}`
                    })()}
                  </p>
                </div>
              )}
            </div>
            
            <div className="flex gap-3">
              <button 
                onClick={cancelDeleteEvent}
                className="btn-ghost flex-1"
                disabled={isDeleting}
              >
                {t('common.cancel')}
              </button>
              <button 
                onClick={confirmDeleteEvent}
                className="btn-danger flex-1"
                disabled={isDeleting}
              >
                {isDeleting ? t('common.deleting') : t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
