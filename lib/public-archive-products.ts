import {PUBLIC_ARCHIVE_SCHEMA} from './public-archive-proof';
import type {MetadataRoute} from 'next';
import type {Match} from './types';
import type {PlayerRecord} from './season-analytics';
import type {RecordManifest} from './revista/snapshot';
import type {PageRevisions} from './publication-pages';
import type {EditionAudit} from './edition-audit';
import {playerSlug} from './explore';
import {recordsCanonical} from './records-url';
import {tournamentDirectory} from './tournament-directory';
import {tournamentEditionCanonicalPaths} from './tournament-url';
import {SITEMAP_STATIC_PATHS,sitemapLocation} from './sitemap-locations';
import {CURATED_COMPARISONS} from './curated-comparisons';
import {comparisonCanonical} from './comparison-canonical';

export type CoverageCell={tour:'atp'|'wta';category:string;decade:number;matches:number;years:number[];editions:number;certified:number;inconsistent:number};
export type PublicArchiveProducts={schema:2;version:string;integrity:{matches:number;playerParticipations:number;players:number;competition:number};sitemap:MetadataRoute.Sitemap;players:Record<string,string>;coverage:CoverageCell[]};
/** All expensive enumeration happens before the atomic publication pointer moves. */
export function compilePublicArchiveProducts(matches:Match[],players:PlayerRecord[],manifest:RecordManifest,revisions?:PageRevisions,audits:EditionAudit[]=[]):PublicArchiveProducts{
 const events=tournamentDirectory(matches),hasWomen=manifest.summary.tours.wta>0;
 const people=Object.fromEntries(players.map(player=>[`${player.tour||'atp'}:${playerSlug(player.name)}`,player.name]));
 const comparisons=CURATED_COMPARISONS.filter(pair=>[pair.a,pair.b].every(name=>people[`${pair.tour}:${playerSlug(name)}`])).map(pair=>comparisonCanonical(pair));
 const paths=[...SITEMAP_STATIC_PATHS,...(hasWomen?['/torneos?circuito=wta','/jugadores?tour=wta','/partidos?tour=wta','/records?tour=wta']:[]),
 ...manifest.pieces.map(piece=>recordsCanonical({dato:piece.id,tour:'atp'})),
 ...(manifest.circuitPieces?.wta||[]).map(piece=>recordsCanonical({dato:piece.id,tour:'wta'})),
 ...events.flatMap(event=>[...(event.matches.some(match=>match.tour!=='wta')?[`/torneos/${event.slug}`]:[]),...(event.matches.some(match=>match.tour==='wta')?[`/torneos/${event.slug}?cuadro=wta`]:[]),...tournamentEditionCanonicalPaths(event.slug,event.matches)]),
 ...players.map(player=>`/jugadores/${playerSlug(player.name)}${player.tour==='wta'?'?tour=wta':''}`),...comparisons];
 const integrity={matches:matches.length,playerParticipations:players.reduce((sum,player)=>sum+player.played,0),players:Object.keys(people).length,competition:manifest.competitionCount||0};
 if(integrity.matches!==manifest.matchCount||integrity.playerParticipations!==matches.length*2||players.length!==integrity.players)throw new Error('Published archive participation counters disagree');
 const sitemap:MetadataRoute.Sitemap=[...new Set(paths)].map(path=>({url:sitemapLocation(path),...(revisions?.pages[path]?.modifiedAt?{lastModified:revisions.pages[path].modifiedAt}:{}),changeFrequency:path===''?'daily':'weekly',priority:path===''?1:path==='/partidos'||path==='/records'?0.9:0.7}));
 const cells=new Map<string,CoverageCell>();
 const cell=(tour:'atp'|'wta',category:string,year:number)=>{const decade=Math.floor(year/10)*10,key=`${tour}:${category}:${decade}`;let row=cells.get(key);if(!row){row={tour,category,decade,matches:0,years:[],editions:0,certified:0,inconsistent:0};cells.set(key,row);}return row;};
 for(const match of matches){const row=cell(match.tour==='wta'?'wta':'atp',match.category,match.year);row.matches++;if(!row.years.includes(match.year))row.years.push(match.year);}
 for(const audit of audits){const row=cell(audit.tour==='wta'?'wta':'atp',audit.category,audit.year);row.editions++;row.certified+=Number(audit.completeDraw===true);row.inconsistent+=Number(audit.completeDraw===false);}
 return{schema:PUBLIC_ARCHIVE_SCHEMA,version:manifest.version,integrity,sitemap,players:people,coverage:[...cells.values()].map(row=>({...row,years:row.years.sort((a,b)=>a-b)})).sort((a,b)=>a.tour.localeCompare(b.tour)||a.category.localeCompare(b.category)||a.decade-b.decade)};
}
