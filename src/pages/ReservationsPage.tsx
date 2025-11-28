import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../state/authStore'
import { useLanguage } from '../contexts/LanguageContext'
import { apiService } from '../services/apiService'
import { formatNumber, formatDate, formatTime24 } from '../utils/persianNumbers'
import CartItemCountdown from '../components/CartItemCountdown'
import type { Event } from '../types/owner'

// Use a minimal event shape locally to ensure dropdown works regardless of backend shape
type SimpleEvent = { id: string; name: string }

interface Reservation {
  id: string
  reservation_date: string
  number_of_people: number
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  customer: string
  event: string
  customer_username: string
  event_name: string
  event_date: string
  event_time: string
  venue_name: string
}

export default function ReservationsPage() {
  const [searchParams] = useSearchParams()
  const { state } = useAuth()
  const { t, isRTL, language } = useLanguage()
  
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [allReservations, setAllReservations] = useState<Reservation[]>([]) // Store all reservations for count calculation
  const [cartItems, setCartItems] = useState<any[]>([]) // Store cart items
  const [isLoading, setIsLoading] = useState(true)
  const [events, setEvents] = useState<SimpleEvent[]>([])
  const [selectedEvent, setSelectedEvent] = useState<string>('')
  const [selectedStatus, setSelectedStatus] = useState<string>('')
  const [showFilters, setShowFilters] = useState(false)

  // Fetch cart items for the owner
  const fetchCartItems = async () => {
    try {
      console.log('Fetching cart items for owner:', state.auth.user?.id)
      const responseData = await apiService.getCartItems(state.auth.user?.id)
      console.log('Cart items response:', responseData)
      setCartItems(responseData)
    } catch (error) {
      console.error('Error fetching cart items:', error)
      setCartItems([])
    }
  }

  // Filter cart items for status counts (to avoid counting duplicates)
  const cartItemsForCounts = useMemo(() => {
    if (!allReservations.length) {
      return cartItems
    }
    const pendingReservations = allReservations.filter(r => r.status === 'pending')
    const pendingReservationKeys = new Set<string>()
    pendingReservations.forEach(reservation => {
      const customerId = reservation.customer
      const eventId = reservation.event
      if (customerId && eventId) {
        pendingReservationKeys.add(`${customerId}-${eventId}`)
      }
    })
    return cartItems.filter(item => {
      const cartItemKey = `${item.customer}-${item.event}`
      return !pendingReservationKeys.has(cartItemKey)
    })
  }, [cartItems, allReservations])

  // Derived status counts for quick overview - include cart items in pending count (excluding duplicates)
  const statusCounts = {
    pending: allReservations.filter(r => r.status === 'pending').length + cartItemsForCounts.length,
    confirmed: allReservations.filter(r => r.status === 'confirmed').length,
    cancelled: allReservations.filter(r => r.status === 'cancelled').length,
    completed: allReservations.filter(r => r.status === 'completed').length,
    all: allReservations.length + cartItemsForCounts.length,
  }
  
  // Debug logging
  console.log('Status counts:', statusCounts)
  console.log('All reservations:', allReservations.length)
  console.log('Cart items:', cartItems.length)
  console.log('Cart items data:', cartItems)

  // Fetch events for filter dropdown
  const fetchEvents = async () => {
    try {
      const responseData = await apiService.getEvents(state.auth.user?.id)
      const rawEvents = (responseData && responseData.results) ? responseData.results : responseData
      const normalized: SimpleEvent[] = Array.isArray(rawEvents)
        ? rawEvents.map((e: any) => ({
            id: String(e?.id || e?.uuid || e?.event_id || ''),
            name: String(e?.name || e?.title || '—')
          })).filter((e: SimpleEvent) => !!e.id && !!e.name)
        : []
      setEvents(normalized)
    } catch (error) {
      console.error('Error fetching events:', error)
      setEvents([])
    }
  }

  // Fetch all reservations (unfiltered) for count calculation
  const fetchAllReservations = async () => {
    try {
      const responseData = await apiService.getReservations()
      setAllReservations(responseData)
    } catch (error) {
      console.error('Error fetching all reservations:', error)
      setAllReservations([])
    }
  }

  // Fetch reservations with filters for display
  const fetchReservations = async () => {
    setIsLoading(true)
    try {
      const responseData = await apiService.getReservations(
        selectedEvent || undefined,
        selectedStatus || undefined
      )
      setReservations(responseData)
    } catch (error) {
      console.error('Error fetching reservations:', error)
      setReservations([])
    } finally {
      setIsLoading(false)
    }
  }

  // Load data on component mount
  useEffect(() => {
    console.log('Owner user:', state.auth.user)
    fetchEvents()
    if (state.auth.user?.id) {
      fetchAllReservations()
      fetchCartItems()
    }
  }, [state.auth.user?.id])

  // Handle URL parameters for event filtering
  useEffect(() => {
    const eventId = searchParams.get('event_id')
    const status = searchParams.get('status')
    if (eventId) {
      setSelectedEvent(eventId)
    }
    if (status) {
      setSelectedStatus(status)
    }
  }, [searchParams])

  // Fetch reservations when filters change
  useEffect(() => {
    if (state.auth.user?.id) {
      fetchReservations()
      fetchCartItems() // Also refetch cart items when filters change
    }
  }, [selectedEvent, selectedStatus, state.auth.user?.id])

  // Periodically refetch cart items when viewing pending section to keep countdown accurate
  useEffect(() => {
    if (!state.auth.user?.id || (selectedStatus !== 'pending' && selectedStatus !== '')) {
      return
    }

    // Refetch cart items every 30 seconds to update expired status
    const interval = setInterval(() => {
      fetchCartItems()
    }, 30000) // 30 seconds

    return () => clearInterval(interval)
  }, [state.auth.user?.id, selectedStatus])

  // Filter out duplicate reservations and cart items
  // Cart items are essentially pending reservations, so we should show either cart items OR pending reservations, not both
  const filteredReservations = useMemo(() => {
    // Only filter when we have cart items and are viewing pending or all statuses
    if (!cartItems.length) {
      return reservations
    }

    // Get pending reservations that we need to check for duplicates
    const pendingReservations = reservations.filter(r => r.status === 'pending')
    
    // Create a Set of unique identifiers for pending reservations using UUIDs
    const pendingReservationKeys = new Set<string>()
    pendingReservations.forEach(reservation => {
      const customerId = reservation.customer
      const eventId = reservation.event
      if (customerId && eventId) {
        pendingReservationKeys.add(`${customerId}-${eventId}`)
      }
    })

    // Filter out pending reservations that match cart items
    // If a cart item exists, it means checkout hasn't happened yet, so we show cart item instead of reservation
    const filteredPending = pendingReservations.filter(reservation => {
      const reservationKey = `${reservation.customer}-${reservation.event}`
      // Check if any cart item matches this reservation
      const hasMatchingCartItem = cartItems.some(item => {
        const cartItemKey = `${item.customer}-${item.event}`
        return cartItemKey === reservationKey
      })
      return !hasMatchingCartItem
    })

    // If viewing all statuses, combine filtered pending with non-pending reservations
    if (selectedStatus === '') {
      const nonPendingReservations = reservations.filter(r => r.status !== 'pending')
      return [...filteredPending, ...nonPendingReservations]
    }

    // If viewing pending, return filtered pending reservations
    if (selectedStatus === 'pending') {
      return filteredPending
    }

    // For other statuses, return all reservations as-is
    return reservations
  }, [reservations, cartItems, selectedStatus])

  // Filter cart items to exclude those that have corresponding pending reservations
  // This prevents showing the same item twice (once as cart item, once as reservation)
  const filteredCartItems = useMemo(() => {
    // Only filter when we have reservations
    if (!reservations.length) {
      return cartItems
    }

    // Get pending reservations
    const pendingReservations = reservations.filter(r => r.status === 'pending')
    
    // Create a Set of unique identifiers for pending reservations
    const pendingReservationKeys = new Set<string>()
    pendingReservations.forEach(reservation => {
      const customerId = reservation.customer
      const eventId = reservation.event
      if (customerId && eventId) {
        pendingReservationKeys.add(`${customerId}-${eventId}`)
      }
    })

    // Filter out cart items that have corresponding pending reservations
    return cartItems.filter(item => {
      const cartItemKey = `${item.customer}-${item.event}`
      return !pendingReservationKeys.has(cartItemKey)
    })
  }, [cartItems, reservations])

  // Get status text with translation
  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return t('owner.pendingBookings')
      case 'confirmed':
        return t('owner.confirmedBookings')
      case 'cancelled':
        return t('owner.cancelledBookings')
      case 'completed':
        return t('common.completed')
      default:
        return status
    }
  }

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400'
      case 'confirmed':
        return 'bg-green-500/20 text-green-400'
      case 'cancelled':
        return 'bg-red-500/20 text-red-400'
      case 'completed':
        return 'bg-blue-500/20 text-blue-400'
      default:
        return 'bg-gray-500/20 text-gray-400'
    }
  }

  // Format date - use language-aware formatting
  const formatDateLocal = (dateString: string) => {
    try {
      return formatDate(dateString, language)
    } catch {
      return dateString
    }
  }

  // Format time - use language-aware formatting
  const formatTimeLocal = (timeString: string) => {
    try {
      if (timeString.includes('T') || timeString.includes('Z')) {
        const timeDate = new Date(timeString)
        return formatTime24(timeDate.toTimeString().slice(0, 5), language)
      }
      return formatTime24(timeString, language)
    } catch {
      return timeString
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{t('owner.bookings')}</h1>
          <p className="text-gray-400">
            {t('owner.manageReservationsAndHistory')}
          </p>
        </div>

        {/* Filters */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2">
                {t('owner.eventName')}
              </label>
              <select
                value={selectedEvent}
                onChange={(e) => setSelectedEvent(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">{t('owner.allEvents')}</option>
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2">
                {t('common.status')}
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">{t('owner.allStatuses')}</option>
                <option value="pending">{t('owner.pendingBookings')}</option>
                <option value="confirmed">{t('owner.confirmedBookings')}</option>
                <option value="cancelled">{t('owner.cancelledBookings')}</option>
                <option value="completed">{t('common.completed')}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Status Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          <button
            onClick={() => setSelectedStatus('')}
            className={`p-3 rounded-lg border transition-colors ${selectedStatus === '' ? 'bg-blue-600/20 border-blue-500/40' : 'bg-gray-800 border-gray-700 hover:bg-gray-700/40'}`}
          >
            <div className="text-sm text-gray-300">{t('owner.allStatuses')}</div>
            <div className="text-lg font-semibold">{formatNumber(statusCounts.all, language)}</div>
          </button>
          <button
            onClick={() => setSelectedStatus('pending')}
            className={`p-3 rounded-lg border transition-colors ${selectedStatus === 'pending' ? 'bg-yellow-600/20 border-yellow-500/40' : 'bg-gray-800 border-gray-700 hover:bg-gray-700/40'}`}
          >
            <div className="text-sm text-yellow-300">{t('owner.pendingBookings')}</div>
            <div className="text-lg font-semibold text-yellow-400">{formatNumber(statusCounts.pending, language)}</div>
          </button>
          <button
            onClick={() => setSelectedStatus('confirmed')}
            className={`p-3 rounded-lg border transition-colors ${selectedStatus === 'confirmed' ? 'bg-green-600/20 border-green-500/40' : 'bg-gray-800 border-gray-700 hover:bg-gray-700/40'}`}
          >
            <div className="text-sm text-green-300">{t('owner.confirmedBookings')}</div>
            <div className="text-lg font-semibold text-green-400">{formatNumber(statusCounts.confirmed, language)}</div>
          </button>
          <button
            onClick={() => setSelectedStatus('cancelled')}
            className={`p-3 rounded-lg border transition-colors ${selectedStatus === 'cancelled' ? 'bg-red-600/20 border-red-500/40' : 'bg-gray-800 border-gray-700 hover:bg-gray-700/40'}`}
          >
            <div className="text-sm text-red-300">{t('owner.cancelledBookings')}</div>
            <div className="text-lg font-semibold text-red-400">{formatNumber(statusCounts.cancelled, language)}</div>
          </button>
          <button
            onClick={() => setSelectedStatus('completed')}
            className={`p-3 rounded-lg border transition-colors ${selectedStatus === 'completed' ? 'bg-blue-600/20 border-blue-500/40' : 'bg-gray-800 border-gray-700 hover:bg-gray-700/40'}`}
          >
            <div className="text-sm text-blue-300">{t('common.completed')}</div>
            <div className="text-lg font-semibold text-blue-400">{formatNumber(statusCounts.completed, language)}</div>
          </button>
        </div>

        {/* Reservations List */}
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : reservations.length === 0 && cartItems.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-lg mb-4">
              {t('owner.noReservationsYet')}
            </div>
            <p className="text-gray-500">
              {t('owner.confirmedReservationsWillAppear')}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Show cart items when viewing pending status or all statuses */}
            {((selectedStatus === 'pending' || selectedStatus === '') && filteredCartItems.length > 0) && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-yellow-400 mb-4">
                  {t('owner.pendingCartItems')} ({formatNumber(filteredCartItems.length, language)})
                </h3>
                <div className="space-y-3">
                  {filteredCartItems.map((cartItem) => (
                    <div
                      key={cartItem.id}
                      className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-semibold text-lg">
                              {cartItem.customer_username}
                            </h4>
                            <span className="px-3 py-1 text-sm rounded-full bg-yellow-500/20 text-yellow-400">
                              {t('owner.cartItem')}
                            </span>
                            {cartItem.is_expired && (
                              <span className="px-3 py-1 text-sm rounded-full bg-red-500/20 text-red-400">
                                {t('owner.expired')}
                              </span>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300">
                            <div>
                              <span className="text-gray-400">{t('common.people')}: </span>
                              {formatNumber(cartItem.number_of_people, language)}
                            </div>
                            <div>
                              <span className="text-gray-400">{t('owner.eventName')}: </span>
                              {cartItem.event_name}
                            </div>
                            <div>
                              <span className="text-gray-400">{t('owner.venueName')}: </span>
                              {cartItem.venue_name}
                            </div>
                            <div>
                              <span className="text-gray-400">{t('owner.eventDate')}: </span>
                              {formatDateLocal(cartItem.event_date)}
                            </div>
                            <div>
                              <span className="text-gray-400">{t('owner.eventTime')}: </span>
                              {formatTimeLocal(cartItem.event_time)}
                            </div>
                            {cartItem.expires_at && !cartItem.is_expired && (
                              <div>
                                <span className="text-gray-400">{t('owner.timeRemaining')}: </span>
                                <CartItemCountdown expiresAt={cartItem.expires_at} />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Regular reservations */}
            {filteredReservations.map((reservation) => (
              <div
                key={reservation.id}
                className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors"
              >
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  {/* Customer Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">
                        {reservation.customer_username}
                      </h3>
                      <span className={`px-3 py-1 text-sm rounded-full ${getStatusColor(reservation.status)}`}>
                        {getStatusText(reservation.status)}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300">
                      <div>
                        <span className="text-gray-400">{t('common.people')}: </span>
                        {formatNumber(reservation.number_of_people, language)}
                      </div>
                      <div>
                        <span className="text-gray-400">{t('owner.eventName')}: </span>
                        {reservation.event_name}
                      </div>
                      <div>
                        <span className="text-gray-400">{t('owner.venueName')}: </span>
                        {reservation.venue_name}
                      </div>
                      <div>
                        <span className="text-gray-400">{t('owner.eventDate')}: </span>
                        {formatDateLocal(reservation.event_date)}
                      </div>
                      <div>
                        <span className="text-gray-400">{t('owner.eventTime')}: </span>
                        {formatTimeLocal(reservation.event_time)}
                      </div>
                    </div>
                  </div>

                  {/* Reservation Details */}
                  <div className="lg:w-48">
                    <div className="text-sm text-gray-400 mb-2">
                      {t('owner.reservationDate')}
                    </div>
                    <div className="text-white">
                      {formatDateLocal(reservation.reservation_date)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
