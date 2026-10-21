import Link from 'next/link';

export type HomeHighlight = {
  id: string;
  title: string;
  name: string;
  value: string;
  detail: string;
  sample: string;
  href: string;
};

export default function HomeHighlights({ slides }: { slides: HomeHighlight[] }) {
  if (!slides.length) return null;
  return <section className="ds-stories" aria-labelledby="ds-stories-title">
    <div className="ds-section-heading">
      <h2 id="ds-stories-title">Seis formas de mirar el archivo</h2>
      <Link href="/records">Todas las estadísticas</Link>
    </div>
    <div className="ds-stories-list">
      {slides.map(story => <Link className="ds-story" href={story.href} key={story.id}>
        <span className="ds-story-title">{story.title}</span>
        <strong>{story.value}</strong>
        <span className="ds-story-person">{story.name}</span>
        <span className="ds-story-sample">{story.sample}</span>
      </Link>)}
    </div>
  </section>;
}
