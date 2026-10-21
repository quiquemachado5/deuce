import { redirect } from 'next/navigation'
import { shelves } from '@/lib/cuaderno/shelves'
export default async function Legacy({searchParams}:{searchParams:Promise<Record<string,string>>}){const q=await searchParams,s=shelves.find(s=>s.metric?.key===q.metric||s.id===q.metric);redirect(`/situaciones${s?'?'+new URLSearchParams({situacion:s.id,...(q.year?{periodo:q.year}:{}),...(q.surface?{superficie:({hard:'dura',clay:'tierra',grass:'hierba'} as Record<string,string>)[q.surface]||'all'}:{})}):''}`)}
