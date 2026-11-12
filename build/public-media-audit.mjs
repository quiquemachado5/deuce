import { readFile, readdir } from 'node:fs/promises';
import { extname, join, relative, sep } from 'node:path';

const sourceExtensions = new Set(['.css', '.js', '.json', '.mjs', '.ts', '.tsx']);
const mediaExtensions = new Set(['.avif', '.gif', '.jpeg', '.jpg', '.png', '.svg', '.webp']);
const sourceRoots = ['app', 'components', 'lib', 'styles'];
const unoptimizedAllowlist = new Map([
  // SVG flags/logos/trophies are resolution-independent. EditorialPhoto's
  // exception is restricted in code to the precompressed reviewed WebP set.
  ['components/EditorialPhoto.tsx', 1],
  ['components/deuce/DeuceFooter.tsx', 1],
  ['components/deuce/MatchScoreboard.tsx', 1],
  ['components/player/ProfileArchiveProposal.tsx', 6],
  ['components/tournament/TournamentDirectoryStudy.tsx', 1],
  ['components/tournament/TournamentExperience.tsx', 1],
  ['app/compare/page.tsx', 1],
  ['app/comparar/CompareSelection.tsx', 1],
  ['app/licencias/page.tsx', 1],
  ['app/page.tsx', 1],
  ['app/records/page.tsx', 4],
  ['app/torneo/[slug]/[year]/page.tsx', 2],
  ['app/torneos/[slug]/page.tsx', 5],
  ['components/HomeFeaturedFinal.tsx', 1],
  ['components/EditionInsightsRail.tsx', 1],
  ['components/PlayerFlag.tsx', 1],
  ['components/PlayerAvatarView.tsx', 1],
  ['components/PlayerPortrait.tsx', 1],
  ['components/TournamentFinal.tsx', 1],
  ['components/TournamentGallery.tsx', 1],
  ['components/deuce/ArchivePage.tsx', 1],
  ['components/deuce/HeroPlayback.tsx', 1],
  ['components/deuce/OnThisDayCarousel.tsx', 2],
  ['components/analytics/Identity.tsx', 1],
  ['components/player/PlayerProfileInteractive.tsx', 2],
  ['components/records/RecordsRankings.tsx', 1],
  ['components/records/RecordsSurfaceChart.tsx', 1],
  ['components/records/RecordsSurfaceSlider.tsx', 1],
]);

async function walk(directory) {
  const rows = [];
  for (const entry of await readdir(directory, { withFileTypes: true }).catch(() => [])) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) rows.push(...await walk(path));
    else rows.push(path);
  }
  return rows;
}

const publicPath = (root, path) => `/${relative(join(root, 'public'), path).split(sep).join('/')}`;
const sourcePath = (root, path) => relative(root, path).split(sep).join('/');

function responsiveVariants(reference) {
  if (/^\/images\/players\/directory\/.+\.webp(?:\?.*)?$/.test(reference) && !/-734\.webp(?:\?.*)?$/.test(reference)) {
    return [reference.split('?')[0].replace(/\.webp$/, '-734.webp')];
  }
  if (/^\/images\/tournaments\/detail\/.+\.webp$/.test(reference) && !/-\d+\.webp$/.test(reference)) {
    return [734, 1068, 1440].map(width => reference.replace(/\.webp$/, `-${width}.webp`));
  }
  if (/^\/images\/courts\/.+\.jpg$/.test(reference)) {
    return [734, 1068, 1440].map(width => reference.replace(/\.jpg$/, `-${width}.webp`));
  }
  if (/^\/images\/home-materials\/(?:clay|grass|hard)\.webp$/.test(reference)) {
    return [768, 1440, 2400].map(width => reference.replace(/\.webp$/, `-${width}.webp`));
  }
  if (/^\/images\/players\/optimized\/.+\.webp$/.test(reference) && !reference.endsWith('-small.webp')) {
    return [reference.replace(/\.webp$/, '-small.webp')];
  }
  if (/^\/images\/players\/wta-licensed\/.+-detail\.webp$/.test(reference)) {
    return ['small', 'medium'].map(size => reference.replace('-detail.webp', `-${size}.webp`));
  }
  return [];
}

function virtualSourceReference(reference) {
  return /^\/images\/courts\/.+\.jpg$/.test(reference)
    || /^\/images\/home-materials\/(?:clay|grass|hard)\.webp$/.test(reference);
}

export async function auditPublicMedia(root = process.cwd()) {
  const sources = (await Promise.all(sourceRoots.map(directory => walk(join(root, directory))))).flat()
    .filter(path => sourceExtensions.has(extname(path)));
  // Licencias reads this catalogue dynamically. These are live references, not
  // orphaned files just because their paths do not occur in a TSX literal.
  sources.push(...(await walk(join(root,'data','media'))).filter(path=>path===join(root,'data','media','tournament-library.json')));
  const references = new Set();
  const unoptimizedViolations = [];
  const unoptimizedCounts = {};

  for (const path of sources) {
    const content = await readFile(path, 'utf8');
    for (const match of content.matchAll(/["'`](\/(?:fonts|images|videos|media)\/[^"'`)\\?#]+(?:\?[^"'`)\\]*)?)["'`]/g)) {
      references.add(match[1].split('?')[0]);
    }
    if (!path.endsWith('.tsx')) continue;
    const count = (content.match(/\bunoptimized(?:=|\s|\/)/g) || []).length;
    if (!count) continue;
    const name = sourcePath(root, path);
    unoptimizedCounts[name] = count;
    if (!unoptimizedAllowlist.has(name) || count > unoptimizedAllowlist.get(name)) {
      unoptimizedViolations.push(`${name}: ${count} unoptimized image use${count === 1 ? '' : 's'}`);
    }
  }

  // Home photos are assembled from catalogue keys, not literal file paths.
  const home=await readFile(join(root,'lib','home-media-refresh.json'),'utf8').then(JSON.parse).catch(()=>({}));
  for(const key of Object.keys(home)){
    const stem=key==='wimbledon'?'wimbledon-final-2023':key;
    references.add(`/images/home-curated/${stem}.webp`);
    references.add(`/images/home-curated/${stem}-small.webp`);
  }
  const expectedResponsive = new Set([...references].flatMap(responsiveVariants));
  const allowed = new Set([...references, ...expectedResponsive]);
  const media = (await Promise.all(['images','media'].map(directory=>walk(join(root,'public',directory))))).flat().filter(path => mediaExtensions.has(extname(path).toLowerCase()));
  const present = new Set(media.map(path => publicPath(root, path)));
  const missingReferenced = [...references].filter(path =>
    /^\/(?:images|media)\//.test(path) && mediaExtensions.has(extname(path).toLowerCase()) &&
    !path.includes('${') && !path.startsWith('/images/players/wta/') &&
    !virtualSourceReference(path) && !present.has(path));
  // The static loader serves these siblings of registered originals.
  for(const path of present){
    const parent=path.replace(/-(?:small|640|734|1024|1068|1440|2400)(?=\.webp$)/,'');
    if(parent!==path&&references.has(parent))allowed.add(path);
  }
  const orphaned = media.map(path => publicPath(root, path)).filter(path =>
    !allowed.has(path) && !path.startsWith('/images/flags/'));
  const missingResponsive = [...expectedResponsive].filter(path => !present.has(path));

  const manifest = JSON.parse(await readFile(join(root, 'lib', 'player-photo-manifest.json'), 'utf8'));
  const rawOriginals = Object.entries(manifest).flatMap(([name, photo]) =>
    photo && typeof photo === 'object' && typeof photo.originalSrc === 'string' ? [`${name}: ${photo.originalSrc}`] : []);

  return {
    media: media.length,
    references: references.size,
    responsiveVariants: expectedResponsive.size,
    orphaned: orphaned.sort(),
    missingReferenced: missingReferenced.sort(),
    missingResponsive: missingResponsive.sort(),
    rawOriginals,
    unoptimizedCounts,
    unoptimizedViolations,
  };
}
