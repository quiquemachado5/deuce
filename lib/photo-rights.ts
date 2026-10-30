import type { Photo } from './imagery';

export type PhotoRightsStatus = 'documented' | 'source-only';

/** Rights are documented only when the exact asset carries a licence or a clear rights marker. */
export function photoRightsStatus(photo: Pick<Photo, 'credit' | 'licenseUrl' | 'source'>): PhotoRightsStatus {
  if (!photo.credit.trim() || !photo.source.trim()) return 'source-only';
  return photo.licenseUrl || /\bCC(?:0| BY)|dominio p[uú]blico|public domain|GODL|licencia espec[ií]fica|Pexels|Unsplash/i.test(photo.credit)
    ? 'documented'
    : 'source-only';
}
