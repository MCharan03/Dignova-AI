'use client';

import { useState, useEffect } from 'react';

/**
 * A custom hook to capture the global window scroll position and provide 
 * a normalized offset (0 to 1) relative to the document height.
 * This is used to sync the 3D background with the landing page scroll.
 */
export function useGlobalScroll() {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      // Calculate normalized offset (0 to 1)
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollHeight > 0) {
        setOffset(window.scrollY / scrollHeight);
      }
    };

    // Initial check
    handleScroll();

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return { offset };
}
