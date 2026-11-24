/**
 * Public archive pages use a stable policy so Next can cache their HTML/RSC.
 * SRI protects generated script assets; attributes remain blocked separately.
 */
export function contentSecurityPolicy(development=false){
 return `default-src 'self'; script-src 'self' 'unsafe-inline'${development?" 'unsafe-eval'":''}; script-src-attr 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; media-src 'self'; connect-src 'self'; frame-src https://www.youtube-nocookie.com; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; manifest-src 'self'${development?'':'; upgrade-insecure-requests'}`;
}
