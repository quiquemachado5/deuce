import {permanentRedirect} from 'next/navigation'
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string>>}){const q=await searchParams;const {situacion,...rest}=q;permanentRedirect('/records?'+new URLSearchParams({...rest,...(situacion?{dato:situacion}:{})}))}
