import { useState, useEffect } from 'react'
import { useAuth } from '../state/authStore'
import { useLanguage } from '../contexts/LanguageContext'
import { useNavigate, Link } from 'react-router-dom'
import { authService } from '../services/authService'
import { apiService } from '../services/apiService'
import { formatPersianCurrency, toPersianNumbers, formatPersianNumber, formatNumber, formatCurrency } from '../utils/persianNumbers'
import SolarHijriDatePicker from '../components/SolarHijriDatePicker'

export default function ProfilePage() {
  const { state, logout, updateOwner } = useAuth()
  const { t, isRTL, language } = useLanguage()
  const navigate = useNavigate()
  const [showEditForm, setShowEditForm] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [formData, setFormData] = useState({
    f_name: '',
    l_name: '',
    username: '',
    email: '',
    mobile_number: '',
    iban: '',
    birthday: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  
  // State for venues and events count
  const [venues, setVenues] = useState<any[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [isLoadingVenues, setIsLoadingVenues] = useState(false)
  const [isLoadingEvents, setIsLoadingEvents] = useState(false)
  
  // Phone verification state (same as customer app)
  const [showPhoneVerification, setShowPhoneVerification] = useState(false)
  const [phoneVerificationStep, setPhoneVerificationStep] = useState<'phone' | 'code'>('phone')
  const [newPhoneNumber, setNewPhoneNumber] = useState('')
  const [newPhoneDigits, setNewPhoneDigits] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [isVerifyingPhone, setIsVerifyingPhone] = useState(false)
  const [originalPhoneNumber, setOriginalPhoneNumber] = useState('')

  // Phone number validation function (same as customer app)
  const validatePhoneNumber = (phoneNumber: string): boolean => {
    const digitsOnly = phoneNumber.replace(/[^\d]/g, '')
    return digitsOnly.length === 10 && digitsOnly.startsWith('9')
  }

  const formatPhoneNumber = (phoneNumber: string): string => {
    const digitsOnly = phoneNumber.replace(/[^\d]/g, '')
    if (digitsOnly.length === 10 && digitsOnly.startsWith('9')) {
      return `+98${digitsOnly}`
    }
    return phoneNumber
  }

  // Phone verification functions (same as customer app)
  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target
    setFormData(prev => ({
      ...prev,
      mobile_number: value
    }))

    // If phone number is different from original, show verification
    if (value !== originalPhoneNumber && value.length > 0) {
      setNewPhoneNumber(value)
      setPhoneVerificationStep('phone')
      setShowPhoneVerification(true)
    }
  }

  const sendPhoneVerificationCode = async () => {
    // Require exactly 10 digits and construct +98 number
    const digitsOnly = (newPhoneDigits || '').replace(/[^\d]/g, '')
    if (digitsOnly.length !== 10 || !digitsOnly.startsWith('9')) {
      alert(t('validation.phoneFormat'))
      return
    }
    const fullNumber = `+98${digitsOnly}`
    setNewPhoneNumber(fullNumber)

    try {
      setIsVerifyingPhone(true)
      // For now, use mock SMS (1234 code)
      console.log('Sending verification code to:', fullNumber)
      // await authService.sendVerificationCode(fullNumber)
      setPhoneVerificationStep('code')
    } catch (error) {
      console.error('Failed to send verification code:', error)
      alert('Failed to send verification code. Please try again.')
    } finally {
      setIsVerifyingPhone(false)
    }
  }

  const verifyPhoneNumber = async () => {
    if (!verificationCode || !newPhoneNumber) return

    try {
      setIsVerifyingPhone(true)
      // For now, accept 1234 as valid code
      if (verificationCode !== '1234') {
        alert('Invalid verification code. Use 1234 for testing.')
        return
      }
      
      // Update the form data with the new phone number
      setFormData(prev => ({
        ...prev,
        mobile_number: newPhoneNumber
      }))
      setOriginalPhoneNumber(newPhoneNumber)
      
      setShowPhoneVerification(false)
      setPhoneVerificationStep('phone')
      setVerificationCode('')
      setNewPhoneNumber('')
      alert('Phone number updated successfully!')
    } catch (error) {
      console.error('Phone verification failed:', error)
      alert('Phone verification failed. Please try again.')
    } finally {
      setIsVerifyingPhone(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  // Fetch venues count
  const fetchVenues = async () => {
    if (!state.auth.user?.id) return
    
    setIsLoadingVenues(true)
    try {
      const responseData = await apiService.getVenues(state.auth.user.id)
      const venuesData = responseData.results || responseData
      setVenues(venuesData)
    } catch (error) {
      console.error('Error fetching venues:', error)
      setVenues([])
    } finally {
      setIsLoadingVenues(false)
    }
  }

  // Fetch events count
  const fetchEvents = async () => {
    if (!state.auth.user?.id) return
    
    setIsLoadingEvents(true)
    try {
      const responseData = await apiService.getEvents(state.auth.user.id)
      const eventsData = responseData.results || responseData
      setEvents(eventsData)
    } catch (error) {
      console.error('Error fetching events:', error)
      setEvents([])
    } finally {
      setIsLoadingEvents(false)
    }
  }

  // Fetch data on component mount
  useEffect(() => {
    if (state.auth.user?.id) {
      fetchVenues()
      fetchEvents()
    }
  }, [state.auth.user?.id])

  const handleEditClick = () => {
    // Initialize form data with current user data
    const currentPhone = state.auth.user?.mobile_number ? state.auth.user.mobile_number.toString() : ''
    setFormData({
      f_name: state.auth.user?.f_name || '',
      l_name: state.auth.user?.l_name || '',
      username: state.auth.user?.username || '',
      email: state.auth.user?.email || '',
      mobile_number: currentPhone,
      iban: state.auth.user?.iban || '',
      birthday: state.auth.user?.birthday || ''
    })
    setOriginalPhoneNumber(currentPhone)
    setShowEditForm(true)
  }

  const handleProfileSave = async () => {
    if (!state.auth.user) return
    
    setIsLoading(true)
    setError('')
    
    try {
      // Validate required fields
      if (!formData.f_name.trim()) {
        setError(t('validation.firstNameRequired'))
        return
      }
      
      if (!formData.l_name.trim()) {
        setError(t('validation.lastNameRequired'))
        return
      }
      
      if (!formData.username.trim()) {
        setError(t('validation.usernameRequired'))
        return
      }
      
      if (!formData.mobile_number.trim()) {
        setError(t('validation.phoneRequired'))
        return
      }
      
      // Validate IBAN if provided (must be 24 digits)
      if (formData.iban.trim() && formData.iban.trim().length !== 24) {
        setError(t('validation.ibanLength'))
        return
      }
      
      // Validate IBAN contains only digits
      if (formData.iban.trim() && !/^\d{24}$/.test(formData.iban.trim())) {
        setError(t('validation.ibanDigits'))
        return
      }
      
      // Use authService directly
      const profileData: any = {
        f_name: formData.f_name.trim(),
        l_name: formData.l_name.trim(),
        username: formData.username.trim(),
        mobile_number: formatPhoneNumber(formData.mobile_number.trim())
      }
      
      // Only include birthday if it's provided
      if (formData.birthday.trim()) {
        profileData.birthday = formData.birthday.trim()
      }
      
      // Only include email if it's provided
      if (formData.email.trim()) {
        profileData.email = formData.email.trim()
      }
      
      // Only include IBAN if it's provided
      if (formData.iban.trim()) {
        profileData.credit_number = formData.iban.trim()
      }
      
      const updatedOwner = await authService.updateProfile(profileData)
      
      // Map credit_number to iban for frontend compatibility
      if (updatedOwner.credit_number) {
        updatedOwner.iban = updatedOwner.credit_number
      }
      
      // Update the auth store with the new data
      if (updateOwner) {
        updateOwner(updatedOwner)
      }
      
      setShowEditForm(false)
      // Show success message
      alert(t('owner.profileUpdated'))
    } catch (error: any) {
      console.error('Error updating profile:', error)
      
      // Handle specific validation errors from backend
      if (error.message && error.message.includes('نام کاربری قبلاً استفاده شده است')) {
        setError(t('validation.usernameExists'))
      } else if (error.message && error.message.includes('ایمیل قبلاً استفاده شده است')) {
        setError(t('validation.emailExists'))
      } else {
        setError(error.message || t('common.error'))
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (!state.auth.user) {
    return (
      <div className={`container-responsive p-responsive space-responsive-compact ${isRTL ? 'rtl' : 'ltr'}`}>
        <div className="text-center space-y-4">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-r from-purple-500 to-teal-500 mx-auto grid place-items-center text-2xl sm:text-3xl font-bold shadow-glow">
            👤
          </div>
          <h2 className="text-responsive-xl font-bold">{t('common.myProfile')}</h2>
          <p className="text-slate-400 text-responsive-sm">{t('common.pleaseSignInToViewProfile')}</p>
          <button 
            onClick={() => navigate('/login')}
            className="btn-primary hover-scale"
          >
            {t('common.signIn')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`container-responsive p-responsive space-responsive ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Profile Header */}
      <div className="glass-card p-4 sm:p-6 text-center space-y-4">
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-r from-purple-500 to-teal-500 mx-auto grid place-items-center text-2xl sm:text-3xl font-bold shadow-glow">
          {state.auth.user.f_name ? state.auth.user.f_name[0] : '👤'}
        </div>
        <div>
          <h1 className="text-responsive-xl font-bold text-gradient">
            {state.auth.user.f_name && state.auth.user.l_name 
              ? `${state.auth.user.f_name} ${state.auth.user.l_name}`
              : state.auth.user.username || 'Owner'
            }
          </h1>
          <p className="text-slate-400 text-responsive-sm">
            @{state.auth.user.username || 'username'}
          </p>
        </div>
        <button 
          onClick={handleEditClick}
          className="btn-secondary hover-scale"
        >
          {t('owner.editProfile')}
        </button>
      </div>

      {/* Profile Information */}
      <div className="space-y-4">
        <h2 className="text-responsive-lg font-semibold">{t('common.profile')} {t('common.information')}</h2>
        <div className="glass-card p-4 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-responsive-sm font-medium text-slate-300">{t('common.email')}</label>
              <div className="text-responsive-sm text-slate-100 mt-1">{state.auth.user.email || t('common.notProvided')}</div>
            </div>
            <div>
              <label className="text-responsive-sm font-medium text-slate-300">{t('common.phone')}</label>
              <div className="text-responsive-sm text-slate-100 mt-1">{state.auth.user.mobile_number ? (language === 'fa' ? toPersianNumbers(state.auth.user.mobile_number) : state.auth.user.mobile_number) : t('common.notProvided')}</div>
            </div>
            <div>
              <label className="text-responsive-sm font-medium text-slate-300">{t('owner.balance')}</label>
              <div className="text-responsive-sm text-slate-100 mt-1">{formatCurrency(state.auth.user.balance || 0, language, t('common.currency'), 2)}</div>
            </div>
            <div>
              <label className="text-responsive-sm font-medium text-slate-300">{t('owner.iban')}</label>
              <div className="text-responsive-sm text-slate-100 mt-1">{state.auth.user.iban || t('common.none')}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Business Stats */}
      <div className="space-y-4">
        <h2 className="text-responsive-lg font-semibold">{t('owner.businessStats')}</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="glass-card p-4 text-center space-y-2">
            <div className="text-2xl sm:text-3xl font-bold text-purple-400">
              {isLoadingVenues ? (
                <div className="animate-pulse">...</div>
              ) : (
                formatNumber(venues.length, language)
              )}
            </div>
            <div className="text-responsive-xs text-slate-400">{t('owner.myVenues')}</div>
          </div>
          <div className="glass-card p-4 text-center space-y-2">
            <div className="text-2xl sm:text-3xl font-bold text-teal-400">
              {isLoadingEvents ? (
                <div className="animate-pulse">...</div>
              ) : (
                formatNumber(events.length, language)
              )}
            </div>
            <div className="text-responsive-xs text-slate-400">{t('owner.myEvents')}</div>
          </div>
        </div>
      </div>

      {/* Settings */}
      <div className="space-y-4">
        <h2 className="text-responsive-lg font-semibold">{t('owner.settings')}</h2>
        <div className="glass-card p-4 sm:p-6 space-y-4">
          <button className="w-full text-left p-3 rounded-lg hover:bg-slate-700/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 grid place-items-center text-white">
                🔔
              </div>
              <div>
                <div className="font-semibold text-responsive-sm">{t('owner.notifications')}</div>
                <div className="text-responsive-xs text-slate-400">{t('owner.manageNotifications')}</div>
              </div>
            </div>
          </button>
          
          <Link to="/support" className="w-full text-left p-3 rounded-lg hover:bg-slate-700/50 transition-colors block">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 grid place-items-center text-white">
                🆘
              </div>
              <div>
                <div className="font-semibold text-responsive-sm">{t('owner.support')}</div>
                <div className="text-responsive-xs text-slate-400">{t('owner.contactSupport')}</div>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Logout Button */}
      <button 
        onClick={() => setShowLogoutConfirm(true)}
        className="w-full btn-ghost text-red-400 hover:text-red-300 hover:bg-red-500/10"
      >
        {t('common.logout')}
      </button>

      {/* Edit Profile Form Modal */}
      {showEditForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 sm:p-6 z-50 overflow-y-auto">
          <div className="glass-card p-4 sm:p-6 max-w-2xl w-full space-y-4 animate-scale-in my-4">
            <div className="flex items-center justify-between">
              <h2 className="text-responsive-lg font-bold">{t('owner.editProfile')}</h2>
              <button 
                onClick={() => setShowEditForm(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Personal Details Section */}
              <div>
                <h3 className="text-responsive-md font-semibold text-slate-300 mb-4">{t('owner.personalDetails')}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-responsive-sm font-medium text-slate-300">{t('common.firstName')} <span className="text-red-400">*</span></label>
                    <input 
                      type="text" 
                      className="input-field w-full mt-1"
                      value={formData.f_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, f_name: e.target.value }))}
                      placeholder={t('common.firstName')}
                    />
                  </div>
                  <div>
                    <label className="text-responsive-sm font-medium text-slate-300">{t('common.lastName')} <span className="text-red-400">*</span></label>
                    <input 
                      type="text" 
                      className="input-field w-full mt-1"
                      value={formData.l_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, l_name: e.target.value }))}
                      placeholder={t('common.lastName')}
                    />
                  </div>
                  <div>
                    <label className="text-responsive-sm font-medium text-slate-300">{t('owner.username')} <span className="text-red-400">*</span></label>
                    <input 
                      type="text" 
                      className="input-field w-full mt-1"
                      value={formData.username}
                      onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                      placeholder={t('owner.username')}
                    />
                  </div>
                  <div>
                    <label className="text-responsive-sm font-medium text-slate-300">{t('common.birthday')} <span className="text-slate-500">({t('common.optional')})</span></label>
                    <SolarHijriDatePicker
                      key={formData.birthday || 'empty'}
                      value={formData.birthday}
                      onChange={(value) => setFormData(prev => ({ ...prev, birthday: value }))}
                      className="w-full px-3 py-2 bg-slate-800/40 border border-slate-600 rounded-lg text-slate-100 focus:border-purple-500 focus:outline-none transition-colors"
                      allowPastDates={true}
                      language={language}
                    />
                  </div>
                </div>
              </div>

              {/* Contact Information Section */}
              <div>
                <h3 className="text-responsive-md font-semibold text-slate-300 mb-4">{t('owner.contactInformation')}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-responsive-sm font-medium text-slate-300">{t('common.email')} <span className="text-slate-500">({t('common.optional')})</span></label>
                    <input 
                      type="email" 
                      className="input-field w-full mt-1"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder={t('common.email')}
                    />
                  </div>
                  <div>
                    <label className="text-responsive-sm font-medium text-slate-300">{t('owner.phoneNumber')} <span className="text-red-400">*</span></label>
                    <input 
                      type="tel" 
                      className="input-field w-full mt-1"
                      value={formData.mobile_number}
                      onChange={handlePhoneNumberChange}
                      placeholder="9123456789"
                      maxLength={10}
                    />
                    <div className="text-responsive-xs text-slate-400 mt-1">
                      {t('validation.phoneFormat')}
                    </div>
                  </div>
                </div>
              </div>

              {/* Account Settings Section */}
              <div>
                <h3 className="text-responsive-md font-semibold text-slate-300 mb-4">{t('owner.accountSettings')}</h3>
                <div>
                  <label className="text-responsive-sm font-medium text-slate-300">{t('owner.iban')}</label>
                  <div className="flex items-stretch mt-1" dir="ltr">
                    <div className="bg-slate-700/50 border border-slate-600 border-r-0 rounded-l-lg px-3 py-2 text-slate-300 font-medium text-sm flex items-center justify-center min-w-[3rem] flex-shrink-0">
                      IR
                    </div>
                    <input 
                      type="text" 
                      className="input-field w-full rounded-l-none border-l-0"
                      value={formData.iban}
                      onChange={(e) => setFormData(prev => ({ ...prev, iban: e.target.value }))}
                      placeholder={t('owner.enterIban')}
                      dir="ltr"
                    />
                  </div>
                  <div className="text-responsive-xs text-slate-400 mt-1">
                    {t('owner.ibanFormat')}
                  </div>
                </div>
              </div>
            </div>
            
            {error && (
              <div className="text-red-400 text-responsive-sm text-center">
                {error}
              </div>
            )}
            
            <div className="flex gap-3">
              <button 
                onClick={() => setShowEditForm(false)}
                className="btn-ghost flex-1"
                disabled={isLoading}
              >
                {t('common.cancel')}
              </button>
              <button 
                onClick={handleProfileSave}
                className="btn-primary flex-1"
                disabled={isLoading}
              >
                {isLoading ? t('common.saving') : t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 sm:p-6 z-50">
          <div className="glass-card p-4 sm:p-6 max-w-sm w-full text-center space-y-4 animate-scale-in">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-r from-red-500 to-pink-500 mx-auto grid place-items-center shadow-glow-pink">
              <span className="text-2xl">🚪</span>
            </div>
            <h3 className="text-responsive-xl font-bold">{t('owner.areYouSureLogout')}</h3>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="btn-ghost flex-1 hover-scale"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleLogout}
                className="btn-primary flex-1 bg-red-500 hover:bg-red-600 hover-scale"
              >
                {t('common.logout')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Phone Verification Modal */}
      {showPhoneVerification && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="glass-card p-6 max-w-md w-full space-y-6 animate-scale-in">
            {phoneVerificationStep === 'phone' ? (
              <>
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-500/20 flex items-center justify-center">
                    📱
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">
                    {t('phoneVerification.enterNewPhoneNumber')}
                  </h3>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    {t('phoneVerification.enterNewPhoneMessage')}
                  </p>
                </div>
                
                <div className="space-y-4" dir="ltr">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      {t('phoneVerification.newPhoneNumber')}
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-2 bg-slate-800/60 border border-slate-600 rounded-lg text-slate-300 select-none">
                        +98
                      </span>
                      <input
                        type="tel"
                        inputMode="numeric"
                        value={newPhoneDigits}
                        onChange={(e) => setNewPhoneDigits(e.target.value.replace(/[^\d]/g, '').slice(0, 10))}
                        className="flex-1 px-3 py-2 bg-slate-800/40 border border-slate-600 rounded-lg text-slate-100 focus:border-purple-500 focus:outline-none transition-colors"
                        placeholder="9123456789"
                      />
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{t('validation.phoneFormat')}</p>
                    {newPhoneDigits.length === 10 && newPhoneDigits === originalPhoneNumber.replace(/[^\d]/g, '').slice(-10) && (
                      <p className="text-xs text-red-400 mt-1">{t('phoneVerification.newPhoneMustBeDifferent')}</p>
                    )}
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowPhoneVerification(false)
                      setNewPhoneNumber('')
                      setFormData(prev => ({ ...prev, mobile_number: originalPhoneNumber }))
                    }}
                    className="btn-ghost flex-1"
                    disabled={isVerifyingPhone}
                  >
                    ✕ {t('common.cancel')}
                  </button>
                  <button
                    onClick={sendPhoneVerificationCode}
                    className="btn-primary flex-1"
                    disabled={newPhoneDigits.length !== 10 || newPhoneDigits === originalPhoneNumber.replace(/[^\d]/g, '').slice(-10) || isVerifyingPhone}
                  >
                    ✓ {t('common.ok')}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                    🎫
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">
                    {t('phoneVerification.verifyPhoneNumber')}
                  </h3>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    {t('phoneVerification.verificationCodeSentTo')} {newPhoneNumber}
                  </p>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      {t('phoneVerification.verificationCode')}
                    </label>
                    <input
                      type="text"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/[^\d]/g, '').slice(0, 4))}
                      className="w-full px-3 py-2 bg-slate-800/40 border border-slate-600 rounded-lg text-slate-100 focus:border-purple-500 focus:outline-none transition-colors text-center text-lg tracking-widest"
                      placeholder="1234"
                      maxLength={4}
                    />
                    <p className="text-xs text-slate-400 mt-1">Use 1234 for testing</p>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setPhoneVerificationStep('phone')
                      setVerificationCode('')
                    }}
                    className="btn-ghost flex-1"
                    disabled={isVerifyingPhone}
                  >
                    ← {t('common.back')}
                  </button>
                  <button
                    onClick={verifyPhoneNumber}
                    className="btn-primary flex-1"
                    disabled={verificationCode.length !== 4 || isVerifyingPhone}
                  >
                    ✓ {t('phoneVerification.verify')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
