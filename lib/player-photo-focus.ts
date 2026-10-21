/** Focal rectangles inspected against these six existing, licensed local assets.
 * Coordinates are fractions of the original width/height; no pixels are changed.
 */
export type PlayerPhotoFocus = {
  objectPosition: string;
  avatarCrop: { x: number; y: number; width: number; height: number };
};

export const playerPhotoFocus: Record<string, PlayerPhotoFocus> = {
  'Roger Federer': {
    objectPosition: '50% 20%',
    avatarCrop: { x: 34 / 330, y: 26 / 457, width: 270 / 330, height: 270 / 457 },
  },
  'Rafael Nadal': {
    objectPosition: '34% 30%',
    avatarCrop: { x: 120 / 760, y: 500 / 1434, width: 240 / 760, height: 240 / 1434 },
  },
  'Novak Djokovic': {
    objectPosition: '55% 0%',
    avatarCrop: { x: 210 / 480, y: 0, width: 130 / 480, height: 130 / 538 },
  },
  'Andy Murray': {
    objectPosition: '50% 18%',
    avatarCrop: { x: 55 / 330, y: 0, width: 250 / 330, height: 250 / 410 },
  },
  'Carlos Alcaraz': {
    objectPosition: '51% 28%',
    avatarCrop: { x: 135 / 400, y: 115 / 600, width: 140 / 400, height: 140 / 600 },
  },
  'Jannik Sinner': {
    objectPosition: '58% 18%',
    avatarCrop: { x: 155 / 480, y: 10 / 568, width: 240 / 480, height: 240 / 568 },
  },
};
