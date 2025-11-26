import React, { useState, useEffect } from 'react'
import DatePicker from 'react-multi-date-picker'
import persian from 'react-date-object/calendars/persian'
import persian_fa from 'react-date-object/locales/persian_fa'
import { 
  formatSolarHijriInputDate, 
  parseSolarHijriDate, 
  getCurrentSolarHijriDate,
  gregorianToSolarHijri,
  solarHijriToGregorian,
  toPersianNumbers,
  toEnglishNumbers
} from '../utils/solarHijriCalendar'

import type { Language } from '../i18n'
import gregorian_en from 'react-date-object/locales/gregorian_en'

interface SolarHijriDatePickerProps {
  value: string
  onChange: (value: string) => void
  min?: string
  max?: string
  className?: string
  required?: boolean
  disabled?: boolean
  allowPastDates?: boolean
  language?: Language
}

export default function SolarHijriDatePicker({ 
  value, 
  onChange, 
  min, 
  max, 
  className = '', 
  required = false,
  disabled = false,
  allowPastDates = false,
  language = 'fa'
}: SolarHijriDatePickerProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  // Initialize selected date from value
  useEffect(() => {
    if (value) {
      try {
        // Parse the ISO date string and create a Date object
        const date = new Date(value)
        if (!isNaN(date.getTime())) {
          setSelectedDate(date)
        }
      } catch (error) {
        console.error('Error parsing date:', error)
        setSelectedDate(null)
      }
    } else {
      setSelectedDate(null)
    }
  }, [value])

  // Handle date change from the picker
  const handleDateChange = (date: any) => {
    if (date) {
      try {
        // Convert the date object to ISO string
        const isoString = date.toDate().toISOString().split('T')[0]
        onChange(isoString)
      } catch (error) {
        console.error('Error converting date:', error)
      }
    } else {
      onChange('')
    }
  }

  // Convert min/max dates to Date objects
  const getMinDate = () => {
    if (min) {
      return new Date(min)
    }
    if (!allowPastDates) {
      return new Date()
    }
    return undefined
  }

  const getMaxDate = () => {
    if (max) {
      return new Date(max)
    }
    return undefined
  }

  return (
    <div className={`w-full ${className}`}>
      <DatePicker
        value={selectedDate}
        onChange={handleDateChange}
        calendar={language === 'fa' ? persian : undefined}
        locale={language === 'fa' ? persian_fa : gregorian_en}
        minDate={getMinDate()}
        maxDate={getMaxDate()}
        disabled={disabled}
        required={required}
        format="YYYY/MM/DD"
        calendarPosition="bottom-right"
        containerClassName="w-full"
        inputClass={`input-field w-full ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        placeholder={language === 'fa' ? 'تاریخ را انتخاب کنید' : 'Select date'}
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: 'transparent',
          border: 'none',
          outline: 'none',
          color: 'inherit',
          fontSize: 'inherit',
          fontFamily: 'inherit'
        }}
        // Custom render for the input
        render={(value: string, openCalendar: () => void) => (
          <div 
            className={`input-field w-full cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={!disabled ? openCalendar : undefined}
          >
            {value || (language === 'fa' ? 'تاریخ را انتخاب کنید' : 'Select date')}
          </div>
        )}
      />
    </div>
  )
}