import Image from "next/image";
import type { Photo } from "@/lib/imagery";
import { imageFocus } from "@/lib/image-focus";

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
        className="art-directed-photo"
        style={imageFocus(photo.objectPosition || "50% 20%",photo.mobileObjectPosition||photo.objectPosition||"50% 20%")}
        loading={preload ? "eager" : "lazy"}
        fetchPriority={preload ? "high" : "auto"}
        unoptimized
      />
    </figure>
  );
}
