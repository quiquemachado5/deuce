import Image from "next/image";
import { playerPhoto } from "@/lib/player-imagery";
export function Avatar({ name }: { name: string }) {
  const p = playerPhoto(name);
  return p ? (
    <Image
      className="avatar"
      src={p.thumbnail || p.src}
      alt=""
      width={40}
      height={44}
      sizes="40px"
      unoptimized
    />
  ) : (
    <span className="avatar avatar-empty" aria-hidden="true">
      {name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")}
    </span>
  );
}
