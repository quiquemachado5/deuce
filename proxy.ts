import {NextResponse,type NextRequest} from 'next/server';
import {spanishArchiveUrl} from './lib/legacy-english';
import {randomBytes} from 'node:crypto';
import {contentSecurityPolicy} from './lib/security-policy';
import {preparedPlayerExists} from './lib/revista/read-records';
import {playerSlug} from './lib/explore';
import {canonicalName} from './lib/quality';
export async function proxy(request:NextRequest){
 if(/^\/en(?:\/|$)/.test(request.nextUrl.pathname))return NextResponse.redirect(spanishArchiveUrl(new URL(request.url)),308);
 const nonce=randomBytes(18).toString('base64'),policy=contentSecurityPolicy(nonce,process.env.NODE_ENV==='development');
 const headers=new Headers(request.headers);headers.set('x-nonce',nonce);headers.set('Content-Security-Policy',policy);
 const options={request:{headers}};
 let response:NextResponse;
 const profile=/^\/jugadores\/([^/]+)$/.exec(request.nextUrl.pathname);
 if(profile){
  let slug='';try{slug=playerSlug(canonicalName(decodeURIComponent(profile[1]).replace(/-/g,' ')));}catch{}
  const tour=request.nextUrl.searchParams.get('tour');
  const exists=await preparedPlayerExists(slug,tour==='wta'?'wta':tour?'atp':'all');
  // Decide status before a loading/Suspense boundary can flush an HTTP 200.
  response=exists?NextResponse.next(options):NextResponse.rewrite(new URL('/archivo-no-encontrado',request.url),{...options,status:404});
  if(!exists)response.headers.set('X-Robots-Tag','noindex');
 }else response=NextResponse.next(options);
 response.headers.set('Content-Security-Policy',policy);
 return response;
}
export const config={matcher:['/en','/en/:path*','/((?!api|_next|images|media|videos|fonts|icons|.*\\.).*)']};
