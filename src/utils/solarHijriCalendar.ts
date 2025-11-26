/**
 * Solar Hijri Calendar Utility Functions
 * Provides conversion between Gregorian and Solar Hijri calendars
 * and formatting functions for Persian date display
 */

import { toJalaali, toGregorian, isValidJalaaliDate } from 'jalaali-js'

// Persian month names in Solar Hijri calendar
const PERSIAN_MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
];

// Persian day names
const PERSIAN_DAYS = [
  'شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه'
];

// Persian numerals
const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

/**
 * Converts Gregorian date to Solar Hijri date
 * @param gregorianDate - Date object or ISO string
 * @returns Object with Solar Hijri date components
 */
export function gregorianToSolarHijri(gregorianDate: Date | string): {
  year: number;
  month: number;
  day: number;
  monthName: string;
  dayName: string;
} {
  const date = typeof gregorianDate === 'string' ? new Date(gregorianDate) : gregorianDate;
  
  // Use the jalaali-js library for accurate conversion
  const jalaaliDate = toJalaali(date.getFullYear(), date.getMonth() + 1, date.getDate());
  
  // Get day of week
  const dayOfWeek = date.getDay();
  const persianDayName = PERSIAN_DAYS[dayOfWeek];
  
  return {
    year: jalaaliDate.jy,
    month: jalaaliDate.jm,
    day: jalaaliDate.jd,
    monthName: PERSIAN_MONTHS[jalaaliDate.jm - 1],
    dayName: persianDayName
  };
}

/**
 * Converts Solar Hijri date to Gregorian date
 * @param solarYear - Solar Hijri year
 * @param solarMonth - Solar Hijri month (1-12)
 * @param solarDay - Solar Hijri day
 * @returns Date object
 */
export function solarHijriToGregorian(solarYear: number, solarMonth: number, solarDay: number): Date {
  // Use the jalaali-js library for accurate conversion
  const gregorianDate = toGregorian(solarYear, solarMonth, solarDay);
  
  // Create date in local timezone to avoid timezone issues
  return new Date(gregorianDate.gy, gregorianDate.gm - 1, gregorianDate.gd);
}

/**
 * Formats a date in Solar Hijri format with Persian numerals
 * @param date - Date object or ISO string
 * @param format - Format string (default: 'YYYY/MM/DD')
 * @returns Formatted Persian date string
 */
export function formatSolarHijriDate(date: Date | string, format: string = 'YYYY/MM/DD'): string {
  const solarDate = gregorianToSolarHijri(date);
  
  // Convert numbers to Persian numerals
  const persianYear = toPersianNumbers(solarDate.year.toString());
  const persianMonth = toPersianNumbers(solarDate.month.toString().padStart(2, '0'));
  const persianDay = toPersianNumbers(solarDate.day.toString().padStart(2, '0'));
  
  return format
    .replace('YYYY', persianYear)
    .replace('MM', persianMonth)
    .replace('DD', persianDay)
    .replace('MMMM', solarDate.monthName)
    .replace('dddd', solarDate.dayName);
}

/**
 * Formats a date in Solar Hijri format for display in event cards
 * @param date - Date object or ISO string
 * @returns Formatted date string for display
 */
export function formatEventDate(date: Date | string): string {
  const solarDate = gregorianToSolarHijri(date);
  const persianDay = toPersianNumbers(solarDate.day.toString());
  const persianYear = toPersianNumbers(solarDate.year.toString());
  
  return `${persianDay} ${solarDate.monthName} ${persianYear}`;
}

/**
 * Formats a date in Solar Hijri format for input fields
 * @param date - Date object or ISO string
 * @returns Formatted date string for input (YYYY-MM-DD format)
 */
export function formatSolarHijriInputDate(date: Date | string): string {
  const solarDate = gregorianToSolarHijri(date);
  const year = solarDate.year.toString();
  const month = solarDate.month.toString().padStart(2, '0');
  const day = solarDate.day.toString().padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Converts Persian numerals to English numerals
 * @param text - String containing Persian numerals
 * @returns String with English numerals
 */
export function toEnglishNumbers(text: string): string {
  return text.replace(/[۰-۹]/g, (digit) => {
    const index = PERSIAN_DIGITS.indexOf(digit);
    return index !== -1 ? index.toString() : digit;
  });
}

/**
 * Converts English numerals to Persian numerals
 * @param text - String containing English numerals
 * @returns String with Persian numerals
 */
export function toPersianNumbers(text: string | number): string {
  if (typeof text === 'number') {
    text = text.toString();
  }
  
  return text.replace(/[0-9]/g, (digit) => {
    return PERSIAN_DIGITS[parseInt(digit)];
  });
}

/**
 * Gets the current Solar Hijri date
 * @returns Object with current Solar Hijri date components
 */
export function getCurrentSolarHijriDate() {
  const now = new Date();
  const jalaaliDate = toJalaali(now.getFullYear(), now.getMonth() + 1, now.getDate());
  const dayOfWeek = now.getDay();
  
  return {
    year: jalaaliDate.jy,
    month: jalaaliDate.jm,
    day: jalaaliDate.jd,
    monthName: PERSIAN_MONTHS[jalaaliDate.jm - 1],
    dayName: PERSIAN_DAYS[dayOfWeek]
  };
}

/**
 * Creates a date picker value for Solar Hijri calendar
 * @param date - Date object or ISO string
 * @returns Date string in YYYY-MM-DD format for Solar Hijri
 */
export function getSolarHijriDatePickerValue(date: Date | string): string {
  const solarDate = gregorianToSolarHijri(date);
  const year = solarDate.year.toString();
  const month = solarDate.month.toString().padStart(2, '0');
  const day = solarDate.day.toString().padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Parses a Solar Hijri date string and converts to Gregorian
 * @param solarDateString - Date string in YYYY-MM-DD format (Solar Hijri)
 * @returns Date object
 */
export function parseSolarHijriDate(solarDateString: string): Date {
  const [year, month, day] = solarDateString.split('-').map(num => parseInt(num));
  return solarHijriToGregorian(year, month, day);
}

/**
 * Gets Solar Hijri month name by number
 * @param monthNumber - Month number (1-12)
 * @returns Persian month name
 */
export function getSolarHijriMonthName(monthNumber: number): string {
  return PERSIAN_MONTHS[monthNumber - 1] || '';
}

/**
 * Gets Solar Hijri day name by number
 * @param dayNumber - Day number (0-6, where 0 is Saturday)
 * @returns Persian day name
 */
export function getSolarHijriDayName(dayNumber: number): string {
  return PERSIAN_DAYS[dayNumber] || '';
}
