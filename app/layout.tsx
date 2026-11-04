import "./deuce.css";
import "@/styles/deuce-system.css";
import "@/styles/refinement-2026-10.css";
import "./audit-fixes.css";
import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Geist } from 'next/font/google';
import { DeuceShell } from '@/components/deuce/DeuceShell';
import { WebVitals } from '@/components/WebVitals';
import { StructuredData } from '@/components/StructuredData';
import { SITE_ORIGIN } from '@/lib/site-origin';
const body = Geist({ subsets:['latin'], variable:'--deuce-body', display:'swap' });
const display = Bricolage_Grotesque({ subsets:['latin'], variable:'--deuce-display', display:'swap' });
const googleVerification=process.env.GOOGLE_SITE_VERIFICATION?.trim();
const bingVerification=process.env.BING_SITE_VERIFICATION?.trim();
const socialImage = { url: '/opengraph-image', width: 1200, height: 630, alt: 'DEUCE — Datos del archivo de tenis' };
export const metadata: Metadata = {
  metadataBase: new URL(SITE_ORIGIN),
  applicationName: 'DEUCE',
  title: "DEUCE — Datos del archivo de tenis",
  description: "Explora el archivo ATP y WTA de DEUCE: partidos, jugadoras, jugadores, torneos y récords con cobertura documentada.",
  alternates: { canonical: "/" },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icons/deuce-32.png', type: 'image/png', sizes: '32x32' },
    ],
    apple: [{ url: '/apple-icon.png', type: 'image/png', sizes: '180x180' }],
  },
  appleWebApp: { capable: true, title: 'DEUCE', statusBarStyle: 'default' },
  openGraph: {
    title: "DEUCE — Datos del archivo de tenis",
    description: "Explora el archivo ATP y WTA de DEUCE: partidos, jugadoras, jugadores, torneos y récords con cobertura documentada.",
    siteName: "DEUCE",
    locale: "es_ES",
    type: "website",
    images: [socialImage],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DEUCE — Datos del archivo de tenis',
    description: 'Explora el archivo ATP y WTA de DEUCE: partidos, jugadoras, jugadores, torneos y récords con cobertura documentada.',
    images: [socialImage],
  },
  ...(googleVerification||bingVerification?{verification:{
    ...(googleVerification?{google:googleVerification}:{}),
    ...(bingVerification?{other:{'msvalidate.01':bingVerification}}:{}),
  }}:{}),
};
export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5f6f7' },
    { media: '(prefers-color-scheme: dark)', color: '#0e1215' },
  ],
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${body.variable} ${display.variable}`}>
      <body>
        <StructuredData value={{
          '@context':'https://schema.org','@type':'WebSite',name:'DEUCE',url:`${SITE_ORIGIN}/`,inLanguage:'es',
          potentialAction:{'@type':'SearchAction',target:`${SITE_ORIGIN}/buscar?tour=all&q={search_term_string}`,'query-input':'required name=search_term_string'},
        }}/>
        <WebVitals />
        <DeuceShell>{children}</DeuceShell>
      </body>
    </html>
  );
}
