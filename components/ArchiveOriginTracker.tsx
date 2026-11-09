'use client';

import { useEffect } from 'react';

const ARCHIVE_ORIGIN_KEY = 'deuce:archive-origin';

/**
 * Keeps the originating match-search URL so a detail page can return to the
 * same filtered archive view. It deliberately renders no personal-history UI.
 */
export default function ArchiveOriginTracker() {
  useEffect(() => {
    const rememberOrigin = (event: MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const link = event.target instanceof Element
        ? event.target.closest<HTMLAnchorElement>('a[href]')
        : null;
      if (!link || link.target === '_blank') return;

      try {
        const url = new URL(link.href, window.location.href);
        if (url.origin !== window.location.origin || !url.pathname.startsWith('/match/')) return;

        if (window.location.pathname === '/buscar' || window.location.pathname === '/partidos') {
          sessionStorage.setItem(ARCHIVE_ORIGIN_KEY, window.location.pathname + window.location.search);
        } else {
          sessionStorage.removeItem(ARCHIVE_ORIGIN_KEY);
        }
      } catch {
        // Navigation remains available if storage is disabled.
      }
    };

    document.addEventListener('click', rememberOrigin, true);
    return () => document.removeEventListener('click', rememberOrigin, true);
  }, []);

  return null;
}
