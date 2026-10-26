export function PageSkeleton({variant='cards'}:{variant?:'cards'|'table'|'compare'}) {
  const columns=variant==='compare'?2:variant==='table'?1:6;
  return <div className="view-root deuce-loading" role="status" aria-label="Cargando contenido"><header className="inner-title"><span className="skeleton skeleton-title"/></header><div className="deuce-content"><span className="skeleton skeleton-toolbar"/><div className={`skeleton-layout skeleton-layout--${variant}`}>{Array.from({length:columns},(_,index)=><article className="skeleton skeleton-card" key={index}><span/><span/><span/></article>)}</div></div><span className="nc-sr">Cargando…</span></div>;
}
