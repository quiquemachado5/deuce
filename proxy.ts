import {NextResponse,type NextRequest} from 'next/server';
import {spanishArchiveUrl} from './lib/legacy-english';
import {preparedPlayerExists} from './lib/revista/read-records';
import {playerSlug} from './lib/explore';
import {canonicalName} from './lib/quality';
export async function proxy(request:NextRequest){
 if(/^\/en(?:\/|$)/.test(request.nextUrl.pathname))return NextResponse.redirect(spanishArchiveUrl(new URL(request.url)),308);
 const profile=/^\/jugadores\/([^/]+)$/.exec(request.nextUrl.pathname);
 if(!profile)return NextResponse.next();
 let slug='';try{slug=playerSlug(canonicalName(decodeURIComponent(profile[1]).replace(/-/g,' ')));}catch{}
 const tour=request.nextUrl.searchParams.get('tour');
 const exists=await preparedPlayerExists(slug,tour==='wta'?'wta':tour?'atp':'all');
 // Decide status before a loading/Suspense boundary can flush an HTTP 200.
 const response=exists?NextResponse.next():NextResponse.rewrite(new URL('/archivo-no-encontrado',request.url),{status:404});
 if(!exists)response.headers.set('X-Robots-Tag','noindex');
 return response;
}
export const config={matcher:['/en','/en/:path*','/jugadores/:slug']};
