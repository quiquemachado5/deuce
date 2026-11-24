import "./deuce.css";
import "@/styles/deuce-system.css";
import "@/styles/refinement-2026-10.css";
import "./audit-fixes.css";
import "@/styles/statistical-numerals.css";
import "@/styles/route-motion.css";
import "@/styles/appearance.css";
import {Suspense} from 'react';
import type { Metadata, Viewport } from "next";
import { Host_Grotesk, Sora } from 'next/font/google';
import { DeuceShell } from '@/components/deuce/DeuceShell';
import { WebVitals } from '@/components/WebVitals';
import { StructuredData } from '@/components/StructuredData';
import { SITE_ORIGIN } from '@/lib/site-origin';
const sans = Host_Grotesk({ subsets:['latin'], variable:'--deuce-sans', display:'swap' });
const headline = Sora({ subsets:['latin'], variable:'--deuce-headline', display:'swap' });
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
    <html lang="es" suppressHydrationWarning className={`${sans.variable} ${headline.variable}`}>
      <head><script dangerouslySetInnerHTML={{__html:`try{var m=localStorage.getItem('deuce-appearance'),d=new Date(),n=d.getUTCMonth()+1,a=d.getUTCDate();document.documentElement.dataset.appearance=m==='season'?'season':'classic';document.documentElement.dataset.season=n===4||n===5||n===6&&a<=7?'clay':n===6||n===7&&a<=14?'grass':'hard'}catch(e){}`}}/></head><body>
        <StructuredData value={{
          '@context':'https://schema.org','@type':'WebSite',name:'DEUCE',url:`${SITE_ORIGIN}/`,inLanguage:'es',
          potentialAction:{'@type':'SearchAction',target:`${SITE_ORIGIN}/buscar?tour=all&q={search_term_string}`,'query-input':'required name=search_term_string'},
        }}/>
        <Suspense fallback={null}><WebVitals /></Suspense>
        <DeuceShell>{children}</DeuceShell>
      </body>
    </html>
  );
}
