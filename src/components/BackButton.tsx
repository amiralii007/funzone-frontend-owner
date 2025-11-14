import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext'

interface BackButtonProps {
  className?: string
  fallbackPath?: string
}

export default function BackButton({ className = '', fallbackPath = '/' }: BackButtonProps) {
  const navigate = useNavigate()
  const { isRTL } = useLanguage()

  const handleBack = () => {
    // Check if there's history to go back to
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      // Fallback to a default page if no history
      navigate(fallbackPath)
    }
  }

  return (
    <button
      onClick={handleBack}
      className={`inline-flex items-center justify-center w-10 h-10 rounded-full bg-slate-700/50 hover:bg-slate-600/50 text-white transition-all duration-200 hover:scale-105 ${className}`}
      aria-label="Go back"
    >
      <span className="text-lg">
        ←
      </span>
    </button>
  )
}
