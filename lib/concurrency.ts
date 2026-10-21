/** A shared FIFO limit: nested callers cannot exceed the same I/O budget. */
export function createLimiter(concurrency: number) {
  if (!Number.isInteger(concurrency) || concurrency < 1) throw new Error('Invalid concurrency');
  let active = 0;
  const waiting: Array<() => void> = [];
  return async function limit<T>(operation: () => Promise<T>): Promise<T> {
    await new Promise<void>(resolve => {
      const start = () => { active++; resolve(); };
      if (active < concurrency) start();
      else waiting.push(start);
    });
    try { return await operation(); }
    finally { active--; waiting.shift()?.(); }
  };
}
