import { ImageResponse } from "next/og";
import { notebook } from "@/lib/cuaderno/data";
import { durationLabel } from "@/lib/editorial";
import { score } from "@/lib/cuaderno/model";
import { tournamentName } from "@/lib/labels";
import { publishedMatchMinutes } from "@/lib/duration";
export const alt = "DEUCE — Datos del archivo de tenis";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default async function Image() {
  const match = (await notebook()).matches
    .filter((m) => publishedMatchMinutes(m) !== null)
    .sort((a, b) => publishedMatchMinutes(b)! - publishedMatchMinutes(a)!)[0];
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          width: "100%",
          height: "100%",
          background: "#f7f7f5",
          color: "#111318",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "73%",
            padding: 70,
          }}
        >
          <div style={{ display: "flex", fontSize: 25, fontWeight: 700, letterSpacing: 4 }}>DEUCE</div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 23, fontWeight: 700, letterSpacing: 2, color: "#3b4dff" }}>EL MÁS LARGO DEL ARCHIVO</div>
            <div style={{ display: "flex", fontSize: 100, fontWeight: 700, letterSpacing: -6, marginTop: 14, lineHeight: 1 }}>
              {match ? durationLabel(publishedMatchMinutes(match)!) : "El archivo del tenis"}
            </div>
            {match && <div style={{ display: "flex", fontSize: 33, fontWeight: 600, marginTop: 25 }}>{match.player1.name} y {match.player2.name}</div>}
          </div>
          <div style={{ display: "flex", fontSize: 21, color: "#5f6673" }}>
            {match ? `${tournamentName(match.tournament)} · ${match.year} · ${score(match)}` : "Grand Slams, Masters y ATP"}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "27%", background: "#3b4dff", color: "#fff" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 160, height: 330, border: "5px solid rgba(255,255,255,.78)", borderRadius: 80 }}>
            <div style={{ display: "flex", width: 5, height: 330, background: "rgba(255,255,255,.78)" }} />
          </div>
        </div>
      </div>
    ),
    size,
  );
}
