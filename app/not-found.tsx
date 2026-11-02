import Link from 'next/link';
export const metadata={title:'Página no encontrada · DEUCE',robots:{index:false}};
export default function NotFound(){return <section className="deuce-content archive-not-found">
  <p>404</p><h1>Este enlace no está en el archivo</h1><p>Busca un partido, jugador, jugadora o torneo en todo el archivo ATP y WTA.</p>
  <form action="/buscar" role="search"><input type="hidden" name="tour" value="all"/><label htmlFor="not-found-search">Buscar en el archivo</label><input id="not-found-search" name="q" type="search" placeholder="Jugador, torneo o año" required/><button type="submit">Buscar</button></form>
  <nav className="archive-suggestions" aria-label="Continuar explorando"><Link href="/">Inicio</Link><Link href="/buscar?tour=atp">ATP</Link><Link href="/buscar?tour=wta">WTA</Link><Link href="/records">Récords</Link><Link href="/comparar">Comparar</Link></nav>
</section>;}
