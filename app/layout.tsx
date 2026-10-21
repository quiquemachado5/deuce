import type { Metadata } from "next";
import Frame from "@/components/nocturno/Frame";
import "./rally.css";
import "./rally-shell.css";
import "./rally-people.css";
import "./rally-match.css";
import "./rally-match-next.css";
import "./design-system.css";
import "./sports-design.css";
export const metadata: Metadata = {
  metadataBase: new URL("https://deuce-archive.vercel.app"),
  title: "DEUCE — Datos del archivo de tenis",
  description: "Grand Slams, Masters y torneos ATP, leídos por el dato.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "DEUCE — Datos del archivo de tenis",
    description: "Grand Slams, Masters y torneos ATP, leídos por el dato.",
    siteName: "DEUCE",
    locale: "es_ES",
    type: "website",
    images: ["/opengraph-image"],
  },
};
const theme = `try{var t=localStorage.getItem('deuce-rally-theme')||'system';document.documentElement.dataset.theme=t==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):t}catch(e){document.documentElement.dataset.theme='light'}`;
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: theme }} />
      </head>
      <body>
        <Frame>{children}</Frame>
      </body>
    </html>
  );
}
