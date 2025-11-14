import { useState, useEffect, useRef } from 'react'
import { toPersianNumbers } from '../utils/persianNumbers'
import type { Language } from '../i18n'

interface TimePickerProps {
  value: string
  onChange: (value: string) => void
  className?: string
  required?: boolean
  disabled?: boolean
  language?: Language
}

export default function TimePicker({ 
  value, 
  onChange, 
  className = '', 
  required = false,
  disabled = false,
  language = 'fa'
}: TimePickerProps) {
  const [selectedHour, setSelectedHour] = useState('')
  const [selectedMinute, setSelectedMinute] = useState('')
  const [isHourOpen, setIsHourOpen] = useState(false)
  const [isMinuteOpen, setIsMinuteOpen] = useState(false)
  const hourRef = useRef<HTMLDivElement>(null)
  const minuteRef = useRef<HTMLDivElement>(null)

  // Initialize from value
  useEffect(() => {
    if (value) {
      const [hour, minute] = value.split(':')
      setSelectedHour(hour || '')
      setSelectedMinute(minute || '')
    } else {
      setSelectedHour('')
      setSelectedMinute('')
    }
  }, [value])

  // Handle hour selection
  const handleHourSelect = (hour: string) => {
    setSelectedHour(hour)
    const newTime = `${hour}:${selectedMinute || '00'}`
    onChange(newTime)
    setIsHourOpen(false)
  }

  // Handle minute selection
  const handleMinuteSelect = (minute: string) => {
    setSelectedMinute(minute)
    const newTime = `${selectedHour || '00'}:${minute}`
    onChange(newTime)
    setIsMinuteOpen(false)
  }

  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (hourRef.current && !hourRef.current.contains(event.target as Node)) {
        setIsHourOpen(false)
      }
      if (minuteRef.current && !minuteRef.current.contains(event.target as Node)) {
        setIsMinuteOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Generate hour options (0-23)
  const hourOptions = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'))
  
  // Generate minute options (00, 15, 30, 45)
  const minuteOptions = ['00', '15', '30', '45']

  // Get color for hour boxes
  const getHourColor = (hour: string) => {
    const hourNum = parseInt(hour)
    if (hourNum >= 5 && hourNum < 12) {
      return 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white' // Morning
    } else if (hourNum >= 12 && hourNum < 17) {
      return 'bg-gradient-to-r from-blue-400 to-cyan-500 text-white' // Afternoon
    } else if (hourNum >= 17 && hourNum < 20) {
      return 'bg-gradient-to-r from-purple-400 to-pink-500 text-white' // Evening
    } else {
      return 'bg-gradient-to-r from-indigo-400 to-blue-500 text-white' // Night
    }
  }

  // Get color for minute boxes
  const getMinuteColor = (minute: string) => {
    switch (minute) {
      case '00':
        return 'bg-gradient-to-r from-green-400 to-emerald-500 text-white' // Green for :00
      case '15':
        return 'bg-gradient-to-r from-blue-400 to-cyan-500 text-white' // Blue for :15
      case '30':
        return 'bg-gradient-to-r from-purple-400 to-pink-500 text-white' // Purple for :30
      case '45':
        return 'bg-gradient-to-r from-orange-400 to-red-500 text-white' // Orange for :45
      default:
        return 'bg-gradient-to-r from-slate-400 to-slate-500 text-white'
    }
  }

  return (
    <div className={`grid grid-cols-2 gap-3 ${className}`}>
      {/* Minute Selection - Left side */}
      <div className="relative" ref={minuteRef}>
        <button
          type="button"
          onClick={() => setIsMinuteOpen(!isMinuteOpen)}
          className="input-field w-full text-left flex items-center justify-between"
          disabled={disabled}
        >
          <span>{selectedMinute ? (language === 'fa' ? toPersianNumbers(selectedMinute) : selectedMinute) : (language === 'fa' ? 'دقیقه' : 'Minute')}</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {isMinuteOpen && (
          <div className="absolute z-50 mt-1 w-full bg-slate-800 border border-slate-600 rounded-lg shadow-lg">
            <div className="grid grid-cols-2 gap-1 p-2">
              {minuteOptions.map((minute) => (
                <button
                  key={minute}
                  type="button"
                  onClick={() => handleMinuteSelect(minute)}
                  className={`px-3 py-2 text-xs rounded-lg font-bold transition-all duration-200 flex items-center justify-center ${
                    selectedMinute === minute
                      ? `${getMinuteColor(minute)} shadow-lg scale-105`
                      : `${getMinuteColor(minute)} hover:scale-105 hover:shadow-md`
                  }`}
                >
                  {language === 'fa' ? toPersianNumbers(minute) : minute}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Hour Selection - Right side */}
      <div className="relative" ref={hourRef}>
        <button
          type="button"
          onClick={() => setIsHourOpen(!isHourOpen)}
          className="input-field w-full text-left flex items-center justify-between"
          disabled={disabled}
        >
          <span>{selectedHour ? (language === 'fa' ? toPersianNumbers(selectedHour) : selectedHour) : (language === 'fa' ? 'ساعت' : 'Hour')}</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {isHourOpen && (
          <div className="absolute z-50 mt-1 w-full bg-slate-800 border border-slate-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            <div className="grid grid-cols-4 gap-1 p-2">
              {hourOptions.map((hour) => (
                <button
                  key={hour}
                  type="button"
                  onClick={() => handleHourSelect(hour)}
                  className={`px-2 py-2 text-xs rounded-lg font-bold transition-all duration-200 flex items-center justify-center ${
                    selectedHour === hour
                      ? `${getHourColor(hour)} shadow-lg scale-105`
                      : `${getHourColor(hour)} hover:scale-105 hover:shadow-md`
                  }`}
                >
                  {language === 'fa' ? toPersianNumbers(hour) : hour}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
