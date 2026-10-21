import Link from 'next/link';
import type { GenerationStatus } from '@/lib/revista/generation';

export default function ArchiveNotice({ status }: { status: GenerationStatus }) {
  if (!status.fallbackReason) return null;
  return <aside className="nc-wrap deuce-archive-notice" aria-label="Estado del archivo">
    <p>Mostramos la copia validada incluida en este despliegue. {status.fallbackReason === 'not-published'
      ? 'La actualización remota aún no se ha publicado.'
      : 'La actualización remota no está disponible o no se ha podido validar completa.'} <Link href="/cobertura">Ver cobertura y versión</Link>.</p>
  </aside>;
}
