import type {MetadataRoute} from 'next';
import {preparedPublicArchive} from '@/lib/revista/read-records';
// The published artifact is immutable; the active pointer must be read at request time.
export const dynamic='force-dynamic';
export const revalidate=0;
export default async function sitemap():Promise<MetadataRoute.Sitemap>{return(await preparedPublicArchive()).sitemap;}
