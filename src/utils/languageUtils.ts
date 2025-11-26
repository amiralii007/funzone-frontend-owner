/**
 * Language utility functions for FunZone Owner App
 */

export type Language = 'en' | 'fa'

export interface LanguageInfo {
  code: Language
  name: string
  nativeName: string
  flag: string
  direction: 'ltr' | 'rtl'
  locale: string
}

export const SUPPORTED_LANGUAGES: LanguageInfo[] = [
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇺🇸',
    direction: 'ltr',
    locale: 'en-US'
  },
  {
    code: 'fa',
    name: 'Persian',
    nativeName: 'فارسی',
    flag: '🇮🇷',
    direction: 'rtl',
    locale: 'fa-IR'
  }
]

/**
 * Detect user's preferred language based on browser settings and localStorage
 */
export const detectUserLanguage = (storageKey: string = 'owner-app-language'): Language => {
  // First check localStorage
  const savedLanguage = localStorage.getItem(storageKey) as Language
  if (savedLanguage && SUPPORTED_LANGUAGES.some(lang => lang.code === savedLanguage)) {
    return savedLanguage
  }

  // Then check browser language
  const browserLanguage = navigator.language.toLowerCase()
  
  // Check for Persian/Farsi
  if (browserLanguage.startsWith('fa') || 
      browserLanguage.includes('persian') || 
      browserLanguage.includes('farsi') ||
      browserLanguage.startsWith('ir')) {
    return 'fa'
  }
  
  // Check for English
  if (browserLanguage.startsWith('en')) {
    return 'en'
  }

  // Default fallback
  return 'en'
}

/**
 * Get language info by code
 */
export const getLanguageInfo = (code: Language): LanguageInfo | undefined => {
  return SUPPORTED_LANGUAGES.find(lang => lang.code === code)
}

/**
 * Check if a language is RTL
 */
export const isRTL = (language: Language): boolean => {
  return language === 'fa'
}

/**
 * Apply language settings to document
 */
export const applyLanguageSettings = (language: Language): void => {
  const languageInfo = getLanguageInfo(language)
  if (!languageInfo) return

  // Update document direction and language
  document.documentElement.dir = languageInfo.direction
  document.documentElement.lang = languageInfo.locale
  
  // Update body class for additional RTL styling if needed
  document.body.classList.remove('rtl', 'ltr')
  document.body.classList.add(languageInfo.direction)
  
  // Dispatch custom event for other components to listen to language changes
  window.dispatchEvent(new CustomEvent('languageChanged', { 
    detail: { language, isRTL: languageInfo.direction === 'rtl' } 
  }))
}

/**
 * Save language preference to localStorage
 */
export const saveLanguagePreference = (language: Language, storageKey: string = 'owner-app-language'): void => {
  localStorage.setItem(storageKey, language)
}

/**
 * Get language preference from localStorage
 */
export const getLanguagePreference = (storageKey: string = 'owner-app-language'): Language | null => {
  const saved = localStorage.getItem(storageKey) as Language
  return SUPPORTED_LANGUAGES.some(lang => lang.code === saved) ? saved : null
}

/**
 * Format number according to language locale
 */
export const formatNumber = (number: number, language: Language): string => {
  const languageInfo = getLanguageInfo(language)
  if (!languageInfo) return number.toString()
  
  return new Intl.NumberFormat(languageInfo.locale).format(number)
}

/**
 * Format date according to language locale
 */
export const formatDate = (date: Date, language: Language, options?: Intl.DateTimeFormatOptions): string => {
  const languageInfo = getLanguageInfo(language)
  if (!languageInfo) return date.toLocaleDateString()
  
  return new Intl.DateTimeFormat(languageInfo.locale, options).format(date)
}

/**
 * Format currency according to language locale
 */
export const formatCurrency = (amount: number, language: Language, currency: string = 'IRR'): string => {
  const languageInfo = getLanguageInfo(language)
  if (!languageInfo) return `${amount} ${currency}`
  
  return new Intl.NumberFormat(languageInfo.locale, {
    style: 'currency',
    currency: currency
  }).format(amount)
}
