"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="nc-wrap">
      <h1>No se pudo abrir el archivo.</h1>
      <button className="nc-link" onClick={reset}>
        Reintentar
      </button>
    </div>
  );
}
