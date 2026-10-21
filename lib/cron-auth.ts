import { timingSafeEqual } from 'node:crypto'

export function authorizedCronRequest(request: Request, expected = process.env.CRON_SECRET): boolean {
  const authorization = request.headers.get('authorization')
  const supplied = authorization?.match(/^Bearer (.+)$/)?.[1]
  if (!expected || !supplied) return false
  const actualBytes = Buffer.from(supplied)
  const expectedBytes = Buffer.from(expected)
  return actualBytes.length === expectedBytes.length && timingSafeEqual(actualBytes, expectedBytes)
}
