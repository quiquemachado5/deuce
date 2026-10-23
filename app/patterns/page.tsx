import { permanentRedirect } from 'next/navigation'
import { shelves } from '@/lib/cuaderno/shelves'
export default async function Legacy({searchParams}:{searchParams:Promise<Record<string,string>>}) {
  const q = await searchParams;
  const shelf = shelves.find((item) => item.metric?.key === q.metric || item.id === q.metric);
  const params = new URLSearchParams();
  if (shelf) params.set('dato', shelf.id);
  if (q.year) params.set('year', q.year);
  if (q.surface) params.set('surface', q.surface);
  permanentRedirect(`/records${params.size ? `?${params}` : ''}`);
}
