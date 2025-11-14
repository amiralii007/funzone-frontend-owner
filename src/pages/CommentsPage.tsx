import { useState } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import BackButton from '../components/BackButton'

export default function CommentsPage() {
  const { t, isRTL } = useLanguage()
  const [filter, setFilter] = useState<'all' | 'event' | 'کافه'>('all')
  const [replyText, setReplyText] = useState('')
  const [replyingTo, setReplyingTo] = useState<number | null>(null)

  const mockComments = [
    { 
      id: 1, 
      type: 'event', 
      targetName: 'Gaming Tournament', 
      username: 'ali_ahmadi', 
      comment: 'رویداد فوق‌العاده‌ای بود! امکانات عالی و جو دوستانه‌ای داشت.',
      rating: 5,
      date: '2024-01-15',
      replies: [
        { id: 1, text: 'ممنون از نظر شما! خوشحالیم که از رویداد لذت بردید.', date: '2024-01-15', isOwner: true }
      ]
    },
    { 
      id: 2, 
      type: 'کافه', 
      targetName: 'Gaming Lounge Downtown', 
      username: 'maryam_rezaei', 
      comment: 'مکان بسیار تمیز و مرتب بود. پیشنهاد می‌کنم.',
      rating: 4,
      date: '2024-01-14',
      replies: []
    },
    { 
      id: 3, 
      type: 'event', 
      targetName: 'Sports Night', 
      username: 'hasan_mohammadi', 
      comment: 'زمان‌بندی خوبی داشت ولی کمی شلوغ بود.',
      rating: 3,
      date: '2024-01-13',
      replies: []
    },
    { 
      id: 4, 
      type: 'کافه', 
      targetName: 'Cafe Central', 
      username: 'fateme_karimi', 
      comment: 'قهوه‌ها عالی بود ولی قیمت‌ها کمی بالا بود.',
      rating: 3,
      date: '2024-01-12',
      replies: []
    },
    { 
      id: 5, 
      type: 'event', 
      targetName: 'Music Night', 
      username: 'reza_nouri', 
      comment: 'موسیقی‌ها عالی بود و فضای خوبی داشت.',
      rating: 5,
      date: '2024-01-11',
      replies: []
    }
  ]

  const filteredComments = filter === 'all' 
    ? mockComments 
    : mockComments.filter(comment => comment.type === filter)

  const handleReply = (commentId: number) => {
    if (replyText.trim()) {
      // Here you would typically send the reply to your backend
      console.log(`Replying to comment ${commentId}: ${replyText}`)
      setReplyText('')
      setReplyingTo(null)
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

      {/* Comments List */}
      <div className="space-y-4">
        {filteredComments.map((comment) => (
          <div key={comment.id} className="glass-card p-4 sm:p-6 space-y-4">
            {/* Comment Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full grid place-items-center text-white font-bold text-sm ${
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
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className={`text-sm ${i < comment.rating ? 'text-yellow-400' : 'text-slate-600'}`}>
                      ⭐
                    </span>
                  ))}
                </div>
                <span className="text-responsive-xs text-slate-400">{comment.date}</span>
              </div>
            </div>

            {/* Comment Text */}
            <p className="text-responsive-sm text-slate-300 leading-relaxed bg-slate-800/50 p-3 rounded-lg">
              {comment.comment}
            </p>

            {/* Replies */}
            {comment.replies.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-responsive-sm font-medium text-slate-300">پاسخ‌ها:</h4>
                {comment.replies.map((reply) => (
                  <div key={reply.id} className="bg-slate-700/50 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-responsive-xs font-medium text-purple-400">
                        {reply.isOwner ? 'شما (مالک)' : 'مشتری'}
                      </span>
                      <span className="text-responsive-xs text-slate-400">{reply.date}</span>
                    </div>
                    <p className="text-responsive-sm text-slate-300">{reply.text}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Reply Section */}
            {replyingTo === comment.id ? (
              <div className="space-y-3">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="پاسخ خود را بنویسید..."
                  className="w-full p-3 bg-slate-800 border border-slate-600 rounded-lg text-responsive-sm text-slate-300 placeholder-slate-500 focus:outline-none focus:border-purple-500 resize-none"
                  rows={3}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleReply(comment.id)}
                    className="px-4 py-2 bg-purple-500 text-white rounded-lg text-responsive-sm font-medium hover:bg-purple-600 transition-colors"
                  >
                    ارسال پاسخ
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
              <button
                onClick={() => setReplyingTo(comment.id)}
                className="text-purple-400 hover:text-purple-300 text-responsive-sm font-medium transition-colors"
              >
                {t('owner.replyToComment')}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredComments.length === 0 && (
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
