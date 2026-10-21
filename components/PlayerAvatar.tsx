import Image from "next/image";
import { playerPhoto } from "@/lib/player-imagery";

/** Local, licensed, size-limited portraits. The adjacent name provides the label. */
export default function PlayerAvatar({
  name,
  size = 36,
}: {
  name: string;
  size?: number;
}) {
  const photo = playerPhoto(name);
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .filter((_, i, parts) => i === 0 || i === parts.length - 1)
    .join("");
  return (
    <span
      className="player-avatar"
      style={{ "--avatar-size": `${size}px` } as React.CSSProperties}
      aria-hidden="true"
    >
      {photo ? (
        <Image
          src={photo.thumbnail || photo.src}
          alt=""
          width={size * 2}
          height={size * 2}
          sizes={`${size}px`}
          unoptimized
        />
      ) : (
        initials
      )}
    </span>
  );
}
