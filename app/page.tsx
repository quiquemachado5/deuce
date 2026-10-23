import Image from "next/image";
import Link from "next/link";
import { preparedGeneration } from "@/lib/revista/read-records";
import { homeMaterials } from "@/lib/home-photography";
import { homeTotals, featuredFinal } from "@/lib/home-story";
import HomeMotion from "@/components/home/HomeMotion";
import HomeSearch from "@/components/home/HomeSearch";
import styles from "./home-story.module.css";

export const revalidate = 300;
export const metadata = {
  title: "DEUCE — El tenis, partido a partido",
  description: "El archivo visual del tenis desde 1968. Partidos, jugadores, torneos y récords, una historia a la vez.",
  alternates: { canonical: "/" },
};
const format = new Intl.NumberFormat("es-ES", { useGrouping: "always" });
const recordStories = [
  { id: "remontada-dos-sets", value: 10, name: "Andy Murray", label: "remontadas tras perder dos sets" },
  { id: "mas-juegos", value: 183, name: "John Isner – Nicolas Mahut", label: "juegos en un solo partido" },
  { id: "top-10", value: 190, name: "Novak Djokovic", label: "victorias ante el top 10" },
] as const;

export default async function Home() {
  const generation = await preparedGeneration();
  const matches = await generation.matches();
  const totals = homeTotals(matches, 2026);
  const final = featuredFinal(matches);
  const records = recordStories.map(story => {
    const leader = generation.manifest.pieces.find(piece => piece.id === story.id)?.leader;
    return { ...story, value: leader?.name === story.name ? leader.value : story.value };
  });

  return <HomeMotion className={styles.story}>
    <section className={styles.intro} data-intro data-home-tone="dark" aria-labelledby="intro-title">
      <div className={styles.introSticky}><div className={styles.introCopy}>
        <h1 id="intro-title">El tenis,<br />partido a partido.</h1>
        <p>El archivo. Desde 1968.</p>
      </div></div>
    </section>
    <section className={styles.matchChapter} data-home-tone="dark" aria-labelledby="match-title">
      <div className={styles.matchContent}>
        <p className={styles.eyebrow}>Final · Masters 1000</p>
        <h2 id="match-title">Shanghái <span>2026</span></h2>
        <p className={styles.winner}>Ganó Alejandro Davidovich Fokina</p>
        <div className={styles.score} role="group" aria-label="Alejandro Davidovich Fokina ganó a Rafael Jódar por 1–6, 7–6, 6–4. Jódar hizo cinco puntos en el tie-break del segundo set.">
          <div className={styles.scoreLine} aria-hidden="true"><span className={styles.scoreName}>Alejandro Davidovich Fokina</span><span>1</span><span>7</span><span>6</span></div>
          <div className={`${styles.scoreLine} ${styles.loser}`} aria-hidden="true"><span className={styles.scoreName}>Rafael Jódar</span><span>6</span><span>6<sup>(5)</sup></span><span>4</span></div>
        </div>
        <Link className={styles.textLink} href={`/match/${final}`}>Ver el partido <span aria-hidden="true">›</span></Link>
      </div>
    </section>
    <section className={styles.records} data-records data-home-tone="light" aria-label="Tres récords del archivo">
      <div className={styles.srOnly}>{records.map(record => <p key={record.id}>{record.name}: {record.value} {record.label}.</p>)}</div>
      <div className={styles.recordSticky}>
        <div className={styles.recordScenes} aria-hidden="true">{records.map(record => <div className={styles.recordScene} data-record-slide key={record.id}>
          <span className={styles.recordNumber}>{format.format(record.value)}</span>
          <p>{record.label}</p><h2>{record.name}</h2>
        </div>)}</div>
        <Link className={`${styles.textLink} ${styles.recordLink}`} href="/records">Todos los récords <span aria-hidden="true">›</span></Link>
      </div>
    </section>
    {homeMaterials.map(material => <section key={material.surface} className={styles.material} data-material data-home-tone="dark" aria-labelledby={`material-${material.surface}`}>
      <div className={styles.materialImage}><Image src={material.photo.src} alt={material.photo.alt} fill sizes="100vw" style={{ objectPosition: material.photo.objectPosition }} /></div>
      <div className={styles.materialCopy}><h2 id={`material-${material.surface}`}>{material.name}</h2><p>{format.format(totals.surfaces[material.surface])}<span>partidos en el archivo</span></p></div>
      <a href={material.photo.source} className={styles.photoCredit} target="_blank" rel="noopener noreferrer">{material.photo.credit}</a>
    </section>)}
    <section className={styles.season} data-home-tone="light" aria-labelledby="season-title">
      <div className={styles.seasonContent}>
        <h2 id="season-title">2026</h2>
        <dl className={styles.seasonNumbers}><div><dt>partidos</dt><dd>{format.format(totals.season.matches)}</dd></div><div><dt>finales</dt><dd>{format.format(totals.season.finals)}</dd></div></dl>
        <div className={styles.proportion} role="img" aria-label={`Partidos de 2026 por superficie: ${totals.season.hard} en dura, ${totals.season.clay} en tierra, ${totals.season.grass} en hierba, ${totals.season.other} en otras superficies o sin identificar.`}>
          {(["hard", "clay", "grass", "other"] as const).map(surface => totals.season[surface] > 0 && <span key={surface} data-surface={surface} style={{ flexGrow: totals.season[surface] }} />)}
        </div>
        <p className={styles.coverage}>La cobertura no es uniforme. Esta proporción no representa una evolución mes a mes.</p>
      </div>
    </section>
    <section className={styles.entry} data-home-tone="dark" aria-labelledby="entry-title">
      <div className={styles.entryContent}>
        <h2 id="entry-title">Busca un partido.</h2><HomeSearch id="archive-entry" />
        <p className={styles.suggestions}><Link href="/buscar?q=Alcaraz">Alcaraz</Link><span aria-hidden="true">·</span><Link href="/buscar?q=Wimbledon">Wimbledon</Link><span aria-hidden="true">·</span><Link href="/buscar?year=1977">1977</Link></p>
      </div>
    </section>
  </HomeMotion>;
}
