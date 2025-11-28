/**
 * Utility functions for converting numbers to Persian numerals
 */

import type { Language } from '../i18n'
import { formatEventDate } from './solarHijriCalendar'

// Persian numerals mapping
const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
const englishDigits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

/**
 * Converts English digits to Persian digits
 * @param text - String containing numbers to convert
 * @returns String with Persian digits
 */
export function toPersianNumbers(text: string | number): string {
  if (typeof text === 'number') {
    text = text.toString();
  }
  
  return text.replace(/[0-9]/g, (digit) => {
    return persianDigits[parseInt(digit)];
  });
}

/**
 * Converts Persian digits to English digits
 * @param text - String containing Persian numbers to convert
 * @returns String with English digits
 */
export function toEnglishNumbers(text: string): string {
  return text.replace(/[۰-۹]/g, (digit) => {
    const index = persianDigits.indexOf(digit);
    return index !== -1 ? englishDigits[index] : digit;
  });
}

/**
 * Formats a number with Persian digits and proper currency formatting
 * @param amount - The amount to format
 * @param currency - The currency symbol (default: 'تومان')
 * @param decimals - Number of decimal places (default: 0)
 * @returns Formatted string with Persian digits and currency
 */
export function formatPersianCurrency(amount: number, currency: string = 'تومان', decimals: number = 0): string {
  // Round to integer if decimals is 0
  const roundedAmount = decimals === 0 ? Math.round(amount) : amount;
  const formattedAmount = roundedAmount.toFixed(decimals);
  const persianAmount = toPersianNumbers(formattedAmount);
  
  // Add thousand separators for Persian digits
  const parts = persianAmount.split('.');
  // Match Persian digits [۰-۹] instead of \d
  parts[0] = parts[0].replace(/\B(?=([۰-۹]{3})+(?![۰-۹]))/g, '،');
  // Remove any leading or trailing commas
  parts[0] = parts[0].replace(/^،+|،+$/g, '');
  
  // If decimals is 0, only return the integer part (no decimal point)
  if (decimals === 0) {
    return `${parts[0]} ${currency}`;
  }
  
  return `${parts.join('.')} ${currency}`;
}

/**
 * Formats a number with Persian digits and thousand separators
 * @param number - The number to format
 * @param decimals - Number of decimal places (default: 0)
 * @returns Formatted string with Persian digits
 */
export function formatPersianNumber(number: number, decimals: number = 0): string {
  const formattedNumber = number.toFixed(decimals);
  const persianNumber = toPersianNumbers(formattedNumber);
  
  // Add thousand separators for Persian digits
  const parts = persianNumber.split('.');
  // Match Persian digits [۰-۹] instead of \d
  parts[0] = parts[0].replace(/\B(?=([۰-۹]{3})+(?![۰-۹]))/g, '،');
  // Remove any leading or trailing commas
  parts[0] = parts[0].replace(/^،+|،+$/g, '');
  
  return parts.join('.');
}

/**
 * Converts a percentage to Persian format
 * @param percentage - The percentage value
 * @param decimals - Number of decimal places (default: 0)
 * @returns Formatted percentage with Persian digits
 */
export function formatPersianPercentage(percentage: number, decimals: number = 0): string {
  const formattedPercentage = percentage.toFixed(decimals);
  const persianPercentage = toPersianNumbers(formattedPercentage);
  
  return `${persianPercentage}%`;
}

/**
 * Formats time in Persian with AM/PM indicators
 * @param timeString - Time string in HH:MM format
 * @returns Formatted time with Persian digits and AM/PM
 */
export function formatPersianTime(timeString: string): string {
  if (!timeString) return '';
  
  try {
    // Clean the time string and validate format
    const cleanTime = timeString.trim().replace(/[^\d:]/g, '');
    const timeMatch = cleanTime.match(/^(\d{1,2}):(\d{2})$/);
    
    if (!timeMatch) {
      console.warn('Invalid time format:', timeString);
      return timeString;
    }
    
    const [, hoursStr, minutesStr] = timeMatch;
    const hour = parseInt(hoursStr);
    const minute = parseInt(minutesStr);
    
    // Validate time ranges
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      console.warn('Invalid time values:', { hour, minute });
      return timeString;
    }
    
    // Convert to 12-hour format for Persian display
    let displayHour = hour;
    let period = 'ق.ظ'; // Morning
    
    if (hour >= 12) {
      period = 'ب.ظ'; // Afternoon
      if (hour > 12) {
        displayHour = hour - 12;
      }
    }
    
    if (hour === 0) {
      displayHour = 12;
    }
    
    // Convert to Persian numbers
    const persianHour = toPersianNumbers(displayHour.toString());
    const persianMinute = toPersianNumbers(minute.toString().padStart(2, '0'));
    
    return `${persianHour}:${persianMinute} ${period}`;
  } catch (error) {
    console.error('Error formatting Persian time:', error);
    return timeString;
  }
}

/**
 * Formats time range in Persian format
 * @param startTime - Start time string in HH:MM format
 * @param endTime - End time string in HH:MM format
 * @returns Formatted time range with Persian digits
 */
export function formatPersianTimeRange(startTime: string, endTime: string): string {
  try {
    const start = new Date(`2000-01-01T${startTime}:00`);
    const end = new Date(`2000-01-01T${endTime}:00`);
    
    // Format time as HH:MM with Persian numbers
    const startTimeStr = formatPersianTime(startTime);
    const endTimeStr = formatPersianTime(endTime);
    
    return `${startTimeStr} - ${endTimeStr}`;
  } catch (error) {
    console.error('Error formatting Persian time range:', error);
    return `${startTime} - ${endTime}`;
  }
}

/**
 * Formats countdown time in Persian format
 * @param hours - Hours remaining
 * @param minutes - Minutes remaining
 * @param seconds - Seconds remaining
 * @returns Formatted countdown with Persian digits
 */
export function formatPersianCountdown(hours: number, minutes: number, seconds: number): string {
  const persianHours = toPersianNumbers(hours.toString().padStart(2, '0'));
  const persianMinutes = toPersianNumbers(minutes.toString().padStart(2, '0'));
  const persianSeconds = toPersianNumbers(seconds.toString().padStart(2, '0'));
  
  return `${persianHours}:${persianMinutes}:${persianSeconds}`;
}

/**
 * Language-aware number formatting functions
 */

/**
 * Formats a number based on the current language
 * @param number - The number to format
 * @param language - The current language
 * @param decimals - Number of decimal places (default: 0)
 * @returns Formatted string with appropriate digits
 */
export function formatNumber(number: number | undefined | null, language: Language, decimals: number = 0): string {
  // Handle undefined, null, or non-number values
  if (number === undefined || number === null || typeof number !== 'number' || isNaN(number)) {
    return language === 'fa' ? '۰' : '0';
  }
  
  const formattedNumber = number.toFixed(decimals);
  
  if (language === 'fa') {
    // Use Persian formatting
    const persianNumber = toPersianNumbers(formattedNumber);
    const parts = persianNumber.split('.');
    // Match Persian digits [۰-۹] instead of \d
    parts[0] = parts[0].replace(/\B(?=([۰-۹]{3})+(?![۰-۹]))/g, '،');
    // Remove any leading or trailing commas
    parts[0] = parts[0].replace(/^،+|،+$/g, '');
    return parts.join('.');
  } else {
    // Use English formatting
    const parts = formattedNumber.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    // Remove any leading or trailing commas
    parts[0] = parts[0].replace(/^,+|,+$/g, '');
    return parts.join('.');
  }
}

/**
 * Formats currency based on the current language
 * @param amount - The amount to format
 * @param language - The current language
 * @param currency - The currency symbol
 * @param decimals - Number of decimal places (default: 0)
 * @returns Formatted string with appropriate digits and currency
 */
export function formatCurrency(amount: number | undefined | null, language: Language, currency: string = 'تومان', decimals: number = 0): string {
  // Handle undefined, null, or non-number values
  if (amount === undefined || amount === null || typeof amount !== 'number' || isNaN(amount)) {
    return language === 'fa' ? `۰ ${currency}` : `0 ${currency}`;
  }
  
  // Round to integer if decimals is 0
  const roundedAmount = decimals === 0 ? Math.round(amount) : amount;
  const formattedAmount = roundedAmount.toFixed(decimals);
  
  if (language === 'fa') {
    // Use Persian formatting
    const persianAmount = toPersianNumbers(formattedAmount);
    const parts = persianAmount.split('.');
    // Match Persian digits [۰-۹] instead of \d
    parts[0] = parts[0].replace(/\B(?=([۰-۹]{3})+(?![۰-۹]))/g, '،');
    // Remove any leading or trailing commas
    parts[0] = parts[0].replace(/^،+|،+$/g, '');
    
    // If decimals is 0, only return the integer part (no decimal point)
    if (decimals === 0) {
      return `${parts[0]} ${currency}`;
    }
    
    return `${parts.join('.')} ${currency}`;
  } else {
    // Use English formatting
    const parts = formattedAmount.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    // Remove any leading or trailing commas
    parts[0] = parts[0].replace(/^,+|,+$/g, '');
    
    // If decimals is 0, only return the integer part (no decimal point)
    if (decimals === 0) {
      return `${parts[0]} ${currency}`;
    }
    
    return `${parts.join('.')} ${currency}`;
  }
}

/**
 * Formats date based on the current language
 * @param date - Date object or ISO string
 * @param language - The current language
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted date string with appropriate digits
 */
export function formatDate(date: Date | string, language: Language, options?: Intl.DateTimeFormatOptions): string {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    if (isNaN(dateObj.getTime())) {
      return '';
    }
    
    if (language === 'fa') {
      // Use Persian formatting with Solar Hijri calendar
      return formatEventDate(dateObj);
    } else {
      // Use English formatting with Gregorian calendar
      return dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        ...options
      });
    }
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
}

/**
 * Formats time based on the current language
 * @param timeString - Time string in HH:MM format
 * @param language - The current language
 * @returns Formatted time with appropriate digits
 */
export function formatTime(timeString: string, language: Language): string {
  if (!timeString) return '';
  
  try {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const minute = parseInt(minutes);
    
    // Convert to 12-hour format
    let displayHour = hour;
    let period = language === 'fa' ? 'ق.ظ' : 'AM';
    
    if (hour >= 12) {
      period = language === 'fa' ? 'ب.ظ' : 'PM';
      if (hour > 12) {
        displayHour = hour - 12;
      }
    }
    
    if (hour === 0) {
      displayHour = 12;
    }
    
    // Format based on language
    if (language === 'fa') {
      const persianHour = toPersianNumbers(displayHour.toString());
      const persianMinute = toPersianNumbers(minute.toString().padStart(2, '0'));
      return `${persianHour}:${persianMinute} ${period}`;
    } else {
      const englishMinute = minute.toString().padStart(2, '0');
      return `${displayHour}:${englishMinute} ${period}`;
    }
  } catch (error) {
    console.error('Error formatting time:', error);
    return timeString;
  }
}

/**
 * Formats time in a more user-friendly Persian format
 * @param timeString - Time string in HH:MM format
 * @returns Formatted time with better Persian display
 */
export function formatPersianTimeFriendly(timeString: string): string {
  if (!timeString) return '';
  
  try {
    // Clean and validate the time string
    const cleanTime = timeString.trim().replace(/[^\d:]/g, '');
    const timeMatch = cleanTime.match(/^(\d{1,2}):(\d{2})$/);
    
    if (!timeMatch) {
      return timeString;
    }
    
    const [, hoursStr, minutesStr] = timeMatch;
    const hour = parseInt(hoursStr);
    const minute = parseInt(minutesStr);
    
    // Validate time ranges
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      return timeString;
    }
    
    // Convert to 12-hour format
    let displayHour = hour;
    let period = 'صبح'; // Morning
    
    if (hour >= 12) {
      period = 'بعدازظهر'; // Afternoon
      if (hour > 12) {
        displayHour = hour - 12;
      }
    }
    
    if (hour === 0) {
      displayHour = 12;
    }
    
    // Convert to Persian numbers
    const persianHour = toPersianNumbers(displayHour.toString());
    const persianMinute = toPersianNumbers(minute.toString().padStart(2, '0'));
    
    // Add time period description
    let timeDescription = '';
    if (hour >= 6 && hour < 12) {
      timeDescription = 'صبح';
    } else if (hour >= 12 && hour < 17) {
      timeDescription = 'ظهر';
    } else if (hour >= 17 && hour < 20) {
      timeDescription = 'عصر';
    } else {
      timeDescription = 'شب';
    }
    
    return `${persianHour}:${persianMinute} ${timeDescription}`;
  } catch (error) {
    console.error('Error formatting friendly Persian time:', error);
    return timeString;
  }
}

/**
 * Extracts and formats time from ISO datetime string in 24-hour format
 * @param isoString - ISO datetime string (e.g., "2026-04-15T02:30:00Z")
 * @returns Formatted time in 24-hour format with Persian numbers
 */
export function formatTimeFromISO(isoString: string): string {
  if (!isoString) return '';
  
  try {
    // Parse the ISO string
    const date = new Date(isoString);
    
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      console.warn('Invalid ISO date string:', isoString);
      return isoString;
    }
    
    // Extract hours and minutes in 24-hour format
    const hours = date.getHours();
    const minutes = date.getMinutes();
    
    // Format as HH:MM with Persian numbers
    const persianHours = toPersianNumbers(hours.toString().padStart(2, '0'));
    const persianMinutes = toPersianNumbers(minutes.toString().padStart(2, '0'));
    
    return `${persianHours}:${persianMinutes}`;
  } catch (error) {
    console.error('Error formatting time from ISO:', error);
    return isoString;
  }
}

/**
 * Smart time formatter that handles both ISO strings and regular time strings
 * @param timeString - Time string (ISO or HH:MM format)
 * @returns Formatted time in 24-hour format
 */
export function formatTimeSmart(timeString: string): string {
  if (!timeString) return '';
  
  // Check if it's an ISO datetime string
  if (timeString.includes('T') && (timeString.includes('Z') || timeString.includes('+'))) {
    return formatTimeFromISO(timeString);
  }
  
  // Handle regular time strings
  try {
    const cleanTime = timeString.trim().replace(/[^\d:]/g, '');
    const timeMatch = cleanTime.match(/^(\d{1,2}):(\d{2})$/);
    
    if (!timeMatch) {
      return timeString;
    }
    
    const [, hoursStr, minutesStr] = timeMatch;
    const hour = parseInt(hoursStr);
    const minute = parseInt(minutesStr);
    
    // Validate time ranges
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      return timeString;
    }
    
    // Format as HH:MM with Persian numbers
    const persianHours = toPersianNumbers(hour.toString().padStart(2, '0'));
    const persianMinutes = toPersianNumbers(minute.toString().padStart(2, '0'));
    
    return `${persianHours}:${persianMinutes}`;
  } catch (error) {
    console.error('Error formatting smart time:', error);
    return timeString;
  }
}

/**
 * Formats time in 24-hour format based on the current language
 * @param timeString - Time string in HH:MM format
 * @param language - The current language
 * @returns Formatted time with appropriate digits in 24-hour format
 */
export function formatTime24(timeString: string, language: Language): string {
  if (!timeString) return '';
  
  try {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const minute = parseInt(minutes);
    
    // Format based on language
    if (language === 'fa') {
      const persianHour = toPersianNumbers(hour.toString().padStart(2, '0'));
      const persianMinute = toPersianNumbers(minute.toString().padStart(2, '0'));
      return `${persianHour}:${persianMinute}`;
    } else {
      const englishHour = hour.toString().padStart(2, '0');
      const englishMinute = minute.toString().padStart(2, '0');
      return `${englishHour}:${englishMinute}`;
    }
  } catch (error) {
    console.error('Error formatting 24-hour time:', error);
    return timeString;
  }
}

/**
 * Formats time range in 24-hour format based on the current language
 * @param startTime - Start time string in HH:MM format or ISO string
 * @param endTime - End time string in HH:MM format or ISO string
 * @param language - The current language
 * @returns Formatted time range with appropriate digits in 24-hour format
 */
export function formatTimeRange24(startTime: string, endTime: string, language: Language): string {
  if (!startTime || !endTime) return '';
  
  try {
    const startFormatted = formatTime24(startTime, language);
    const endFormatted = formatTime24(endTime, language);
    return `${startFormatted} - ${endFormatted}`;
  } catch (error) {
    console.error('Error formatting 24-hour time range:', error);
    return '';
  }
}

/**
 * Formats a number with commas for input field display (English numbers only)
 * @param value - The number or string to format
 * @returns Formatted string with commas (e.g., "1,000,000")
 */
export function formatNumberWithCommas(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') {
    return '';
  }
  
  // Convert to string and remove any existing commas
  const numStr = String(value).replace(/,/g, '');
  
  // Check if it's a valid number
  if (numStr === '' || isNaN(Number(numStr))) {
    return numStr;
  }
  
  // Add commas every 3 digits
  const formatted = numStr.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  // Remove any leading or trailing commas
  return formatted.replace(/^,+|,+$/g, '');
}

/**
 * Parses a formatted number string (with commas) back to a number
 * @param value - The formatted string (e.g., "1,000,000")
 * @returns The numeric value or 0 if invalid
 */
export function parseFormattedNumber(value: string): number {
  if (!value || value === '') {
    return 0;
  }
  
  // Remove all commas and parse
  const cleaned = value.replace(/,/g, '');
  const parsed = parseInt(cleaned, 10);
  
  return isNaN(parsed) ? 0 : parsed;
}

