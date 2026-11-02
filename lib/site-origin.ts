const configured = process.env.NEXT_PUBLIC_SITE_ORIGIN?.trim()

export const SITE_ORIGIN = (configured || 'https://deuce-archivo.netlify.app').replace(/\/+$/, '')
