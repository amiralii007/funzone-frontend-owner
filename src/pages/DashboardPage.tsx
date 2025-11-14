import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../state/authStore'
import { useLanguage } from '../contexts/LanguageContext'
import { formatNumber, formatCurrency, formatDate } from '../utils/persianNumbers'
import { apiService } from '../services/apiService'

export default function DashboardPage() {
  const navigate = useNavigate()
  const { state } = useAuth()
  const { t, isRTL, language } = useLanguage()

  // Real analytics data will be fetched from API
  const [analytics, setAnalytics] = useState({
    totalRevenue: 0,
    monthlyRevenue: 0,
    weeklyRevenue: 0,
    dailyRevenue: 0,
    totalBookings: 0,
    averageRating: 0,
    topVenues: [] as Array<{ name: string; revenue: number; bookings: number }>,
    topEvents: [] as Array<{ name: string; revenue: number; bookings: number }>,
    recentComments: [] as Array<{ 
      id: number; 
      type: string; 
      targetName: string; 
      username: string; 
      comment: string; 
      rating: number; 
      date: string; 
    }>
  })
  // const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(true) // Will be used when analytics API is implemented

  // State for checking if user has venues
  const [venues, setVenues] = useState<any[]>([])
  const [isLoadingVenues, setIsLoadingVenues] = useState(false)
  
  // State for events count
  const [events, setEvents] = useState<any[]>([])
  const [isLoadingEvents, setIsLoadingEvents] = useState(false)
  
  // State for top events by rating (رویدادهای برتر)
  const [topEvents, setTopEvents] = useState<any[]>([])
  const [isLoadingTopEvents, setIsLoadingTopEvents] = useState(false)
  
  // State for comments
  const [comments, setComments] = useState<any[]>([])
  const [isLoadingComments, setIsLoadingComments] = useState(false)
  
  // State for analytics loading
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false)

  // Fetch venues to check if user has any
  const fetchVenues = async () => {
    if (!state.auth.user?.id) return
    
    setIsLoadingVenues(true)
    try {
      const responseData = await apiService.getVenues(state.auth.user.id)
      const venuesData = responseData.results || responseData
      
      // Ensure venues have proper rating data
      const venuesWithRatings = venuesData.map((venue: any) => ({
        ...venue,
        rating: venue.average_rating || venue.rating || 0, // Use average_rating from backend
        ratings_count: venue.ratings_count || 0
      }))
      
      setVenues(venuesWithRatings)
      console.log('Fetched venues for dashboard:', venuesWithRatings.length)
      console.log('Venue ratings:', venuesWithRatings.map(v => ({ name: v.name, rating: v.rating, ratings_count: v.ratings_count })))
    } catch (error) {
      console.error('Error fetching venues:', error)
      setVenues([])
    } finally {
      setIsLoadingVenues(false)
    }
  }

  // Fetch events to get count
  const fetchEvents = async () => {
    if (!state.auth.user?.id) return
    
    setIsLoadingEvents(true)
    try {
      const responseData = await apiService.getEvents(state.auth.user.id)
      const eventsData = responseData.results || responseData
      
      // Ensure events have proper rating data
      const eventsWithRatings = eventsData.map((event: any) => ({
        ...event,
        average_rating: event.average_rating || 0,
        ratings_count: event.ratings_count || 0
      }))
      
      setEvents(eventsWithRatings)
      console.log('Fetched events for dashboard:', eventsWithRatings.length)
      console.log('Event ratings:', eventsWithRatings.map(e => ({ name: e.name, rating: e.average_rating, ratings_count: e.ratings_count })))
    } catch (error) {
      console.error('Error fetching events:', error)
      setEvents([])
    } finally {
      setIsLoadingEvents(false)
    }
  }

  // Fetch top events by rating (رویدادهای برتر)
  const fetchTopEvents = async () => {
    if (!state.auth.user?.id) return
    
    setIsLoadingTopEvents(true)
    try {
      const topEventsData = await apiService.getTopEventsByRating(state.auth.user.id, 10)
      setTopEvents(topEventsData)
      console.log('Fetched top events by rating:', topEventsData.length)
      console.log('Top events data:', topEventsData)
    } catch (error) {
      console.error('Error fetching top events:', error)
      setTopEvents([])
    } finally {
      setIsLoadingTopEvents(false)
    }
  }

  // Fetch comments and ratings
  const fetchComments = async () => {
    if (!state.auth.user?.id) return
    
    setIsLoadingComments(true)
    try {
      // Fetch comments for owner's venues and events using new API
      const commentsData = await apiService.getCommentsByOwner(state.auth.user.id)
      
      // Fetch ratings for owner's venues and events using new API
      const ratingsData = await apiService.getRatingsByOwner(state.auth.user.id)
      
      // Combine comments and ratings into a unified format
          const combinedData = [
        ...commentsData.map((comment: any) => ({
          id: `comment_${comment.id}`,
          type: comment.event ? 'event' : 'venue',
          targetName: comment.event?.name || comment.social_hub?.name || 'نامشخص',
          username: comment.customer?.f_name || 'کاربر',
          comment: comment.comment,
          rating: null, // Comments don't have ratings
          date: new Date(comment.created_at).toLocaleDateString(language === 'fa' ? 'fa-IR' : 'en-US')
        })),
        ...ratingsData.map((rating: any) => ({
          id: `rating_${rating.id}`,
          type: rating.event ? 'event' : 'venue',
          targetName: rating.event?.name || rating.social_hub?.name || 'نامشخص',
          username: rating.customer?.f_name || 'کاربر',
          comment: null, // Ratings don't have comments
          rating: rating.rating,
          date: new Date(rating.created_at).toLocaleDateString(language === 'fa' ? 'fa-IR' : 'en-US')
        }))
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      
      setComments(combinedData)
      console.log('Fetched comments and ratings:', combinedData.length)
    } catch (error) {
      console.error('Error fetching comments and ratings:', error)
      
      // Fallback to sample data if API fails
      const sampleComments = [
        {
          id: 1,
          type: 'کافه',
          targetName: 'کافه مرکزی',
          username: 'ali_ahmadi',
          comment: 'محیط بسیار عالی و آرامش بخش. پیشنهاد می‌کنم.',
          rating: 5,
          date: '۲ روز پیش'
        },
        {
          id: 2,
          type: 'event',
          targetName: 'تورنمنت فوتبال',
          username: 'maryam_rezaei',
          comment: 'رویداد فوق‌العاده‌ای بود. امیدوارم دوباره برگزار شود.',
          rating: 4,
          date: '۱ هفته پیش'
        },
        {
          id: 3,
          type: 'کافه',
          targetName: 'رستوران سنتی',
          username: 'hasan_mohammadi',
          comment: 'غذاهای خوشمزه و سرویس عالی. حتماً دوباره می‌آیم.',
          rating: 5,
          date: '۳ روز پیش'
        }
      ]
      setComments(sampleComments)
    } finally {
      setIsLoadingComments(false)
    }
  }

  // Get all venues sorted by rating (or randomly if no rating)
  const getAllVenuesSorted = () => {
    return venues
      .sort((a, b) => {
        // If both have ratings, sort by rating (highest first)
        if (a.rating && b.rating) {
          return b.rating - a.rating
        }
        // If only one has rating, prioritize it
        if (a.rating && !b.rating) return -1
        if (!a.rating && b.rating) return 1
        // If neither has rating, sort randomly
        return Math.random() - 0.5
      })
  }

  // Get all events sorted by rating (or randomly if no rating)
  const getAllEventsSorted = () => {
    return events
      .sort((a, b) => {
        // If both have ratings, sort by rating (highest first)
        if (a.average_rating && b.average_rating) {
          return b.average_rating - a.average_rating
        }
        // If only one has rating, prioritize it
        if (a.average_rating && !b.average_rating) return -1
        if (!a.average_rating && b.average_rating) return 1
        // If neither has rating, sort randomly
        return Math.random() - 0.5
      })
  }

  // Calculate revenue from events
  const calculateRevenue = (events: any[]) => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekStart = new Date(today)
    weekStart.setDate(today.getDate() - today.getDay()) // Start of current week
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1) // Start of current month

    let totalRevenue = 0
    let monthlyRevenue = 0
    let weeklyRevenue = 0
    let dailyRevenue = 0
    let totalBookings = 0

    events.forEach(event => {
      const eventDate = new Date(event.start_time)
      const eventRevenue = event.total_revenue || 0
      const eventBookings = event.total_reserved_people || 0

      // Total revenue
      totalRevenue += eventRevenue
      totalBookings += eventBookings

      // Monthly revenue (current month)
      if (eventDate >= monthStart) {
        monthlyRevenue += eventRevenue
      }

      // Weekly revenue (current week)
      if (eventDate >= weekStart) {
        weeklyRevenue += eventRevenue
      }

      // Daily revenue (today)
      if (eventDate >= today && eventDate < new Date(today.getTime() + 24 * 60 * 60 * 1000)) {
        dailyRevenue += eventRevenue
      }
    })

    return {
      totalRevenue,
      monthlyRevenue,
      weeklyRevenue,
      dailyRevenue,
      totalBookings
    }
  }

  // Calculate average rating from venues
  const calculateAverageRating = (venues: any[]) => {
    if (venues.length === 0) return 0
    
    const venuesWithRatings = venues.filter(venue => venue.average_rating && venue.average_rating > 0)
    if (venuesWithRatings.length === 0) return 0
    
    const totalRating = venuesWithRatings.reduce((sum, venue) => sum + venue.average_rating, 0)
    return totalRating / venuesWithRatings.length
  }

  // Fetch analytics data
  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!state.auth.user) return
      
      setIsLoadingAnalytics(true)
      try {
        // Calculate revenue from events
        const revenueData = calculateRevenue(events)
        const averageRating = calculateAverageRating(venues)
        
        console.log('Calculated revenue data:', revenueData)
        console.log('Average rating:', averageRating)
        
        setAnalytics({
          totalRevenue: revenueData.totalRevenue,
          monthlyRevenue: revenueData.monthlyRevenue,
          weeklyRevenue: revenueData.weeklyRevenue,
          dailyRevenue: revenueData.dailyRevenue,
          totalBookings: revenueData.totalBookings,
          averageRating: averageRating,
          topVenues: [] as Array<{ name: string; revenue: number; bookings: number }>,
          topEvents: [] as Array<{ name: string; revenue: number; bookings: number }>,
          recentComments: [] as Array<{ 
            id: number; 
            type: string; 
            targetName: string; 
            username: string; 
            comment: string; 
            rating: number; 
            date: string; 
          }>
        })
      } catch (error) {
        console.error('Error calculating analytics:', error)
      } finally {
        setIsLoadingAnalytics(false)
      }
    }

    // Calculate analytics when venues or events data changes
    if (venues.length > 0 || events.length > 0) {
      fetchAnalytics()
    }
  }, [venues, events, state.auth.user])

  // Load data on component mount
  useEffect(() => {
    fetchVenues()
    fetchEvents()
    fetchTopEvents()
    fetchComments()
  }, [state.auth.user])

  // Show welcome message for non-logged in users, but still show the dashboard content
  const isLoggedIn = !!state.auth.user

  return (
    <div className={`container-responsive p-responsive space-responsive ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Welcome Section */}
      <div className="glass-card p-4 sm:p-6 text-center space-y-4">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-r from-purple-500 to-teal-500 mx-auto grid place-items-center text-xl sm:text-2xl font-bold shadow-glow">
          {isLoggedIn && state.auth.user?.f_name ? state.auth.user.f_name[0] : '🏢'}
        </div>
        <div>
          <h1 className="text-responsive-xl font-bold text-gradient">
            {isLoggedIn && state.auth.user?.f_name 
              ? (language === 'fa' ? `خوش آمدید ${state.auth.user.f_name} عزیز` : `Welcome ${state.auth.user.f_name}`)
              : t('owner.welcomeOwner')
            }
          </h1>
          <p className="text-slate-400 text-responsive-sm">
            {isLoggedIn && state.auth.user?.f_name && state.auth.user?.l_name ? `${state.auth.user.f_name} ${state.auth.user.l_name}` : t('owner.manageYourBusiness')}
          </p>
          {!isLoggedIn && (
            <div className="mt-4">
              <a href="/login" className="btn-primary hover-scale">
                {t('common.signIn')}
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Venue Creation Shortcut - Show only if user has no venues */}
      {isLoggedIn && !isLoadingVenues && venues.length === 0 && (
        <div className="glass-card p-6 text-center space-y-4 bg-gradient-to-r from-purple-500/10 to-teal-500/10 border border-purple-500/20">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-r from-purple-500 to-teal-500 mx-auto grid place-items-center text-2xl sm:text-3xl shadow-glow">
            🏢
          </div>
          <div>
            <h2 className="text-responsive-lg font-bold text-gradient mb-2">{t('owner.createVenueShortcut')}</h2>
            <p className="text-slate-400 text-responsive-sm mb-4">{t('owner.createVenueShortcutDescription')}</p>
            <button 
              onClick={() => navigate('/venues?action=add')}
              className="btn-primary hover-scale text-responsive-sm px-6 py-3 rounded-lg font-semibold"
            >
              {t('owner.getStarted')}
            </button>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="space-y-4">
        <h2 className="text-responsive-lg font-semibold">{t('owner.quickStats')}</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="glass-card p-4 text-center space-y-2">
            <div className="text-2xl sm:text-3xl font-bold text-purple-400">
              {isLoadingVenues ? (
                <div className="animate-pulse">...</div>
              ) : (
                formatNumber(venues.length, language)
              )}
            </div>
            <div className="text-responsive-xs text-slate-400">{t('owner.myVenues')}</div>
          </div>
          <div className="glass-card p-4 text-center space-y-2">
            <div className="text-2xl sm:text-3xl font-bold text-teal-400">
              {isLoadingEvents ? (
                <div className="animate-pulse">...</div>
              ) : (
                formatNumber(events.length, language)
              )}
            </div>
            <div className="text-responsive-xs text-slate-400">{t('owner.myEvents')}</div>
          </div>
          <div className="glass-card p-4 text-center space-y-2">
            <div className="text-2xl sm:text-3xl font-bold text-green-400">{formatCurrency(isLoggedIn && state.auth.user?.balance !== undefined ? state.auth.user.balance : 0, language, t('common.currency'))}</div>
            <div className="text-responsive-xs text-slate-400">{t('owner.balance')}</div>
          </div>
          <div className="glass-card p-4 text-center space-y-2">
            <div className="text-2xl sm:text-3xl font-bold text-yellow-400">
              {analytics.averageRating && analytics.averageRating > 0 ? formatNumber(analytics.averageRating, language, 1) : '⭐'}
            </div>
            <div className="text-responsive-xs text-slate-400">{t('owner.averageRating')}</div>
          </div>
        </div>
      </div>

      {/* Revenue Overview */}
      <div className="space-y-4">
        <h2 className="text-responsive-lg font-semibold">{t('owner.revenue')}</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="glass-card p-4 text-center space-y-2">
            <div className="text-2xl sm:text-3xl font-bold text-green-400">
              {isLoadingAnalytics ? (
                <div className="animate-pulse">...</div>
              ) : (
                formatCurrency(analytics.totalRevenue, language, '')
              )}
            </div>
            <div className="text-responsive-xs text-slate-400">{t('owner.totalRevenue')}</div>
          </div>
          <div className="glass-card p-4 text-center space-y-2">
            <div className="text-2xl sm:text-3xl font-bold text-blue-400">
              {isLoadingAnalytics ? (
                <div className="animate-pulse">...</div>
              ) : (
                formatCurrency(analytics.monthlyRevenue, language, '')
              )}
            </div>
            <div className="text-responsive-xs text-slate-400">{t('owner.monthlyRevenue')}</div>
          </div>
          <div className="glass-card p-4 text-center space-y-2">
            <div className="text-2xl sm:text-3xl font-bold text-purple-400">
              {isLoadingAnalytics ? (
                <div className="animate-pulse">...</div>
              ) : (
                formatCurrency(analytics.weeklyRevenue, language, '')
              )}
            </div>
            <div className="text-responsive-xs text-slate-400">{t('owner.weeklyRevenue')}</div>
          </div>
          <div className="glass-card p-4 text-center space-y-2">
            <div className="text-2xl sm:text-3xl font-bold text-yellow-400">
              {isLoadingAnalytics ? (
                <div className="animate-pulse">...</div>
              ) : (
                formatCurrency(analytics.dailyRevenue, language, '')
              )}
            </div>
            <div className="text-responsive-xs text-slate-400">{t('owner.dailyRevenue')}</div>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="space-y-4">
        <h2 className="text-responsive-lg font-semibold">{t('owner.performanceMetrics')}</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="glass-card p-4 text-center space-y-2">
            <div className="text-2xl sm:text-3xl font-bold text-teal-400">
              {isLoadingAnalytics ? (
                <div className="animate-pulse">...</div>
              ) : (
                formatNumber(analytics.totalBookings, language)
              )}
            </div>
            <div className="text-responsive-xs text-slate-400">{t('owner.totalBookings')}</div>
          </div>
          <div className="glass-card p-4 text-center space-y-2">
            <div className="text-2xl sm:text-3xl font-bold text-orange-400">
              {isLoadingAnalytics ? (
                <div className="animate-pulse">...</div>
              ) : (
                formatNumber(analytics.averageRating, language, 1)
              )}
            </div>
            <div className="text-responsive-xs text-slate-400">{t('owner.averageRating')}</div>
          </div>
        </div>
      </div>

      {/* All Venues - Only show if venues exist */}
      {venues.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-responsive-lg font-semibold">{t('owner.topPerformingVenues')}</h2>
          <div className="space-y-3">
            {getAllVenuesSorted().map((venue, index) => (
              <div key={venue.id} className="glass-card p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-teal-500 grid place-items-center text-white font-bold text-sm">
                    {formatNumber(index + 1, language)}
                  </div>
                  <div>
                    <div className="font-semibold text-responsive-sm">{venue.name}</div>
                    <div className="text-responsive-xs text-slate-400">{venue.address}</div>
                  </div>
                </div>
                <div className="text-right">
                  {venue.rating && venue.rating > 0 ? (
                    <>
                      <div className="font-bold text-responsive-sm text-yellow-400">{formatNumber(venue.rating, language, 1)} ⭐</div>
                      <div className="text-responsive-xs text-slate-400">
                        {venue.ratings_count > 0 ? `${formatNumber(venue.ratings_count, language)}` : t('owner.rating')}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="font-bold text-responsive-sm text-slate-400">{t('owner.noRating') || 'No rating'}</div>
                      <div className="text-responsive-xs text-slate-400">{t('owner.noRatingsYet') || 'No ratings yet'}</div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Events by Rating (رویدادهای برتر) - Show all events with ratings */}
      {topEvents.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-responsive-lg font-semibold">{language === 'fa' ? 'رویدادهای برتر' : 'Top Events'}</h2>
            <Link 
              to="/events" 
              className="text-teal-400 hover:text-teal-300 text-responsive-sm font-medium transition-colors"
            >
              {t('common.seeMore')}
            </Link>
          </div>
          <div className="space-y-3">
            {topEvents.slice(0, 3).map((event, index) => (
              <div key={event.id} className="glass-card p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-teal-500 to-blue-500 grid place-items-center text-white font-bold text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-semibold text-responsive-sm">{event.name}</div>
                    <div className="text-responsive-xs text-slate-400">{formatDate(event.start_time, language)}</div>
                    <div className="text-responsive-xs text-slate-500">{event.social_hub?.name}</div>
                  </div>
                </div>
                <div className="text-right">
                  {event.average_rating && event.average_rating > 0 ? (
                    <>
                      <div className="font-bold text-responsive-sm text-yellow-400">{formatNumber(event.average_rating, language, 1)} ⭐</div>
                      <div className="text-responsive-xs text-slate-400">
                        {event.ratings_count > 0 ? `${formatNumber(event.ratings_count, language)}` : t('owner.rating')}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="font-bold text-responsive-sm text-slate-400">{t('owner.noRating') || 'No rating'}</div>
                      <div className="text-responsive-xs text-slate-400">{t('owner.noRatingsYet') || 'No ratings yet'}</div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Comments - Only show if comments exist */}
      {comments.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-responsive-lg font-semibold">{t('owner.recentComments')}</h2>
            <Link 
              to="/comments" 
              className="text-purple-400 hover:text-purple-300 text-responsive-sm font-medium transition-colors"
            >
              {t('owner.seeMoreComments')}
            </Link>
          </div>
          <div className="space-y-3">
            {comments.slice(0, 3).map((comment) => (
              <div key={comment.id} className="glass-card p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full grid place-items-center text-white font-bold text-sm ${
                      comment.type === 'event' 
                        ? 'bg-gradient-to-r from-teal-500 to-blue-500' 
                        : 'bg-gradient-to-r from-purple-500 to-pink-500'
                    }`}>
                      {comment.type === 'event' ? '🎉' : '🏢'}
                    </div>
                    <div>
                      <div className="font-semibold text-responsive-sm">{comment.username}</div>
                      <div className="text-responsive-xs text-slate-400">
                        {comment.type === 'event' ? t('owner.eventComment') : t('owner.venueComment')} - {comment.targetName}
                      </div>
                    </div>
                  </div>
                  {comment.rating && (
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <span key={i} className={`text-sm ${i < comment.rating ? 'text-yellow-400' : 'text-slate-600'}`}>
                          ⭐
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {comment.comment && (
                  <p className="text-responsive-sm text-slate-300 leading-relaxed">{comment.comment}</p>
                )}
                {comment.rating && !comment.comment && (
                  <p className="text-responsive-sm text-slate-300 leading-relaxed">
                    امتیاز: {formatPersianNumber(comment.rating)} ستاره
                  </p>
                )}
                <div className="flex items-center justify-between text-responsive-xs text-slate-400">
                  <span>{comment.date}</span>
                  <button className="text-purple-400 hover:text-purple-300 transition-colors">
                    {t('owner.replyToComment')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="space-y-4">
        <h2 className="text-responsive-lg font-semibold">{t('common.quickActions')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button 
            onClick={() => navigate('/venues?action=add')}
            className="glass-card p-4 text-left space-y-2 hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 grid place-items-center text-white">
                🏢
              </div>
              <div>
                <div className="font-semibold text-responsive-sm">{t('owner.addVenue')}</div>
                <div className="text-responsive-xs text-slate-400">{t('owner.venueManagement')}</div>
              </div>
            </div>
          </button>
          
          <button 
            onClick={() => navigate('/events?action=add')}
            className="glass-card p-4 text-left space-y-2 hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-teal-500 to-teal-600 grid place-items-center text-white">
                🎉
              </div>
              <div>
                <div className="font-semibold text-responsive-sm">{t('owner.addEvent')}</div>
                <div className="text-responsive-xs text-slate-400">{t('owner.eventManagement')}</div>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Recommendations */}
      <div className="space-y-4">
        <h2 className="text-responsive-lg font-semibold">{t('owner.recommendations')}</h2>
        <div className="space-y-3">
          <div className="glass-card p-4 flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-yellow-500 to-orange-500 grid place-items-center text-white">
              💡
            </div>
            <div>
              <div className="font-semibold text-responsive-sm">{t('owner.boostVisibility')}</div>
              <div className="text-responsive-xs text-slate-400 mt-1">{t('owner.addMorePhotos')}</div>
            </div>
          </div>
          
          <div className="glass-card p-4 flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 grid place-items-center text-white">
              📈
            </div>
            <div>
              <div className="font-semibold text-responsive-sm">{t('owner.increaseBookings')}</div>
              <div className="text-responsive-xs text-slate-400 mt-1">{t('owner.promoteEvent')}</div>
            </div>
          </div>
          
          <div className="glass-card p-4 flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 grid place-items-center text-white">
              ⚡
            </div>
            <div>
              <div className="font-semibold text-responsive-sm">{t('owner.optimizePricing')}</div>
              <div className="text-responsive-xs text-slate-400 mt-1">{t('owner.adjustPricing')}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
