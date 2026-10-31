import Link from 'next/link';
import type { GenerationStatus } from '@/lib/revista/generation';
import type { RecordManifest } from '@/lib/revista/snapshot';

export default function ArchiveNotice({ status }: { status: GenerationStatus & { manifest?: Pick<RecordManifest, 'generatedAt'> } }) {
  if (!status.fallbackReason) return null;
  const date=status.manifest?.generatedAt&&Number.isFinite(Date.parse(status.manifest.generatedAt))
    ? new Date(status.manifest.generatedAt).toLocaleString('es-ES',{dateStyle:'medium',timeStyle:'short',timeZone:'Europe/Madrid'})
    : null;
  return <aside className="nc-wrap deuce-archive-notice" aria-label="Estado del archivo">
    <p>Mostramos la copia validada incluida en este despliegue. {status.fallbackReason === 'not-published'
      ? 'La actualización remota aún no se ha publicado.'
      : 'La actualización remota no está disponible o no se ha podido validar completa; pueden faltar partidos recientes.'}{date?` Última generación disponible: ${date}.`:''} <Link href="/cobertura">Ver cobertura y versión</Link>.</p>
  </aside>;
}
