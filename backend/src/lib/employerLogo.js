const axios = require('axios');
const prisma = require('./prisma');

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const GOOGLE_PLACES_BASE = 'https://maps.googleapis.com/maps/api/place';

const inFlight = new Map();

function isFresh(date) {
  if (!date) return false;
  return Date.now() - new Date(date).getTime() < THIRTY_DAYS_MS;
}

function clearbitUrl(domain) {
  return `https://www.google.com/s2/favicons?sz=64&domain=${domain}`;
}

function domainFromWebsite(website) {
  if (!website) return null;
  try {
    const url = new URL(website);
    return url.hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

async function fetchWebsiteFromGoogle(placeId) {
  const response = await axios.get(`${GOOGLE_PLACES_BASE}/details/json`, {
    params: {
      place_id: placeId,
      fields: 'website',
      key: process.env.GOOGLE_MAPS_API_KEY,
    },
    timeout: 8000,
  });
  if (response.data.status !== 'OK') return { website: null };
  return { website: response.data?.result?.website || null };
}

/**
 * Best-effort og:image / twitter:image / apple-touch-icon from employer website HTML.
 */
async function extractOgImage(websiteUrl) {
  try {
    const r = await axios.get(websiteUrl, {
      timeout: 10000,
      maxRedirects: 5,
      maxContentLength: 450000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Clocked/1.0; +https://theclocked.com)',
        Accept: 'text/html,application/xhtml+xml',
      },
      validateStatus: s => s >= 200 && s < 400,
    });
    const html = typeof r.data === 'string' ? r.data : '';
    let m =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    if (!m) {
      m =
        html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i) ||
        html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i);
    }
    if (!m) {
      m = html.match(/<link[^>]+rel=["']apple-touch-icon["'][^>]+href=["']([^"']+)["']/i);
    }
    if (!m) return null;
    const raw = m[1].trim();
    if (!raw) return null;
    return new URL(raw, websiteUrl).href;
  } catch {
    return null;
  }
}

function formatRow(row) {
  return {
    placeId: row.place_id,
    domain: row.domain,
    logoUrl: row.logo_url,
    logoLastUpdated: row.logo_last_updated,
    source: row.source,
  };
}

async function resolveLogoFromExternal(placeId) {
  const { website } = await fetchWebsiteFromGoogle(placeId);
  const domain = domainFromWebsite(website);

  if (domain) {
    return {
      logo_url: clearbitUrl(domain),
      domain,
      source: 'clearbit',
    };
  }

  if (website) {
    const og = await extractOgImage(website);
    if (og) {
      return { logo_url: og, domain: null, source: 'og' };
    }
  }

  return { logo_url: null, domain, source: 'none' };
}

async function persistResolved(placeId, resolved) {
  await prisma.employerLogo.upsert({
    where: { place_id: placeId },
    create: {
      place_id: placeId,
      domain: resolved.domain,
      logo_url: resolved.logo_url,
      logo_last_updated: new Date(),
      source: resolved.source,
    },
    update: {
      domain: resolved.domain,
      logo_url: resolved.logo_url,
      logo_last_updated: new Date(),
      source: resolved.source,
    },
  });
}

async function doResolve(placeId, previousRow) {
  try {
    const resolved = await resolveLogoFromExternal(placeId);
    await persistResolved(placeId, resolved);
    return formatRow({
      place_id: placeId,
      domain: resolved.domain,
      logo_url: resolved.logo_url,
      logo_last_updated: new Date(),
      source: resolved.source,
    });
  } catch (err) {
    console.error('employer logo resolve failed', placeId, err.message);
    if (previousRow) {
      return formatRow(previousRow);
    }
    return {
      placeId,
      domain: null,
      logoUrl: null,
      logoLastUpdated: null,
      source: null,
    };
  }
}

/**
 * Returns cached logo when fresh; otherwise resolves (Google Places → Clearbit → og:image) and persists.
 */
async function getOrResolveLogo(placeId) {
  if (!placeId) {
    return { placeId: null, domain: null, logoUrl: null, logoLastUpdated: null, source: null };
  }

  const row = await prisma.employerLogo.findUnique({ where: { place_id: placeId } });
  if (row && isFresh(row.logo_last_updated)) {
    return formatRow(row);
  }

  if (inFlight.has(placeId)) {
    return inFlight.get(placeId);
  }

  const p = doResolve(placeId, row).finally(() => {
    inFlight.delete(placeId);
  });
  inFlight.set(placeId, p);
  return p;
}

/**
 * Batch: up to `max` concurrent resolves. Same semantics as getOrResolveLogo per id.
 */
async function getOrResolveLogosBatch(placeIds, maxConcurrent = 4) {
  const unique = [...new Set(placeIds.filter(Boolean))];
  const out = {};
  let i = 0;

  async function worker() {
    while (i < unique.length) {
      const idx = i;
      i += 1;
      const id = unique[idx];
      out[id] = await getOrResolveLogo(id);
    }
  }

  const workers = Array.from({ length: Math.min(maxConcurrent, unique.length) }, () => worker());
  await Promise.all(workers);
  return out;
}

async function invalidateLogo(placeId) {
  await prisma.employerLogo.updateMany({
    where: { place_id: placeId },
    data: {
      logo_url: null,
      logo_last_updated: new Date(0),
    },
  });
}

module.exports = {
  getOrResolveLogo,
  getOrResolveLogosBatch,
  invalidateLogo,
  isFresh,
  THIRTY_DAYS_MS,
};
