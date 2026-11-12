import { CoverageCalendar } from '@/components/deuce/CoverageCalendar';
import Link from 'next/link';
import { preparedEloProducts, preparedGeneration } from '@/lib/revista/read-records';
import styles from '../archive.module.css';

export const metadata={title:'Archive coverage — DEUCE',description:'ATP and WTA coverage, publication freshness and DEUCE Elo validation.',alternates:{canonical:'/en/coverage',languages:{es:'/cobertura',en:'/en/coverage'}}};

export default async function EnglishCoverage({ searchParams }:{ searchParams:Promise<{ date?:string; tour?:string }> }){
  const { date, tour: calendarTour }=await searchParams;
  const [generation,elo]=await Promise.all([preparedGeneration(),preparedEloProducts()]);
  const manifest=generation.manifest,calibration=elo.calibration;
  return <main className={styles.page} lang="en">
    <header className={styles.heading}><div><h1>Coverage</h1><p>What the active publication contains, when it was generated and how derived metrics are checked.</p></div><strong>{manifest.matchCount.toLocaleString('en-GB')} matches</strong></header>
    <section className={styles.grid}>{(['atp','wta'] as const).map(tour=>{
      const circuit=manifest.circuitSummary?.[tour],freshness=manifest.circuitFreshness?.[tour];
      const matches=circuit?.years.reduce((total,year)=>total+year.matches,0)||manifest.summary.tours[tour]||0;
      return <article className={styles.card} key={tour}><span>{tour.toUpperCase()}</span><h2>{matches.toLocaleString('en-GB')} results</h2><p>{circuit?.years.at(-1)?.year||1968}–{circuit?.years[0]?.year||new Date().getUTCFullYear()} · latest exact result {freshness?.latestExactDate||'not dated'}</p><b>{circuit?.categories.length||0}</b><p>documented competition categories</p></article>;
    })}</section>
    {calibration?<section className={styles.comparison} aria-labelledby="english-elo-title"><article className={styles.player}><h2 id="english-elo-title">DEUCE Elo {elo.modelVersion||''}</h2><p>Chronological estimates are scored before each result updates the model. They are not official ATP or WTA rankings.</p></article><span className={styles.versus}>{calibration.all.matches.toLocaleString('en-GB')} validation matches</span><article className={styles.player}>{(['atp','wta'] as const).map(tour=><p key={tour}><strong>{tour.toUpperCase()}</strong> · {(calibration[tour].hitRate*100).toLocaleString('en-GB',{maximumFractionDigits:1})}% directional accuracy · Brier {calibration[tour].brier.toFixed(3)}</p>)}{elo.surfaceCalibration?<p>Surface ratings are also backtested separately on hard, clay, grass and carpet courts.</p>:null}</article></section>:null}
    <CoverageCalendar value={date} circuit={calendarTour} language="en"/>
    <p className={styles.note}>Generated {new Date(manifest.generatedAt).toLocaleString('en-GB',{dateStyle:'long',timeStyle:'short',timeZone:'UTC'})} UTC · dataset {manifest.version}. <Link href="/cobertura">Open the complete daily operations log in Spanish ↗</Link></p>
  </main>;
}
