const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();

const GRAND_RAPIDS_EMPLOYERS = [
  {
    place_id: 'ChIJseed0001GrandRapids',
    name: 'Meijer Distribution Center',
    address: '2929 Walker Ave NW, Grand Rapids, MI 49544',
  },
  {
    place_id: 'ChIJseed0002GrandRapids',
    name: 'Spectrum Health / Corewell Health',
    address: '100 Michigan St NE, Grand Rapids, MI 49503',
  },
  {
    place_id: 'ChIJseed0003GrandRapids',
    name: 'Amway Grand Plaza Hotel',
    address: '187 Monroe Ave NW, Grand Rapids, MI 49503',
  },
  {
    place_id: 'ChIJseed0004GrandRapids',
    name: 'Gordon Food Service',
    address: '1300 Gezon Pkwy SW, Wyoming, MI 49509',
  },
  {
    place_id: 'ChIJseed0005GrandRapids',
    name: 'Lacks Enterprises',
    address: '5460 Cascade Rd SE, Grand Rapids, MI 49546',
  },
  {
    place_id: 'ChIJseed0006GrandRapids',
    name: "McDonald's Grand Rapids",
    address: '555 28th St SE, Grand Rapids, MI 49548',
  },
  {
    place_id: 'ChIJseed0007GrandRapids',
    name: 'SpartanNash Distribution',
    address: '850 76th St SW, Byron Center, MI 49315',
  },
  {
    place_id: 'ChIJseed0008GrandRapids',
    name: 'Gentex Corporation',
    address: '600 N Centennial St, Zeeland, MI 49464',
  },
  {
    place_id: 'ChIJseed0009GrandRapids',
    name: 'Amazon Fulfillment Center GRR1',
    address: '5050 Baumhower Ave, Gaines Charter Township, MI 49548',
  },
  {
    place_id: 'ChIJseed0010GrandRapids',
    name: 'Frederik Meijer Gardens & Sculpture Park',
    address: '1000 E Beltline Ave NE, Grand Rapids, MI 49525',
  },
];

const SEED_POSTS = [
  {
    employer_index: 0,
    rating: 'BAD',
    header: 'Warehouse burns you out fast',
    body: `The pace at the Meijer DC is brutal. They track every single second of your productivity and if you fall below rate they write you up immediately. I worked there for 8 months and my knees were already shot. Management talks down to you constantly and HR does absolutely nothing when you report issues. The pay starts around $17/hr which sounds decent until you realize you're running 15+ miles a day in a refrigerated warehouse. They also cut hours randomly with no notice. On the plus side, benefits kick in after 90 days and aren't terrible. But the turnover is insane — my entire team flipped twice in one year.`,
  },
  {
    employer_index: 1,
    rating: 'NEUTRAL',
    header: 'Big hospital system — has its ups and downs',
    body: `Corewell/Spectrum is a massive system so your experience depends entirely on which department you land in. As a CNA on the floor, short staffing is a constant problem. You're always covering for someone. Pay is around $18-21/hr depending on shift differential, which is below what you'd get in Detroit. The mission feels real though — most nurses and docs genuinely care. PTO is decent and there are tons of internal transfer opportunities. Just don't expect to feel valued most days. The cafeteria discount is a nice perk though.`,
  },
  {
    employer_index: 2,
    rating: 'NEUTRAL',
    header: 'Tourist-season hell, off-season is chill',
    body: `Working banquets at the Amway Grand is a tale of two seasons. Summer and convention season you're slammed — 12-hour shifts on your feet, guests who treat you like furniture, and management who schedules you without asking. But January through March? Easiest job I've had. Tips can be great for private events, terrible for corporate stuff where they pre-pay gratuity and pocket it. Pay hovers around $15/hr + tips. The building is beautiful and there's a certain pride in working there. Union protections helped when a manager tried to schedule me past my contracted hours.`,
  },
  {
    employer_index: 3,
    rating: 'GOOD',
    header: 'Best warehouse job I\'ve had in GR',
    body: `GFS treats their drivers and warehouse workers way better than Amazon or the other DCs in the area. Starting pay was $19/hr and I got a raise after 6 months. They actually give you enough time to complete tasks without running you ragged. Safety culture is real — my supervisor stopped production twice for equipment issues rather than pushing through. The route drivers make solid money, $24-28/hr with overtime. 401k match is solid. The food perks are great too — you can buy discounted product. Communication from leadership actually happens. I've been here 3 years and I'm not looking to leave.`,
  },
  {
    employer_index: 4,
    rating: 'BAD',
    header: 'Plastic fumes and zero respect',
    body: `Lacks runs an injection molding operation and the fumes are no joke. I asked about air quality testing results and was told that information isn't available to floor workers. That alone should tell you everything. Temps get hired through agencies at $14/hr with the promise of going permanent — that conversion takes 12+ months if it ever happens. Management is clique-based; if you're not already connected you're disposable. Mandatory overtime with less than 24 hours notice is standard. I watched a coworker get disciplined for leaving to pick up his kid from the ER. Get in, save money, get out.`,
  },
  {
    employer_index: 5,
    rating: 'BAD',
    header: 'Classic fast food chaos — avoid the 28th St location',
    body: `This specific McDonald's location is understaffed every single shift. I was a crew lead getting paid $13.50/hr and routinely managing the whole front end by myself during lunch rush. District manager shows up once a month acting surprised at the chaos. You'll spend your own money on uniform pieces they never replace. The schedule changes constantly and they'll cut your hours if they don't like you. I once worked a double because nobody else showed up and received zero recognition or extra pay beyond the regular rate. Left after 5 months for a warehouse job.`,
  },
  {
    employer_index: 6,
    rating: 'NEUTRAL',
    header: 'Solid union environment, but production pressure is real',
    body: `SpartanNash is a union shop which makes a huge difference. Grievance process works, your seniority matters, and they can't just fire you for nonsense. Pay starts at $18.50/hr and tops out around $24 with seniority. The work itself is physically demanding — order selection means hours with a pallet jack. Cold side (dairy/frozen) pays a differential which helps. Night shift isn't for everyone but the differential plus less management presence makes it worth it for a lot of people. Benefits through the union are actually good. Downside: the facility is aging and equipment breaks constantly.`,
  },
  {
    employer_index: 7,
    rating: 'GOOD',
    header: 'Gentex is the real deal for manufacturing',
    body: `I've worked manufacturing in West Michigan for 15 years and Gentex is hands down the best company culture I've experienced. Pay is competitive — I started at $20/hr on assembly and am now at $26 after 4 years. They genuinely invest in employees. On-site fitness center, quarterly bonuses tied to company performance, and tuition reimbursement that people actually use. The work is clean and precise — auto-dimming mirrors and camera systems. Management is visible and approachable. They promote from within constantly. Only complaint: parking is a nightmare at shift change and the drive to Zeeland from GR isn't fun in winter.`,
  },
  {
    employer_index: 8,
    rating: 'BAD',
    header: 'Amazon rates are designed to fail you',
    body: `The rate system at the GRR1 FC is impossible to sustain. They calculate your expected rate based on "peak performance" data which means you're always being measured against the fastest days. When you raise a safety concern about walking pace on wet floors, it gets ignored. I strained my back in month 3 and was told to fill out a form and keep working. The pay is $18/hr which is about $2 above what nearby places offer but you earn every penny and then some. VTO gets posted at 3am. UPT disappears fast if you have any life emergencies. Turnover is so high they burned through my whole starting cohort in 8 months.`,
  },
  {
    employer_index: 9,
    rating: 'GOOD',
    header: 'Unexpected gem — they actually treat staff well',
    body: `Frederik Meijer Gardens is genuinely a pleasant place to work. I'm a seasonal horticulture tech making $16/hr. The culture is community-focused and management communicates well. You're surrounded by beautiful art and plants all day which makes a difference mentally. Benefits are limited for seasonal but full-time staff get a solid package. The Dorothy A. Johnson Amphitheater shows mean summer weekends are hectic but the energy is fun. Great place if you're into nature, arts, or non-profit environments. They hired several seasonal staff to full-time last year including a couple people from my cohort.`,
  },
];

async function main() {
  console.log('Seeding database with Grand Rapids employer reviews...');

  // Create 10 anonymous users
  const users = await Promise.all(
    Array.from({ length: 10 }, () =>
      prisma.user.create({ data: { anonymous_id: uuidv4() } })
    )
  );

  // Create posts
  for (let i = 0; i < SEED_POSTS.length; i++) {
    const seedPost = SEED_POSTS[i];
    const employer = GRAND_RAPIDS_EMPLOYERS[seedPost.employer_index];
    const user = users[i];

    await prisma.post.create({
      data: {
        anonymous_user_id: user.id,
        employer_place_id: employer.place_id,
        employer_name: employer.name,
        employer_address: employer.address,
        rating_emoji: seedPost.rating,
        header: seedPost.header,
        body: seedPost.body,
        media_urls: [],
        likes: Math.floor(Math.random() * 45),
        dislikes: Math.floor(Math.random() * 8),
        created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      },
    });

    console.log(`  ✓ Seeded post: "${seedPost.header}" @ ${employer.name}`);
  }

  console.log(`\nDone! Seeded ${SEED_POSTS.length} posts across ${GRAND_RAPIDS_EMPLOYERS.length} Grand Rapids employers.`);
}

main()
  .catch(err => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
