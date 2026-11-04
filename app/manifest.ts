import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'DEUCE — Archivo de tenis ATP y WTA',
    short_name: 'DEUCE',
    description: 'Partidos, jugadoras, jugadores, torneos y récords ATP y WTA con cobertura documentada.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#f1f4f1',
    theme_color: '#0b3429',
    categories: ['sports', 'reference'],
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
  };
}
