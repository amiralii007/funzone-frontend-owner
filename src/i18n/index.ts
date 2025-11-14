import enTranslations from './translations/en.json'
import faTranslations from './translations/fa.json'

export type Language = 'en' | 'fa'

export const translations = {
  en: enTranslations,
  fa: faTranslations,
}

export const defaultLanguage: Language = 'fa'

export const rtlLanguages: Language[] = ['fa']

export function isRTL(language: Language): boolean {
  return rtlLanguages.includes(language)
}
