'use client';

import Image from 'next/image';
import { useState } from 'react';
import { imageFocus } from '@/lib/image-focus';
import styles from './editorial-photo.module.css';

export default function EditorialPhoto({
  src,
  alt,
  label,
  sizes,
  priority = false,
  objectPosition = 'center',
  mobileObjectPosition,
  className,
}: {
  src?: string | null;
  alt: string;
  label: string;
  sizes: string;
  priority?: boolean;
  objectPosition?: string;
  mobileObjectPosition?: string;
  className?: string;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  if (src && failedSrc !== src) {
    return <Image
      className={className}
      src={src}
      alt={alt}
      fill
      priority={priority}
      quality={88}
      sizes={sizes}
      style={imageFocus(objectPosition, mobileObjectPosition || objectPosition)}
      onError={() => setFailedSrc(src)}
    />;
  }
  const mark = label.split(/\s+/).filter(Boolean).map(part => part[0]).slice(0, 2).join('').toUpperCase();
  return <span className={styles.fallback} aria-label={`Fotografía no disponible: ${label}`} role="img">
    <span className={styles.court} aria-hidden="true" />
    <b aria-hidden="true">{mark}</b>
  </span>;
}
