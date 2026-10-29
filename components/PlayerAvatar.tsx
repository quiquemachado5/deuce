"use client";

import Image from "next/image";
import { playerPhoto } from "@/lib/player-imagery";
import { avatarPhotoStyle } from "@/lib/photo-style";
import type { Photo } from "@/lib/imagery";
import { useState } from "react";

function avatarColors(name: string) {
  let hash = 0;
  for (const character of name) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  const hue = hash % 360;
  return [`hsl(${hue} 58% 36%)`, `hsl(${(hue + 42) % 360} 68% 58%)`];
}

/** Local, licensed, size-limited portraits. The adjacent name provides the label. */
export default function PlayerAvatar({
  name,
  size = 36,
  photo: suppliedPhoto,
}: {
  name: string;
  size?: number;
  photo?: Photo | null;
}) {
  const photo = suppliedPhoto === undefined ? playerPhoto(name) : suppliedPhoto;
  const hasThumbnail = Boolean(photo?.thumbnail);
  const [failed, setFailed] = useState(false);
  const [from, to] = avatarColors(name);
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .filter((_, i, parts) => i === 0 || i === parts.length - 1)
    .join("");
  return (
    <span
      className="player-avatar"
      style={{
        "--avatar-size": `${size}px`,
        "--avatar-from": from,
        "--avatar-to": to,
      } as React.CSSProperties}
      aria-hidden="true"
      data-fallback={!photo || failed ? "true" : undefined}
    >
      {photo && !failed ? (
        <Image
          src={photo.thumbnail || photo.src}
          alt=""
          width={size * 2}
          height={size * 2}
          sizes={`${size}px`}
          style={avatarPhotoStyle(hasThumbnail ? {
            objectPosition: "50% 20%",
          } : photo)}
          unoptimized
          onError={() => setFailed(true)}
        />
      ) : (
        initials
      )}
    </span>
  );
}
