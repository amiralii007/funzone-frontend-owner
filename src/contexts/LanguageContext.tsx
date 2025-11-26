import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { translations, defaultLanguage, isRTL } from '../i18n'
import type { Language } from '../i18n'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
  isRTL: boolean
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

interface LanguageProviderProps {
  children: ReactNode
}

// Function to detect user's preferred language
const detectUserLanguage = (): Language => {
  // First check localStorage
  const savedLanguage = localStorage.getItem('owner-app-language') as Language
  if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'fa')) {
    return savedLanguage
  }

  // Then check browser language
  const browserLanguage = navigator.language.toLowerCase()
  
  // Check for Persian/Farsi
  if (browserLanguage.startsWith('fa') || browserLanguage.includes('persian') || browserLanguage.includes('farsi')) {
    return 'fa'
  }
  
  // Check for English
  if (browserLanguage.startsWith('en')) {
    return 'en'
  }

  // Default fallback
  return defaultLanguage
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<Language>(detectUserLanguage)

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem('owner-app-language', lang)
    
    // Update document direction and language
    const isRTL = lang === 'fa'
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr'
    document.documentElement.lang = lang
    
    // Update body class for additional RTL styling if needed
    document.body.classList.remove('rtl', 'ltr')
    document.body.classList.add(isRTL ? 'rtl' : 'ltr')
    
    // Dispatch custom event for other components to listen to language changes
    window.dispatchEvent(new CustomEvent('languageChanged', { 
      detail: { language: lang, isRTL } 
    }))
  }

  const t = (key: string): string => {
    const keys = key.split('.')
    let value: any = translations[language]
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k]
      } else {
        return key // Return key if translation not found
      }
    }
    
    return typeof value === 'string' ? value : key
  }

  useEffect(() => {
    document.documentElement.dir = isRTL(language) ? 'rtl' : 'ltr'
    document.documentElement.lang = language
  }, [language])

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRTL: isRTL(language) }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
