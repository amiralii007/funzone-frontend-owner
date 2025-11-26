import { AuthProvider } from './state/authStore'
import { Outlet } from 'react-router-dom'
import SplashScreen from './components/SplashScreen'
import { useState, useEffect } from 'react'

export default function App() {
  const [showSplash, setShowSplash] = useState(true)
  
  useEffect(() => {
    // Check if splash was already shown in this session
    const splashShown = sessionStorage.getItem('splashShown')
    if (splashShown === 'true') {
      setShowSplash(false)
    }
  }, [])
  
  const handleSplashComplete = () => {
    setShowSplash(false)
  }
  
  return (
    <AuthProvider>
      {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
      <Outlet />
    </AuthProvider>
  )
}

