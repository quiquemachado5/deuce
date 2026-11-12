import type { MatchRecord } from '@/types/deuce';
import { compactMatchDate } from './match-date';
import { providerRoundName } from './provider-publication';
const weekDate=new Intl.DateTimeFormat('es-ES',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});

export function scorecardPresentation(match:MatchRecord){
  const round=providerRoundName(match.round).replace(/^Semifinales$/i,'Semifinal').replace(/^Cuartos$/i,'Cuartos de final').replace(/^Octavos$/i,'Octavos de final').replace(/^Round of (\d+)$/i,'Ronda de $1');
  const normalized=round.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const tone=/semi|^sf$/.test(normalized)?'semi':/cuartos|quarter|^qf$/.test(normalized)?'quarter':/^(final|f)$/.test(normalized)?'final':'regular';
  const day=match.date&&/^\d{4}-\d{2}-\d{2}$/.test(match.date)&&Number.isFinite(Date.parse(`${match.date}T12:00:00Z`))?match.date:undefined;
  const approximate=match.dateLabel==='Inicio del torneo';
  const date=approximate&&day?`Semana del ${weekDate.format(new Date(`${day}T12:00:00Z`))}`:compactMatchDate(match);
  const status=/walkover/i.test(match.status||'')?'W/O · Sin disputa':/retired|abandoned/i.test(match.status||'')?'Abandono':/disqualified|default/i.test(match.status||'')?'Descalificación':/cancelled/i.test(match.status||'')?'Cancelado':!match.sets.length?'Sin sets registrados':undefined;
  return {round,tone,date,dateTime:match.dateLabel==='Fecha del partido'?day:undefined,category:/^WTA\s+1000$/i.test(match.category||'')?'WTA 1000':/^ATP\s+1000$/i.test(match.category||'')?'Masters 1000':match.category?.replace(/^(ATP|WTA)\s+/i,'').trim(),status};
}
