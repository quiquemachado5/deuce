const configured = process.env.NEXT_PUBLIC_SITE_ORIGIN?.trim()

export const SITE_ORIGIN = (configured || 'https://deucearchive.com').replace(/\/+$/, '')
export const SITE_HOST = new URL(SITE_ORIGIN).host
