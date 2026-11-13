import SearchPage, { matchBrowserMetadata } from '@/app/buscar/page';
import type { MatchQuery } from '@/lib/match-search-url';

export const revalidate = 300;

export async function generateMetadata({ searchParams }: { searchParams: Promise<MatchQuery> }) {
  const metadata = await matchBrowserMetadata(searchParams, '/partidos');
  return {
    ...metadata,
    alternates: {
      ...metadata.alternates,

    },
  };
}

/** `/buscar` remains the advanced-search alias; this route renders directly. */
export default function MatchesPage({ searchParams }: { searchParams: Promise<MatchQuery> }) {
  return <SearchPage searchParams={searchParams}/>;
}
