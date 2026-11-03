"use client";

export default function GlobalError({ reset }: { reset: () => void }) {
  return <html lang="es"><body><main className="nc-wrap deuce-error" role="alert">
    <p>Problema temporal</p>
    <h1>No se pudo cargar DEUCE.</h1>
    <p>El archivo publicado sigue protegido. Puedes reintentar sin perder ningún dato.</p>
    <button type="button" className="nc-link" onClick={reset}>Reintentar</button>
  </main></body></html>;
}
