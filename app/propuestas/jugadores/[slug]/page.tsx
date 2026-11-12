import type { Metadata } from 'next';
import { PlayerProfile } from '@/app/players/PlayerProfile';

export const metadata: Metadata = {
  title: 'Propuesta de perfil de jugador — DEUCE',
  robots: { index: false, follow: false },
};

export default function ProfileProposal({ params, searchParams }: {
  params: Promise<{ slug: string }>; searchParams: Promise<{ tour?: string; year?: string }>;
}) {
  return <PlayerProfile params={params} searchParams={searchParams} proposal />;
}
