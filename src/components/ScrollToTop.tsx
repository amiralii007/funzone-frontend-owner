import { useLayoutEffect, useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * ScrollToTop component that scrolls to the top of the page
 * whenever the route changes.
 * Uses useLayoutEffect for immediate scroll and useEffect as fallback.
 */
export default function ScrollToTop() {
  const { pathname } = useLocation()

  const scrollToTop = () => {
    // Scroll window
    window.scrollTo(0, 0)
    
    // Scroll document elements
    if (document.documentElement) {
      document.documentElement.scrollTop = 0
    }
    if (document.body) {
      document.body.scrollTop = 0
    }
    
    // Scroll main element if it exists and is scrollable
    const mainElement = document.querySelector('main')
    if (mainElement) {
      mainElement.scrollTop = 0
    }
    
    // Scroll root element if it exists
    const rootElement = document.getElementById('root')
    if (rootElement) {
      rootElement.scrollTop = 0
    }
  }

  // Immediate scroll before paint
  useLayoutEffect(() => {
    scrollToTop()
  }, [pathname])

  // Fallback scroll after render (handles edge cases)
  useEffect(() => {
    // Small delay to ensure DOM is fully rendered
    const timeoutId = setTimeout(() => {
      scrollToTop()
    }, 0)
    
    return () => clearTimeout(timeoutId)
  }, [pathname])

  return null
}

