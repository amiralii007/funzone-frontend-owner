import { useState, useEffect, useRef } from 'react'
import { toPersianNumbers } from '../utils/persianNumbers'

interface ClockTimePickerProps {
  value: string
  onChange: (value: string) => void
  className?: string
  required?: boolean
  disabled?: boolean
}

export default function ClockTimePicker({ 
  value, 
  onChange, 
  className = '', 
  required = false,
  disabled = false 
}: ClockTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedHour, setSelectedHour] = useState(0)
  const [selectedMinute, setSelectedMinute] = useState(0)
  const [displayValue, setDisplayValue] = useState('')
  const clockRef = useRef<HTMLDivElement>(null)

  // Initialize from value
  useEffect(() => {
    if (value) {
      const [hour, minute] = value.split(':').map(Number)
      setSelectedHour(hour || 0)
      setSelectedMinute(minute || 0)
      setDisplayValue(value)
    } else {
      setSelectedHour(0)
      setSelectedMinute(0)
      setDisplayValue('')
    }
  }, [value])

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (clockRef.current && !clockRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Handle hour selection
  const handleHourSelect = (hour: number) => {
    setSelectedHour(hour)
    const newTime = `${hour.toString().padStart(2, '0')}:${selectedMinute.toString().padStart(2, '0')}`
    setDisplayValue(newTime)
    onChange(newTime)
  }

  // Handle minute selection
  const handleMinuteSelect = (minute: number) => {
    setSelectedMinute(minute)
    const newTime = `${selectedHour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
    setDisplayValue(newTime)
    onChange(newTime)
  }

  // Generate hour options (0-23)
  const hourOptions = Array.from({ length: 24 }, (_, i) => i)
  
  // Generate minute options (0, 15, 30, 45 for better UX)
  const minuteOptions = [0, 15, 30, 45]

  // Get time period (morning, afternoon, evening, night)
  const getTimePeriod = (hour: number) => {
    if (hour >= 5 && hour < 12) return 'صبح'
    if (hour >= 12 && hour < 17) return 'ظهر'
    if (hour >= 17 && hour < 20) return 'عصر'
    return 'شب'
  }

  return (
    <div className={`relative ${className}`} ref={clockRef}>
      {/* Input field with clock icon */}
      <div className="relative">
        <input
          type="text"
          value={displayValue}
          onChange={(e) => {
            const inputValue = e.target.value
            setDisplayValue(inputValue)
            // Validate and update if it's a valid time format
            if (/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(inputValue)) {
              onChange(inputValue)
            }
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="ساعت:دقیقه"
          className="input-field w-full mt-1 pr-10"
          required={required}
          disabled={disabled}
          style={{ colorScheme: 'dark' }}
        />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors"
          disabled={disabled}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12,6 12,12 16,14"/>
          </svg>
        </button>
      </div>

      {/* Beautiful Clock dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-2 w-full max-w-sm sm:max-w-md bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-600 rounded-xl shadow-2xl backdrop-blur-sm">
          {/* Header */}
          <div className="p-4 border-b border-slate-700">
            <div className="text-center">
              <h3 className="text-sm font-semibold text-slate-200 mb-1">انتخاب زمان</h3>
              <div className="text-2xl font-bold text-white bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                {toPersianNumbers(selectedHour.toString().padStart(2, '0'))}:{toPersianNumbers(selectedMinute.toString().padStart(2, '0'))}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                {getTimePeriod(selectedHour)}
              </div>
            </div>
          </div>

          <div className="p-4">
             {/* Hour selection with beautiful design */}
             <div className="mb-6">
               <label className="block text-xs font-semibold text-slate-300 mb-3 flex items-center">
                 <svg className="w-4 h-4 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <circle cx="12" cy="12" r="10"/>
                   <polyline points="12,6 12,12 16,14"/>
                 </svg>
                 ساعت
               </label>
               
               {/* Mobile-friendly hour picker with scrollable wheel */}
               <div className="relative">
                 {/* Hour wheel container */}
                 <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-600">
                   <div className="flex items-center justify-center space-x-2 mb-4">
                     <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                     <div className="w-1 h-1 bg-slate-500 rounded-full"></div>
                     <div className="w-1 h-1 bg-slate-500 rounded-full"></div>
                     <div className="w-1 h-1 bg-slate-500 rounded-full"></div>
                     <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                   </div>
                   
                   {/* Hour selection with time periods */}
                   <div className="grid grid-cols-2 gap-3">
                     {/* Morning hours (5-10) */}
                     <div className="space-y-2">
                       <div className="text-xs text-yellow-400 font-medium text-center mb-2">صبح</div>
                       <div className="grid grid-cols-2 gap-1">
                         {hourOptions.filter(h => h >= 5 && h < 11).map((hour) => (
                           <button
                             key={hour}
                             type="button"
                             onClick={() => handleHourSelect(hour)}
                             className={`px-2 py-2 text-xs rounded-lg font-bold transition-all duration-200 ${
                               selectedHour === hour
                                 ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-lg'
                                 : 'bg-yellow-400/20 text-yellow-300 hover:bg-yellow-400/30 border border-yellow-400/30'
                             }`}
                           >
                             {toPersianNumbers(hour.toString().padStart(2, '0'))}
                           </button>
                         ))}
                       </div>
                     </div>
                     
                     {/* Afternoon hours (11-16) */}
                     <div className="space-y-2">
                       <div className="text-xs text-blue-400 font-medium text-center mb-2">ظهر</div>
                       <div className="grid grid-cols-2 gap-1">
                         {hourOptions.filter(h => h >= 11 && h < 17).map((hour) => (
                           <button
                             key={hour}
                             type="button"
                             onClick={() => handleHourSelect(hour)}
                             className={`px-2 py-2 text-xs rounded-lg font-bold transition-all duration-200 ${
                               selectedHour === hour
                                 ? 'bg-gradient-to-r from-blue-400 to-cyan-500 text-white shadow-lg'
                                 : 'bg-blue-400/20 text-blue-300 hover:bg-blue-400/30 border border-blue-400/30'
                             }`}
                           >
                             {toPersianNumbers(hour.toString().padStart(2, '0'))}
                           </button>
                         ))}
                       </div>
                     </div>
                     
                     {/* Evening hours (17-20) */}
                     <div className="space-y-2">
                       <div className="text-xs text-purple-400 font-medium text-center mb-2">عصر</div>
                       <div className="grid grid-cols-2 gap-1">
                         {hourOptions.filter(h => h >= 17 && h <= 20).map((hour) => (
                           <button
                             key={hour}
                             type="button"
                             onClick={() => handleHourSelect(hour)}
                             className={`px-2 py-2 text-xs rounded-lg font-bold transition-all duration-200 ${
                               selectedHour === hour
                                 ? 'bg-gradient-to-r from-purple-400 to-pink-500 text-white shadow-lg'
                                 : 'bg-purple-400/20 text-purple-300 hover:bg-purple-400/30 border border-purple-400/30'
                             }`}
                           >
                             {toPersianNumbers(hour.toString().padStart(2, '0'))}
                           </button>
                         ))}
                       </div>
                     </div>
                     
                     {/* Night hours (21-23, 0-4) */}
                     <div className="space-y-2">
                       <div className="text-xs text-indigo-400 font-medium text-center mb-2">شب</div>
                       <div className="grid grid-cols-2 gap-1">
                         {hourOptions.filter(h => h >= 21 || h < 5).map((hour) => (
                           <button
                             key={hour}
                             type="button"
                             onClick={() => handleHourSelect(hour)}
                             className={`px-2 py-2 text-xs rounded-lg font-bold transition-all duration-200 ${
                               selectedHour === hour
                                 ? 'bg-gradient-to-r from-indigo-400 to-blue-500 text-white shadow-lg'
                                 : 'bg-indigo-400/20 text-indigo-300 hover:bg-indigo-400/30 border border-indigo-400/30'
                             }`}
                           >
                             {toPersianNumbers(hour.toString().padStart(2, '0'))}
                           </button>
                         ))}
                       </div>
                     </div>
                   </div>
                   
                 </div>
               </div>
             </div>

            {/* Minute selection with beautiful design */}
            <div className="mb-6">
              <label className="block text-xs font-semibold text-slate-300 mb-3 flex items-center">
                <svg className="w-4 h-4 mr-2 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12,6 12,12 16,14"/>
                </svg>
                دقیقه
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {minuteOptions.map((minute) => (
                  <button
                    key={minute}
                    type="button"
                    onClick={() => handleMinuteSelect(minute)}
                    className={`px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm rounded-lg font-medium transition-all duration-200 transform hover:scale-105 ${
                      selectedMinute === minute
                        ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg shadow-purple-500/25'
                        : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600 hover:text-white border border-slate-600'
                    }`}
                  >
                    {toPersianNumbers(minute.toString().padStart(2, '0'))}
                  </button>
                ))}
              </div>
            </div>

             {/* Action buttons with beautiful design */}
             <div className="flex justify-center">
               <button
                 type="button"
                 onClick={() => setIsOpen(false)}
                 className="px-6 py-2 text-sm font-medium bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-all duration-200 transform hover:scale-105 flex items-center justify-center"
               >
                 <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                 </svg>
                 بستن
               </button>
             </div>
          </div>
        </div>
      )}
    </div>
  )
}
