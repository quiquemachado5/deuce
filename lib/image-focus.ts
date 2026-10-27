import type { CSSProperties } from "react";

export type ArtDirectedImageStyle = CSSProperties & {
  "--image-position"?: string;
  "--image-position-mobile"?: string;
};

export function imageFocus(position = "center", mobilePosition = position): ArtDirectedImageStyle {
  return {
    "--image-position": position,
    "--image-position-mobile": mobilePosition,
  };
}
