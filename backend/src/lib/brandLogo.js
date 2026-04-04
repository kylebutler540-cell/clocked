/**
 * brandLogo.js
 *
 * Resolves the official brand domain for any business name variation,
 * then returns a logo URL using Google's favicon service.
 *
 * Priority:
 *  1. Hardcoded brand map (fastest, most accurate)
 *  2. Name normalization heuristic (strips suffixes, cleans up)
 *  3. Google Places website lookup (if placeId provided)
 *  4. Fallback: null (show placeholder)
 */

const axios = require('axios');
const prisma = require('./prisma');

// ─── Brand Map ────────────────────────────────────────────────────────────────
// Maps lowercase name patterns to official domain.
// Keys are matched as substring or full match (case-insensitive).
const BRAND_MAP = [
  // Retail / Grocery
  { match: /\bamazon\b/,            domain: 'amazon.com' },
  { match: /\bwhole foods\b/,       domain: 'wholefoodsmarket.com' },
  { match: /\bwholefood/,           domain: 'wholefoodsmarket.com' },
  { match: /\bwalmart\b/,           domain: 'walmart.com' },
  { match: /\bsam['']?s club\b/,    domain: 'samsclub.com' },
  { match: /\btarget\b/,            domain: 'target.com' },
  { match: /\bcostco\b/,            domain: 'costco.com' },
  { match: /\bmeijer\b/,            domain: 'meijer.com' },
  { match: /\bkroger\b/,            domain: 'kroger.com' },
  { match: /\baldi\b/,              domain: 'aldi.us' },
  { match: /\blowes?\b/,            domain: 'lowes.com' },
  { match: /\bhome depot\b/,        domain: 'homedepot.com' },
  { match: /\bmenards\b/,           domain: 'menards.com' },
  { match: /\bdollar general\b/,    domain: 'dollargeneral.com' },
  { match: /\bdollar tree\b/,       domain: 'dollartree.com' },
  { match: /\bfive below\b/,        domain: 'fivebelow.com' },
  { match: /\bbig lots\b/,          domain: 'biglots.com' },
  { match: /\btjmaxx\b|tj maxx\b/,  domain: 'tjmaxx.com' },
  { match: /\bmarshalls\b/,         domain: 'marshalls.com' },
  { match: /\bold navy\b/,          domain: 'oldnavy.com' },
  { match: /\bgap\b/,               domain: 'gap.com' },
  { match: /\bauto ?zone\b/,        domain: 'autozone.com' },
  { match: /\bo['']?reilly\b/,      domain: 'oreillyauto.com' },
  { match: /\badvance auto\b/,      domain: 'advanceautoparts.com' },
  { match: /\bnapa auto\b/,         domain: 'napaonline.com' },
  { match: /\bcvs\b/,               domain: 'cvs.com' },
  { match: /\bwalgreen\b/,          domain: 'walgreens.com' },
  { match: /\brite aid\b/,          domain: 'riteaid.com' },
  // Food / QSR
  { match: /\bmcdonald['']?s\b/,    domain: 'mcdonalds.com' },
  { match: /\bburger king\b/,       domain: 'bk.com' },
  { match: /\bwendy['']?s\b/,       domain: 'wendys.com' },
  { match: /\btaco bell\b/,         domain: 'tacobell.com' },
  { match: /\bchick.fil.a\b/,       domain: 'chick-fil-a.com' },
  { match: /\bculver['']?s\b/,      domain: 'culvers.com' },
  { match: /\bfive guys\b/,         domain: 'fiveguys.com' },
  { match: /\bchipotle\b/,          domain: 'chipotle.com' },
  { match: /\bpanera\b/,            domain: 'panerabread.com' },
  { match: /\bsubway\b/,            domain: 'subway.com' },
  { match: /\bjersey mike['']?s\b/,  domain: 'jerseymikes.com' },
  { match: /\bdomino['']?s\b/,      domain: 'dominos.com' },
  { match: /\bpizza hut\b/,         domain: 'pizzahut.com' },
  { match: /\bpapa john['']?s\b/,   domain: 'papajohns.com' },
  { match: /\blittle caesars\b/,    domain: 'littlecaesars.com' },
  { match: /\bbuffalo wild wings\b/,domain: 'buffalowildwings.com' },
  { match: /\bapplebee['']?s\b/,    domain: 'applebees.com' },
  { match: /\bdenny['']?s\b/,       domain: 'dennys.com' },
  { match: /\boldgarden\b|old garden\b/, domain: 'olivegarden.com' },
  { match: /\bolive garden\b/,      domain: 'olivegarden.com' },
  { match: /\bstarbucks\b/,         domain: 'starbucks.com' },
  { match: /\bdunkin\b/,            domain: 'dunkindonuts.com' },
  { match: /\btim horton\b/,        domain: 'timhortons.com' },
  { match: /\bsonic\b.*drive.in\b|\bsonic drive\b/, domain: 'sonicdrivein.com' },
  { match: /\bdairy queen\b/,       domain: 'dairyqueen.com' },
  { match: /\bbaskin.robbins\b/,    domain: 'baskinrobbins.com' },
  { match: /\bcold stone\b/,        domain: 'coldstonecreamery.com' },
  // Services / HVAC / Trade
  { match: /\bservice professor\b/, domain: 'serviceprofessor.com' },
  { match: /\bOne Hour Air\b/i,     domain: 'onehourhvac.com' },
  { match: /\bmr\. rooter\b|mr rooter\b/, domain: 'mrrooter.com' },
  { match: /\bbenjamin franklin\b/, domain: 'benjaminfranklinplumbing.com' },
  // Logistics / Warehouse
  { match: /\bups\b/,               domain: 'ups.com' },
  { match: /\bfedex\b/,             domain: 'fedex.com' },
  { match: /\busps\b|united states postal\b/, domain: 'usps.com' },
  { match: /\bdhl\b/,               domain: 'dhl.com' },
  { match: /\bxpo\b/,               domain: 'xpo.com' },
  // Tech / Office
  { match: /\bbestbuy\b|best buy\b/,domain: 'bestbuy.com' },
  { match: /\bapple store\b|\bapple inc\b/, domain: 'apple.com' },
  { match: /\bmicrosoft\b/,         domain: 'microsoft.com' },
  { match: /\bgoogle\b/,            domain: 'google.com' },
  { match: /\bmetaplatforms\b|meta platforms\b/, domain: 'meta.com' },
  // Healthcare
  { match: /\bspectrum health\b/,   domain: 'spectrumhealth.org' },
  { match: /\bmercyhealth\b|mercy health\b/, domain: 'mercyhealth.com' },
  { match: /\bsparrow\b/,           domain: 'sparrow.org' },
  { match: /\bcvs health\b/,        domain: 'cvshealth.com' },
  // Banks / Finance
  { match: /\bchase\b/,             domain: 'chase.com' },
  { match: /\bbank of america\b/,   domain: 'bankofamerica.com' },
  { match: /\bwells fargo\b/,       domain: 'wellsfargo.com' },
  { match: /\bfifth third\b/,       domain: '53.com' },
  { match: /\bhuntington\b/,        domain: 'huntington.com' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function logoUrlFromDomain(domain) {
  return `https://www.google.com/s2/favicons?sz=64&domain=${domain}`;
}

/**
 * Strip common non-brand words and normalize the name.
 * e.g. "Walmart Supercenter #1234" → "walmart"
 */
function normalizeName(name) {
  return name
    .toLowerCase()
    .replace(/#\d+/g, '')                         // store numbers
    .replace(/\b(supercenter|distribution center|distribution|warehouse|center|store|stores|location|inc|llc|ltd|corp|co|company|restaurant|cafe|grill|bar|club|north|south|east|west|downtown|plaza|mall)\b/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Try to match a business name against the brand map.
 * Returns domain string or null.
 */
function matchBrandMap(name) {
  const lower = name.toLowerCase();
  for (const entry of BRAND_MAP) {
    if (entry.match.test(lower)) return entry.domain;
  }
  return null;
}

/**
 * Heuristic domain guess from normalized name.
 * e.g. "jersey mikes subs" → "jerseymikes.com"
 */
function guessDomain(name) {
  const normalized = normalizeName(name).replace(/\s+/g, '');
  if (!normalized || normalized.length < 3) return null;
  return `${normalized}.com`;
}

/**
 * Fetch official website from Google Places API.
 */
async function fetchDomainFromPlaces(placeId) {
  if (!placeId || !process.env.GOOGLE_MAPS_API_KEY) return null;
  try {
    const res = await axios.get('https://maps.googleapis.com/maps/api/place/details/json', {
      params: {
        place_id: placeId,
        fields: 'website',
        key: process.env.GOOGLE_MAPS_API_KEY,
      },
      timeout: 6000,
    });
    const website = res.data?.result?.website;
    if (!website) return null;
    const url = new URL(website);
    return url.hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

// ─── Main resolver ────────────────────────────────────────────────────────────

/**
 * Resolve the best logo URL for a business.
 * Uses DB cache first, then resolves fresh if needed.
 *
 * @param {string} name - Business display name
 * @param {string|null} placeId - Google Places ID (optional)
 * @returns {string|null} - Logo URL or null
 */
async function getLogoUrl(name, placeId) {
  if (!name) return null;

  // 1. Check DB cache first
  if (placeId) {
    const cached = await prisma.employerLogo.findUnique({ where: { place_id: placeId } });
    if (cached?.logo_url && cached.logo_url.includes('google.com/s2/favicons')) {
      // Already a valid Google favicon URL — return it
      return cached.logo_url;
    }
  }

  // 2. Try brand map (most reliable)
  const brandDomain = matchBrandMap(name);
  if (brandDomain) {
    const url = logoUrlFromDomain(brandDomain);
    await cacheLogo(placeId, brandDomain, url, 'brand_map');
    return url;
  }

  // 3. Try Google Places for official website
  if (placeId) {
    const placesDomain = await fetchDomainFromPlaces(placeId);
    if (placesDomain) {
      const url = logoUrlFromDomain(placesDomain);
      await cacheLogo(placeId, placesDomain, url, 'places');
      return url;
    }
  }

  // 4. Heuristic domain guess
  const guessedDomain = guessDomain(name);
  if (guessedDomain) {
    const url = logoUrlFromDomain(guessedDomain);
    await cacheLogo(placeId, guessedDomain, url, 'heuristic');
    return url;
  }

  return null;
}

async function cacheLogo(placeId, domain, logoUrl, source) {
  if (!placeId) return;
  try {
    await prisma.employerLogo.upsert({
      where: { place_id: placeId },
      create: { place_id: placeId, domain, logo_url: logoUrl, logo_last_updated: new Date(), source },
      update: { domain, logo_url: logoUrl, logo_last_updated: new Date(), source },
    });
  } catch { /* non-fatal */ }
}

/**
 * Batch resolve logos for multiple posts.
 * Returns a map of placeId → logoUrl.
 */
async function batchGetLogoUrls(posts) {
  const results = {};
  await Promise.all(
    posts.map(async post => {
      const url = await getLogoUrl(post.employer_name, post.employer_place_id);
      results[post.employer_place_id || post.employer_name] = url;
    })
  );
  return results;
}

module.exports = { getLogoUrl, batchGetLogoUrls, logoUrlFromDomain, matchBrandMap };
