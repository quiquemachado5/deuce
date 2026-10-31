import Link from 'next/link';
import type { GenerationStatus } from '@/lib/revista/generation';
import type { RecordManifest } from '@/lib/revista/snapshot';

export default function ArchiveNotice({ status }: { status: GenerationStatus & { manifest?: Pick<RecordManifest, 'generatedAt'> } }) {
  if (!status.fallbackReason) return null;
  const date=status.manifest?.generatedAt&&Number.isFinite(Date.parse(status.manifest.generatedAt))
    ? new Date(status.manifest.generatedAt).toLocaleString('es-ES',{dateStyle:'medium',timeStyle:'short',timeZone:'Europe/Madrid'})
    : null;
  return <aside className="nc-wrap deuce-archive-notice" aria-label="Estado del archivo">
    <p><strong>Datos disponibles: copia validada.</strong> <span>{status.fallbackReason === 'not-published'
      ? 'La actualización remota aún no se ha publicado.'
      : 'La fuente remota no está disponible; pueden faltar partidos recientes.'}{date?` Generada: ${date}.`:''}</span> <Link href="/cobertura">Cobertura y versión</Link></p>
  </aside>;
}
