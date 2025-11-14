import { useState, useEffect } from 'react'
import { getTimeUntilTicketClosing, formatTimeUntilTicketClosing } from '../utils/eventStatusUpdater'
import type { Event } from '../types/owner'

interface TimerProps {
  event: Event
  className?: string
}

export default function Timer({ event, className = '' }: TimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
  const [formattedTime, setFormattedTime] = useState<string | null>(null)

  useEffect(() => {
    const updateTimer = () => {
      const remaining = getTimeUntilTicketClosing(event)
      setTimeRemaining(remaining)
      setFormattedTime(remaining ? formatTimeUntilTicketClosing(event) : null)
    }

    // Update immediately
    updateTimer()

    // Update every minute
    const interval = setInterval(updateTimer, 60000)

    return () => clearInterval(interval)
  }, [event])

  if (!timeRemaining || !formattedTime) {
    return null
  }

  // Determine urgency level
  const isUrgent = timeRemaining <= 24 * 60 * 60 * 1000 // 24 hours
  const isCritical = timeRemaining <= 2 * 60 * 60 * 1000 // 2 hours

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`w-2 h-2 rounded-full ${
        isCritical ? 'bg-red-500 animate-pulse' :
        isUrgent ? 'bg-orange-500' :
        'bg-blue-500'
      }`} />
      <span className={`text-sm font-medium ${
        isCritical ? 'text-red-400' :
        isUrgent ? 'text-orange-400' :
        'text-blue-400'
      }`}>
        {formattedTime}
      </span>
      <span className="text-xs text-slate-500">
        تا بسته شدن فروش بلیت
      </span>
    </div>
  )
}
