import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../state/authStore'
import { apiService } from '../services/apiService'
import { useLanguage } from '../contexts/LanguageContext'

export default function PaymentCallbackPage() {
  const { state, updateOwner } = useAuth()
  const { t, isRTL } = useLanguage()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    handlePaymentCallback()
  }, [])

  const handlePaymentCallback = async () => {
    try {
      // Get payment parameters from URL
      const token = searchParams.get('Token')
      const refNum = searchParams.get('RefNum')
      const resCode = searchParams.get('ResCode')
      const traceNo = searchParams.get('TraceNo')
      const authority = searchParams.get('Authority')
      const statusParam = searchParams.get('Status')

      if (!token && !authority) {
        setStatus('failed')
        setMessage('Payment token not found')
        return
      }

      // Call payment callback API
      const payload = authority
        ? {
            Authority: authority,
            Status: statusParam,
          }
        : {
            Token: token,
            RefNum: refNum,
            ResCode: resCode,
            TraceNo: traceNo,
          }

      const response: any = await apiService.post('payments/callback/', payload, false) // Don't require auth for callback

      if (response.success) {
        setStatus('success')
        setMessage(response.message || 'Payment completed successfully!')
        
        // Check if this is a wallet deposit
        if (response.wallet_deposit) {
          // Refresh owner balance
          if (state.auth.user) {
            try {
              const balanceResponse = await apiService.getWalletBalance()
              if (balanceResponse.balance !== undefined) {
                updateOwner({
                  ...state.auth.user,
                  balance: balanceResponse.balance
                })
              }
            } catch (err) {
              console.error('Error fetching balance:', err)
            }
          }
          
          // Refresh transactions
          try {
            await apiService.getTransactions()
          } catch (err) {
            console.error('Error fetching transactions:', err)
          }
          
          // Redirect to wallet page after 3 seconds
          setTimeout(() => {
            navigate('/wallet')
          }, 3000)
        } else {
          // For other payment types, redirect to dashboard
          setTimeout(() => {
            navigate('/')
          }, 3000)
        }
      } else {
        setStatus('failed')
        setMessage(response.error || 'Payment verification failed')
        
        // Redirect to wallet page after 5 seconds
        setTimeout(() => {
          navigate('/wallet')
        }, 5000)
      }
    } catch (error) {
      console.error('Payment callback error:', error)
      setStatus('failed')
      setMessage(error instanceof Error ? error.message : 'An error occurred during payment verification')
      
      // Redirect to wallet page after 5 seconds
      setTimeout(() => {
        navigate('/wallet')
      }, 5000)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        {status === 'loading' && (
          <>
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold mb-2">
              {t('payment.processing') || 'Processing Payment...'}
            </h2>
            <p className="text-gray-600">
              {t('payment.pleaseWait') || 'Please wait while we verify your payment'}
            </p>
          </>
        )}
        
        {status === 'success' && (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">✓</span>
            </div>
            <h2 className="text-xl font-semibold text-green-600 mb-2">
              {t('payment.success') || 'Payment Successful!'}
            </h2>
            <p className="text-gray-600 mb-4">{message}</p>
            <p className="text-sm text-gray-500">
              {t('payment.redirecting') || 'Redirecting to your wallet...'}
            </p>
          </>
        )}
        
        {status === 'failed' && (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">✕</span>
            </div>
            <h2 className="text-xl font-semibold text-red-600 mb-2">
              {t('payment.failed') || 'Payment Failed'}
            </h2>
            <p className="text-gray-600 mb-4">{message}</p>
            <p className="text-sm text-gray-500">
              {t('payment.redirectingToWallet') || 'Redirecting to wallet...'}
            </p>
          </>
        )}
      </div>
    </div>
  )
}

