import type { Metadata } from 'next';
import { PlayerProfile } from '@/app/players/PlayerProfile';

export const metadata: Metadata = {
  title: 'Rafael Nadal · Propuesta de ficha — DEUCE',
  robots: { index: false, follow: false },
};

export default function NadalProposal() {
  return <PlayerProfile params={Promise.resolve({ slug: 'rafael-nadal' })} searchParams={Promise.resolve({ tour: 'atp' })} proposal />;
}
