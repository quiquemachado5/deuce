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
          background: "#f5f5f7",
          color: "#111111",
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
            <div style={{ display: "flex", fontSize: 23, fontWeight: 600, letterSpacing: 2, color: "#64646a" }}>EL MÁS LARGO DEL ARCHIVO</div>
            <div style={{ display: "flex", fontSize: 100, fontWeight: 700, letterSpacing: -6, marginTop: 14, lineHeight: 1 }}>
              {match ? durationLabel(publishedMatchMinutes(match)!) : "El archivo del tenis"}
            </div>
            {match && <div style={{ display: "flex", fontSize: 33, fontWeight: 600, marginTop: 25 }}>{match.player1.name} y {match.player2.name}</div>}
          </div>
          <div style={{ display: "flex", fontSize: 21, color: "#64646a" }}>
            {match ? `${tournamentName(match.tournament)} · ${match.year} · ${score(match)}` : "Grand Slams, Masters y ATP"}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "27%", background: "#1c1c1e", color: "#fff" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 160, height: 330, border: "3px solid rgba(255,255,255,.72)", borderRadius: 12 }}>
            <div style={{ display: "flex", width: 3, height: 330, background: "rgba(255,255,255,.72)" }} />
          </div>
        </div>
      </div>
    ),
    size,
  );
}
