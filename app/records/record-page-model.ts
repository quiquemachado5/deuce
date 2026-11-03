import { number } from "@/lib/cuaderno/model";
import type { RecordQuery } from "@/lib/records-url";
import { recordsHaveTransientState } from "@/lib/records-url";
import { canonicalSearchText } from "@/lib/search-text";
import type { RecordManifest, RecordMeta } from "@/lib/revista/snapshot";

export type RecordTour = "atp" | "wta";

export const RECORD_FAMILIES = [
  ["Títulos y finales", "Títulos y finales"],
  ["Victorias", "Victorias"],
  ["Remontadas", "Remontadas y forma del partido"],
  ["Presión", "Presión"],
  ["Tiempo y edad", "Tiempo, edad y calendario"],
  ["Por torneo", "Un torneo"],
  ["Parejas", "Parejas"],
  ["Medidas de partido", "Medidas de partido"],
  ["Superficies", "Superficies"],
  ["Saque", "Saque"],
  ["Resto", "Resto"],
  ["Golpes", "Golpes"],
] as const;

const ATP_RANKING_IDS = [
  "victorias",
  "finales-ganadas",
  "efectividad-top-10",
] as const;

const WTA_RANKING_IDS = [
  "victorias",
  "finales-ganadas",
  "partidos-disputados",
] as const;

const ATP_INSIGHT_IDS = [
  "efectividad-hard",
  "efectividad-clay",
  "efectividad-grass",
  "mas-juegos",
  "efectividad-finales",
  "remontada-dos-sets",
  "aces",
  "titulos-grass",
  "titulos-clay",
  "titulos-hard",
] as const;

const WTA_INSIGHT_IDS = [
  "efectividad-hard",
  "efectividad-clay",
  "efectividad-grass",
  "mas-juegos",
  "remontada-primer-set",
  "titulos-grass",
  "titulos-clay",
  "titulos-hard",
] as const;

const ATP_FAMILY_PHOTO_RECORDS: Record<string, string> = {
  Victorias: "atp-500-victorias",
  "Remontadas y forma del partido": "remontada-dos-sets",
  "Títulos y finales": "titulos-grass",
  Presión: "breaks-salvados",
  "Tiempo, edad y calendario": "mas-largos",
  Parejas: "parejas",
  Superficies: "efectividad-clay",
  Saque: "first-in",
  Resto: "return-won",
  Golpes: "winners",
};

const WTA_FAMILY_PHOTO_RECORDS: Record<string, string> = {
  Victorias: "victorias",
  "Remontadas y forma del partido": "remontada-primer-set",
  "Títulos y finales": "titulos-clay",
  Superficies: "efectividad-clay",
};

const FAMILY_PHOTO_FALLBACKS: Record<
  string,
  { recordId: string; playerName: string }
> = {
  "Tiempo, edad y calendario": {
    recordId: "mas-juegos",
    playerName: "John Isner",
  },
  Parejas: {
    recordId: "aces",
    playerName: "Novak Djokovic",
  },
};

const FAMILY_LAYOUTS: Record<string, string> = {
  Victorias: "photoLeft",
  "Remontadas y forma del partido": "photoBottom",
  "Títulos y finales": "photoRight",
  Presión: "photoTop",
  "Tiempo, edad y calendario": "videoBottom",
  Parejas: "photoRight",
  Saque: "photoBottom",
  Resto: "photoLeft",
  Golpes: "photoTop",
  Superficies: "slider",
};

const FAMILY_KEYS: Record<string, string> = {
  Victorias: "wins",
  "Remontadas y forma del partido": "comebacks",
  "Títulos y finales": "finals",
  Presión: "pressure",
  "Tiempo, edad y calendario": "time",
  Parejas: "doubles",
  Saque: "serve",
  Resto: "return",
  Golpes: "shots",
  Superficies: "surfaces",
};

export const RECORD_SURFACE_IMAGES = {
  Dura: {
    src: "/images/courts/us-open-1440.webp",
    alt: "Pista dura del Abierto de Estados Unidos vista desde la grada",
    objectPosition: "50% 52%",
  },
  Tierra: {
    src: "/images/courts/roland-garros-1440.webp",
    alt: "Pista de tierra batida de Roland Garros",
    objectPosition: "50% 48%",
  },
  Hierba: {
    src: "/images/courts/wimbledon-1440.webp",
    alt: "Pista central de Wimbledon sobre hierba",
    objectPosition: "50% 46%",
  },
} as const;

export function normalizeRecordQuery(raw: RecordQuery): RecordQuery & {
  tour: RecordTour;
} {
  return { ...raw, tour: raw.tour === "wta" ? "wta" : "atp" };
}

export function recordScope(manifest: RecordManifest, tour: RecordTour) {
  const coverage = manifest.circuitCoverage?.[tour];
  const range =
    coverage?.firstYear && coverage.lastYear
      ? coverage.firstYear === coverage.lastYear
        ? String(coverage.firstYear)
        : `${coverage.firstYear}–${coverage.lastYear}`
      : "temporadas publicadas";
  return tour === "wta"
    ? `Muestra WTA ${range}: ${number(coverage?.matches || 0)} resultados. No contiene estadísticas de saque ni secuencias punto a punto; estos récords se calculan con los marcadores y el contexto realmente publicados.`
    : `Muestra ATP ${range}: ${number(coverage?.matches || manifest.matchCount)} resultados. Las estadísticas y el punto a punto solo intervienen en los récords que documentan esos campos.`;
}

export function recordFamilyLabel(group: string | undefined) {
  return RECORD_FAMILIES.find(([, value]) => value === group)?.[0] || group;
}

export function recordIndexModel(manifest: RecordManifest, query: RecordQuery) {
  const groups = [...new Set(manifest.pieces.map((piece) => piece.group))];
  const selected =
    query.grupo && groups.includes(query.grupo) ? query.grupo : "";
  const term = canonicalSearchText(query.q || "");
  const pieces = manifest.pieces.filter(
    (piece) =>
      (!selected || piece.group === selected) &&
      (!term ||
        canonicalSearchText(
          `${piece.title} ${piece.group} ${piece.leader?.name || ""}`,
        ).includes(term)),
  );
  return {
    groups,
    selected,
    term,
    pieces,
    visibleGroups: (selected ? [selected] : groups).filter((group) =>
      pieces.some((piece) => piece.group === group),
    ),
    overview: !selected && !term && !recordsHaveTransientState(query),
    wtaUnavailable:
      query.tour === "wta" && !manifest.pieces.some((piece) => piece.leader),
  };
}

export function recordViewIds(tour: RecordTour) {
  return tour === "wta"
    ? {
        rankingIds: [...WTA_RANKING_IDS],
        insightIds: [...WTA_INSIGHT_IDS],
      }
    : {
        rankingIds: [...ATP_RANKING_IDS],
        insightIds: [...ATP_INSIGHT_IDS],
      };
}

export function recordFamilyPresentation(tour: RecordTour) {
  return {
    photoRecords:
      tour === "wta" ? WTA_FAMILY_PHOTO_RECORDS : ATP_FAMILY_PHOTO_RECORDS,
    photoFallbacks: FAMILY_PHOTO_FALLBACKS,
    layouts: FAMILY_LAYOUTS,
    keys: FAMILY_KEYS,
  };
}

export function recordDetailModel(
  manifest: RecordManifest,
  piece: RecordMeta | undefined,
  query: RecordQuery,
) {
  const relatedPieces = piece
    ? manifest.pieces
        .filter(
          (entry) => entry.group === piece.group && entry.id !== piece.id,
        )
        .slice(0, 4)
    : [];
  return {
    asYear: query.dato === "tal-dia-como-hoy",
    title:
      piece?.title ||
      manifest.pieces.find((entry) => entry.id === query.dato)?.title ||
      "Récords",
    definition: piece?.definition
      ? `${piece.definition.split(". ")[0].replace(/\.$/, "")}.`
      : undefined,
    marathonPreview: query.dato === "mas-juegos" && query.full !== "true",
    relatedPieces,
    relatedLabel: recordFamilyLabel(piece?.group),
    tourOptions: (["atp", "wta"] as const)
      .filter(
        (tour) =>
          manifest.circuitPieces?.[tour]?.some(
            (entry) => entry.id === query.dato,
          ) ?? true,
      )
      .map((value) => ({ value, label: value.toUpperCase() })),
  };
}
