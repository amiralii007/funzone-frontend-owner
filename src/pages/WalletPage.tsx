import { useState } from 'react'
import { useAuth } from '../state/authStore'
import { useLanguage } from '../contexts/LanguageContext'
import { formatPersianCurrency, formatPersianNumber } from '../utils/persianNumbers'
import type { Transaction } from '../types/owner'

export default function WalletPage() {
  const { state } = useAuth()
  const { t, isRTL } = useLanguage()
  const [showDepositForm, setShowDepositForm] = useState(false)
  const [showWithdrawForm, setShowWithdrawForm] = useState(false)
  const [depositAmount, setDepositAmount] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')

  const mockTransactions: Transaction[] = [
    {
      id: 'tx-1',
      owner_id: 'owner-1',
      type: 'booking_payment',
      amount: 150,
      status: 'completed',
      description: t('owner.paymentFromEvent').replace('{eventName}', 'Gaming Tournament'),
      created_at: '2024-01-10T10:30:00Z',
      updated_at: '2024-01-10T10:30:00Z'
    },
    {
      id: 'tx-2',
      owner_id: 'owner-1',
      type: 'deposit',
      amount: 500,
      status: 'completed',
      description: t('owner.bankDeposit'),
      created_at: '2024-01-08T14:20:00Z',
      updated_at: '2024-01-08T14:20:00Z'
    },
    {
      id: 'tx-3',
      owner_id: 'owner-1',
      type: 'withdraw',
      amount: 200,
      status: 'completed',
      description: t('owner.withdrawalToBank'),
      created_at: '2024-01-05T09:15:00Z',
      updated_at: '2024-01-05T09:15:00Z'
    }
  ]

  const handleDeposit = () => {
    if (depositAmount && parseFloat(depositAmount) > 0) {
      // Mock deposit logic
      console.log('Depositing:', depositAmount)
      setDepositAmount('')
      setShowDepositForm(false)
    }
  }

  const handleWithdraw = () => {
    const balance = state.auth.user?.balance ?? 0
    const hasIban = Boolean(state.auth.user?.iban)
    
    if (withdrawAmount && parseFloat(withdrawAmount) > 0 && parseFloat(withdrawAmount) <= balance && hasIban) {
      // Mock withdrawal logic
      console.log('Withdrawing:', withdrawAmount, 'to IBAN:', state.auth.user?.iban)
      setWithdrawAmount('')
      setShowWithdrawForm(false)
    }
  }

  return (
    <div className={`container-responsive p-responsive space-responsive ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-responsive-xl font-bold">{t('owner.wallet')}</h1>
        <button
          type="button"
          onClick={() => {
            // TODO: Implement financial history functionality
            console.log('Financial history clicked')
          }}
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

      {/* Balance Card */}
      <div className="glass-card p-4 sm:p-6 text-center space-y-4">
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 mx-auto grid place-items-center text-2xl sm:text-3xl font-bold shadow-glow">
          💰
        </div>
        <div>
          <div className="text-responsive-xl font-bold text-gradient">{formatPersianCurrency(state.auth.user?.balance || 0, t('common.currency'), 2)}</div>
          <div className="text-slate-400 text-responsive-sm">{t('owner.balance')}</div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-4">
        <button 
          onClick={() => setShowDepositForm(true)}
          className="glass-card p-4 text-center space-y-2 hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]"
        >
          <div className="w-12 h-12 rounded-lg bg-gradient-to-r from-green-500 to-green-600 mx-auto grid place-items-center text-white text-xl">
            ➕
          </div>
          <div className="font-semibold text-responsive-sm">{t('owner.deposit')}</div>
        </button>
        
        <button 
          onClick={() => setShowWithdrawForm(true)}
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
        <div className="space-y-3">
          {mockTransactions.map((transaction) => (
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
                <div>
                  <div className="font-semibold text-responsive-sm">{transaction.description}</div>
                  <div className="text-responsive-xs text-slate-400">
                    {new Date(transaction.created_at).toLocaleDateString()}
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
                   transaction.type === 'withdraw' ? '-' : '+'}${transaction.amount}
                </div>
                <div className={`text-responsive-xs ${
                  transaction.status === 'completed' ? 'text-green-400' :
                  transaction.status === 'pending' ? 'text-yellow-400' :
                  'text-red-400'
                }`}>
                  {t(`owner.transactionStatus.${transaction.status}`)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Deposit Form Modal */}
      {showDepositForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 sm:p-6 z-50">
          <div className="glass-card p-4 sm:p-6 max-w-sm w-full space-y-4 animate-scale-in">
            <div className="flex items-center justify-between">
              <h2 className="text-responsive-lg font-bold">{t('owner.deposit')}</h2>
              <button 
                onClick={() => setShowDepositForm(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            </div>
            
            <div>
              <label className="text-responsive-sm font-medium text-slate-300">{t('owner.depositAmount')}</label>
              <input 
                type="number" 
                className="input-field w-full mt-1"
                placeholder={t('owner.enterAmount')}
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                min="10"
                step="0.01"
              />
              <div className="text-responsive-xs text-slate-400 mt-1">
                {t('owner.minimumDeposit')}
              </div>
            </div>
            
            <div className="flex gap-3">
              <button 
                onClick={() => setShowDepositForm(false)}
                className="btn-ghost flex-1"
              >
                {t('common.cancel')}
              </button>
              <button 
                onClick={handleDeposit}
                className="btn-primary flex-1"
              >
                {t('owner.deposit')}
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
                onClick={() => setShowWithdrawForm(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            </div>
            
            <div>
              <label className="text-responsive-sm font-medium text-slate-300">{t('owner.withdrawAmount')}</label>
              <input 
                type="number" 
                className="input-field w-full mt-1"
                placeholder={t('owner.enterAmount')}
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                max={state.auth.user?.balance}
                min="50000"
                step="0.01"
              />
              <div className="text-responsive-xs text-slate-400 mt-1">
                {t('owner.availableBalance')}: {formatPersianCurrency(state.auth.user?.balance || 0, 'تومان', 2)}
              </div>
              <div className="text-responsive-xs text-slate-400 mt-1">
                {t('owner.minimumWithdraw')}
              </div>
            </div>
            
            <div>
              <label className="text-responsive-sm font-medium text-slate-300">{t('owner.iban')}</label>
              <div className="bg-slate-800/50 border border-slate-600 rounded-lg px-3 py-2 mt-1 text-slate-100" dir="ltr">
                {state.auth.user?.iban ? `IR${state.auth.user.iban}` : t('owner.ibanRequired')}
              </div>
              {!state.auth.user?.iban && (
                <div className="text-responsive-xs text-red-400 mt-1">
                  {t('owner.ibanRequired')}
                </div>
              )}
            </div>
            
            <div className="flex gap-3">
              <button 
                onClick={() => setShowWithdrawForm(false)}
                className="btn-ghost flex-1"
              >
                {t('common.cancel')}
              </button>
              <button 
                onClick={handleWithdraw}
                className="btn-primary flex-1"
                disabled={!withdrawAmount || parseFloat(withdrawAmount) <= 0 || parseFloat(withdrawAmount) > (state.auth.user?.balance || 0) || !state.auth.user?.iban}
              >
                {t('owner.withdraw')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}