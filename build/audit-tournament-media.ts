import path from "node:path";
import sharp from "sharp";
import { tournamentEditionMedia } from "../lib/tournament-media";

async function main() {
const failures: string[] = [];
for (const entry of tournamentEditionMedia) {
  const label = `${entry.tournament} ${entry.year}`;
  if (!/^https:\/\/www\.youtube\.com\/watch\?v=/.test(entry.video.source)) failures.push(`${label}: el vídeo no enlaza a una fuente verificable`);
  if (!entry.trophy.credit || !entry.trophy.license || !entry.trophy.source) failures.push(`${label}: la fotografía carece de crédito, licencia o fuente`);
  const localPath = path.join(process.cwd(), "public", entry.trophy.src.replace(/^\//, ""));
  try {
    const image = sharp(localPath);
    const [metadata, stats] = await Promise.all([image.metadata(), image.clone().greyscale().stats()]);
    const width = metadata.width || 0, height = metadata.height || 0;
    if (width < 960 || height < 640) failures.push(`${label}: recorte insuficiente (${width}×${height}; mínimo 960×640)`);
    if (width !== entry.trophy.width || height !== entry.trophy.height) failures.push(`${label}: las dimensiones declaradas no coinciden con el archivo`);
    if ((stats.sharpness || 0) < .8) failures.push(`${label}: posible desenfoque (nitidez ${stats.sharpness?.toFixed(2)})`);
    if ((stats.entropy || 0) < 4) failures.push(`${label}: imagen con poco detalle (entropía ${stats.entropy?.toFixed(2)})`);
    if (!/^\d{1,3}% \d{1,3}%$/.test(entry.trophy.objectPosition)) failures.push(`${label}: falta un punto focal explícito para el recorte`);
  } catch (error) {
    failures.push(`${label}: no se pudo analizar ${entry.trophy.src} (${error instanceof Error ? error.message : "error desconocido"})`);
  }
}

if (failures.length) {
  console.error("Registro multimedia rechazado:\n" + failures.map(item => `- ${item}`).join("\n"));
  process.exit(1);
}
console.log(`Registro multimedia verificado: ${tournamentEditionMedia.length} edición${tournamentEditionMedia.length === 1 ? "" : "es"}.`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
