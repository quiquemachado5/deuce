/** Inline styles remain compatible with dynamic charts; executable scripts require a nonce. */
export function contentSecurityPolicy(nonce:string,development=false){
 if(!/^[A-Za-z0-9+/=_-]{16,}$/.test(nonce))throw new Error('Invalid CSP nonce');
 return `default-src 'self'; script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${development?" 'unsafe-eval'":''}; script-src-attr 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; media-src 'self'; connect-src 'self'; frame-src https://www.youtube-nocookie.com; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; manifest-src 'self'${development?'':'; upgrade-insecure-requests'}`;
}
