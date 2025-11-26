import { useState, useEffect } from 'react'
import { formatPersianCountdown, toPersianNumbers } from '../utils/persianNumbers'

interface CartItemCountdownProps {
  expiresAt: string
  className?: string
}

export default function CartItemCountdown({ expiresAt, className = '' }: CartItemCountdownProps) {
  const [timeRemaining, setTimeRemaining] = useState<number>(0)
  const [isExpired, setIsExpired] = useState(false)

  useEffect(() => {
    const calculateTimeRemaining = () => {
      if (!expiresAt) {
        setIsExpired(true)
        setTimeRemaining(0)
        return
      }

      const expirationTime = new Date(expiresAt).getTime()
      const currentTime = new Date().getTime()
      const remaining = Math.max(0, Math.floor((expirationTime - currentTime) / 1000)) // Convert to seconds

      if (remaining <= 0) {
        setIsExpired(true)
        setTimeRemaining(0)
      } else {
        setIsExpired(false)
        setTimeRemaining(remaining)
      }
    }

    // Update immediately
    calculateTimeRemaining()

    // Update every second
    const interval = setInterval(calculateTimeRemaining, 1000)

    return () => clearInterval(interval)
  }, [expiresAt])

  if (isExpired) {
    return (
      <div className={`text-red-400 text-sm ${className}`}>
        {toPersianNumbers('منقضی شده')}
      </div>
    )
  }

  // Calculate hours, minutes, seconds
  const hours = Math.floor(timeRemaining / 3600)
  const minutes = Math.floor((timeRemaining % 3600) / 60)
  const seconds = timeRemaining % 60

  // Format as MM:SS if less than 1 hour, otherwise HH:MM:SS
  const formattedTime = hours > 0
    ? formatPersianCountdown(hours, minutes, seconds)
    : `${toPersianNumbers(minutes.toString().padStart(2, '0'))}:${toPersianNumbers(seconds.toString().padStart(2, '0'))}`

  return (
    <div className={`text-yellow-400 text-sm font-medium ${className}`}>
      {formattedTime}
    </div>
  )
}




