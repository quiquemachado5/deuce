'use client';

import { SlidersHorizontal, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import TournamentFilters, { type TournamentFilterItem } from '@/components/TournamentFilters';
import styles from './archive-filter-bar.module.css';

const mobileQuery = '(max-width: 560px)';

export default function ArchiveFilterBar({
  circuits,
  circuitLabel,
  panelTitle,
  activeCount = 0,
  busy = false,
  compactMobile = true,
  children,
}: {
  circuits: TournamentFilterItem[];
  circuitLabel: string;
  panelTitle: string;
  activeCount?: number;
  busy?: boolean;
  compactMobile?: boolean;
  children: ReactNode;
}) {
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const subscribe = useCallback((notify: () => void) => {
    const media = window.matchMedia(mobileQuery);
    const onChange = () => {
      setOpen(current => {
        if (current) window.requestAnimationFrame(() => trigger.current?.focus());
        return false;
      });
      notify();
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);
  const isMobile = useSyncExternalStore(subscribe, () => window.matchMedia(mobileQuery).matches, () => false);
  const portalRoot = typeof document === 'undefined' ? null : document.body;
  const close = useCallback((restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) window.requestAnimationFrame(() => trigger.current?.focus());
  }, []);

  useEffect(() => {
    if (!open) return;
    const currentPanel = panel.current;
    const inerted = new Map<HTMLElement, boolean>();
    if (isMobile && currentPanel) {
      document.body.classList.add('archive-filters-active');
      for (const child of document.body.children) {
        if (!(child instanceof HTMLElement) || child === currentPanel || child.contains(currentPanel)) continue;
        inerted.set(child, child.inert);
        child.inert = true;
      }
      window.requestAnimationFrame(() => closeButton.current?.focus());
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== 'Tab' || !isMobile || !currentPanel) return;
      const focusable = [...currentPanel.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])')]
        .filter(element => element.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable.at(-1)!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!root.current?.contains(target) && !currentPanel?.contains(target)) close(isMobile);
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.body.classList.remove('archive-filters-active');
      inerted.forEach((wasInert, element) => { element.inert = wasInert; });
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [close, isMobile, open]);

  const filterPanel = (portal = false) => (
    <div
      ref={panel}
      className={`${styles.panel} ${portal ? styles.mobilePanel : styles.desktopPanel}`}
      role={portal ? 'dialog' : 'region'}
      aria-modal={portal ? 'true' : undefined}
      aria-labelledby={titleId}
      data-visible={open || undefined}
    >
      <div className={styles.panelHeader}>
        <strong id={titleId}>{panelTitle}</strong>
        <button ref={closeButton} type="button" onClick={() => close()} aria-label="Cerrar filtros">
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      {portal && compactMobile ? <div className={styles.mobileCircuits}><TournamentFilters ariaLabel={circuitLabel} items={circuits} /></div> : null}
      <div className={styles.panelBody}>{children}</div>
    </div>
  );

  return (
    <div
      ref={root}
      className={styles.bar}
      data-open={open || undefined}
      data-compact-mobile={compactMobile || undefined}
      aria-busy={busy || undefined}
      onClickCapture={event => { if ((event.target as Element).closest('a[href]')) close(false); }}
      onSubmitCapture={() => close(false)}
    >
      <TournamentFilters ariaLabel={circuitLabel} items={circuits} />
      <button
        ref={trigger}
        className={styles.trigger}
        type="button"
        aria-expanded={open}
        aria-label={`${panelTitle}${activeCount ? `, ${activeCount} ${activeCount === 1 ? 'filtro activo' : 'filtros activos'}` : ''}`}
        onClick={() => setOpen(value => !value)}
      >
        <span>Filtros</span>
        <SlidersHorizontal size={18} aria-hidden="true" />
        {activeCount ? <b>{activeCount}</b> : null}
      </button>
      {!isMobile ? filterPanel() : null}
      {portalRoot && isMobile && open ? createPortal(<><button className={styles.backdrop} type="button" aria-label="Cerrar filtros" onClick={() => close()} />{filterPanel(true)}</>, portalRoot) : null}
    </div>
  );
}
