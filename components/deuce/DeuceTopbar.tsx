'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, ChevronDown, Menu, Search, X } from 'lucide-react';
import { circuitSectionHref, navigationCircuit, type Circuit, type CircuitSection, type SearchCircuit } from '@/lib/circuit-navigation';
import { TennisBallMark } from './TennisBallMark';
import styles from './deuce-topbar.module.css';

type MegaSection = Exclude<CircuitSection, 'compare'>;
type Result = { href: string; name: string; detail?: string; group: string; image?: string; imageAlt?: string; imagePosition?: string };
type SearchResult = { query: string; tour: SearchCircuit; items: Result[]; phase?: 'quick' | 'full'; error?: boolean };
type MegaLink = { label: string; detail: string; href: string };
type FeaturePhoto = { src: string; position?: string };
type MegaPanel = {
  title: string;
  description: string;
  overview: string;
  links: MegaLink[];
  feature: { value: string; action: string; href: string; photos: FeaturePhoto[] };
};

const navigation: ReadonlyArray<{ label: string; section: CircuitSection }> = [
  { label: 'Partidos', section: 'matches' },
  { label: 'Récords', section: 'records' },
  { label: 'Jugadores', section: 'players' },
  { label: 'Torneos', section: 'tournaments' },
  { label: 'Comparar', section: 'compare' },
];
const englishNavigation: Record<CircuitSection,{label:string;href:string}>={
  matches:{label:'Matches',href:'/en/matches'},records:{label:'Records',href:'/en/records'},players:{label:'Players',href:'/en/players'},tournaments:{label:'Tournaments',href:'/en/tournaments'},compare:{label:'Compare',href:'/en/compare'},
};

function tournamentHref(tour: Circuit, category?: string) {
  const params = new URLSearchParams();
  if (tour === 'wta') params.set('circuito', 'wta');
  if (category) params.set('categoria', category);
  const query = params.toString();
  return `/torneos${query ? `?${query}` : ''}`;
}

function matchHref(tour: Circuit | 'all', values: Record<string, string> = {}) {
  const params = new URLSearchParams(values);
  if (tour !== 'atp') params.set('tour', tour);
  const query = params.toString();
  return `/partidos${query ? `?${query}` : ''}`;
}

function panelFor(section: MegaSection, tour: Circuit): MegaPanel {
  const level1000 = tour === 'wta' ? 'WTA 1000' : 'Masters 1000';
  const level500 = tour === 'wta' ? 'WTA 500' : 'ATP 500';
  const level250 = tour === 'wta' ? 'WTA 250' : 'ATP 250';
  const overview = circuitSectionHref(section, tour);

  if (section === 'matches') return {
    title: 'Partido a partido',
    description: 'Resultados individuales por fecha, torneo, superficie y ronda. ATP y WTA conviven sin mezclar sus cálculos.',
    overview,
    links: [
      { label: 'Archivo ATP', detail: 'Resultados del circuito masculino', href: '/partidos' },
      { label: 'Archivo WTA', detail: 'Resultados del circuito femenino', href: '/partidos?tour=wta' },
      { label: 'ATP + WTA', detail: 'Buscar en todo el archivo', href: '/partidos?tour=all' },
      { label: 'Buscar por nombre', detail: 'Encontrar jugadores y jugadoras', href: `/jugadores?tour=${tour}&filtros=nombre` },
      { label: 'Grand Slam', detail: `Partidos ${tour.toUpperCase()} de los cuatro grandes`, href: matchHref(tour, { category: 'Grand Slam' }) },
    ],
    feature: {
      value: 'Desde 1968',
      action: 'Explorar partidos',
      href: overview,
      photos: tour === 'wta'
        ? [
            { src: '/images/players/wta-licensed/aryna-sabalenka-detail.webp', position: '50% 38%' },
            { src: '/images/players/wta-licensed/iga-swiatek-detail.webp', position: '50% 28%' },
            { src: '/images/players/wta-openverse/justine-henin.webp', position: '50% 24%' },
          ]
        : [
            { src: '/images/editorial/records/alexander-zverev-citi-open-2018.webp', position: '52% 35%' },
            { src: '/images/players/refreshed/carlos-alcaraz-379d5255.webp', position: '50% 38%' },
            { src: '/images/editorial/records/andy-murray-wimbledon-2013.webp', position: '50% 30%' },
          ],
    },
  };
  if (section === 'records') return {
    title: 'El archivo en cifras',
    description: 'Récords con muestra, escala y acceso a los partidos que sostienen cada dato.',
    overview,
    links: [
      { label: 'Récords ATP', detail: 'Carreras y temporadas masculinas', href: '/records' },
      { label: 'Récords WTA', detail: 'Carreras y temporadas femeninas', href: '/records?tour=wta' },
      { label: 'Comparar carreras', detail: 'Dos trayectorias en una misma escala', href: circuitSectionHref('compare', tour) },
      { label: 'Cobertura', detail: 'Qué datos incluye el archivo', href: '/cobertura' },
    ],
    feature: {
      value: 'ATP + WTA',
      action: 'Ver récords',
      href: overview,
      photos: tour === 'wta'
        ? [
            { src: '/images/players/wta-openverse/justine-henin.webp', position: '50% 22%' },
            { src: '/images/players/wta-licensed/iga-swiatek-detail.webp', position: '50% 30%' },
          ]
        : [
            { src: '/images/editorial/records/roger-federer-wimbledon-2005.webp', position: '50% 30%' },
            { src: '/images/editorial/records/isner-mahut-2010.webp', position: '50% 42%' },
            { src: '/images/editorial/records/andy-murray-wimbledon-2013.webp', position: '50% 28%' },
          ],
    },
  };
  if (section === 'players') return {
    title: 'Carreras completas',
    description: 'Jugadores y jugadoras con resultados, temporadas, superficies y rivales conectados.',
    overview,
    links: [
      { label: 'Jugadores ATP', detail: 'Directorio del circuito masculino', href: '/jugadores' },
      { label: 'Jugadoras WTA', detail: 'Directorio del circuito femenino', href: '/jugadores?tour=wta' },
      { label: 'Comparar jugadores', detail: 'Cruzar dos carreras', href: circuitSectionHref('compare', tour) },
      { label: 'Buscar por nombre', detail: 'Encontrar una carrera en segundos', href: `/jugadores?tour=${tour}&filtros=nombre` },
    ],
    feature: {
      value: 'Dos carreras',
      action: 'Abrir comparador',
      href: circuitSectionHref('compare', tour),
      photos: tour === 'wta'
        ? [
            { src: '/images/players/wta-licensed/iga-swiatek-detail.webp', position: '50% 30%' },
            { src: '/images/players/wta-licensed/aryna-sabalenka-detail.webp', position: '50% 38%' },
          ]
        : [
            { src: '/images/players/curated/rafael-nadal-orange.webp', position: '50% 30%' },
            { src: '/images/players/refreshed/carlos-alcaraz-379d5255.webp', position: '50% 38%' },
            { src: '/images/editorial/records/roger-federer-wimbledon-2005.webp', position: '50% 28%' },
          ],
    },
  };
  return {
    title: 'Grandes escenarios',
    description: 'Sedes, ediciones, campeones y cuadros publicados de cada circuito.',
    overview,
    links: [
      { label: 'Grand Slams', detail: 'Las cuatro grandes citas', href: tournamentHref(tour, 'Grand Slam') },
      { label: level1000, detail: 'Los torneos de categoría 1000', href: tournamentHref(tour, level1000) },
      { label: level500, detail: 'Calendario de categoría 500', href: tournamentHref(tour, level500) },
      { label: level250, detail: 'Calendario de categoría 250', href: tournamentHref(tour, level250) },
    ],
    feature: {
      value: 'GS · 1000 · 500 · 250',
      action: 'Ver torneos',
      href: overview,
      photos: [
        { src: '/images/tournaments/detail/us-open-arthur-ashe.webp', position: '50% 78%' },
        { src: '/images/tournaments/detail/wimbledon-centre-court-detail.webp', position: '50% 58%' },
        { src: '/images/tournaments/detail/roland-garros-match.webp', position: '50% 60%' },
        { src: '/images/tournaments/detail/australian-open-final.webp', position: '50% 55%' },
      ],
    },
  };
}

function isSectionActive(section: CircuitSection, pathname: string) {
  if(pathname.startsWith('/en/'))return englishNavigation[section].href===pathname||pathname.startsWith(`${englishNavigation[section].href}/`);
  if (section === 'matches') return pathname === '/partidos' || pathname === '/buscar' || pathname.startsWith('/match/');
  if (section === 'players') return pathname.startsWith('/jugadores') || pathname.startsWith('/players/');
  if (section === 'tournaments') return pathname.startsWith('/torneos') || /^\/[a-z0-9-]+\/\d{4}$/.test(pathname);
  if (section === 'compare') return pathname === '/comparar' || pathname === '/compare';
  return pathname === '/records' || pathname.startsWith('/records/');
}

function MegaPanelContent({ panel, section, close }: { panel: MegaPanel; section: MegaSection; close: () => void }) {
  const [photoIndex, setPhotoIndex] = useState(0);

  useEffect(() => {
    if (panel.feature.photos.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => setPhotoIndex(index => (index + 1) % panel.feature.photos.length), 4600);
    return () => window.clearInterval(timer);
  }, [panel.feature.photos.length]);

  return <div className={styles.megaPanel} data-panel={section} key={section}>
    <div className={styles.megaIntro}>
      <h2>{panel.title}</h2>
      <p>{panel.description}</p>
      <Link href={panel.overview} onClick={close}>Ver toda la sección <ArrowRight size={16} aria-hidden="true" /></Link>
    </div>
    <nav className={styles.megaLinks} aria-label={`Accesos de ${panel.title}`}>
      {panel.links.map(link => <Link href={link.href} onClick={()=>{close();if(link.href.includes('filtros=nombre'))window.dispatchEvent(new Event('deuce:player-search'))}} key={link.href}>
        <span><strong>{link.label}</strong><small>{link.detail}</small></span>
        <ArrowRight size={16} aria-hidden="true" />
      </Link>)}
    </nav>
    <Link className={styles.megaFeature} data-panel={section} href={panel.feature.href} onClick={close}>
      {panel.feature.photos.map((photo, index) => <Image
        className={`${styles.featurePhoto}${index === photoIndex ? ` ${styles.featurePhotoActive}` : ''}`}
        src={photo.src}
        alt=""
        fill
        sizes="300px"
        style={{ objectPosition: photo.position }}
        key={photo.src}
      />)}
      <strong>{panel.feature.value}</strong>
      <span>{panel.feature.action} <ArrowRight size={15} aria-hidden="true" /></span>
    </Link>
  </div>;
}

export function DeuceTopbar() {
  const pathname = usePathname(), router = useRouter(), searchParams = useSearchParams();
  const english=pathname==='/en'||pathname.startsWith('/en/');
  const navigationTour = navigationCircuit(pathname, searchParams);
  const searchTour: SearchCircuit = 'all';
  const navigationItems = navigation.map(item => english?{...item,...englishNavigation[item.section]}:{ ...item, href: circuitSectionHref(item.section, navigationTour) });
  const [scrolled, setScrolled] = useState(false), [navHidden, setNavHidden] = useState(false);
  const [menu, setMenu] = useState(false), [menuClosing, setMenuClosing] = useState(false), [activePanel, setActivePanel] = useState<MegaSection | null>(null), [panelOpen, setPanelOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false), [searchMounted, setSearchMounted] = useState(false), [query, setQuery] = useState('');
  const [result, setResult] = useState<SearchResult>({ query: '', tour: 'all', items: [] });
  const lastScroll = useRef(0), closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null), panelUnmountTimer = useRef<ReturnType<typeof setTimeout> | null>(null), searchUnmountTimer = useRef<ReturnType<typeof setTimeout> | null>(null), menuUnmountTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restoreSearchFocus = useRef(false);
  const shell = useRef<HTMLElement>(null), menuTrigger = useRef<HTMLButtonElement>(null);
  const field = useRef<HTMLInputElement>(null), searchTrigger = useRef<HTMLButtonElement>(null);
  const navTriggers = useRef(new Map<MegaSection, HTMLButtonElement>());
  const panel = activePanel ? panelFor(activePanel, navigationTour) : null;
  const expanded = searchOpen || menu || panelOpen;

  const clearCloseTimer = useCallback(() => { if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; } }, []);
  const clearPanelUnmountTimer = useCallback(() => { if (panelUnmountTimer.current) { clearTimeout(panelUnmountTimer.current); panelUnmountTimer.current = null; } }, []);
  const clearSearchUnmountTimer = useCallback(() => { if (searchUnmountTimer.current) { clearTimeout(searchUnmountTimer.current); searchUnmountTimer.current = null; } }, []);
  const clearMenuUnmountTimer = useCallback(() => { if (menuUnmountTimer.current) { clearTimeout(menuUnmountTimer.current); menuUnmountTimer.current = null; } }, []);
  const closeAll = useCallback(() => { clearCloseTimer(); clearPanelUnmountTimer(); clearSearchUnmountTimer(); clearMenuUnmountTimer(); setMenu(false); setMenuClosing(false); setPanelOpen(false); setActivePanel(null); setSearchOpen(false); setSearchMounted(false); }, [clearCloseTimer, clearMenuUnmountTimer, clearPanelUnmountTimer, clearSearchUnmountTimer]);
  const closeMobileMenu = useCallback(() => {
    if (!menu) return;
    clearMenuUnmountTimer();
    setMenu(false); setMenuClosing(true); setPanelOpen(false); setActivePanel(null);
    menuUnmountTimer.current = setTimeout(() => { setMenuClosing(false); window.requestAnimationFrame(() => menuTrigger.current?.focus()); }, 460);
  }, [clearMenuUnmountTimer, menu]);
  const closePanel = useCallback(() => {
    if (!activePanel) return;
    clearCloseTimer(); clearPanelUnmountTimer(); setPanelOpen(false);
    panelUnmountTimer.current = setTimeout(() => setActivePanel(null), 460);
  }, [activePanel, clearCloseTimer, clearPanelUnmountTimer]);
  const openPanel = useCallback((section: MegaSection) => {
    clearCloseTimer(); clearPanelUnmountTimer(); clearSearchUnmountTimer();
    setSearchOpen(false); setSearchMounted(false); setMenu(false); setNavHidden(false); setActivePanel(section);
    window.requestAnimationFrame(() => setPanelOpen(true));
  }, [clearCloseTimer, clearPanelUnmountTimer, clearSearchUnmountTimer]);
  const closeSearch = useCallback(() => {
    restoreSearchFocus.current = true;
    setSearchOpen(false);
    clearSearchUnmountTimer();
    searchUnmountTimer.current = setTimeout(() => setSearchMounted(false), 460);
  }, [clearSearchUnmountTimer]);
  const openSearch = useCallback(() => {
    clearCloseTimer(); clearPanelUnmountTimer(); clearSearchUnmountTimer();
    setMenu(false); setPanelOpen(false); setActivePanel(null); setNavHidden(false); setSearchMounted(true);
    window.requestAnimationFrame(() => setSearchOpen(true));
  }, [clearCloseTimer, clearPanelUnmountTimer, clearSearchUnmountTimer]);
  const togglePanel = useCallback((section: MegaSection) => {
    if (menu) {
      clearPanelUnmountTimer(); setPanelOpen(false);
      setActivePanel(current => current === section ? null : section);
      return;
    }
    if (activePanel === section && panelOpen) closePanel();
    else openPanel(section);
  }, [activePanel, clearPanelUnmountTimer, closePanel, menu, openPanel, panelOpen]);

  useEffect(() => {
    const scroll = () => {
      const next = Math.max(0, window.scrollY);
      setScrolled(next > 24);
      if (expanded || next <= 72) setNavHidden(false);
      else if (Math.abs(next - lastScroll.current) > 7) setNavHidden(next > lastScroll.current);
      lastScroll.current = next;
    };
    const key = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const editing = target?.matches('input,textarea,select,[contenteditable="true"]');
      if (((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') || (event.key === '/' && !editing)) {
        event.preventDefault(); openSearch(); return;
      }
      if (event.key === 'Escape') {
        if (searchOpen) { event.preventDefault(); closeSearch(); }
        else if (menu) { event.preventDefault(); closeMobileMenu(); }
        else if (activePanel) { event.preventDefault(); const previous = activePanel; closePanel(); window.requestAnimationFrame(() => navTriggers.current.get(previous)?.focus()); }
      }
      if (event.key === 'Tab' && (searchMounted || menu) && shell.current) {
        const focusable = [...shell.current.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])')]
          .filter(node => !node.hidden
            && !node.closest('[aria-hidden="true"], [inert]')
            && (!searchMounted || Boolean(node.closest('form[role="search"],#global-search-results'))));
        if (!focusable.length) return;
        const first = focusable[0], last = focusable.at(-1)!;
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    const navigate = () => closeAll();
    const frame = requestAnimationFrame(scroll);
    document.addEventListener('deuce:navigate', navigate);
    window.addEventListener('scroll', scroll, { passive: true });
    document.addEventListener('keydown', key);
    return () => {
      cancelAnimationFrame(frame); clearCloseTimer();
      document.removeEventListener('deuce:navigate', navigate);
      window.removeEventListener('scroll', scroll); document.removeEventListener('keydown', key);
    };
  }, [activePanel, clearCloseTimer, clearSearchUnmountTimer, closeAll, closeMobileMenu, closePanel, closeSearch, expanded, menu, openSearch, searchMounted, searchOpen]);

  useEffect(() => () => { clearMenuUnmountTimer(); clearPanelUnmountTimer(); clearSearchUnmountTimer(); }, [clearMenuUnmountTimer, clearPanelUnmountTimer, clearSearchUnmountTimer]);

  useEffect(() => {
    if (!activePanel || menu || searchOpen) return;
    const outside = (event: PointerEvent) => { if (!shell.current?.contains(event.target as Node)) closePanel(); };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [activePanel, closePanel, menu, searchOpen]);

  useEffect(() => {
    const blocked = [document.getElementById('main-content'), document.querySelector<HTMLElement>('[data-deuce-footer]')]
      .filter((node): node is HTMLElement => Boolean(node));
    for (const node of blocked) node.inert = searchMounted || menu;
    return () => { for (const node of blocked) node.inert = false; };
  }, [menu, searchMounted]);

  useEffect(() => {
    if (!searchOpen) return;
    const frame = window.requestAnimationFrame(() => field.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [searchOpen]);

  useEffect(() => {
    if (searchMounted || !restoreSearchFocus.current) return;
    const frame = window.requestAnimationFrame(() => { searchTrigger.current?.focus(); restoreSearchFocus.current = false; });
    return () => window.cancelAnimationFrame(frame);
  }, [searchMounted]);

  useEffect(() => {
    const text = query.trim();
    if (text.length < 2) return;
    const abort = new AbortController();
    let fullTimer: ReturnType<typeof setTimeout> | undefined;
    const loadFull = async (quickItems: Result[]) => {
      try {
        const full = await fetch(`/api/search?tour=${searchTour}&q=${encodeURIComponent(text)}`, { signal: abort.signal });
        if (!full.ok) return;
        const fullData = await full.json();
        setResult({ query: text, tour: searchTour, items: Array.isArray(fullData.items) ? fullData.items.slice(0, 24) : quickItems, phase: 'full' });
      } catch (error) { if (!(error instanceof Error && error.name === 'AbortError')) return; }
    };
    const load = async () => {
      let quickLoaded = false;
      try {
        const quick = await fetch(`/api/search?mode=quick&tour=${searchTour}&q=${encodeURIComponent(text)}`, { signal: abort.signal });
        if (!quick.ok) throw Error('search');
        const quickData = await quick.json(), quickItems = Array.isArray(quickData.items) ? quickData.items.slice(0, 24) : [];
        quickLoaded = ['quick', 'indexed'].includes(quick.headers.get('X-DEUCE-Search-Mode') || '');
        setResult({ query: text, tour: searchTour, items: quickItems, phase: quickLoaded ? 'quick' : 'full' });
        if (!quickLoaded) return;
        fullTimer = setTimeout(() => { void loadFull(quickItems); }, 500);
      } catch (error) {
        if (!(error instanceof Error && error.name === 'AbortError') && !quickLoaded) setResult({ query: text, tour: searchTour, items: [], phase: 'full', error: true });
      }
    };
    const timer = setTimeout(load, 120);
    return () => { clearTimeout(timer); if (fullTimer) clearTimeout(fullTimer); abort.abort(); };
  }, [query, searchTour]);

  const submit = () => {
    const text = query.trim();
    if (!text) return;
    closeAll();
    router.push(english?`/en/matches?${new URLSearchParams({q:text}).toString()}`:`/buscar?${new URLSearchParams({ q: text, tour: searchTour }).toString()}`);
  };
  const recordSearchClick=(group:string,position:number)=>{
    const normalized=['Jugadores','Players'].includes(group)?'players':['Partidos','Matches'].includes(group)?'matches':'tournaments';
    const payload=JSON.stringify({kind:'search-click',group:normalized,position,queryLength:query.trim().length});
    navigator.sendBeacon?.('/api/telemetry',new Blob([payload],{type:'application/json'}));
  };
  const queryLength = query.trim().length;
  const loading = queryLength >= 2 && (result.query !== query.trim() || result.tour !== searchTour);
  const visibleItems = result.tour === searchTour && result.query === query.trim() ? result.items : [];
  const searchColumns = [
    { label: english?'Players':'Jugadores', items: visibleItems.filter(item => item.group === 'Jugadores').slice(0, 6) },
    { label: english?'Matches':'Partidos', items: visibleItems.filter(item => item.group === 'Partidos').slice(0, 6) },
  ];
  const tournamentItems = visibleItems.filter(item => item.group === 'Torneos' || item.group === 'Ediciones').slice(0, 6);
  if (tournamentItems.length) searchColumns.push({ label: english?'Tournaments':'Torneos', items: tournamentItems });
  const resultHref=(item:Result)=>{if(!english)return item.href;if(item.href.startsWith('/match/'))return item.href.replace('/match/','/en/matches/');if(item.href.startsWith('/jugadores/'))return item.href.replace('/jugadores/','/en/players/');if(item.href.startsWith('/torneos/'))return item.href.replace('/torneos/','/en/tournaments/').split('?')[0];if(item.href.startsWith('/torneo/'))return `/en/tournaments/${item.href.split('/')[2]}`;if(item.href.startsWith('/records'))return '/en/records';return '/en/matches';};
  const hasPresentedResults = searchColumns.some(column => column.items.length > 0);
  const completingSearch = loading || result.phase === 'quick';
  const moveResult = (direction: 1 | -1) => {
    const links = [...(shell.current?.querySelectorAll<HTMLAnchorElement>('[data-search-result]') || [])];
    if (!links.length) return;
    const current = links.indexOf(document.activeElement as HTMLAnchorElement);
    if (direction < 0 && current <= 0) { field.current?.focus(); return; }
    links[current < 0 ? (direction > 0 ? 0 : links.length - 1) : (current + direction + links.length) % links.length]?.focus();
  };
  const schedulePanelClose = () => {
    if (menu || searchOpen || !activePanel || !window.matchMedia('(hover:hover) and (pointer:fine)').matches) return;
    clearCloseTimer(); closeTimer.current = setTimeout(closePanel, 140);
  };

  return <>
    {(menu || searchMounted) && <button className={styles.backdrop} type="button" aria-label={english ? 'Close navigation' : 'Cerrar navegación'} onClick={menu ? closeMobileMenu : closeAll} />}
    <header
      ref={shell}
      className={`${styles.topbar}${scrolled ? ` ${styles.scrolled}` : ''}${navHidden && !expanded ? ` ${styles.hidden}` : ''}${expanded ? ` ${styles.expanded}` : ''}${(activePanel && !panelOpen && !menu) || menuClosing ? ` ${styles.panelClosing}` : ''}${searchMounted && !searchOpen ? ` ${styles.searchClosing}` : ''}`}
      data-deuce-topbar=""
      data-grand-slam={pathname.match(/^\/(?:torneos|en\/tournaments)\/(australian-open|roland-garros|wimbledon|us-open)(?:\/|$)/)?.[1]}
      data-scrolled={scrolled || undefined}
      data-search-open={searchMounted || undefined}
      data-hidden={navHidden && !expanded || undefined}
      onPointerEnter={() => { clearCloseTimer(); clearPanelUnmountTimer(); if (activePanel) setPanelOpen(true); }}
      onPointerLeave={schedulePanelClose}
      onBlur={event => { if (!menu && !searchOpen && !event.currentTarget.contains(event.relatedTarget)) closePanel(); }}
    >
      <div className={styles.shell}>
        <div className={styles.topline}>
          <Link className={styles.logo} href={english?'/en':'/'} aria-label={english?'DEUCE, home':'DEUCE, inicio'} onClick={closeAll}><span className={styles.logoMark} aria-hidden="true"><TennisBallMark/></span><span className={styles.logoWord}>DEUCE</span></Link>
          <nav className={styles.desktopNavigation} aria-label={english ? 'Main navigation' : 'Principal'} aria-hidden={searchMounted} inert={searchMounted || undefined}>
            <Link className={`${styles.navTrigger} ${styles.homeLink}`} aria-current={pathname === (english?'/en':'/') ? 'page' : undefined} href={english?'/en':'/'} onClick={closeAll}>{english?'Home':'Inicio'}</Link>
            {navigationItems.map(({ label, section, href }) => english||section === 'compare'
              ? <Link className={`${styles.compareLink}${isSectionActive(section, pathname) ? ` ${styles.current}` : ''}`} aria-current={isSectionActive(section, pathname) ? 'page' : undefined} href={href} onClick={closeAll} key={section}>{label}</Link>
              : <button
                ref={node => { if (node) navTriggers.current.set(section, node); else navTriggers.current.delete(section); }}
                className={`${styles.navTrigger}${isSectionActive(section, pathname) ? ` ${styles.current}` : ''}${activePanel === section ? ` ${styles.selected}` : ''}`}
                type="button"
                aria-expanded={activePanel === section}
                aria-controls="deuce-mega-panel"
                onClick={() => togglePanel(section)}
                onPointerEnter={event => {
                  if (event.pointerType !== 'mouse' || !window.matchMedia('(hover:hover) and (pointer:fine)').matches) return;
                  openPanel(section);
                }}
                key={section}
              >{label}<ChevronDown size={13} aria-hidden="true" /></button>)}
          </nav>
          <div className={styles.actions} aria-hidden={searchMounted} inert={searchMounted || undefined}>
            <button ref={searchTrigger} className={styles.searchTrigger} type="button" onClick={openSearch} aria-label={english?'Search DEUCE':'Buscar en DEUCE'} aria-expanded={searchOpen} aria-controls="global-search-results"><Search size={19} aria-hidden="true" /></button>
            <button ref={menuTrigger} className={styles.menuTrigger} type="button" aria-label={menu ? (english ? 'Close menu' : 'Cerrar men\u00fa') : (english ? 'Open menu' : 'Abrir men\u00fa')} aria-expanded={menu} aria-controls="deuce-mobile-navigation" onClick={() => { clearPanelUnmountTimer(); clearMenuUnmountTimer(); setSearchOpen(false); setPanelOpen(false); setActivePanel(null); setNavHidden(false); if (menu) closeMobileMenu(); else { setMenuClosing(false); setMenu(true); } }}>{menu ? <X size={19} aria-hidden="true" /> : <Menu size={19} aria-hidden="true" />}</button>
          </div>
          <form className={`${styles.searchForm}${searchOpen ? ` ${styles.searchFormOpen}` : ''}`} role="search" aria-hidden={!searchOpen} onSubmit={event => { event.preventDefault(); submit(); }}>
            <Search size={19} aria-hidden="true" />
            <label className="nc-sr" htmlFor="global-search">{english?'Search players, matches or tournaments':'Buscar jugadores, partidos o torneos'}</label>
            <input ref={field} id="global-search" type="search" name="q" value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === 'ArrowDown') { event.preventDefault(); moveResult(1); } }} placeholder={english?'Player, tournament, match or record':'Jugador, torneo, partido o récord'} autoComplete="off" tabIndex={searchOpen ? 0 : -1} aria-controls="global-search-results" />
            {query && <button className={styles.clearSearch} type="button" onClick={() => { setQuery(''); field.current?.focus(); }} aria-label={english ? 'Clear search' : 'Borrar búsqueda'} tabIndex={searchOpen ? 0 : -1}><X size={16} aria-hidden="true" /></button>}
            <button className={styles.submitSearch} type="submit" aria-label={english ? 'View all results' : 'Ver todos los resultados'} tabIndex={searchOpen ? 0 : -1}><ArrowRight size={18} aria-hidden="true" /></button>
            <button className={styles.closeSearch} type="button" onClick={closeSearch} aria-label={english ? 'Close search' : 'Cerrar búsqueda'} tabIndex={searchOpen ? 0 : -1}><X size={18} aria-hidden="true" /></button>
          </form>
        </div>

        <div className={styles.panelFrame} id="deuce-mega-panel">
          <div className={styles.panelClip}>
            {searchMounted ? <section id="global-search-results" className={styles.searchResults} aria-label={english ? 'Search suggestions' : 'Sugerencias de búsqueda'} aria-live="polite" aria-busy={loading} aria-hidden={!searchOpen} inert={!searchOpen || undefined} onKeyDown={event => { if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); moveResult(event.key === 'ArrowDown' ? 1 : -1); } }}>
              {!query.trim() ? <div className={styles.searchEmpty}>
                <div><h2>{english?'All tennis, one search':'Todo el tenis, una búsqueda'}</h2><p>{english?'ATP and WTA players, matches, tournaments and records.':'Jugadores, jugadoras, partidos, torneos y récords ATP y WTA.'}</p></div>
                <nav aria-label={english ? 'Search shortcuts' : 'Accesos de búsqueda'}>{navigationItems.slice(0, 4).map(({ label, section, href }) => <Link key={section} href={href} onClick={closeAll}>{label}<ArrowRight size={15} aria-hidden="true" /></Link>)}</nav>
              </div>
              : queryLength < 2 ? <p className={styles.searchStatus}>{english?'Enter at least two characters.':'Escribe al menos dos caracteres.'}</p>
              : result.error ? <p className={styles.searchStatus}>{english?'Suggestions could not be loaded. Press Enter to search.':'No se pudieron cargar las sugerencias. Pulsa Intro para buscar.'}</p>
              : hasPresentedResults || completingSearch ? <div className={`${styles.searchGroups}${tournamentItems.length ? ` ${styles.searchGroupsThree}` : ''}`}>{searchColumns.map(column => <section key={column.label} aria-label={column.label}><h2>{column.label}</h2>{column.items.length ? column.items.map((item,index) => {const href=resultHref(item);return <Link className={item.image ? styles.searchResultWithPhoto : undefined} href={href} prefetch={false} key={item.href} data-search-result="" onPointerEnter={() => router.prefetch(href)} onFocus={() => router.prefetch(href)} onClick={()=>{recordSearchClick(column.label,index+1);closeAll();}}>{item.image&&<Image className={styles.searchResultPhoto} src={item.image} alt={item.imageAlt||''} width={88} height={88} style={{objectPosition:item.imagePosition}}/>}<span><strong>{item.name}</strong>{item.detail && <small>{item.detail}</small>}</span><ArrowRight size={15} aria-hidden="true" /></Link>}) : <p className={styles.searchColumnStatus}>{completingSearch ? (english?'Searching…':'Buscando…') : (english?'No matches':'Sin coincidencias')}</p>}</section>)}</div>
              : <p className={styles.searchStatus}>{english?`No results for “${query}”. Try another player, tournament or year.`:`No hay resultados para «${query}». Prueba con otro nombre, torneo o año.`}</p>}
            </section>
            : menu || menuClosing ? <nav id="deuce-mobile-navigation" className={styles.mobileNavigation} aria-label={english ? 'Main navigation' : 'Principal'} aria-hidden={menuClosing || undefined} inert={menuClosing || undefined}>
              <Link className={`${styles.mobileDirectLink} ${styles.mobileHomeLink}`} href={english?'/en':'/'} onClick={closeAll}>{english?'Home':'Inicio'}<ArrowRight size={17} aria-hidden="true" /></Link>
              {navigationItems.map(({ label, section, href }) => english||section === 'compare' ? <Link className={styles.mobileDirectLink} href={href} onClick={closeAll} key={section}>{label}<ArrowRight size={17} aria-hidden="true" /></Link> : <div className={styles.mobileGroup} data-open={activePanel === section || undefined} key={section}>
                <button type="button" aria-expanded={activePanel === section} onClick={() => togglePanel(section)}><span>{label}</span><ChevronDown size={18} aria-hidden="true" /></button>
                <div className={styles.mobileSubmenu}><div>
                  <Link className={styles.mobileOverview} href={panelFor(section, navigationTour).overview} onClick={closeAll}>Ver toda la sección <ArrowRight size={15} aria-hidden="true" /></Link>
                  {panelFor(section, navigationTour).links.map(link => <Link href={link.href} onClick={()=>{closeAll();if(link.href.includes('filtros=nombre'))window.dispatchEvent(new Event('deuce:player-search'))}} key={link.href}><strong>{link.label}</strong><small>{link.detail}</small></Link>)}
                </div></div>
              </div>)}
            </nav>
            : panel && activePanel ? <MegaPanelContent panel={panel} section={activePanel} close={closeAll} key={activePanel} /> : null}
          </div>
        </div>
      </div>
    </header>
  </>;
}
