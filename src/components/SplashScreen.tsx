import React, { useState, useEffect, useRef } from 'react'

const ASSET_BASE_URL = import.meta.env.BASE_URL || '/'

interface SplashScreenProps {
  onComplete: () => void
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [videoLoaded, setVideoLoaded] = useState(false)
  const [videoError, setVideoError] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const startTime = useRef(Date.now())
  const minDisplayTime = 2500 // 2.5 seconds minimum

  useEffect(() => {
    // Check if splash was already shown in this session
    const splashShown = sessionStorage.getItem('splashShown')
    if (splashShown === 'true') {
      onComplete()
      return
    }

    // Try to play video
    if (videoRef.current) {
      videoRef.current.play().catch((error) => {
        console.log('Video autoplay failed, using fallback:', error)
        setVideoError(true)
      })
    }
  }, [onComplete])

  const handleVideoLoaded = () => {
    setVideoLoaded(true)
    console.log('Video loaded successfully')
  }

  const handleVideoEnded = () => {
    console.log('Video ended')
    handleComplete()
  }

  const handleVideoError = () => {
    console.log('Video failed to load, using fallback')
    setVideoError(true)
  }

  const handleComplete = () => {
    const elapsed = Date.now() - startTime.current
    const remainingTime = Math.max(0, minDisplayTime - elapsed)
    
    setTimeout(() => {
      setIsVisible(false)
      // Mark splash as shown in this session
      sessionStorage.setItem('splashShown', 'true')
      setTimeout(() => {
        onComplete()
      }, 300)
    }, remainingTime)
  }

  // Don't show splash if already shown in this session
  const splashShown = sessionStorage.getItem('splashShown')
  if (splashShown === 'true') {
    return null
  }

  if (!isVisible) {
    return null
  }

  return (
    <div className={`fixed inset-0 z-50 bg-slate-900 flex items-center justify-center transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      {/* Video Background or Fallback */}
      <div className="absolute inset-0 w-full h-full">
        {!videoError ? (
          <video
            ref={videoRef}
            autoPlay
            muted
            loop={false}
            playsInline
            preload="auto"
            className="w-full h-full object-cover"
            onLoadedData={handleVideoLoaded}
            onEnded={handleVideoEnded}
            onError={handleVideoError}
          >
            <source src={`${ASSET_BASE_URL}splash.mp4`} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        ) : (
          // Fallback gradient background
          <div className="w-full h-full bg-gradient-to-br from-purple-900 via-slate-900 to-teal-900 flex items-center justify-center">
            <div className="text-center space-y-4">
              <img 
                src={`${ASSET_BASE_URL}logo.png`} 
                alt="Funzone" 
                className="h-16 sm:h-20 md:h-24 lg:h-28 w-auto object-contain mx-auto animate-pulse"
              />
              <div className="text-white text-lg sm:text-xl font-semibold">
                Funzone Owner Portal
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Overlay with logo (only show if video is playing) */}
      {!videoError && (
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
          <div className="text-center space-y-4">
            <img 
              src={`${ASSET_BASE_URL}logo.png`} 
              alt="Funzone" 
              className="h-16 sm:h-20 md:h-24 lg:h-28 w-auto object-contain mx-auto animate-pulse"
            />
            <div className="text-white text-lg sm:text-xl font-semibold">
              Funzone Owner Portal
            </div>
          </div>
        </div>
      )}

      {/* Loading indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
      </div>
    </div>
  )
}
