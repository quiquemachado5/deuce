import 'server-only';
import { playerPhoto } from "@/lib/player-imagery";
import type { Photo } from "@/lib/imagery";
import PlayerAvatarView, { type PlayerAvatarPhoto } from "@/components/PlayerAvatarView";

function presentationPhoto(photo: Photo | null): PlayerAvatarPhoto | null {
  if (!photo) return null;
  if (photo.thumbnail) return { src: photo.thumbnail, objectPosition: "50% 20%" };
  return {
    src: photo.src,
    ...(photo.objectPosition ? { objectPosition: photo.objectPosition } : {}),
    ...(photo.avatarCrop ? { avatarCrop: photo.avatarCrop } : {}),
  };
}

export function resolvePlayerAvatarPhoto(
  name: string,
  tour: 'atp' | 'wta' = 'atp',
  suppliedPhoto?: Photo | null,
): PlayerAvatarPhoto | null {
  return presentationPhoto(suppliedPhoto === undefined ? playerPhoto(name, tour) : suppliedPhoto);
}

/** Local, licensed, size-limited portraits. The adjacent name provides the label. */
export default function PlayerAvatar({
  name,
  tour = 'atp',
  size = 36,
  photo: suppliedPhoto,
}: {
  name: string;
  tour?: 'atp'|'wta';
  size?: number;
  photo?: Photo | null;
}) {
  return <PlayerAvatarView name={name} size={size} photo={resolvePlayerAvatarPhoto(name, tour, suppliedPhoto)} />;
}
