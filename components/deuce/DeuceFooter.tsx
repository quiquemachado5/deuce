'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { circuitSectionHref, navigationCircuit, type Circuit } from '@/lib/circuit-navigation';
import { TennisBallMark } from './TennisBallMark';
import {AppearanceControl} from './AppearanceControl';
import styles from './deuce-footer.module.css';

function FooterNavigationLinks({ circuit,english=false }: { circuit: Circuit;english?:boolean }) {
  if(english)return <nav className={styles.navigation} aria-label="Footer navigation"><div className={styles.navigationGroup}><strong>Explore</strong><Link href={"/en/matches"+(circuit==='wta'?'?tour=wta':'')}>Matches</Link><Link href={"/en/records"+(circuit==='wta'?'?tour=wta':'')}>Records</Link><Link href={"/en/players"+(circuit==='wta'?'?tour=wta':'')}>Players</Link><Link href={"/en/tournaments"+(circuit==='wta'?'?tour=wta':'')}>Tournaments</Link><Link href={"/en/compare"+(circuit==='wta'?'?tour=wta':'')}>Compare</Link></div><div className={styles.navigationGroup}><strong>The archive</strong><Link href="/en/coverage">Coverage</Link><Link href="/sobre">About DEUCE · ES</Link><Link href="/licencias">Licences · ES</Link></div></nav>;
  return <nav className={styles.navigation} aria-label="Navegación del pie">
    <div className={styles.navigationGroup}>
      <strong>Explorar</strong>
      <Link href={circuitSectionHref('matches',circuit)}>Partidos</Link>
      <Link href={circuitSectionHref('records',circuit)}>Récords</Link>
      <Link href={circuitSectionHref('players',circuit)}>Jugadores</Link>
      <Link href={circuitSectionHref('tournaments',circuit)}>Torneos</Link>
      <Link href={circuitSectionHref('compare',circuit)}>Comparar</Link>
    </div>
    <div className={styles.navigationGroup}>
      <strong>El archivo</strong>
      <Link href="/cobertura">Cobertura</Link>
      <Link href="/licencias">Licencias</Link>
      <Link href="/sobre">Sobre DEUCE</Link>
    </div>
  </nav>;
}

function CircuitAwareFooterNavigation() {
  const pathname=usePathname(),searchParams=useSearchParams();
  return <FooterNavigationLinks circuit={navigationCircuit(pathname,searchParams)} english={pathname==='/en'||pathname.startsWith('/en/')}/>;
}

function spanishEquivalent(pathname:string){
  if(pathname.startsWith('/en/matches/'))return pathname.replace('/en/matches/','/match/');
  if(pathname.startsWith('/en/players/'))return pathname.replace('/en/players/','/jugadores/');
  if(pathname.startsWith('/en/tournaments/'))return pathname.replace('/en/tournaments/','/torneos/');
  return ({'/en':'/','/en/matches':'/partidos','/en/players':'/jugadores','/en/tournaments':'/torneos','/en/records':'/records','/en/compare':'/comparar','/en/time-machine':'/maquina-del-tiempo','/en/coverage':'/cobertura','/en/developers':'/desarrolladores'} as Record<string,string>)[pathname]||'/';
}
function englishEquivalent(pathname:string){
  if(pathname.startsWith('/match/'))return pathname.replace('/match/','/en/matches/');
  if(pathname.startsWith('/jugadores/'))return pathname.replace('/jugadores/','/en/players/');
  if(pathname.startsWith('/torneos/'))return pathname.replace('/torneos/','/en/tournaments/');
  return ({'/':'/en','/partidos':'/en/matches','/buscar':'/en/matches','/jugadores':'/en/players','/torneos':'/en/tournaments','/records':'/en/records','/comparar':'/en/compare','/maquina-del-tiempo':'/en/time-machine','/cobertura':'/en/coverage','/desarrolladores':'/en/developers'} as Record<string,string>)[pathname]||'/en';
}

function localizedHref(pathname:string,searchParams:URLSearchParams,target:'es'|'en'){
  const destination=target==='es'?spanishEquivalent(pathname):englishEquivalent(pathname);
  const params=new URLSearchParams(searchParams.toString());
  const circuit=params.get('tour')||params.get('circuito')||params.get('cuadro');
  params.delete('tour');
  params.delete('circuito');
  params.delete('cuadro');
  if(circuit==='atp'||circuit==='wta'){
    if(target==='en')params.set('tour',circuit);
    else params.set(destination.startsWith('/torneos/')?'cuadro':'tour',circuit);
  }
  const query=params.toString();
  return query?`${destination}?${query}`:destination;
}

function FooterLanguageSelector(){
  const pathname=usePathname(),searchParams=useSearchParams(),router=useRouter();
  const english=pathname==='/en'||pathname.startsWith('/en/');
  const changeLanguage=(language:string)=>router.push(localizedHref(pathname,new URLSearchParams(searchParams.toString()),language==='en'?'en':'es'));
  return <label className={styles.language} title={english?'Change language':'Cambiar idioma'}>
    <Image className={styles.languageFlag} src={`/images/flags/${english?'gb':'es'}.svg`} alt="" width={26} height={19} unoptimized aria-hidden="true"/>
    <select aria-label={english?'Select language':'Seleccionar idioma'} value={english?'en':'es'} onChange={(event)=>changeLanguage(event.target.value)}>
      <option value="es">🇪🇸</option>
      <option value="en">🇬🇧</option>
    </select>
  </label>;
}

export function DeuceFooter() {
  const pathname=usePathname();
  const english=pathname==='/en'||pathname.startsWith('/en/');
  const tone=pathname==='/'?'home':pathname.startsWith('/records')||pathname.startsWith('/torneos/')||pathname.startsWith('/torneo/')?'dark':'light';
  return <footer className={styles.footer} data-deuce-footer="" data-tone={tone} data-grand-slam={pathname.match(/^\/(?:torneos|en\/tournaments)\/(australian-open|roland-garros|wimbledon|us-open)(?:\/|$)/)?.[1]} aria-label="Pie de página">
    <div className={styles.transition} aria-hidden="true" />
    <div className={styles.material}>
      <div className={styles.directory}>
        <div className={styles.directoryRow}>
          <div className={styles.brand}>
            <Link className={styles.logo} href={english?'/en':'/'} aria-label={english?'DEUCE, home':'DEUCE, inicio'}><TennisBallMark/>DEUCE</Link>
            <p>{english?'ATP and WTA tennis archive.':'Archivo estadístico de tenis ATP y WTA.'}</p>
          </div>
          <Suspense fallback={<div className={styles.navigationPending} aria-busy="true"><span className="nc-sr">Cargando navegación del circuito…</span></div>}><CircuitAwareFooterNavigation/></Suspense>
        </div>
        <div className={styles.bottom}>
          <div className={styles.bottomIdentity}><span>© {new Date().getUTCFullYear()} DEUCE</span><div className={styles.preferences}><Suspense fallback={<span className={styles.languagePending} aria-hidden="true"/>}><FooterLanguageSelector/></Suspense><AppearanceControl english={english}/></div></div>
          <span className={styles.credit}>Made by quiquicius</span>
        </div>
      </div>
    </div>
  </footer>;
}
