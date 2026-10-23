import { ImageResponse } from "next/og";
import { notebook } from "@/lib/cuaderno/data";
import { playerSlug } from "@/lib/explore";

export const alt = "Ficha de jugador — DEUCE";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await notebook();
  const player = data.players.find((entry) => playerSlug(entry.name) === slug);
  const record = data.records.find((entry) => entry.name === player?.name);
  const name = player?.name || "Jugador";
  const rate = record?.played ? Math.round(record.wins / record.played * 1000) / 10 : 0;
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "64px 72px", color: "#f6f2e9", background: "linear-gradient(135deg, #101b17 0%, #16392e 55%, #b36736 140%)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 29, fontWeight: 800, letterSpacing: "0.16em" }}>DEUCE</div>
        <div style={{ fontSize: 22, opacity: .75 }}>ARCHIVO VISUAL DE TENIS</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 24, color: "#d7b28d", marginBottom: 16 }}>FICHA DE JUGADOR</div>
        <div style={{ fontSize: 72, fontWeight: 800, letterSpacing: "-0.035em", lineHeight: 1.04 }}>{name}</div>
      </div>
      <div style={{ display: "flex", gap: 54, borderTop: "1px solid rgba(246,242,233,.28)", paddingTop: 26 }}>
        <div style={{ display: "flex", flexDirection: "column" }}><strong style={{ fontSize: 34 }}>{record?.wins || 0}</strong><span style={{ fontSize: 18, opacity: .72 }}>victorias</span></div>
        <div style={{ display: "flex", flexDirection: "column" }}><strong style={{ fontSize: 34 }}>{record?.played || 0}</strong><span style={{ fontSize: 18, opacity: .72 }}>partidos</span></div>
        <div style={{ display: "flex", flexDirection: "column" }}><strong style={{ fontSize: 34 }}>{rate} %</strong><span style={{ fontSize: 18, opacity: .72 }}>efectividad</span></div>
      </div>
    </div>,
    size,
  );
}
