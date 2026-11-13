import {NextResponse,type NextRequest} from 'next/server';
import {spanishArchiveUrl} from './lib/legacy-english';
export function proxy(request:NextRequest){return NextResponse.redirect(spanishArchiveUrl(new URL(request.url)),308)}
export const config={matcher:['/en','/en/:path*']};
