import { ImageResponse } from 'next/og'
import { getMatch } from '@/lib/data'
import Og from '@/components/revista/Og'
export const alt='Marcador del partido — DEUCE'
export const size={width:1200,height:630}
export const contentType='image/png'
export default async function Image({params}:{params:Promise<{id:string}>}){return new ImageResponse(<Og match={await getMatch((await params).id)}/>,size)}
