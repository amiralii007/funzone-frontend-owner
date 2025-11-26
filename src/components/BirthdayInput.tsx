import React, { useState, useEffect, useRef } from 'react'
import { toPersianNumbers } from '../utils/persianNumbers'

interface BirthdayInputProps {
  value: string // ISO date string (YYYY-MM-DD)
  onChange: (value: string) => void
  className?: string
}

export default function BirthdayInput({ value, onChange, className = '' }: BirthdayInputProps) {
  const [year, setYear] = useState('')
  const [month, setMonth] = useState('')
  const [day, setDay] = useState('')
  const isInitialized = useRef(false)
  const lastValue = useRef(value)

  // Persian month names
  const persianMonths = [
    'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
    'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
  ]

  // Initialize from value only once or when value actually changes from outside
  useEffect(() => {
    if (value !== lastValue.current) {
      lastValue.current = value
      console.log('BirthdayInput: Initializing with value:', value)
      if (value) {
        try {
          const date = new Date(value)
          console.log('BirthdayInput: Parsing date:', value, 'Parsed date object:', date)
          
          // More accurate Solar Hijri conversion
          const gregorianYear = date.getFullYear()
          const gregorianMonth = date.getMonth() + 1
          const gregorianDay = date.getDate()
          
          // Convert to Solar Hijri (approximate)
          const solarYear = gregorianYear - 621
          const solarMonth = gregorianMonth
          const solarDay = gregorianDay
          
          console.log('BirthdayInput: Gregorian - Year:', gregorianYear, 'Month:', gregorianMonth, 'Day:', gregorianDay)
          console.log('BirthdayInput: Solar - Year:', solarYear, 'Month:', solarMonth, 'Day:', solarDay)
          
          setYear(solarYear.toString())
          setMonth(solarMonth.toString())
          setDay(solarDay.toString())
        } catch (error) {
          console.error('Error parsing birthday:', error)
        }
      } else {
        console.log('BirthdayInput: Clearing values')
        setYear('')
        setMonth('')
        setDay('')
      }
      isInitialized.current = true
    }
  }, [value])

  // Update parent when values change - but only after initialization
  useEffect(() => {
    if (!isInitialized.current) return
    
    if (year && month && day) {
      try {
        const gregorianYear = parseInt(year) + 621
        const gregorianMonth = parseInt(month)
        const gregorianDay = parseInt(day)
        
        if (gregorianYear > 1900 && gregorianYear < 2100 && 
            gregorianMonth >= 1 && gregorianMonth <= 12 && 
            gregorianDay >= 1 && gregorianDay <= 31) {
          const date = new Date(gregorianYear, gregorianMonth - 1, gregorianDay)
          const isoString = date.toISOString().split('T')[0]
          if (isoString !== lastValue.current) {
            lastValue.current = isoString
            onChange(isoString)
          }
        }
      } catch (error) {
        console.error('Error converting birthday:', error)
      }
    } else if (!year && !month && !day && lastValue.current !== '') {
      lastValue.current = ''
      onChange('')
    }
  }, [year, month, day, onChange])

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setYear(e.target.value)
  }

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setMonth(e.target.value)
  }

  const handleDayChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setDay(e.target.value)
  }

  // Generate year options (from current year to 1300, descending order)
  const currentYear = new Date().getFullYear()
  const solarCurrentYear = currentYear - 621
  const yearOptions = []
  for (let y = solarCurrentYear; y >= 1300; y--) {
    yearOptions.push(y)
  }

  return (
    <div className={`grid grid-cols-3 gap-2 ${className}`}>
      {/* Year Select */}
      <div>
        <label className="block text-xs text-slate-400 mb-1">سال</label>
        <select
          value={year}
          onChange={handleYearChange}
          className="w-full px-2 py-2 bg-slate-800/40 border border-slate-600 rounded-lg text-slate-100 focus:border-purple-500 focus:outline-none transition-colors"
        >
          <option value="">انتخاب کنید</option>
          {yearOptions.map((yearOption) => (
            <option key={yearOption} value={yearOption}>
              {toPersianNumbers(yearOption.toString())}
            </option>
          ))}
        </select>
      </div>

      {/* Month Select */}
      <div>
        <label className="block text-xs text-slate-400 mb-1">ماه</label>
        <select
          value={month}
          onChange={handleMonthChange}
          className="w-full px-2 py-2 bg-slate-800/40 border border-slate-600 rounded-lg text-slate-100 focus:border-purple-500 focus:outline-none transition-colors"
        >
          <option value="">انتخاب کنید</option>
          {persianMonths.map((monthName, index) => (
            <option key={index} value={index + 1}>
              {monthName}
            </option>
          ))}
        </select>
      </div>

      {/* Day Select */}
      <div>
        <label className="block text-xs text-slate-400 mb-1">روز</label>
        <select
          value={day}
          onChange={handleDayChange}
          className="w-full px-2 py-2 bg-slate-800/40 border border-slate-600 rounded-lg text-slate-100 focus:border-purple-500 focus:outline-none transition-colors"
        >
          <option value="">انتخاب کنید</option>
          {Array.from({ length: 31 }, (_, i) => i + 1).map((dayOption) => (
            <option key={dayOption} value={dayOption}>
              {toPersianNumbers(dayOption.toString())}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
