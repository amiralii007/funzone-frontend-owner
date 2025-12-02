import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * ScrollRestoration component that ensures pages start from the top.
 * Should be placed inside RouterProvider to catch all route changes.
 */
export default function ScrollRestoration() {
  const { pathname } = useLocation()

  useEffect(() => {
    // Force scroll to top on every route change
    const scrollToTop = () => {
      // Multiple methods to ensure compatibility
      try {
        window.scrollTo(0, 0)
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
      } catch (e) {
        // Fallback for older browsers
        window.scrollTo(0, 0)
      }
      
      if (document.documentElement) {
        document.documentElement.scrollTop = 0
        document.documentElement.scrollLeft = 0
      }
      if (document.body) {
        document.body.scrollTop = 0
        document.body.scrollLeft = 0
      }
      
      const mainElement = document.querySelector('main')
      if (mainElement) {
        mainElement.scrollTop = 0
        mainElement.scrollLeft = 0
      }
      
      const rootElement = document.getElementById('root')
      if (rootElement) {
        rootElement.scrollTop = 0
        rootElement.scrollLeft = 0
      }
    }

    // Immediate scroll
    scrollToTop()
    
    // Multiple fallbacks to handle different rendering scenarios
    const timeout1 = setTimeout(() => {
      scrollToTop()
    }, 0)
    
    const timeout2 = setTimeout(() => {
      scrollToTop()
    }, 10)
    
    const timeout3 = setTimeout(() => {
      scrollToTop()
    }, 50)

    return () => {
      clearTimeout(timeout1)
      clearTimeout(timeout2)
      clearTimeout(timeout3)
    }
  }, [pathname])

  // Also handle initial page load
  useEffect(() => {
    const scrollToTop = () => {
      window.scrollTo(0, 0)
      if (document.documentElement) document.documentElement.scrollTop = 0
      if (document.body) document.body.scrollTop = 0
    }
    
    // Scroll on mount
    scrollToTop()
    
    // Also scroll after a brief delay to override browser restoration
    const timeout = setTimeout(scrollToTop, 100)
    
    return () => clearTimeout(timeout)
  }, [])

  return null
}

