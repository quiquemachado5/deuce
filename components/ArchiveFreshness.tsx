import Link from 'next/link';
import { archiveDate } from '@/lib/archive-freshness';
import type { RecordManifest } from '@/lib/revista/snapshot';

export default function ArchiveFreshness({ manifest, compact = false }: { manifest: RecordManifest; compact?: boolean }) {
  if(compact)return <p className="archive-freshness archive-freshness--compact">Actualizado <time dateTime={manifest.generatedAt}>{archiveDate(manifest.generatedAt)}</time>
    {manifest.extent?.latestExactDate && <> · datos hasta <time dateTime={manifest.extent.latestExactDate}>{archiveDate(manifest.extent.latestExactDate)}</time></>}
    {' '}· <Link href="/cobertura">Cobertura</Link></p>;
  return <p className="archive-freshness">Cálculo actualizado el <time dateTime={manifest.generatedAt}>{archiveDate(manifest.generatedAt)}</time>.
    {manifest.extent?.latestExactDate && <> Último partido con fecha exacta: <time dateTime={manifest.extent.latestExactDate}>{archiveDate(manifest.extent.latestExactDate)}</time>.</>}
    {' '}<Link href="/cobertura">Cobertura y fuentes</Link>. La fecha de cálculo no garantiza que la fuente esté al día.</p>;
}
