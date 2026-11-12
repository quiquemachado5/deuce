import type {Metadata} from 'next';
import Link from 'next/link';
import {ArrowUpRight} from 'lucide-react';
import styles from './about.module.css';

const repository='https://github.com/quiquemachado5/deuce';

export const metadata:Metadata={
  title:'Sobre DEUCE — Un archivo independiente de tenis',
  description:'El manifiesto de DEUCE: conservar el tenis que se jugó y mostrar con honestidad lo que sabemos.',
  alternates:{canonical:'/sobre'},
};

export default function About(){
  return <article className={styles.page}>
    <header className={styles.hero}><h1>Sobre DEUCE</h1><p>El tenis no termina con el último punto.</p></header>
    <div className={styles.manifest}>
      <p>DEUCE es un archivo independiente del tenis. Conservamos partidos ATP y WTA para que puedas volver a una final, seguir una carrera o entender cómo cambió el juego.</p>
      <p>Publicamos lo que podemos documentar. Cuando solo conocemos el marcador, mostramos el marcador. Cada estadística se calcula con los partidos que permiten medirla, y cada corrección exige una fuente verificable.</p>
      <p>El archivo se consulta sin cuenta. Sus límites también son públicos.</p>
    </div>
    <nav className={styles.actions} aria-label="Consultar el archivo">
      <Link href="/cobertura">Ver cobertura <ArrowUpRight size={16}/></Link>
      <Link href="/licencias">Consultar licencias <ArrowUpRight size={16}/></Link>
    </nav>
    <div className={styles.notes}>
      <details><summary>Proponer una corrección</summary><p>Incluye el enlace del partido, el dato a corregir y una fuente verificable. GitHub es un canal público: no compartas información privada.</p><a href={`${repository}/issues/new`}>Abrir una incidencia en GitHub <ArrowUpRight size={15}/></a></details>
      <details><summary>Privacidad</summary><p>Recogemos métricas técnicas de carga e interacción con la ruta visitada para detectar problemas de rendimiento. La aplicación procesa la dirección de red temporalmente para limitar el abuso de la API y no la incorpora a esas métricas.</p></details>
      <details><summary>Descargar o reutilizar datos</summary><p>Si estás preparando un artículo o un análisis, puedes descargar resultados en CSV para trabajarlos en una hoja de cálculo, o usar la API para automatizar consultas.</p><Link href="/desarrolladores">API y descarga de datos <ArrowUpRight size={15}/></Link></details>
    </div>
  </article>;
}
