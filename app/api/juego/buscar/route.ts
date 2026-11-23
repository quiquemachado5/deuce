import {NextRequest,NextResponse} from 'next/server';
import {searchGameMatches} from '@/lib/daily-game';
import {rateLimit} from '@/lib/rate-limit';
export const dynamic='force-dynamic';
export async function GET(request:NextRequest){const budget=rateLimit(request,'daily-game-search',120,60_000);if(!budget.allowed)return NextResponse.json({error:'Demasiadas búsquedas. Espera un momento.'},{status:429,headers:{'Retry-After':String(budget.retryAfter)}});const q=(request.nextUrl.searchParams.get('q')||'').trim().slice(0,100).toLocaleLowerCase('es');if(q.length<2)return NextResponse.json([]);return NextResponse.json(await searchGameMatches(q),{headers:{'Cache-Control':'no-store'}});}
