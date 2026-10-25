import Link from 'next/link';
export const metadata={title:'Página no encontrada · DEUCE',robots:{index:false}};
export default function NotFound(){return <section className="deuce-content archive-not-found">
  <p>404</p><h1>Este enlace no está en el archivo</h1><p>Puedes buscar el partido, el jugador o el torneo desde aquí.</p>
  <form action="/buscar" role="search"><label htmlFor="not-found-search">Buscar en el archivo</label><input id="not-found-search" name="q" type="search" placeholder="Jugador, torneo o año" required/><button type="submit">Buscar</button></form>
  <nav className="archive-suggestions" aria-label="Continuar explorando"><Link href="/">Inicio</Link><Link href="/buscar">Partidos</Link><Link href="/records">Récords</Link><Link href="/historias">Historias</Link></nav>
</section>;}
