import 'server-only';

import {readFile} from 'node:fs/promises';
import {join} from 'node:path';

export type WtaSnapshotPlayer = {
  id: number;
  name: string;
  country: string | null;
  birthday: string | null;
  hand: string | null;
  ranking: number | null;
  ranking_points: number | null;
  is_doubles_team: boolean;
};

export type WtaSnapshotDoublesTeam = Pick<WtaSnapshotPlayer, 'id' | 'name' | 'country' | 'is_doubles_team'>;

export type WtaSnapshotTournament = {
  id: string;
  name: string;
  category: string | null;
  tier: string | null;
  city: string | null;
  country: string | null;
  surface: string | null;
  indoor: boolean;
  tour: string;
};

type MatchPlayer = {id: number; name: string; country: string | null; ranking: number | null};
export type WtaSnapshotMatch = {
  id: number;
  tournament: string;
  tournament_id: string;
  scheduled_time: string;
  status: 'live' | 'upcoming' | string;
  round: string | null;
  round_code: string | null;
  surface: string | null;
  is_doubles: boolean;
  players: {p1: MatchPlayer; p2: MatchPlayer};
  score: null | {sets?: number[]; games?: number[][]; points?: string[]};
};

export type WtaSnapshotSummary = {
  generado: string;
  plan_detectado: string;
  descarga_completa: boolean;
  motivo_fin: string;
  datasets: Record<string, number>;
  jugadoras_individuales: number;
  parejas_dobles: number;
  torneos_unicos: number;
  partidos_recopilados: number;
  consultas_descarga_acumuladas: number;
  siguiente_offset_archivo: number | null;
  alcance: string;
  limitacion_historico: string;
};

const root = join(process.cwd(), 'data', 'wta-snapshot');

async function loadSnapshot() {
  const [summary, preview] = await Promise.all([
    readFile(join(root, 'resumen.json'), 'utf8').then(value => JSON.parse(value) as WtaSnapshotSummary),
    readFile(join(root, 'preview.json'), 'utf8').then(value => JSON.parse(value) as {
      version: string;
      players: WtaSnapshotPlayer[];
      doubles: WtaSnapshotDoublesTeam[];
      tournaments: WtaSnapshotTournament[];
      matches: WtaSnapshotMatch[];
      aggregate: {players_with_ranking:number;players_with_country:number;catalog_entries:number;surface_counts:Record<string,number>};
    }),
  ]);
  return {
    summary,
    previewVersion: preview.version,
    aggregate: preview.aggregate,
    players: preview.players,
    doubles: preview.doubles,
    tournaments: preview.tournaments,
    matches: preview.matches,
  };
}

let snapshot: ReturnType<typeof loadSnapshot> | undefined;

export function wtaSnapshot() {
  snapshot ||= loadSnapshot();
  return snapshot;
}
