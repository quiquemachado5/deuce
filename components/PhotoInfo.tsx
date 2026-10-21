import { Info } from 'lucide-react'
import Link from 'next/link'
import type { Photo } from '@/lib/imagery'

/** Credits stay one click away, without a caption competing with the content. */
export default function PhotoInfo({ photo }: { photo: Photo }) {
  return <Link className="photo-info" href={`/credits?image=${encodeURIComponent(photo.src)}`} aria-label={`Autor y licencia: ${photo.alt}`} title="Fotografía y licencia"><Info size={17} aria-hidden="true"/></Link>
}
