import type { CSSProperties } from 'react';
import { recordPhoto } from '@/lib/editorial-imagery';
import type { Photo } from '@/lib/imagery';
import { playerEditionPhoto, playerPhoto } from '@/lib/player-imagery';
import type { RecordRow } from '@/lib/revista/records';
import type { RecordMeta } from '@/lib/revista/snapshot';

const portraitFocus:Record<string,{objectPosition:string;mobileObjectPosition:string}>={
  'Alex De Minaur':{objectPosition:'50% 24%',mobileObjectPosition:'50% 18%'},
  'Andy Murray':{objectPosition:'50% 20%',mobileObjectPosition:'50% 15%'},
  'Roger Federer':{objectPosition:'50% 20%',mobileObjectPosition:'50% 16%'},
  'Novak Djokovic':{objectPosition:'50% 16%',mobileObjectPosition:'50% 12%'},
  'Rafael Nadal':{objectPosition:'50% 20%',mobileObjectPosition:'50% 16%'},
  'John Isner':{objectPosition:'50% 20%',mobileObjectPosition:'50% 16%'},
  'Ben Shelton':{objectPosition:'50% 23%',mobileObjectPosition:'50% 18%'},
  'Alexander Zverev':{objectPosition:'50% 24%',mobileObjectPosition:'50% 18%'},
};

export const photoFor=(piece?:RecordMeta|null)=>piece?.leader?recordPhoto(piece.id,piece.leader.name):null;
export const rowForTour=(row:RecordRow,tour?:string):RecordRow=>tour==='wta'&&row.href.startsWith('/jugadores/')
  ?{...row,href:`${row.href}${row.href.includes('?')?'&':'?'}tour=wta`}:row;
export function portraitFor(name:string):Photo|null{
  const photo=playerEditionPhoto(name,1)||playerPhoto(name);if(!photo)return null;
  const fullPortrait=photo.thumbnail?.match(/^\/images\/players\/optimized\/(.+)-small\.webp$/)?.[1];
  return {...photo,src:fullPortrait?`/images/players/optimized/${fullPortrait}.webp`:photo.src,...(portraitFocus[name]||{})};
}
export const recordImageStyle=(photo:Photo)=>({
  '--record-photo-position':photo.objectPosition||'50% 28%',
  '--record-photo-position-mobile':photo.mobileObjectPosition||photo.objectPosition||'50% 22%',
}) as CSSProperties;
