// Build-only Node runtime: use the same server-only and React aliases as Next.
import { registerHooks, createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
const require = createRequire(import.meta.url);
const aliases = {
  'server-only': pathToFileURL(require.resolve('next/dist/compiled/server-only/empty')).href,
  react: pathToFileURL(require.resolve('next/dist/compiled/react')).href,
};
registerHooks({resolve(specifier,context,nextResolve){return nextResolve(aliases[specifier] || specifier,context);}});
