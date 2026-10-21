import { redirect } from 'next/navigation'
export default async function Legacy({searchParams}:{searchParams:Promise<Record<string,string>>}){const q=await searchParams;redirect(`/buscar?${new URLSearchParams(q)}`)}
