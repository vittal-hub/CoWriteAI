import { useState, useEffect } from 'react'

/**
 * Returns scroll status for sticky headers.
 * isSticky: true when page is scrolled past threshold.
 * isScrollingUp: true when scrolling upwards.
 */
export function useStickyHeader(threshold = 20) {
  const [isSticky, setIsSticky] = useState(false)
  const [isScrollingUp, setIsScrollingUp] = useState(true)

  useEffect(() => {
    let lastScrollY = window.scrollY

    function onScroll() {
      const currentScrollY = window.scrollY
      setIsSticky(currentScrollY > threshold)
      
      if (currentScrollY < lastScrollY || currentScrollY <= threshold) {
        setIsScrollingUp(true)
      } else {
        setIsScrollingUp(false)
      }
      
      lastScrollY = currentScrollY
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [threshold])

  return { isSticky, isScrollingUp }
}
