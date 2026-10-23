"use client";

import { Check, Link2, Share2 } from "lucide-react";
import { useState } from "react";

export default function ShareLinkButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    const data = { title, url: window.location.href };
    try {
      if (navigator.share) await navigator.share(data);
      else {
        await navigator.clipboard.writeText(data.url);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      try {
        await navigator.clipboard.writeText(data.url);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
      } catch {}
    }
  };
  const canShare = typeof navigator !== "undefined" && Boolean(navigator.share);
  return (
    <button type="button" className="share-link-button" onClick={share} aria-label={`${copied ? "Enlace copiado" : "Compartir"}: ${title}`}>
      {copied ? <Check size={16} aria-hidden="true" /> : canShare ? <Share2 size={16} aria-hidden="true" /> : <Link2 size={16} aria-hidden="true" />}
      <span aria-live="polite">{copied ? "Enlace copiado" : "Compartir estadística"}</span>
    </button>
  );
}
