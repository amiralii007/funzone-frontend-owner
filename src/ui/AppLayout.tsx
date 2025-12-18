import { Outlet, NavLink } from 'react-router-dom'
import { useState } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import ScrollToTop from '../components/ScrollToTop'
// import { useAuth } from '../state/authStore' // Unused for now

const ASSET_BASE_URL = import.meta.env.BASE_URL || '/'

function TabLink({ to, label, icon }: { to: string; label: string; icon: string }) {
  const { t } = useLanguage()
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex flex-col items-center gap-1 px-2 sm:px-3 py-2 rounded-xl transition-all duration-200 ${
          isActive 
            ? 'text-white bg-gradient-to-r from-purple-500/20 to-teal-500/20 shadow-glow' 
            : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/40'
        }`
      }
    >
      <span className="text-lg sm:text-xl leading-none">{icon}</span>
      <span className="text-xs sm:text-sm font-medium leading-tight text-center">{t(label)}</span>
    </NavLink>
  )
}

function LanguageSwitcher() {
  const { language, setLanguage, isRTL } = useLanguage()
  const [isOpen, setIsOpen] = useState(false)
  
  const languages = [
    { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
    { code: 'fa', name: 'Persian', nativeName: 'فارسی', flag: '🇮🇷' }
  ]
  
  const currentLanguage = languages.find(lang => lang.code === language)
  
  const handleLanguageChange = (langCode: 'en' | 'fa') => {
    setLanguage(langCode)
    setIsOpen(false)
  }
  
  return (
    <div className="relative language-switcher">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="chip hover:scale-105 transition-transform text-xs sm:text-sm inline-flex items-center gap-1"
        aria-label="Change language"
      >
        <span className="text-base">{currentLanguage?.flag}</span>
        <span className="hidden xs:inline">{currentLanguage?.nativeName}</span>
        <svg 
          className={`w-3 h-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-dropdown-backdrop" 
            onClick={() => setIsOpen(false)}
          />
          <div className={`absolute top-full mt-1 z-dropdown bg-slate-800 border border-slate-700 rounded-lg shadow-lg min-w-[120px] ${
            isRTL ? 'left-0' : 'right-0'
          }`}>
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleLanguageChange(lang.code as 'en' | 'fa')}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-700 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                  language === lang.code ? 'bg-slate-700 text-white' : 'text-slate-300'
                }`}
              >
                <span className="text-base">{lang.flag}</span>
                <span>{lang.nativeName}</span>
                {language === lang.code && (
                  <svg className="w-4 h-4 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default function AppLayout() {
  const { t, isRTL } = useLanguage()
  // const { state } = useAuth() // Unused for now
  
  return (
    <div className={`min-h-dvh w-full relative flex flex-col ${isRTL ? 'rtl' : 'ltr'}`}>
      <ScrollToTop />
      {/* Header */}
      <header className="px-3 sm:px-4 md:px-6 pt-3 sm:pt-4 md:pt-5 pb-2 sm:pb-3 sticky top-0 z-20">
        <div className="glass-card px-3 sm:px-4 md:px-6 py-2 sm:py-3 flex items-center justify-between">
          {/* Left side - Creation buttons */}
          <div className={`flex items-center gap-1 sm:gap-2 md:gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <NavLink 
              to="/venues?action=add" 
              className="chip inline-flex items-center gap-1 text-xs sm:text-sm hover:scale-105 transition-transform bg-slate-700/50 hover:bg-slate-600/50"
            >
              <span className="text-sm">🏢</span>
              <span className="hidden xs:inline">{t('create.venue')}</span>
            </NavLink>
            <NavLink 
              to="/events?action=add" 
              className="chip inline-flex items-center gap-1 text-xs sm:text-sm hover:scale-105 transition-transform bg-gradient-to-r from-purple-500/20 to-teal-500/20 hover:from-purple-500/30 hover:to-teal-500/30"
            >
              <span className="text-sm">🎉</span>
              <span className="hidden xs:inline">{t('create.event')}</span>
            </NavLink>
          </div>

          {/* Center - Logo */}
          <div className="flex items-center">
            <img 
              src={`${ASSET_BASE_URL}logo.png`} 
              alt="Funzone" 
              className="h-8 sm:h-10 md:h-12 lg:h-14 w-auto object-contain"
            />
          </div>

          {/* Right side - Support and Language */}
          <div className={`flex items-center gap-1 sm:gap-2 md:gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <LanguageSwitcher />
            <NavLink 
              to="/support" 
              className="chip inline-flex items-center gap-1 text-xs sm:text-sm hover:scale-105 transition-transform"
            >
              <span className="text-sm">🎧</span>
              <span className="hidden xs:inline">{t('support.title')}</span>
            </NavLink>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-3 sm:px-4 md:px-6 pb-20 sm:pb-24 md:pb-28">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 flex justify-center px-4 sm:px-6">
        <div className="w-full">
          <div className="glass-card px-2 sm:px-3 py-2 m-2 sm:m-3">
            <div className="grid grid-cols-5 gap-1 sm:gap-2">
              <TabLink to="/" label="navigation.home" icon="🏠" />
              <TabLink to="/venues" label="navigation.venues" icon="🏢" />
              <TabLink to="/events" label="navigation.events" icon="🎉" />
              <TabLink to="/wallet" label="navigation.wallet" icon="💰" />
              <TabLink to="/profile" label="navigation.profile" icon="👤" />
            </div>
          </div>
        </div>
      </nav>

      {/* Responsive Background Elements */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        {/* Gradient Orbs */}
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl animate-pulse-slow"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-teal-500/20 rounded-full blur-3xl animate-pulse-slow animation-delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-pulse-slow animation-delay-2000"></div>
      </div>
    </div>
  )
}


