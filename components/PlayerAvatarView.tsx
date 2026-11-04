"use client";

import Image from "next/image";
import { useState } from "react";
import { avatarPhotoStyle } from "@/lib/photo-style";

export type PlayerAvatarPhoto = {
  src: string;
  objectPosition?: string;
  avatarCrop?: { x: number; y: number; width: number; height: number };
};

function avatarColors(name: string) {
  let hash = 0;
  for (const character of name) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  const hue = hash % 360;
  return [`hsl(${hue} 58% 36%)`, `hsl(${(hue + 42) % 360} 68% 58%)`];
}

/** Presentational client boundary: it never imports the complete photo catalogue. */
export default function PlayerAvatarView({
  name,
  size = 36,
  photo,
}: {
  name: string;
  size?: number;
  photo: PlayerAvatarPhoto | null;
}) {
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
          src={photo.src}
          alt=""
          width={size * 2}
          height={size * 2}
          sizes={`${size}px`}
          style={avatarPhotoStyle(photo)}
          unoptimized
          onError={() => setFailed(true)}
        />
      ) : (
        initials
      )}
    </span>
  );
}
