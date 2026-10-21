import type { Surface } from './types'
export const surfaceColor: Record<Surface, string> = { grass: '#267552', clay: '#b45736', hard: '#286fa5' }
export function useSurfaceColor(surface: Surface) { return surfaceColor[surface] }
