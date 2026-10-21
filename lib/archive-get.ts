type ArchiveGetResult<T> = {
  data: T | null
  error: { code?: string; name?: string } | null
  status: number
}
type ReadFailure = { code: string; status: number; name: string }
const networkNames = new Set(['AbortError', 'TimeoutError', 'TypeError'])
const networkCodes = new Set(['ABORT_ERR', 'ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'EAI_AGAIN', 'ENOTFOUND', 'UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_HEADERS_TIMEOUT', 'UND_ERR_BODY_TIMEOUT', 'UND_ERR_SOCKET'])
const safeLabel = (value: unknown, fallback: string) => typeof value === 'string' && /^[A-Za-z0-9_]{1,64}$/.test(value) ? value : fallback

export function archiveReadFailure(error: unknown, status = 0): ReadFailure {
  const failure = error as { code?: unknown; status?: unknown; name?: unknown; cause?: { code?: unknown } } | null
  return {
    code: safeLabel(failure?.code || failure?.cause?.code, status === 0 ? 'NETWORK' : 'UNKNOWN'),
    status: typeof failure?.status === 'number' ? failure.status : status,
    name: safeLabel(failure?.name, status === 0 ? 'NetworkError' : 'Error'),
  }
}
class ArchiveReadError extends Error {
  readonly code: string
  readonly status: number
  constructor(failure: ReadFailure) {
    super(`Archive GET failed: ${failure.code} ${failure.status} ${failure.name}`)
    this.code = failure.code
    this.status = failure.status
    this.name = failure.name
  }
}

// The callback creates a fresh GET and disables SDK retries, so this is the
// complete retry budget. Each attempt also receives a fresh timeout signal.
export async function archiveGet<T>(
  request: (signal: AbortSignal) => PromiseLike<ArchiveGetResult<T>>,
  pause: (ms: number) => Promise<void> = ms => new Promise(resolve => setTimeout(resolve, ms)),
): Promise<T | null> {
  for (let attempt = 0; ; attempt++) {
    let failure: ReadFailure
    let retryable: boolean
    let result: ArchiveGetResult<T>
    try {
      result = await request(AbortSignal.timeout(15_000))
    } catch (error) {
      failure = archiveReadFailure(error)
      retryable = networkNames.has(failure.name) || networkCodes.has(failure.code)
      if (!retryable || attempt === 2) throw new ArchiveReadError(failure)
      await pause(attempt === 0 ? 300 : 900)
      continue
    }
    if (!result.error) return result.data
    failure = archiveReadFailure(result.error, result.status)
    retryable = failure.code === 'PGRST303' || result.status === 0 || (result.status >= 500 && result.status < 600)
    if (!retryable || attempt === 2) throw new ArchiveReadError(failure)
    await pause(attempt === 0 ? 300 : 900)
  }
}
