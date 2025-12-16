import { useState, useEffect } from 'react'
import { useAuth } from '../state/authStore'
import { useLanguage } from '../contexts/LanguageContext'
import { formatCurrency, formatDate, formatNumberWithCommas, parseFormattedNumber, toPersianNumbers, toEnglishNumbers } from '../utils/persianNumbers'
import type { Transaction } from '../types/owner'
import { apiService } from '../services/apiService'

export default function WalletPage() {
  const { state, updateOwner } = useAuth()
  const { t, isRTL, language } = useLanguage()
  const [showDepositForm, setShowDepositForm] = useState(false)
  const [showWithdrawForm, setShowWithdrawForm] = useState(false)
  const [depositAmount, setDepositAmount] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Fetch transactions on component mount
  useEffect(() => {
    fetchTransactions()
    fetchBalance()
  }, [])

  const fetchTransactions = async () => {
    try {
      setIsLoadingTransactions(true)
      setError(null)
      const response = await apiService.getTransactions()
      if (response.transactions) {
        setTransactions(response.transactions)
      }
    } catch (err: any) {
      console.error('Error fetching transactions:', err)
      setError(err.message || t('owner.errorFetchingTransactions'))
    } finally {
      setIsLoadingTransactions(false)
    }
  }

  const fetchBalance = async () => {
    try {
      const response = await apiService.getWalletBalance()
      if (response.balance !== undefined && state.auth.user) {
        // Update balance in auth state
        updateOwner({
          ...state.auth.user,
          balance: response.balance
        })
      }
    } catch (err: any) {
      console.error('Error fetching balance:', err)
    }
  }

  const handleDeposit = async () => {
    const amount = parseFormattedNumber(depositAmount)
    
    if (!depositAmount || amount <= 0) {
      setError(t('owner.pleaseEnterValidAmount'))
      return
    }

    if (amount < 10000) {
      setError(t('owner.minimumDepositAmount'))
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      setSuccessMessage(null)
      
      const response = await apiService.depositToWallet(amount)
      
      if (response.success && response.payment_url) {
        // Redirect to payment gateway
        window.location.href = response.payment_url
      } else {
        setError(response.message || t('owner.errorDepositing'))
        setIsLoading(false)
      }
    } catch (err: any) {
      console.error('Error depositing:', err)
      setError(err.message || t('owner.errorDepositing'))
      setIsLoading(false)
    }
  }

  const handleWithdraw = async () => {
    const balance = state.auth.user?.balance ?? 0
    const hasIban = Boolean(state.auth.user?.iban || state.auth.user?.credit_number)
    const amount = parseFormattedNumber(withdrawAmount)
    
    if (!withdrawAmount || amount <= 0) {
      setError(t('owner.pleaseEnterValidAmount'))
      return
    }

    if (amount < 50000) {
      setError(t('owner.minimumWithdrawAmount'))
      return
    }

    if (amount > balance) {
      setError(t('owner.insufficientBalanceError'))
      return
    }

    if (!hasIban) {
      setError(t('owner.ibanRequiredForWithdraw'))
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      setSuccessMessage(null)
      
      const response = await apiService.withdrawFromWallet(amount)
      
      if (response.transaction && response.new_balance !== undefined) {
        // Update balance in auth state
        if (state.auth.user) {
          updateOwner({
            ...state.auth.user,
            balance: response.new_balance
          })
        }
        
        // Add new transaction to list
        setTransactions(prev => [response.transaction, ...prev])
        
        setSuccessMessage(response.message || 'درخواست برداشت با موفقیت ثبت شد')
        setWithdrawAmount('')
        setShowWithdrawForm(false)
        
        // Refresh transactions to get latest
        setTimeout(() => {
          fetchTransactions()
        }, 500)
      }
    } catch (err: any) {
      console.error('Error withdrawing:', err)
      setError(err.message || t('owner.errorWithdrawing'))
    } finally {
      setIsLoading(false)
    }
  }

  // Clear messages after 5 seconds
  useEffect(() => {
    if (error || successMessage) {
      const timer = setTimeout(() => {
        setError(null)
        setSuccessMessage(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [error, successMessage])

  return (
    <div className={`container-responsive p-responsive space-responsive ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-responsive-xl font-bold">{t('owner.wallet')}</h1>
        <button
          type="button"
          onClick={fetchTransactions}
          className="group relative overflow-hidden bg-gradient-to-r from-purple-500/20 to-teal-500/20 backdrop-blur-md border border-purple-400/30 rounded-xl px-4 py-3 text-responsive-sm flex items-center gap-3 transition-all duration-300 hover:from-purple-500/30 hover:to-teal-500/30 hover:border-purple-400/50 hover:shadow-lg hover:shadow-purple-500/20 hover:scale-105 hover:-translate-y-1"
        >
          {/* Animated background gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-teal-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          
          {/* Glowing effect */}
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-500/20 to-teal-500/20 blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"></div>
          
          {/* Icon with enhanced styling */}
          <div className="relative z-10 w-8 h-8 rounded-lg bg-gradient-to-r from-purple-500 to-teal-500 flex items-center justify-center text-white text-lg shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
            <span className="drop-shadow-sm">🧾</span>
          </div>
          
          {/* Text with gradient effect */}
          <span className="relative z-10 font-semibold bg-gradient-to-r from-purple-300 to-teal-300 bg-clip-text text-transparent group-hover:from-purple-200 group-hover:to-teal-200 transition-all duration-300">
            {t('owner.financialHistory')}
          </span>
          
          {/* Subtle pulse animation */}
          <div className="absolute inset-0 rounded-xl border border-purple-400/20 animate-pulse opacity-0 group-hover:opacity-100"></div>
        </button>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="glass-card p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
          <div className="text-red-300 text-responsive-sm">{error}</div>
        </div>
      )}
      
      {successMessage && (
        <div className="glass-card p-4 bg-green-500/20 border border-green-500/50 rounded-lg">
          <div className="text-green-300 text-responsive-sm">{successMessage}</div>
        </div>
      )}

      {/* Balance Card */}
      <div className="glass-card p-4 sm:p-6 text-center space-y-4">
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 mx-auto grid place-items-center text-2xl sm:text-3xl font-bold shadow-glow">
          💰
        </div>
        <div>
          <div className="text-responsive-xl font-bold text-gradient">
            {formatCurrency(state.auth.user?.balance || 0, language, t('common.currency'), 0)}
          </div>
          <div className="text-slate-400 text-responsive-sm">{t('owner.balance')}</div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-4">
        <button 
          onClick={() => {
            setShowDepositForm(true)
            setError(null)
            setSuccessMessage(null)
          }}
          className="glass-card p-4 text-center space-y-2 hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]"
        >
          <div className="w-12 h-12 rounded-lg bg-gradient-to-r from-green-500 to-green-600 mx-auto grid place-items-center text-white text-xl">
            ➕
          </div>
          <div className="font-semibold text-responsive-sm">{t('owner.deposit')}</div>
        </button>
        
        <button 
          onClick={() => {
            setShowWithdrawForm(true)
            setError(null)
            setSuccessMessage(null)
          }}
          className="glass-card p-4 text-center space-y-2 hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]"
        >
          <div className="w-12 h-12 rounded-lg bg-gradient-to-r from-red-500 to-red-600 mx-auto grid place-items-center text-white text-xl">
            ➖
          </div>
          <div className="font-semibold text-responsive-sm">{t('owner.withdraw')}</div>
        </button>
      </div>

      {/* Transaction History */}
      <div className="space-y-4">
        <h2 className="text-responsive-lg font-semibold">{t('owner.transactionHistory')}</h2>
        {isLoadingTransactions ? (
          <div className="glass-card p-8 text-center">
            <div className="text-slate-400">{t('common.loading') || 'در حال بارگذاری...'}</div>
          </div>
        ) : transactions.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <div className="text-slate-400">{t('owner.noTransactions')}</div>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((transaction) => (
              <div key={transaction.id} className="glass-card p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg grid place-items-center text-white ${
                    transaction.type === 'deposit' ? 'bg-green-500' :
                    transaction.type === 'withdraw' ? 'bg-red-500' :
                    'bg-blue-500'
                  }`}>
                    {transaction.type === 'deposit' ? '➕' : 
                     transaction.type === 'withdraw' ? '➖' : '💰'}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-responsive-sm">
                      {transaction.type === 'booking_payment' ? (
                        <div className="text-blue-300">
                          {(() => {
                            let desc = transaction.description || ''
                            // Extract event name from {eventName} format (supports both single and double braces)
                            const match = desc.match(/\{([^}]+)\}/) || desc.match(/\{\{([^}]+)\}\}/)
                            if (match) {
                              return `💰 ${match[1]}`
                            }
                            // Fallback: extract from description text
                            const eventName = desc
                              .replace('درآمد از رویداد:', '')
                              .replace('Payment from event:', '')
                              .replace('درآمد از رویداد', '')
                              .split('(رزرو')[0]
                              .split('(Reservation')[0]
                              .split('رزرو')[0]
                              .trim()
                            return eventName ? `💰 ${eventName}` : `💰 ${t('owner.paymentFromEvent') || 'درآمد از رویداد'}`
                          })()}
                        </div>
                      ) : transaction.description ? (
                        (() => {
                          // Translate common transaction descriptions
                          const desc = transaction.description
                          if (desc === 'Deposit to wallet' || desc === 'واریز به کیف پول') {
                            return t('owner.depositToWallet')
                          }
                          if (desc === 'Withdrawal from wallet' || desc === 'برداشت از کیف پول') {
                            return t('owner.withdrawalFromWallet')
                          }
                          return desc
                        })()
                      ) : (
                        t(`owner.transactionTypes.${transaction.type}`) || transaction.type
                      )}
                    </div>
                    <div className="text-responsive-xs text-slate-400 mt-1">
                      {formatDate(transaction.created_at, language, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-bold text-responsive-sm ${
                    transaction.type === 'deposit' ? 'text-green-400' :
                    transaction.type === 'withdraw' ? 'text-red-400' :
                    'text-blue-400'
                  }`}>
                    {transaction.type === 'deposit' ? '+' : 
                     transaction.type === 'withdraw' ? '-' : '+'}
                    {formatCurrency(transaction.amount, language, t('common.currency'), 0)}
                  </div>
                  <div className={`text-responsive-xs ${
                    transaction.status === 'completed' ? 'text-green-400' :
                    transaction.status === 'pending' ? 'text-yellow-400' :
                    'text-red-400'
                  }`}>
                    {t(`owner.transactionStatus.${transaction.status}`) || transaction.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Deposit Form Modal */}
      {showDepositForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 sm:p-6 z-50">
          <div className="glass-card p-4 sm:p-6 max-w-sm w-full space-y-4 animate-scale-in">
            <div className="flex items-center justify-between">
              <h2 className="text-responsive-lg font-bold">{t('owner.deposit')}</h2>
              <button 
                onClick={() => {
                  setShowDepositForm(false)
                  setDepositAmount('')
                  setError(null)
                }}
                className="text-slate-400 hover:text-slate-200"
                disabled={isLoading}
              >
                ✕
              </button>
            </div>
            
            {error && (
              <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
                <div className="text-red-300 text-responsive-xs">{error}</div>
              </div>
            )}
            
            <div>
              <label className="text-responsive-sm font-medium text-slate-300">{t('owner.depositAmount')}</label>
              <input 
                type="text" 
                inputMode="numeric"
                className="input-field w-full mt-1"
                placeholder={t('owner.enterAmount')}
                value={depositAmount ? (language === 'fa' 
                  ? toPersianNumbers(formatNumberWithCommas(depositAmount))
                  : formatNumberWithCommas(depositAmount)) : ''}
                onChange={(e) => {
                  // Convert Persian numbers to English first if needed
                  let rawValue = language === 'fa' 
                    ? toEnglishNumbers(e.target.value)
                    : e.target.value
                  
                  // Remove all non-digit characters except commas
                  rawValue = rawValue.replace(/[^\d,]/g, '')
                  // Remove commas for storage
                  const numericValue = rawValue.replace(/,/g, '')
                  setDepositAmount(numericValue)
                }}
                disabled={isLoading}
              />
              <div className="text-responsive-xs text-slate-400 mt-1">
                {t('owner.minimumDeposit')}
              </div>
            </div>
            
            <div className="flex gap-3">
              <button 
                onClick={() => {
                  setShowDepositForm(false)
                  setDepositAmount('')
                  setError(null)
                }}
                className="btn-ghost flex-1"
                disabled={isLoading}
              >
                {t('common.cancel')}
              </button>
              <button 
                onClick={handleDeposit}
                className="btn-primary flex-1"
                disabled={isLoading || !depositAmount || parseFormattedNumber(depositAmount) < 10000}
              >
                {isLoading ? (t('common.loading') || 'در حال پردازش...') : t('owner.deposit')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Withdraw Form Modal */}
      {showWithdrawForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 sm:p-6 z-50">
          <div className="glass-card p-4 sm:p-6 max-w-sm w-full space-y-4 animate-scale-in">
            <div className="flex items-center justify-between">
              <h2 className="text-responsive-lg font-bold">{t('owner.withdraw')}</h2>
              <button 
                onClick={() => {
                  setShowWithdrawForm(false)
                  setWithdrawAmount('')
                  setError(null)
                }}
                className="text-slate-400 hover:text-slate-200"
                disabled={isLoading}
              >
                ✕
              </button>
            </div>
            
            {error && (
              <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
                <div className="text-red-300 text-responsive-xs">{error}</div>
              </div>
            )}
            
            <div>
              <label className="text-responsive-sm font-medium text-slate-300">{t('owner.withdrawAmount')}</label>
              <input 
                type="text" 
                inputMode="numeric"
                className="input-field w-full mt-1"
                placeholder={t('owner.enterAmount')}
                value={withdrawAmount ? (language === 'fa' 
                  ? toPersianNumbers(formatNumberWithCommas(withdrawAmount))
                  : formatNumberWithCommas(withdrawAmount)) : ''}
                onChange={(e) => {
                  // Convert Persian numbers to English first if needed
                  let rawValue = language === 'fa' 
                    ? toEnglishNumbers(e.target.value)
                    : e.target.value
                  
                  // Remove all non-digit characters except commas
                  rawValue = rawValue.replace(/[^\d,]/g, '')
                  // Remove commas for storage
                  const numericValue = rawValue.replace(/,/g, '')
                  setWithdrawAmount(numericValue)
                }}
                disabled={isLoading}
              />
              <div className="text-responsive-xs text-slate-400 mt-1">
                {t('owner.availableBalance')}: {formatCurrency(state.auth.user?.balance || 0, language, t('common.currency'), 0)}
              </div>
              <div className="text-responsive-xs text-slate-400 mt-1">
                {t('owner.minimumWithdraw')}
              </div>
            </div>
            
            <div>
              <label className="text-responsive-sm font-medium text-slate-300">{t('owner.iban')}</label>
              <div className="bg-slate-800/50 border border-slate-600 rounded-lg px-3 py-2 mt-1 text-slate-100" dir="ltr">
                {state.auth.user?.iban || state.auth.user?.credit_number 
                  ? `IR${state.auth.user.iban || state.auth.user.credit_number}` 
                  : t('owner.ibanRequired')}
              </div>
              {!state.auth.user?.iban && !state.auth.user?.credit_number && (
                <div className="text-responsive-xs text-red-400 mt-1">
                  {t('owner.ibanRequired')}
                </div>
              )}
            </div>
            
            <div className="flex gap-3">
              <button 
                onClick={() => {
                  setShowWithdrawForm(false)
                  setWithdrawAmount('')
                  setError(null)
                }}
                className="btn-ghost flex-1"
                disabled={isLoading}
              >
                {t('common.cancel')}
              </button>
              <button 
                onClick={handleWithdraw}
                className="btn-primary flex-1"
                disabled={
                  isLoading || 
                  !withdrawAmount || 
                  parseFormattedNumber(withdrawAmount) <= 0 || 
                  parseFormattedNumber(withdrawAmount) > (state.auth.user?.balance || 0) || 
                  parseFormattedNumber(withdrawAmount) < 50000 ||
                  (!state.auth.user?.iban && !state.auth.user?.credit_number)
                }
              >
                {isLoading ? (t('common.loading') || 'در حال پردازش...') : t('owner.withdraw')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
