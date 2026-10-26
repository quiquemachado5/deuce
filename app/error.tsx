"use client";
import Link from 'next/link';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="nc-wrap deuce-error" role="alert">
      <p>Problema temporal</p>
      <h1>No se pudieron cargar los datos.</h1>
      <p>La fuente publicada puede estar temporalmente inaccesible. Puedes reintentar o volver a una sección estable del archivo.</p>
      <div><button className="nc-link" onClick={reset}>Reintentar</button><Link href="/buscar">Abrir partidos</Link><Link href="/">Volver a inicio</Link></div>
    </div>
  );
}
