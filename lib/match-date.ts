import { exactDay } from './archive-freshness';

export type MatchDateInput = {
  date?: string | null;
  dateLabel?: string | null;
  year?: number | null;
  tournament?: string | null;
};

export type MatchDatePresentation = {
  exact: boolean;
  key: string;
  long: string;
  short: string;
  dateTime?: string;
};

const formatter = (options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('es-ES', {
  ...options,
  timeZone: 'UTC',
});

const longDate = formatter({ day: 'numeric', month: 'long', year: 'numeric' });
const shortDate = formatter({ day: '2-digit', month: '2-digit', year: 'numeric' });
const compactDate = formatter({ day: 'numeric', month: 'short', year: 'numeric' });

function sentenceCase(value: string) {
  return value.charAt(0).toLocaleUpperCase('es') + value.slice(1);
}

/** Only a reviewed match date may be presented as a calendar day. */
export function matchDatePresentation(input: MatchDateInput): MatchDatePresentation {
  const day = input.dateLabel === 'Fecha del partido' ? exactDay(input.date) : null;
  if (day) {
    const date = new Date(`${day}T12:00:00Z`);
    return {
      exact: true,
      key: `date:${day}`,
      long: sentenceCase(longDate.format(date)),
      short: shortDate.format(date),
      dateTime: day,
    };
  }

  const year = input.year || exactDay(input.date)?.slice(0, 4);
  const edition = year ? `Edición ${year}` : 'Edición histórica';
  const tournament = input.tournament?.trim() || 'torneo';
  return {
    exact: false,
    key: `edition:${tournament}:${year || 'unknown'}`,
    long: edition,
    short: year ? `Ed. ${year}` : 'Edición',
  };
}

export function compactMatchDate(input: MatchDateInput) {
  const presentation = matchDatePresentation(input);
  if (!presentation.exact || !presentation.dateTime) return presentation.long;
  return compactDate.format(new Date(`${presentation.dateTime}T12:00:00Z`)).replaceAll('.', '');
}

export function reviewMatchDate(input: MatchDateInput) {
  const presentation = matchDatePresentation(input);
  return presentation.exact && presentation.dateTime ? presentation.dateTime : presentation.long;
}
