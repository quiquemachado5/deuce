import Image from "next/image";
import type { Photo } from "@/lib/imagery";

export default function PlayerPortrait({
  photo,
  className = "",
  preload = false,
}: {
  photo: Photo;
  className?: string;
  preload?: boolean;
}) {
  return (
    <figure className={`pd-portrait ${className}`}>
      <Image
        src={photo.src}
        alt={photo.alt}
        width={640}
        height={760}
        sizes="(max-width: 759px) calc(100vw - 32px), (max-width: 1099px) 38vw, 480px"
        style={{ objectPosition: photo.objectPosition || "50% 20%" }}
        preload={preload}
        unoptimized
      />
    </figure>
  );
}
