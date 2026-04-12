const prisma = require('../src/lib/prisma');
const https = require('https');

const API_KEY = 'AIzaSyDVTt1iv8oqd9ziIMyqs_jCo6et5iucc2s';

async function geocode(address) {
  return new Promise((resolve) => {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${API_KEY}`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const loc = json.results?.[0]?.geometry?.location;
          resolve(loc ? { lat: loc.lat, lng: loc.lng } : null);
        } catch { resolve(null); }
      });
    }).on('error', () => resolve(null));
  });
}

async function main() {
  const posts = await prisma.post.findMany({
    where: { employer_lat: null },
    select: { id: true, employer_address: true },
  });
  console.log(`Backfilling ${posts.length} posts...`);
  for (const post of posts) {
    const coords = await geocode(post.employer_address);
    if (coords) {
      await prisma.post.update({ where: { id: post.id }, data: { employer_lat: coords.lat, employer_lng: coords.lng } });
      console.log(`  ✓ ${post.id} → ${coords.lat}, ${coords.lng}`);
    }
    await new Promise(r => setTimeout(r, 100)); // rate limit
  }
  console.log('Done');
  await prisma.$disconnect();
}

main().catch(console.error);
