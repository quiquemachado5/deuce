import type { CSSProperties } from "react";
import type { Photo } from "./imagery";

/** Crops only the rendered frame; the licensed source pixels remain unchanged. */
export function avatarPhotoStyle(
  photo: Pick<Photo, "avatarCrop" | "objectPosition">,
): CSSProperties {
  const crop = photo.avatarCrop;
  if (!crop)
    return {
      objectFit: "cover",
      objectPosition: photo.objectPosition || "50% 20%",
    };
  return {
    position: "absolute",
    right: "auto",
    bottom: "auto",
    width: `${100 / crop.width}%`,
    height: `${100 / crop.height}%`,
    left: `${(-100 * crop.x) / crop.width}%`,
    top: `${(-100 * crop.y) / crop.height}%`,
    maxWidth: "none",
    objectFit: "fill",
  };
}
