type UnknownRecord = Record<string, unknown>;

export type ProviderPlayerCandidate = {
  id: string;
  name: string;
  tour: 'atp' | 'wta';
};

function record(value: unknown): UnknownRecord | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as UnknownRecord
    : undefined;
}

function statisticsBody(value: unknown): UnknownRecord | undefined {
  const root = record(value);
  if (!root) return undefined;
  const data = record(root.data);
  const candidates = [record(root.stats), root, record(data?.stats), data];
  return candidates.find((candidate) => record(candidate?.players));
}

export function hasProviderStatistics(value: unknown) {
  return Boolean(statisticsBody(value));
}

/** Normalize the dedicated statistics response into the detail shape used by modernStats. */
export function mergeProviderStatistics(detail: unknown, response: unknown): UnknownRecord {
  const source = record(detail) || {};
  const incoming = statisticsBody(response);
  if (!incoming) return source;
  const current = record(source.stats) || {};
  return {
    ...source,
    stats: {
      ...current,
      ...incoming,
      players: incoming.players,
    },
  };
}

/** Extract stable provider IDs only when the documented name and circuit exist. */
export function providerPlayersFromDetail(value: unknown, fallbackTour: 'atp' | 'wta') {
  const root = record(value);
  const body = record(root?.match) || record(root?.data) || root;
  const players = record(body?.players);
  if (!players) return [];
  return ['p1', 'p2'].flatMap((key): ProviderPlayerCandidate[] => {
    const player = record(players[key]);
    const id = player?.id;
    const name = typeof player?.name === 'string' ? player.name.trim() : '';
    const tour = player?.tour === 'wta' ? 'wta' : player?.tour === 'atp' ? 'atp' : fallbackTour;
    return (typeof id === 'string' || typeof id === 'number') && name
      ? [{ id: String(id), name, tour }]
      : [];
  });
}
