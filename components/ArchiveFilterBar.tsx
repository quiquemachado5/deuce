'use client';

import { SlidersHorizontal, X } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import type { TournamentFilterItem } from '@/components/TournamentFilters';
import CircuitCapsule from './CircuitCapsule';
import styles from './archive-filter-bar.module.css';

const mobileQuery = '(max-width: 759px)';

export default function ArchiveFilterBar({
  circuits,
  circuitLabel,
  panelTitle,
  activeCount = 0,
  busy = false,
  language = 'es',
  children,
  tone = 'light',
  palette,
  mobileLabel,
  desktopLabel,
  initiallyOpen = false,
  mobileIconOnly = false,
  autoFocusField,
}: {
  circuits: TournamentFilterItem[];
  circuitLabel: string;
  panelTitle: string;
  activeCount?: number;
  busy?: boolean;
  language?: 'es' | 'en';
  children?: ReactNode;
  palette?: { surface: string; panel: string; accent: string };
  mobileLabel?: string;
  desktopLabel?: string;
  initiallyOpen?: boolean;
  mobileIconOnly?: boolean;
  autoFocusField?: string;
  tone?: 'light' | 'dark';
}) {
  const theme = palette ? {
    '--filter-surface': palette.surface, '--filter-panel': palette.panel,
    '--filter-accent': palette.accent, '--filter-accent-ink': palette.surface,
    '--filter-control': 'color-mix(in srgb, var(--filter-panel) 82%, white)',
  } as CSSProperties : undefined;
  const selection = mobileLabel || circuits.find(item => item.active)?.label;
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const panelId = `${titleId}-panel`;
  const closeLabel = language === 'en' ? 'Close filters' : 'Cerrar filtros';
  const [open, setOpen] = useState(initiallyOpen);
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
        if (!(child instanceof HTMLElement) || child === currentPanel || child.contains(currentPanel) || child.hasAttribute('data-filter-backdrop')) continue;
        inerted.set(child, child.inert);
        child.inert = true;
      }
      window.requestAnimationFrame(() => {const field=autoFocusField?currentPanel.querySelector<HTMLInputElement>(`input[name="${autoFocusField}"]`):null;(field||closeButton.current)?.focus()});
    }
    if(open&&!isMobile&&autoFocusField)window.requestAnimationFrame(()=>currentPanel?.querySelector<HTMLInputElement>(`input[name="${autoFocusField}"]`)?.focus());
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
  }, [close, isMobile, open, autoFocusField]);

  useEffect(()=>{
    if(!autoFocusField)return;
    const openSearch=()=>setOpen(true);
    window.addEventListener('deuce:player-search',openSearch);
    return()=>window.removeEventListener('deuce:player-search',openSearch);
  },[autoFocusField]);

  const filterPanel = (portal = false) => (
    <div
      ref={panel}
      id={panelId}
      className={`${styles.panel} ${portal ? styles.mobilePanel : styles.desktopPanel}`}
      role={portal ? 'dialog' : 'region'}
      aria-modal={portal ? 'true' : undefined}
      aria-labelledby={titleId}
      data-visible={open || undefined}
      data-tone={tone}
      data-mobile-icon-only={mobileIconOnly || undefined}
      style={theme}
    >
      <div className={styles.panelHeader}>
        <strong id={titleId}>{panelTitle}</strong>
        <button ref={closeButton} type="button" onClick={() => close()} aria-label={closeLabel}>
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      <div className={styles.panelBody}>{portal && circuits.length > 1 && <CircuitCapsule label={circuitLabel} items={circuits} tone={tone} />}{children}</div>
    </div>
  );

  return (
    <div
      ref={root}
      className={styles.bar}
      data-tone={tone}
      data-mobile-icon-only={mobileIconOnly || undefined}
      style={theme}
      aria-busy={busy || undefined}
      onClickCapture={event => { if ((event.target as Element).closest('a[href]')) close(false); }}
      // Keep a mobile portal form connected until its native GET has submitted.
      onSubmitCapture={() => { if (!isMobile) close(false); }}
    >
      {circuits.length > 1 && <CircuitCapsule label={circuitLabel} items={circuits} tone={tone} />}
      <button
        ref={trigger}
        className={styles.trigger}
        data-labelled={desktopLabel ? true : undefined}
        data-mobile-only={!children || undefined}
        type="button"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={[panelTitle, selection, activeCount || null].filter(Boolean).join(" · ")}
        onClick={() => setOpen(value => !value)}
      >
        {desktopLabel && <span className={styles.desktopSelection}>{desktopLabel}</span>}
        {selection && <span className={styles.mobileSelection}>{selection}</span>}
        <SlidersHorizontal size={18} aria-hidden="true" />
        {activeCount ? <b>{activeCount}</b> : null}
      </button>
      {!isMobile ? filterPanel() : null}
      {portalRoot && isMobile && open ? createPortal(<><button className={styles.backdrop} data-filter-backdrop="" tabIndex={-1} type="button" aria-label={closeLabel} onClick={() => close()} />{filterPanel(true)}</>, portalRoot) : null}
    </div>
  );
}
