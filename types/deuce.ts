export type MatchRecord = {
  id: string; tournament: string; round: string; date: string; href: string;
  players: [{ id: string; name: string; countryCode: string }, { id: string; name: string; countryCode: string }];
  sets: Array<{ games: [number, number]; tieBreak?: [number | null, number | null]; completed?: boolean }>;
  isFinal?: boolean; winnerIndex?: 0 | 1; tags?: string[];
  status?: string; requiredSets?: number; dateLabel?: string; year?: number;
  category?: string; surface?: string; environment?: string;
};
export type ArchiveCard = { surface?: string; id: string; title: string; eyebrow?: string; meta?: string; image?: string; alt?: string; imagePosition?: string; href: string; value?: string; tags?: string[] };
export type ArchiveSection = { title: string; cards: ArchiveCard[] };
export type TournamentSlide = { id: string; name: string; city: string; surface: string; description: string; image: string; alt: string; href: string; credit: string; source: string };
