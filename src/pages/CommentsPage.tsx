import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext'
import BackButton from '../components/BackButton'
import { useAuth } from '../state/authStore'
import { apiService } from '../services/apiService'
import { formatSolarHijriDate } from '../utils/solarHijriCalendar'

const ASSET_BASE_URL = (import.meta.env.BASE_URL || '/').replace(/\/?$/, '/')

// Comment interface based on API response
interface ApiComment {
  id: string
  comment: string
  created_at: string
  customer: {
    id: string
    username?: string
    f_name?: string
    l_name?: string
    mobile_number?: string
  }
  event: {
    id: string
    name: string
    description?: string
    start_time?: string
    end_time?: string
    date?: string
  } | null
  social_hub: {
    id: string
    name: string
  } | null
  parent_comment?: string | null
  replies?: ApiComment[]
}

// Transformed comment for UI
interface DisplayComment {
  id: string
  type: 'event' | 'کافه'
  targetName: string
  username: string
  comment: string
  rating: number
  date: string
  customer?: {
    id: string
    username?: string
    f_name?: string
    l_name?: string
    avatar?: string
  }
  replies: Array<{
    id: string
    text: string
    date: string
    isOwner: boolean
    customer?: {
      id: string
      username?: string
      f_name?: string
      l_name?: string
      avatar?: string
    }
  }>
}

export default function CommentsPage() {
  const { t, isRTL } = useLanguage()
  const { state } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [filter, setFilter] = useState<'all' | 'event' | 'کافه'>('all')
  const [replyText, setReplyText] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [comments, setComments] = useState<DisplayComment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSubmittingReply, setIsSubmittingReply] = useState(false)

  // Fetch comments from API
  useEffect(() => {
    const fetchComments = async () => {
      if (!state.auth.user?.id) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const response = await apiService.getCommentsByOwner(state.auth.user.id)
        
        // Handle both paginated response (with results array) and direct array response
        const apiComments: ApiComment[] = Array.isArray(response) 
          ? response 
          : (response?.results || [])
        
        // Transform API comments to display format
        const transformedCommentsResults = await Promise.all(
          apiComments.map(async (apiComment: ApiComment) => {
            // Skip replies (comments with parent_comment) - we'll fetch them separately
            if (apiComment.parent_comment) {
              return null as DisplayComment | null
            }

            // Determine comment type: 'event' if event exists, otherwise 'کافه'
            const commentType: 'event' | 'کافه' = apiComment.event ? 'event' : 'کافه'
            
            // Get target name (event name or social hub name)
            const targetName = apiComment.event?.name || apiComment.social_hub?.name || 'نامشخص'
            
            // Format date using formatSolarHijriDate
            const date = formatSolarHijriDate(apiComment.created_at, 'YYYY/MM/DD')

            // Get real name: prioritize f_name + l_name, fallback to username, then mobile_number
            const fullName = `${apiComment.customer.f_name || ''} ${apiComment.customer.l_name || ''}`.trim()
            const displayName = fullName || apiComment.customer.username || apiComment.customer.mobile_number || 'کاربر ناشناس'

            // Fetch replies for this comment - only show replies from current owner
            let replies: DisplayComment['replies'] = []
            try {
              // Fetch replies (use cache for initial load, but will be fresh after posting)
              const repliesResponse = await apiService.getCommentReplies(apiComment.id, true)
              const repliesData: ApiComment[] = Array.isArray(repliesResponse) 
                ? repliesResponse 
                : (repliesResponse?.results || [])
              
              // Show all replies - in owner app, only owners can reply
              // All replies shown here are from owners (the current owner or other owners)
              // For now, we show all replies. Can be filtered later if needed.
              const ownerReplies = repliesData.filter((reply: ApiComment) => {
                // Only show replies that have a customer (should always be true)
                return !!reply.customer
              })
              
              replies = ownerReplies.map((reply: ApiComment) => {
                const replyFullName = `${reply.customer.f_name || ''} ${reply.customer.l_name || ''}`.trim()
                const replyDisplayName = replyFullName || reply.customer.username || reply.customer.mobile_number || 'مالک'
                
                const replyDate = formatSolarHijriDate(reply.created_at, 'YYYY/MM/DD')

                return {
                  id: reply.id,
                  text: reply.comment,
                  date: replyDate,
                  isOwner: true, // Replies from owner app are always from owner
                  customer: reply.customer
                }
              })
            } catch (err) {
              console.error('Error fetching replies:', err)
              // If replies endpoint doesn't exist yet, continue without replies
            }

            return {
              id: apiComment.id,
              type: commentType,
              targetName,
              username: displayName,
              comment: apiComment.comment,
              rating: 0, // Rating is not part of comment model, would need separate ratings API
              date,
              customer: apiComment.customer,
              replies
            }
          })
        )

        // Filter out null values (replies) and ensure type safety
        const filteredComments: DisplayComment[] = transformedCommentsResults.filter((comment): comment is DisplayComment => comment !== null)

        setComments(filteredComments)
      } catch (err: any) {
        console.error('Error fetching comments:', err)
        setError(err.message || 'خطا در دریافت نظرات')
      } finally {
        setIsLoading(false)
      }
    }

    fetchComments()
  }, [state.auth.user?.id])

  // Handle commentId from URL params (from dashboard shortcut)
  useEffect(() => {
    const commentId = searchParams.get('commentId')
    if (commentId && comments.length > 0) {
      // Find the comment and open reply section
      const comment = comments.find(c => c.id === commentId)
      if (comment) {
        setReplyingTo(commentId)
        // Remove the query param after opening
        setSearchParams({})
        // Scroll to the comment (with a small delay to ensure it's rendered)
        setTimeout(() => {
          const element = document.getElementById(`comment-${commentId}`)
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        }, 100)
      }
    }
  }, [comments, searchParams, setSearchParams])

  // Filter comments based on selected filter
  const filteredComments = filter === 'all' 
    ? comments 
    : comments.filter(comment => comment.type === filter)

  const handleReply = async (commentId: string) => {
    if (!replyText.trim()) {
      alert('لطفاً متن پاسخ را وارد کنید')
      return
    }

    if (!state.auth.user?.id) {
      alert('لطفاً ابتدا وارد حساب کاربری خود شوید')
      return
    }

    if (isSubmittingReply) {
      return // Prevent multiple submissions
    }

    setIsSubmittingReply(true)

    try {
      // Post reply via API
      const replyResult = await apiService.replyToComment(commentId, replyText.trim(), state.auth.user.id)
      
      if (!replyResult) {
        throw new Error('پاسخ ثبت نشد. لطفاً دوباره تلاش کنید.')
      }
      
      // Invalidate cache for replies to ensure fresh data
      // The post method should already invalidate cache, but we'll fetch without cache
      
      // Refresh comments to show the new reply
      const response = await apiService.getCommentsByOwner(state.auth.user.id)
      const apiComments: ApiComment[] = Array.isArray(response) 
        ? response 
        : (response?.results || [])
      
      // Transform comments with replies
      const transformedComments: DisplayComment[] = await Promise.all(
        apiComments
          .filter((apiComment: ApiComment) => !apiComment.parent_comment)
          .map(async (apiComment: ApiComment) => {
            const commentType: 'event' | 'کافه' = apiComment.event ? 'event' : 'کافه'
            const targetName = apiComment.event?.name || apiComment.social_hub?.name || 'نامشخص'
            
            const date = formatSolarHijriDate(apiComment.created_at, 'YYYY/MM/DD')

            const fullName = `${apiComment.customer.f_name || ''} ${apiComment.customer.l_name || ''}`.trim()
            const displayName = fullName || apiComment.customer.username || apiComment.customer.mobile_number || 'کاربر ناشناس'

            // Fetch replies - only show replies from current owner
            let replies: DisplayComment['replies'] = []
            try {
              // Fetch replies with cache disabled to get fresh data after posting
              const repliesResponse = await apiService.getCommentReplies(apiComment.id, false)
              const repliesData: ApiComment[] = Array.isArray(repliesResponse) 
                ? repliesResponse 
                : (repliesResponse?.results || [])
              
              // Show all replies - in owner app, only owners can reply
              // All replies shown here are from owners (the current owner or other owners)
              // For now, we show all replies. Can be filtered later if needed.
              const ownerReplies = repliesData.filter((reply: ApiComment) => {
                // Only show replies that have a customer (should always be true)
                return !!reply.customer
              })
              
              replies = ownerReplies.map((reply: ApiComment) => {
                const replyFullName = `${reply.customer.f_name || ''} ${reply.customer.l_name || ''}`.trim()
                const replyDisplayName = replyFullName || reply.customer.username || reply.customer.mobile_number || 'مالک'
                
                const replyDate = formatSolarHijriDate(reply.created_at, 'YYYY/MM/DD')

                return {
                  id: reply.id,
                  text: reply.comment,
                  date: replyDate,
                  isOwner: true,
                  customer: reply.customer
                }
              })
            } catch (err) {
              console.error('Error fetching replies:', err)
            }

            return {
              id: apiComment.id,
              type: commentType,
              targetName,
              username: displayName,
              comment: apiComment.comment,
              rating: 0,
              date,
              customer: apiComment.customer,
              replies
            }
          })
      )

      setComments(transformedComments)
      
      // Show success message
      alert('پاسخ شما با موفقیت ثبت شد')
      
      setReplyText('')
      setReplyingTo(null)
    } catch (err: any) {
      console.error('Error replying to comment:', err)
      let errorMessage = 'خطا در ارسال پاسخ'
      
      if (err.message) {
        errorMessage = err.message
      } else if (err.response?.data) {
        // Handle API error responses
        const errorData = err.response.data
        if (typeof errorData === 'string') {
          errorMessage = errorData
        } else if (errorData.detail) {
          errorMessage = errorData.detail
        } else if (errorData.error) {
          errorMessage = errorData.error
        } else if (errorData.message) {
          errorMessage = errorData.message
        } else if (typeof errorData === 'object') {
          // Try to get first error message
          const firstError = Object.values(errorData)[0]
          if (Array.isArray(firstError) && firstError.length > 0) {
            errorMessage = firstError[0]
          } else if (typeof firstError === 'string') {
            errorMessage = firstError
          }
        }
      }
      
      alert(errorMessage)
    } finally {
      setIsSubmittingReply(false)
    }
  }

  return (
    <div className={`container-responsive p-responsive space-responsive ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Header */}
      <div className="glass-card p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-2">
          <BackButton fallbackPath="/" />
          <h1 className="text-responsive-xl font-bold text-gradient">{t('owner.manageComments')}</h1>
        </div>
        <p className="text-slate-400 text-responsive-sm">
          نظرات مشتریان درباره مکان‌ها و رویدادهای خود را مدیریت کنید
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="glass-card p-4">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-responsive-sm font-medium transition-colors ${
              filter === 'all' 
                ? 'bg-purple-500 text-white' 
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            همه نظرات
          </button>
          <button
            onClick={() => setFilter('event')}
            className={`px-4 py-2 rounded-lg text-responsive-sm font-medium transition-colors ${
              filter === 'event' 
                ? 'bg-teal-500 text-white' 
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            نظرات رویدادها
          </button>
          <button
            onClick={() => setFilter('کافه')}
            className={`px-4 py-2 rounded-lg text-responsive-sm font-medium transition-colors ${
              filter === 'کافه' 
                ? 'bg-purple-500 text-white' 
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            نظرات مکان‌ها
          </button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="glass-card p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-700 mx-auto grid place-items-center text-2xl mb-4 animate-pulse">
            ⏳
          </div>
          <h3 className="text-responsive-lg font-semibold mb-2">در حال بارگذاری...</h3>
          <p className="text-slate-400 text-responsive-sm">لطفاً صبر کنید</p>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="glass-card p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-red-900/50 mx-auto grid place-items-center text-2xl mb-4">
            ⚠️
          </div>
          <h3 className="text-responsive-lg font-semibold mb-2 text-red-400">خطا در دریافت نظرات</h3>
          <p className="text-slate-400 text-responsive-sm mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-purple-500 text-white rounded-lg text-responsive-sm font-medium hover:bg-purple-600 transition-colors"
          >
            تلاش مجدد
          </button>
        </div>
      )}

      {/* Comments List */}
      {!isLoading && !error && (
        <div className="space-y-4">
          {filteredComments.map((comment) => {
            // Get first letter of username for avatar
            const avatarLetter = comment.username?.[0]?.toUpperCase() || 'U'
            
            return (
              <div key={comment.id} id={`comment-${comment.id}`} className="glass-card p-4 md:p-6">
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                    <div className="relative w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-teal-500 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {comment.customer?.avatar ? (
                      <img 
                        src={`${ASSET_BASE_URL}avatars/${comment.customer.avatar}`} 
                        alt={comment.username} 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.style.display = 'none'
                          const parent = target.parentElement
                          if (parent) {
                            const fallback = document.createElement('span')
                            fallback.className = 'text-white text-sm font-semibold'
                            fallback.textContent = avatarLetter
                            parent.appendChild(fallback)
                          }
                        }}
                      />
                    ) : (
                      <span className="text-white text-sm font-semibold">
                        {avatarLetter}
                      </span>
                    )}
                  </div>
                  
                  {/* Comment Content */}
                  <div className="flex-1 min-w-0">
                    {/* Header with name and date */}
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold text-responsive-base">
                        {comment.username}
                      </h4>
                      <span className="text-responsive-sm text-slate-400">
                        {comment.date}
                      </span>
                    </div>
                    
                    {/* Comment Text */}
                    <p className="text-responsive-sm text-slate-300 leading-relaxed break-words">
                      {comment.comment}
                    </p>
                    
                    {/* Event/Venue tag */}
                    {comment.targetName && (
                      <div className="mt-2">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-900/30 text-blue-300 border border-blue-700/50">
                          {comment.type === 'event' ? t('owner.eventComment') : t('owner.venueComment')} - {comment.targetName}
                        </span>
                      </div>
                    )}
                    
                    {/* Rating */}
                    {comment.rating > 0 && (
                      <div className="flex items-center gap-1 mt-2">
                        {[1, 2, 3, 4, 5].map(star => (
                          <span key={star} className={`text-sm ${star <= comment.rating ? 'text-yellow-400' : 'text-slate-600'}`}>
                            ⭐
                          </span>
                        ))}
                        <span className="text-xs text-slate-400 ml-1">
                          {comment.rating}/5
                        </span>
                      </div>
                    )}

                    {/* Replies Section - Only show if owner has replied */}
                    {comment.replies && comment.replies.length > 0 && (
                      <div className="mt-4 space-y-3 border-t border-slate-700 pt-4">
                        <h5 className="text-responsive-sm font-medium text-slate-300 mb-2">
                          پاسخ مالک:
                        </h5>
                        {comment.replies.map((reply) => {
                          const replyFullName = reply.customer?.f_name && reply.customer?.l_name
                            ? `${reply.customer.f_name} ${reply.customer.l_name}`
                            : reply.customer?.username || 'مالک'
                          const replyAvatarLetter = replyFullName[0]?.toUpperCase() || 'O'
                          
                          return (
                            <div key={reply.id} className="bg-slate-700/50 p-3 rounded-lg ml-4">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="relative w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-teal-500 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                  {reply.customer?.avatar ? (
                                    <img 
                                      src={`${ASSET_BASE_URL}avatars/${reply.customer.avatar}`} 
                                      alt={replyFullName} 
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement
                                        target.style.display = 'none'
                                        const parent = target.parentElement
                                        if (parent) {
                                          const fallback = document.createElement('span')
                                          fallback.className = 'text-white text-xs font-semibold'
                                          fallback.textContent = replyAvatarLetter
                                          parent.appendChild(fallback)
                                        }
                                      }}
                                    />
                                  ) : (
                                    <span className="text-white text-xs font-semibold">
                                      {replyAvatarLetter}
                                    </span>
                                  )}
                                </div>
                                <span className="text-responsive-xs font-medium text-purple-400">
                                  {replyFullName}
                                </span>
                                <span className="text-responsive-xs text-slate-400">
                                  {reply.date}
                                </span>
                              </div>
                              <p className="text-responsive-sm text-slate-300 break-words">{reply.text}</p>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* Reply Section - Only owner can reply */}
                    {replyingTo === comment.id ? (
                      <div className="mt-4 space-y-3 border-t border-slate-700 pt-4">
                        <textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="پاسخ خود را بنویسید..."
                          className="w-full p-3 bg-slate-800 border border-slate-600 rounded-lg text-responsive-sm text-slate-300 placeholder-slate-500 focus:outline-none focus:border-purple-500 resize-none"
                          rows={2}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleReply(comment.id)}
                            disabled={isSubmittingReply}
                            className="px-4 py-2 bg-purple-500 text-white rounded-lg text-responsive-sm font-medium hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isSubmittingReply ? 'در حال ارسال...' : 'ارسال پاسخ'}
                          </button>
                          <button
                            onClick={() => {
                              setReplyingTo(null)
                              setReplyText('')
                            }}
                            className="px-4 py-2 bg-slate-600 text-slate-300 rounded-lg text-responsive-sm font-medium hover:bg-slate-500 transition-colors"
                          >
                            لغو
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 border-t border-slate-700 pt-4">
                        <button
                          onClick={() => setReplyingTo(comment.id)}
                          className="text-purple-400 hover:text-purple-300 text-responsive-sm font-medium transition-colors"
                        >
                          {t('owner.replyToComment')}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && filteredComments.length === 0 && (
        <div className="glass-card p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-700 mx-auto grid place-items-center text-2xl mb-4">
            💬
          </div>
          <h3 className="text-responsive-lg font-semibold mb-2">هیچ نظری یافت نشد</h3>
          <p className="text-slate-400 text-responsive-sm">
            {filter === 'all' 
              ? 'هنوز هیچ نظری دریافت نکرده‌اید.' 
              : `هیچ نظری برای ${filter === 'event' ? 'رویدادها' : 'مکان‌ها'} یافت نشد.`
            }
          </p>
        </div>
      )}
    </div>
  )
}
