import { useState } from 'react'
// import { useAuth } from '../state/authStore' // Unused for now
import { useLanguage } from '../contexts/LanguageContext'

export default function AnalyticsPage() {
  // const { state } = useAuth() // Unused for now
  const { t, isRTL } = useLanguage()

  // Real analytics data will be fetched from API
  const [analytics] = useState({
    totalRevenue: 0,
    monthlyRevenue: 0,
    weeklyRevenue: 0,
    dailyRevenue: 0,
    totalBookings: 0,
    averageRating: 0,
    topVenues: [] as Array<{ name: string; revenue: number; bookings: number }>,
    topEvents: [] as Array<{ name: string; revenue: number; bookings: number }>
  })
  // const [isLoading, setIsLoading] = useState(true) // Will be used when API is implemented

  return (
    <div className={`container-responsive p-responsive space-responsive ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Header */}
      <h1 className="text-responsive-xl font-bold">{t('owner.analytics')}</h1>

      {/* Revenue Overview */}
      <div className="space-y-4">
        <h2 className="text-responsive-lg font-semibold">{t('owner.revenue')}</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="glass-card p-4 text-center space-y-2">
            <div className="text-2xl sm:text-3xl font-bold text-green-400">{analytics.totalRevenue.toLocaleString()}</div>
            <div className="text-responsive-xs text-slate-400">{t('owner.totalRevenue')}</div>
          </div>
          <div className="glass-card p-4 text-center space-y-2">
            <div className="text-2xl sm:text-3xl font-bold text-blue-400">{analytics.monthlyRevenue.toLocaleString()}</div>
            <div className="text-responsive-xs text-slate-400">{t('owner.monthlyRevenue')}</div>
          </div>
          <div className="glass-card p-4 text-center space-y-2">
            <div className="text-2xl sm:text-3xl font-bold text-purple-400">{analytics.weeklyRevenue.toLocaleString()}</div>
            <div className="text-responsive-xs text-slate-400">{t('owner.weeklyRevenue')}</div>
          </div>
          <div className="glass-card p-4 text-center space-y-2">
            <div className="text-2xl sm:text-3xl font-bold text-yellow-400">{analytics.dailyRevenue.toLocaleString()}</div>
            <div className="text-responsive-xs text-slate-400">{t('owner.dailyRevenue')}</div>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="space-y-4">
        <h2 className="text-responsive-lg font-semibold">{t('owner.performanceMetrics')}</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="glass-card p-4 text-center space-y-2">
            <div className="text-2xl sm:text-3xl font-bold text-teal-400">{analytics.totalBookings.toLocaleString()}</div>
            <div className="text-responsive-xs text-slate-400">{t('owner.totalBookings')}</div>
          </div>
          <div className="glass-card p-4 text-center space-y-2">
            <div className="text-2xl sm:text-3xl font-bold text-orange-400">{analytics.averageRating}</div>
            <div className="text-responsive-xs text-slate-400">{t('owner.averageRating')}</div>
          </div>
        </div>
      </div>

      {/* Top Performing Venues */}
      <div className="space-y-4">
        <h2 className="text-responsive-lg font-semibold">{t('owner.topPerformingVenues')}</h2>
        <div className="space-y-3">
          {analytics.topVenues.map((venue, index) => (
            <div key={index} className="glass-card p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-teal-500 grid place-items-center text-white font-bold text-sm">
                  {index + 1}
                </div>
                <div>
                  <div className="font-semibold text-responsive-sm">{venue.name}</div>
                  <div className="text-responsive-xs text-slate-400">{venue.bookings} {t('owner.bookings')}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-responsive-sm text-green-400">{venue.revenue.toLocaleString()}</div>
                <div className="text-responsive-xs text-slate-400">{t('owner.revenue')}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Performing Events */}
      <div className="space-y-4">
        <h2 className="text-responsive-lg font-semibold">{t('owner.topPerformingEvents')}</h2>
        <div className="space-y-3">
          {analytics.topEvents.map((event, index) => (
            <div key={index} className="glass-card p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-teal-500 to-blue-500 grid place-items-center text-white font-bold text-sm">
                  {index + 1}
                </div>
                <div>
                  <div className="font-semibold text-responsive-sm">{event.name}</div>
                  <div className="text-responsive-xs text-slate-400">{event.bookings} {t('owner.bookings')}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-responsive-sm text-green-400">{event.revenue.toLocaleString()}</div>
                <div className="text-responsive-xs text-slate-400">{t('owner.revenue')}</div>
              </div>
            </div>
          ))}
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