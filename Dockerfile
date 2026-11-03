FROM node:24-bookworm-slim AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS builder
WORKDIR /app
COPY . .
ARG NEXT_PUBLIC_SITE_ORIGIN
ARG SOURCE_COMMIT
ARG DEUCE_SNAPSHOT_MANIFEST_URL
ARG DEUCE_EXPECTED_SNAPSHOT_COMMIT
ENV NEXT_PUBLIC_SITE_ORIGIN=${NEXT_PUBLIC_SITE_ORIGIN}
ENV COMMIT_REF=${SOURCE_COMMIT}
ENV DEUCE_SNAPSHOT_MANIFEST_URL=${DEUCE_SNAPSHOT_MANIFEST_URL}
ENV DEUCE_EXPECTED_SNAPSHOT_COMMIT=${DEUCE_EXPECTED_SNAPSHOT_COMMIT}
ENV CI=1
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

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

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/ops/railway/start.mjs ./ops/railway/start.mjs
COPY --from=builder --chown=nextjs:nodejs /app/ops/oracle/scheduler.mjs ./ops/oracle/scheduler.mjs
COPY --from=builder --chown=nextjs:nodejs /app/ops/scheduler-core.mjs ./ops/scheduler-core.mjs
COPY --from=builder --chown=nextjs:nodejs /app/ops/release-policy.mjs ./ops/release-policy.mjs
COPY --from=builder --chown=nextjs:nodejs /app/ops/release-baseline.json ./ops/release-baseline.json
COPY --from=builder --chown=nextjs:nodejs /app/ops/verify-release.mjs ./ops/verify-release.mjs
COPY --from=builder --chown=nextjs:nodejs /app/build/restore-drill.mjs ./build/restore-drill.mjs
COPY --from=builder --chown=nextjs:nodejs /app/build/restore-validation.mjs ./build/restore-validation.mjs
COPY --from=builder --chown=nextjs:nodejs /app/lib/match-browser-contract.json ./lib/match-browser-contract.json
RUN mkdir -p /app/.deuce-archive /app/.next/cache \
  && chown -R nextjs:nodejs /app/.deuce-archive /app/.next

USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=90s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
