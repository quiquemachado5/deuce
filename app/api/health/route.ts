import { preparedEditionAudit, preparedGeneration } from "@/lib/revista/read-records";
import { generationMetadata } from "@/lib/revista/generation";
import { cloudClient, cloudRead } from "@/lib/cloud-archive";
import { editionCompleteness } from "@/lib/edition-audit";

export const dynamic = "force-dynamic";
export async function GET() {
  const headers = { "Cache-Control": "no-store" };
  try {
    const [generation, editions, sync, wtaSync, publication] = await Promise.all([
      preparedGeneration(),
      preparedEditionAudit(),
      cloudRead("sync-status"),
      cloudRead("wta-sync-status"),
      cloudRead("publish-status"),
    ]);
    const auditedEditions = editions.map(edition => ({ ...edition, ...editionCompleteness(edition) }));
    const ageHours = Math.max(
      0,
      (Date.now() - Date.parse(generation.manifest.generatedAt)) / 3_600_000,
    );
    const recentStatus = (value: unknown) => {
      const row =
        value && typeof value === "object"
          ? (value as Record<string, unknown>)
          : {};
      const at =
        typeof row.at === "string" && Number.isFinite(Date.parse(row.at))
          ? row.at
          : null;
      return {
        status: typeof row.status === "string" ? row.status : "unavailable",
        at,
        detail: typeof row.message === "string" ? row.message.slice(0, 120) : undefined,
        lastSuccessAt: typeof row.lastSuccessAt === "string" && Number.isFinite(Date.parse(row.lastSuccessAt)) ? row.lastSuccessAt : undefined,
        ageHours: at
          ? Math.round(
              Math.max(0, (Date.now() - Date.parse(at)) / 3_600_000) * 10,
            ) / 10
          : null,
      };
    };
    const refresh = recentStatus(sync),
      wtaRefresh = recentStatus(wtaSync),
      published = recentStatus(publication);
    const dailyIssue =
      Boolean(cloudClient()) &&
      (refresh.status !== "success" ||
        refresh.ageHours === null ||
        refresh.ageHours > 36 ||
        wtaRefresh.status !== "success" ||
        wtaRefresh.ageHours === null ||
        wtaRefresh.ageHours > 36 ||
        published.status !== "success" ||
        published.ageHours === null ||
        published.ageHours > 36);
    return Response.json(
      {
        status:
          generation.fallbackReason || ageHours > 72 || dailyIssue
            ? "degraded"
            : "healthy",
        ...generationMetadata(generation),
        matches: generation.manifest.matchCount,
        statistics: generation.manifest.pieces.length,
        editionCoverage: {
          audited: auditedEditions.length,
          incomplete: auditedEditions.filter(edition => edition.completeDraw === false).length,
          pendingResults: auditedEditions.reduce((sum, edition) => sum + edition.pending, 0),
        },
        ageHours: Math.round(ageHours * 10) / 10,
        staleAfterHours: 72,
        dailyUpdate: {
          refresh,
          atp: refresh,
          wta: wtaRefresh,
          publication: published,
          staleAfterHours: 36,
        },
      },
      {
        headers: {
          ...headers,
          "X-DEUCE-Dataset-Version": generation.manifest.version,
        },
      },
    );
  } catch {
    return Response.json({ status: "unavailable" }, { status: 503, headers });
  }
}
