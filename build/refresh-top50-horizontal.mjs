import {createApprovedFetch} from './approved-media-fetch.mjs';
const fetch=createApprovedFetch(["assets.tennismajors.com", "cdn.wearetennis.bnpparibas", "commons.wikimedia.org", "d2me2qg8dfiw8u.cloudfront.net", "i.ebayimg.com", "images.thequint.com", "johankriektennis.com", "live-production.wcms.abc-cdn.net.au", "media.newyorker.com", "medias.lequipe.fr", "monesport.cat", "photo-assets.wimbledon.com", "resources.prod.atpmedia.pulselive.com", "s3-newsifier.ams3.digitaloceanspaces.com", "shop.memorylane.co.uk", "sportescu.ro", "static.livetennis.it", "staticg.sportskeeda.com", "tennisuptodate.com", "thumb.wikimedia.org", "upload.wikimedia.org", "wearetennis.bnpparibas", "www.80scasualclassics.co.uk", "www.abc.net.au", "www.ebay.co.uk", "www.ebay.com", "www.lequipe.fr", "www.livetennis.it", "www.newyorker.com", "www.sporting-heroes.net", "www.sportskeeda.com", "www.supertennis.tv", "www.tennis365.com", "www.tennismajors.com", "www.tennistv.com", "www.thequint.com", "www.wimbledon.com"]);
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const outputDirectory = join(root, 'public/images/players/top50-horizontal');
const reviewDirectory = join(root, 'data/media-review');
const manifestPath = join(root, 'lib/player-photo-top50.json');
const suppliedNadal = process.argv.find(argument => argument.startsWith('--nadal='))?.slice(8);
const offline = process.argv.includes('--local-sources');
const previousTop50 = JSON.parse(await readFile(manifestPath, 'utf8'));
const archiveManifest = JSON.parse(await readFile(join(root, 'lib/player-photo-manifest.json'), 'utf8'));

const players = [
  'Novak Djokovic','Rafael Nadal','Roger Federer','Pete Sampras','Bjorn Borg','Andre Agassi','Jimmy Connors','Carlos Alcaraz','Ivan Lendl','John McEnroe',
  'Mats Wilander','Stefan Edberg','Boris Becker','John Newcombe','Rod Laver','Jannik Sinner','Jim Courier','Guillermo Vilas','Ken Rosewall','Andy Murray',
  'Stan Wawrinka','Gustavo Kuerten','Arthur Ashe','Alexander Zverev','Lleyton Hewitt','Yevgeny Kafelnikov','Marat Safin','Patrick Rafter','Sergi Bruguera','Stan Smith',
  'Ilie Nastase','Johan Kriek','Jan Kodes','Marin Čilić','Daniil Medvedev','Andy Roddick','Juan Martin del Potro','Dominic Thiem','Juan Carlos Ferrero','Michael Chang',
  'Goran Ivanisevic','Carlos Moya','Richard Krajicek','Thomas Muster','Albert Costa','Petr Korda','Michael Stich','Thomas Johansson','Gaston Gaudio','Yannick Noah',
];

const aliases = {
  'Bjorn Borg': 'Björn Borg',
  'Marin Čilić': 'Marin Cilic',
};

// Horizontal images are also reused inside narrow directory cards. Keep the
// athlete, not the empty court, inside those responsive crops.
const subjectFocus = {
  'Rafael Nadal': '68% 50%',
  'Roger Federer': '100% 50%',
  'Carlos Alcaraz': '62% 50%',
  'John McEnroe': '56% 50%',
  'Ken Rosewall': '60% 50%',
  'Andy Murray': '72% 50%',
  'Alexander Zverev': '62% 50%',
  'Yevgeny Kafelnikov': '38% 50%',
  'Sergi Bruguera': '62% 50%',
  'Jan Kodes': '62% 50%',
  'Albert Costa': '62% 50%',
  'Yannick Noah': '60% 50%',
};

const outputSlugs = {
  'Roger Federer': 'roger-federer-action',
};

const manual = suppliedNadal ? {
  'Rafael Nadal': {
    path: suppliedNadal,
    source: '/images/players/top50-horizontal/rafael-nadal.webp',
    credit: 'Imagen horizontal de referencia aportada al proyecto · adaptación WebP por DEUCE',
  },
} : {};

const external = {
  'Andre Agassi': {
    url: 'https://staticg.sportskeeda.com/editor/2025/04/7cc3d-17454037675770-1920.jpg',
    source: 'https://www.sportskeeda.com/tennis/we-never-touched-other-never-said-i-love-you-when-andre-agassi-made-emotional-admission-changing-relationship-father',
    credit: 'Sportskeeda · archivo US Open · adaptación WebP por DEUCE',
  },
  'John Newcombe': {
    url: 'https://d2me2qg8dfiw8u.cloudfront.net/content/uploads/2022/03/15105954/John-Newcombe.jpg',
    source: 'https://www.tennis365.com/tennis-news/grand-slam-champion-laments-change-in-player-press-relationship',
    credit: 'Tennis365 · archivo Wimbledon · adaptación WebP por DEUCE',
  },
  'Jim Courier': {
    url: 'https://staticg.sportskeeda.com/editor/2022/05/5e996-16525434880946-1920.jpg',
    source: 'https://www.sportskeeda.com/tennis/7-players-successfully-defended-french-open-title',
    credit: 'Sportskeeda · archivo Roland-Garros · adaptación WebP por DEUCE',
  },
  'Lleyton Hewitt': {
    url: 'https://live-production.wcms.abc-cdn.net.au/f5e878bb67140a8d64200018b722c710?cropH=1997&cropW=2993&height=575&impolicy=wcms_crop_resize&width=862&xPos=3&yPos=0',
    source: 'https://www.abc.net.au/news/2014-06-24/wimbledon3a-nick-kyrgios-through-to-second-round-after-four-se/5547846',
    credit: 'ABC News Australia · archivo Wimbledon · adaptación WebP por DEUCE',
  },
  'Yevgeny Kafelnikov': {
    url: 'https://www.supertennis.tv/media_contents/campioni/42/main/preview_190720-kafelnikov-rovescio.jpg',
    source: 'https://www.supertennis.tv/I-tuoi-campioni/I-Piu-Grandi-Di-Sempre/Yevgeny-Kafelnikov',
    credit: 'SuperTennis · archivo Yevgeny Kafelnikov · adaptación WebP por DEUCE',
  },
  'Ilie Nastase': {
    url: 'https://sportescu.ro/wp-content/uploads/2014/12/Ilie-N%C4%83stase-Romania.jpg',
    source: 'https://sportescu.ro/ilie-nastase-romania/',
    credit: 'Sportescu · archivo Ilie Năstase · adaptación WebP por DEUCE',
  },
  'Jan Kodes': {
    url: 'https://www.supertennis.tv/media/REDAZIONE_LUGLIO_2023/20230703_jan_kodes_wimbledon_1973.jpg',
    source: 'https://www.supertennis.tv/News/Eventi-internazionali/wimbledon-1973-sciopero-tennis-atp-vincenti-gratuiti',
    credit: 'SuperTennis · archivo Wimbledon · adaptación WebP por DEUCE',
  },
  'Marin Čilić': {
    url: 'https://s3-newsifier.ams3.digitaloceanspaces.com/tennisuptodate.com/images/images/Cilic_Marin_Wimbledon2016v2.jpg',
    source: 'https://tennisuptodate.com/atp/it-means-the-world-marin-cilic-celebrates-600-atp-wins-who-else-has-crossed-this-milestone',
    credit: 'Tennis Up To Date · archivo Wimbledon · adaptación WebP por DEUCE',
  },
  'Michael Chang': {
    url: 'https://www.supertennis.tv/media/REDAZIONE/Redazione_esterne/190606-michael-chang-1989-gioca-diritto-a-Parigi.jpg',
    source: 'https://www.supertennis.tv/News/Campioni-internazionali/190608-chang-roland-garros-1989',
    credit: 'SuperTennis · archivo Roland-Garros · adaptación WebP por DEUCE',
  },
  'Carlos Moya': {
    url: 'https://i.ebayimg.com/images/g/26AAAeSwDA5n8L8x/s-l1200.jpg',
    source: 'https://www.ebay.co.uk/itm/297181994709',
    credit: 'Archivo fotográfico Roland-Garros · adaptación WebP por DEUCE',
  },
  'Richard Krajicek': {
    url: 'https://shop.memorylane.co.uk/p/767/richard-krajicek-stretches-ball-malivai-21573870.jpg.webp',
    source: 'https://shop.memorylane.co.uk/mirror/0100to0199-00199/richard-krajicek-stretches-ball-malivai-21573870.html',
    credit: 'Mirrorpix / Memory Lane · adaptación WebP por DEUCE',
  },
  'Michael Stich': {
    url: 'https://www.sporting-heroes.net/content/thumbnails/00058/05694-zoom.jpg',
    source: 'https://www.sporting-heroes.net/tennis/germany/michael-stich-4431/1992-94-u-s-runner-up-in-1994_a05694/',
    credit: 'Sporting Heroes · archivo Wimbledon · adaptación WebP por DEUCE',
  },
  'Thomas Johansson': {
    url: 'https://assets.tennismajors.com/uploads/2021/01/Thomas-Johansson-1-1024x539.jpg',
    source: 'https://www.tennismajors.com/australian-open-news/january-27-2002-the-day-thomas-johansson-stunned-safin-to-win-the-australian-open-title-317353.html',
    credit: 'Tennis Majors · archivo Australian Open · adaptación WebP por DEUCE',
  },
  'Gaston Gaudio': {
    url: 'https://www.lequipe.fr/_medias/img-photo-jpg/gaston-gaudio-a-remporte-l-edition-2004-de-roland-garros-apres-une-finale-d-anthologie-contre-son-c/1500000001389184/0%3A0%2C1998%3A1323-828-548-75/c9659.jpg',
    source: 'https://www.lequipe.fr/Tennis/Actualites/Laver-chang-grosjean-ferrer-ces-joueurs-de-petite-taille-qui-sont-alles-tres-haut/1178693',
    credit: "L'Équipe · archivo Roland-Garros · adaptación WebP por DEUCE",
  },
  'Yannick Noah': {
    url: 'https://www.lequipe.fr/_medias/img-photo-jpg/yannick-noah-seul-et-unique-vainqueur-francais-en-grand-chelem-de-l-ere-open-l-equipe/1500000001643739/0%3A0%2C1998%3A1328-828-548-75/29559.jpg',
    source: 'https://www.lequipe.fr/Tennis/Actualites/Votez-pour-le-top-10-des-meilleurs-francais-de-l-histoire-de-l-atp/1333726',
    credit: "L'Équipe · archivo Roland-Garros · adaptación WebP por DEUCE",
  },
  'Roger Federer': {
    url: 'https://media.newyorker.com/photos/596b822bb97d712f094b0e6c/master/pass/Roger-Federer-Wimbledon-Final.jpg',
    source: 'https://www.newyorker.com/sports/sporting-scene/the-general-joy-of-roger-federer-wimbledon-champion-once-again',
    credit: 'The New Yorker · archivo Wimbledon · adaptación WebP por DEUCE',
  },
  'Pete Sampras': {
    url: 'https://d2me2qg8dfiw8u.cloudfront.net/content/uploads/2018/07/04182947/Sampras-1.jpg',
    source: 'https://www.tennis365.com/tennis-news/t365-recall-pete-sampras-wins-his-first-wimbledon-crown-25-years-ago',
    credit: 'Tennis365 · archivo Wimbledon · adaptación WebP por DEUCE',
  },
  'Bjorn Borg': {
    url: 'https://www.80scasualclassics.co.uk/cdn/shop/articles/2JPJ3BG_1e941b27-4379-4a25-889a-0eb090628fd0.jpg?v=1774624211',
    source: 'https://www.80scasualclassics.co.uk/blogs/blog/bjorn-borg-style',
    credit: '80s Casual Classics · archivo editorial · adaptación WebP por DEUCE',
  },
  'Carlos Alcaraz': {
    url: 'https://photo-assets.wimbledon.com/images/pics/large/b_20230712_alcrungal_BB505854-310252_2289.jpg',
    source: 'https://www.wimbledon.com/',
    credit: 'Wimbledon · archivo oficial · adaptación WebP por DEUCE',
  },
  'John McEnroe': {
    url: 'https://i.ebayimg.com/images/g/nCEAAOSw6dNWT3FT/s-l1200.jpg',
    source: 'https://www.ebay.com/itm/195682854407',
    credit: 'SportfolioOnline · fotografía de Jeff Blackman · adaptación WebP por DEUCE',
  },
  'Rod Laver': {
    url: 'https://www.supertennis.tv/media_gallery/fotogallery/3054/190915-Rod-Laver-2.jpg',
    source: 'https://www.supertennis.tv/Media-gallery/Gallery-Categorie-Foto/Protagonisti/190915-Rod-Laver-e-la-Laver-Cup',
    credit: 'SuperTennis · archivo Rod Laver · adaptación WebP por DEUCE',
  },
  'Ivan Lendl': {
    url: 'https://static.livetennis.it/photo/Lendl_3.jpg',
    source: 'https://www.livetennis.it/post/427492/i-sette-numeri-uno-diventati-coach-di-altrettanti-n-1/',
    credit: 'LiveTennis.it · archivo editorial · adaptación WebP por DEUCE',
  },
  'Mats Wilander': {
    url: 'https://www.supertennis.tv/media_gallery/fotogallery/2824/191012-Wilander-9.jpg',
    source: 'https://www.supertennis.tv/Media-gallery/Gallery-Categorie-Foto/Protagonisti/191012-Wilander-carriera',
    credit: 'SuperTennis · archivo Mats Wilander · adaptación WebP por DEUCE',
  },
  'Boris Becker': {
    url: 'https://images.thequint.com/thequint/2015-07/ccfacf9e-31ef-4331-b0db-0d8eb594cc82/boris%20becker.jpg?auto=format%2Ccompress',
    source: 'https://www.thequint.com/neon/social-buzz/a-non-white-album-these-fashionistas-defied-wimbledon-and-how',
    credit: 'The Quint · archivo editorial · adaptación WebP por DEUCE',
  },
  'Jannik Sinner': {
    url: 'https://monesport.cat/app/uploads/sites/12/2024/01/europapress_5721377_jannik_sinner_of_italy_in_action_during_the_mens_singles_final_against-1-scaled.jpg',
    source: 'https://monesport.cat/es/polideportivo/tenis-es/relevo-generacional-tenis-jannik-sinner-open-australia-363261/',
    credit: 'Món Esport · Europa Press · adaptación WebP por DEUCE',
  },
  'Guillermo Vilas': {
    url: 'https://cdn.wearetennis.bnpparibas/media/images/cache/crop/rc/TEZWX0Zx/uploads/article/image/20201105171409000000_vilas.JPG',
    source: 'https://wearetennis.bnpparibas/fr/actualites-tennis/histoire/4050-sauvez-willy',
    credit: 'We Are Tennis · archivo Guillermo Vilas · adaptación WebP por DEUCE',
  },
  'Ken Rosewall': {
    url: 'https://www.supertennis.tv/media_gallery/fotogallery/3127/191228-Rosewall-5.jpg',
    source: 'https://www.supertennis.tv/Media-gallery/Gallery-Categorie-Foto/Protagonisti/191228-Ken-Rosewall-carriera',
    credit: 'SuperTennis · archivo Ken Rosewall · adaptación WebP por DEUCE',
  },
  'Patrick Rafter': {
    url: 'https://assets.tennismajors.com/uploads/2021/07/Patrick-Rafter-Wimbledon-1998-1024x614.jpg',
    source: 'https://www.tennismajors.com/fr/atp-actualite/26-juillet-1999-le-jour-ou-patrick-rafter-est-devenu-numero-1-mondial-2-436052.html',
    credit: 'Tennis Majors · archivo Wimbledon · adaptación WebP por DEUCE',
  },
  'Goran Ivanisevic': {
    url: 'https://www.supertennis.tv/media_gallery/fotogallery/2849/190616-Ivanisevic-7.jpg',
    source: 'https://www.supertennis.tv/Media-gallery/Gallery-Categorie-Foto/Protagonisti/190616-Ivanisevic',
    credit: 'SuperTennis · archivo Wimbledon · adaptación WebP por DEUCE',
  },
  'Albert Costa': {
    url: 'https://medias.lequipe.fr/img-photo-jpg/costa-albert/1500000000809099/43%3A46%2C2000%3A1311-850-550-75/b423f.jpg',
    source: 'https://www.lequipe.fr/Tennis/Diaporama/Les-25-meilleurs-joueurs-de-l-histoire-de-roland-garros/6117',
    credit: "L'Équipe · archivo Roland-Garros · adaptación WebP por DEUCE",
  },
  'Petr Korda': {
    url: 'https://staticg.sportskeeda.com/editor/2021/12/6704c-16406077243380-1920.jpg',
    source: 'https://www.sportskeeda.com/tennis/petr-korda-everything-need-know-abou-former-australian-open-champion',
    credit: 'Sportskeeda · archivo editorial · adaptación WebP por DEUCE',
  },
  'Sergi Bruguera': {
    url: 'https://resources.prod.atpmedia.pulselive.com/photo-resources/2021/11/01/a0faf70d-b06f-4c81-88e6-bae9c800c771/Vqxb8XG1.jpg?height=1080&width=1920',
    source: 'https://www.tennistv.com/players/B350/sergi-bruguera/',
    credit: 'Tennis TV · archivo oficial ATP · recorte horizontal DEUCE',
  },
  'Johan Kriek': {
    url: 'https://johankriektennis.com/wp-content/uploads/2020/12/johans-scrapbook-101.jpg',
    source: 'https://johankriektennis.com/tennis-coaches/johan-kriek/',
    credit: 'Johan Kriek Tennis Academy · recorte horizontal DEUCE',
  },
};

function slug(value) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function plain(value = '') {
  return value.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
}

function normalized(value = '') {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

async function commonsCandidates(name) {
  const displayName = aliases[name] || name;
  const searches = [`\"${displayName}\" tennis`];
  const candidates = new Map();
  for (const search of searches) {
    const url = new URL('https://commons.wikimedia.org/w/api.php');
    Object.entries({
      action: 'query', generator: 'search', gsrsearch: search, gsrnamespace: '6', gsrlimit: '40',
      prop: 'imageinfo', iiprop: 'url|size|mime|extmetadata', iiurlwidth: '2000', format: 'json', origin: '*',
    }).forEach(([key, value]) => url.searchParams.set(key, value));
    let response;
    for (let attempt = 0; attempt < 4; attempt++) {
      response = await fetch(url, { headers: { 'user-agent': 'DEUCE/1.0 (editorial image refresh; deucearchive.com)' } });
      if (response.ok || response.status !== 429) break;
      await new Promise(resolve => setTimeout(resolve, 8_000 * (attempt + 1)));
    }
    if (!response.ok) throw new Error(`Commons ${response.status} for ${name}`);
    const payload = await response.json();
    for (const page of Object.values(payload.query?.pages || {})) {
      const info = page.imageinfo?.[0];
      if (!info || !/^image\/(jpeg|png|webp)$/i.test(info.mime || '')) continue;
      const title = page.title || '';
      const key = info.descriptionurl || info.url;
      candidates.set(key, { title, index: page.index || 99, ...info });
    }
  }
  const tokens = normalized(displayName).split(/\s+/).filter(token => token.length > 2);
  const last = tokens.at(-1) || '';
  return [...candidates.values()].map(candidate => {
    const title = normalized(candidate.title);
    const landscape = candidate.width / candidate.height;
    const nameHits = tokens.filter(token => title.includes(token)).length;
    const negatives = /(stadium|arena|court |trophy|award|autograph|press|conference|museum|statue|stamp|logo|poster|shirt|jersey|doubles|and | vs\.? | with |coach|spectator)/.test(title) ? 1 : 0;
    const action = /(serve|serving|forehand|backhand|play|playing|open|wimbledon|garros|match|tennis)/.test(title) ? 1 : 0;
    const resolution = Math.min(12, Math.log2(Math.max(1, candidate.width * candidate.height / 1_000_000)) * 2.2);
    const landscapeScore = landscape >= 1.28 ? 28 + Math.min(12, (landscape - 1.28) * 15) : -Math.min(24, (1.28 - landscape) * 30);
    const score = nameHits * 17 + (title.includes(last) ? 15 : 0) + action * 7 + landscapeScore + resolution - negatives * 24 - candidate.index * .35;
    return { ...candidate, score, landscape, hasLastName: title.includes(last), groupLike: negatives > 0 };
  }).sort((a, b) => b.score - a.score || b.width * b.height - a.width * a.height);
}

async function renderHorizontal(input, destination, thumbnail) {
  const source = sharp(input).rotate();
  await source.clone().resize(1600, 900, { fit: 'cover', position: sharp.strategy.attention }).webp({ quality: 88, effort: 5 }).toFile(destination);
  await source.clone().resize(640, 360, { fit: 'cover', position: sharp.strategy.attention }).webp({ quality: 82, effort: 5 }).toFile(thumbnail);
}

function localPhoto(name) {
  const candidateNames = [name, aliases[name]].filter(Boolean);
  for (const candidateName of candidateNames) {
    const photo = previousTop50[candidateName] || archiveManifest[candidateName];
    if (photo?.src?.startsWith('/')) return photo;
  }
  return null;
}

async function download(url, name) {
  let response;
  for (let attempt = 0; attempt < 4; attempt++) {
    response = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 DEUCE editorial image refresh' } });
    if (response.ok || response.status !== 429) break;
    await new Promise(resolve => setTimeout(resolve, 8_000 * (attempt + 1)));
  }
  if (!response?.ok) throw new Error(`Image ${response?.status || 'unavailable'} for ${name}`);
  return Buffer.from(await response.arrayBuffer());
}

await mkdir(outputDirectory, { recursive: true });
await mkdir(reviewDirectory, { recursive: true });
const manifest = {};
const report = [];

for (const [position, name] of players.entries()) {
  const id = outputSlugs[name] || slug(name);
  const destination = join(outputDirectory, `${id}.webp`);
  const thumbnail = join(outputDirectory, `${id}-small.webp`);
  let selected;
  let image;
  if (manual[name]) {
    image = await readFile(manual[name].path);
    selected = { descriptionurl: manual[name].source, extmetadata: {}, title: basename(manual[name].path), landscape: 16 / 9 };
  } else if (offline && external[name]) {
    try {
      image = await download(external[name].url, name);
      const dimensions = await sharp(image).metadata();
      selected = { descriptionurl: external[name].source, credit: external[name].credit, extmetadata: {}, title: `${name} external horizontal`, width: dimensions.width, height: dimensions.height, landscape: (dimensions.width || 1) / (dimensions.height || 1) };
    } catch (error) {
      const photo = localPhoto(name);
      if (!photo) throw error;
      image = await readFile(join(root, 'public', photo.src));
      const dimensions = await sharp(image).metadata();
      selected = { descriptionurl: photo.source, credit: photo.credit, licenseUrl: photo.licenseUrl, extmetadata: {}, title: `${name} local fallback`, width: dimensions.width, height: dimensions.height, landscape: (dimensions.width || 1) / (dimensions.height || 1) };
    }
  } else if (offline) {
    const photo = localPhoto(name);
    if (!photo) throw new Error(`No local source for ${name}`);
    image = await readFile(join(root, 'public', photo.src));
    const dimensions = await sharp(image).metadata();
    selected = { descriptionurl: photo.source, credit: photo.credit, licenseUrl: photo.licenseUrl, extmetadata: {}, title: `${name} local archive source`, width: dimensions.width, height: dimensions.height, landscape: (dimensions.width || 1) / (dimensions.height || 1) };
  } else {
    const candidates = await commonsCandidates(name);
    const named = candidates.filter(candidate => candidate.hasLastName);
    selected = named.find(candidate => !candidate.groupLike && candidate.landscape >= 1.28 && candidate.width >= 1200)
      || named.find(candidate => candidate.landscape >= 1.28 && candidate.width >= 1200)
      || named.find(candidate => !candidate.groupLike && candidate.width >= 900)
      || named[0];
    if (!selected) throw new Error(`No image candidate for ${name}`);
    image = await download(selected.thumburl || selected.url, name);
  }
  await renderHorizontal(image, destination, thumbnail);
  const metadata = selected.extmetadata || {};
  const author = plain(metadata.Artist?.value) || 'Wikimedia Commons';
  const license = plain(metadata.LicenseShortName?.value) || 'fuente registrada';
  manifest[name] = {
    src: `/images/players/top50-horizontal/${id}.webp`,
    thumbnail: `/images/players/top50-horizontal/${id}-small.webp`,
    alt: `${name} en una imagen horizontal de tenis`,
    credit: manual[name]?.credit || selected.credit || `${author} · ${license} · recorte horizontal DEUCE`,
    source: selected.descriptionurl,
    ...(metadata.LicenseUrl?.value || selected.licenseUrl ? { licenseUrl: metadata.LicenseUrl?.value || selected.licenseUrl } : {}),
    width: 1600,
    height: 900,
    objectPosition: subjectFocus[name] || '50% 50%',
    mobileObjectPosition: subjectFocus[name] || '50% 50%',
  };
  report.push({ position: position + 1, name, source: selected.descriptionurl, original: `${selected.width || '?'}x${selected.height || '?'}`, landscape: Number(selected.landscape?.toFixed(2) || 0) });
  console.log(`${String(position + 1).padStart(2, '0')}/50 ${name} · ${report.at(-1).original} · ${selected.title}`);
  await new Promise(resolve => setTimeout(resolve, 650));
}

await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
await writeFile(join(reviewDirectory, 'player-photo-top50-horizontal.json'), `${JSON.stringify(report, null, 2)}\n`);

const tiles = await Promise.all(players.map(async name => {
  const id = outputSlugs[name] || slug(name);
  const image = await sharp(join(outputDirectory, `${id}-small.webp`)).resize(320, 180, { fit: 'cover' }).toBuffer();
  return { input: image, top: Math.floor(players.indexOf(name) / 5) * 218, left: (players.indexOf(name) % 5) * 320 };
}));
const labels = players.map((name, index) => ({ input: Buffer.from(`<svg width="320" height="38" xmlns="http://www.w3.org/2000/svg"><rect width="320" height="38" fill="#06261d"/><text x="12" y="25" fill="white" font-family="Arial" font-size="15">${index + 1}. ${name.replace(/&/g, '&amp;')}</text></svg>`), top: Math.floor(index / 5) * 218 + 180, left: (index % 5) * 320 }));
await sharp({ create: { width: 1600, height: 2180, channels: 3, background: '#06261d' } }).composite([...tiles, ...labels]).jpeg({ quality: 88 }).toFile(join(reviewDirectory, 'player-photo-top50-horizontal-contact.jpg'));
