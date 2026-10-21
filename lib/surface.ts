import type { Surface } from './types'
export const SURFACES = ['hard', 'clay', 'grass', 'carpet', 'unknown'] as const;
export const surfaceLabel: Record<Surface, string> = { hard: 'Dura', clay: 'Tierra', grass: 'Hierba', carpet: 'Moqueta', unknown: 'Sin superficie registrada' };
export function normalizeSurface(value: unknown): Surface {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return SURFACES.includes(normalized as Surface) ? normalized as Surface : 'unknown';
}
export const surfaceColor: Record<Surface, string> = { grass: '#267552', clay: '#b45736', hard: '#286fa5', carpet: '#7956a3', unknown: '#727578' }
export function useSurfaceColor(surface: Surface) { return surfaceColor[surface] }
