import "./deuce.css";
import "@/styles/deuce-system.css";
import "@/styles/refinement-2026-10.css";
import "./panorama-match.css";
import type { Metadata } from "next";
import { DM_Sans, Manrope, Newsreader } from 'next/font/google';
import { DeuceShell } from '@/components/deuce/DeuceShell';
const body = DM_Sans({ subsets:['latin'], variable:'--deuce-body', display:'swap' });
const display = Manrope({ subsets:['latin'], variable:'--deuce-display', display:'swap' });
const editorial = Newsreader({ subsets:['latin'], variable:'--deuce-editorial', style:['normal','italic'], display:'swap' });
export const metadata: Metadata = {
  metadataBase: new URL("https://deuce-archive.vercel.app"),
  title: "DEUCE — Datos del archivo de tenis",
  description: "Explora partidos, jugadoras, jugadores y récords ATP y WTA desde 1968 en el archivo visual de DEUCE.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "DEUCE — Datos del archivo de tenis",
    description: "Explora partidos, jugadoras, jugadores y récords ATP y WTA desde 1968 en el archivo visual de DEUCE.",
    siteName: "DEUCE",
    locale: "es_ES",
    type: "website",
    images: ["/opengraph-image"],
  },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${body.variable} ${display.variable} ${editorial.variable}`}>
      <body>
        <DeuceShell>{children}</DeuceShell>
      </body>
    </html>
  );
}
