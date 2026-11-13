FROM node:24-bookworm-slim AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm,sharing=locked npm ci

FROM dependencies AS builder
WORKDIR /app
COPY . .
ARG NEXT_PUBLIC_SITE_ORIGIN
ARG GOOGLE_SITE_VERIFICATION
ARG BING_SITE_VERIFICATION
ARG SOURCE_COMMIT
ARG DEUCE_SNAPSHOT_MANIFEST_URL
ARG DEUCE_EXPECTED_SNAPSHOT_COMMIT
ENV NEXT_PUBLIC_SITE_ORIGIN=${NEXT_PUBLIC_SITE_ORIGIN}
ENV GOOGLE_SITE_VERIFICATION=${GOOGLE_SITE_VERIFICATION}
ENV BING_SITE_VERIFICATION=${BING_SITE_VERIFICATION}
ENV COMMIT_REF=${SOURCE_COMMIT}
ENV DEUCE_SNAPSHOT_MANIFEST_URL=${DEUCE_SNAPSHOT_MANIFEST_URL}
ENV DEUCE_EXPECTED_SNAPSHOT_COMMIT=${DEUCE_EXPECTED_SNAPSHOT_COMMIT}
ENV CI=1
ENV NEXT_TELEMETRY_DISABLED=1
RUN --mount=type=cache,target=/app/.next/cache,sharing=locked npm run build

FROM node:24-bookworm-slim AS runner
WORKDIR /app
ARG SOURCE_COMMIT
LABEL org.opencontainers.image.title="DEUCE" \
  org.opencontainers.image.source="https://github.com/quiquemachado5/deuce" \
  org.opencontainers.image.revision="${SOURCE_COMMIT}"
ENV NODE_ENV=production
ENV COMMIT_REF=${SOURCE_COMMIT}
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

# The runtime executes node directly; keep build-time package managers out.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx /opt/yarn-* /usr/local/bin/yarn /usr/local/bin/yarnpkg

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/data/reading ./data/reading
COPY --from=builder --chown=nextjs:nodejs /app/ops/railway/start.mjs ./ops/railway/start.mjs
COPY --from=builder --chown=nextjs:nodejs /app/ops/oracle/scheduler.mjs ./ops/oracle/scheduler.mjs
COPY --from=builder --chown=nextjs:nodejs /app/ops/scheduler-core.mjs ./ops/scheduler-core.mjs
COPY --from=builder --chown=nextjs:nodejs /app/ops/release-policy.mjs ./ops/release-policy.mjs
COPY --from=builder --chown=nextjs:nodejs /app/ops/release-baseline.json ./ops/release-baseline.json
COPY --from=builder --chown=nextjs:nodejs /app/ops/internal-request.mjs ./ops/internal-request.mjs
COPY --from=builder --chown=nextjs:nodejs /app/ops/recover-publication.mjs ./ops/recover-publication.mjs
COPY --from=builder --chown=nextjs:nodejs /app/ops/verify-release.mjs ./ops/verify-release.mjs
COPY --from=builder --chown=nextjs:nodejs /app/build/restore-drill.mjs ./build/restore-drill.mjs
COPY --from=builder --chown=nextjs:nodejs /app/build/restore-validation.mjs ./build/restore-validation.mjs
COPY --from=builder --chown=nextjs:nodejs /app/lib/publication-hash.mjs ./lib/publication-hash.mjs
COPY --from=builder --chown=nextjs:nodejs /app/lib/match-browser-contract.json ./lib/match-browser-contract.json
RUN mkdir -p /app/.deuce-archive /app/.next/cache \
  && chown -R nextjs:nodejs /app/.deuce-archive /app/.next

USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=90s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
