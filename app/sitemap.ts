import type {MetadataRoute} from 'next';
import {preparedPublicArchive} from '@/lib/revista/read-records';
export const revalidate=3600;
export default async function sitemap():Promise<MetadataRoute.Sitemap>{return(await preparedPublicArchive()).sitemap;}
