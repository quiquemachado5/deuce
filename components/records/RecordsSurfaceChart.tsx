import Image from "next/image";
import Link from "next/link";

export type SurfaceRecord = {
  id: string;
  href: string;
  label: string;
  player: string;
  value: number;
  display: string;
  image: {
    src: string;
    alt: string;
    objectPosition?: string;
  };
};

export default function RecordsSurfaceChart({
  records,
}: {
  records: SurfaceRecord[];
}) {
  if (!records.length) return null;

  return (
    <section
      className="records-surface-gallery"
      aria-labelledby="records-surface-title"
    >
      <header>
        <h3 id="records-surface-title">Cada pista cambia el juego</h3>
      </header>
      <div>
        {records.map((record) => (
          <Link
            key={record.id}
            href={record.href}
            className="records-surface-photo"
          >
            <Image
              src={record.image.src}
              alt={record.image.alt}
              fill
              unoptimized
              sizes="(max-width: 560px) 82vw, 34vw"
              style={{ objectPosition: record.image.objectPosition }}
            />
            <span>
              <small>{record.label}</small>
              <b>{record.player}</b>
              <strong>{record.display}</strong>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
