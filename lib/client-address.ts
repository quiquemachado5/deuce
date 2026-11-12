import {isIP} from 'node:net';
/** Caddy overwrites X-Real-IP; ignore the caller-controlled leftmost forwarding chain. */
export function clientAddress(request:Request):string{
 const real=request.headers.get('x-real-ip')?.trim();
 if(real&&isIP(real))return real;
 const last=request.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim();
 return last&&isIP(last)?last:'unknown';
}
