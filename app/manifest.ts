import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'DEUCE — Archivo de tenis ATP y WTA',
    short_name: 'DEUCE',
    description: 'Partidos, jugadoras, jugadores, torneos y récords ATP y WTA con cobertura documentada.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#f5f6f7',
    theme_color: '#151b20',
    categories: ['sports', 'reference'],
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icons/deuce-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/deuce-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/deuce-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
