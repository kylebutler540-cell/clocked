#!/usr/bin/env node
/**
 * One-off script: fix "Test Company" and "Test Co" posts
 * Run with: node scripts/fix-test-company.js
 */

const prisma = require('../src/lib/prisma');

async function main() {
  // Fix "Test Company" post — remap to real Walmart Supercenter on 28th St
  const fixedTestCompany = await prisma.post.updateMany({
    where: {
      employer_place_id: 'ChIJgUYJpuBNGIgR8PGiUfuZkEs',
      employer_name: { not: 'Walmart Supercenter' },
    },
    data: {
      employer_name: 'Walmart Supercenter',
      employer_address: '5859 28th St SE, Grand Rapids, MI 49546, USA',
    },
  });
  console.log(`Fixed ${fixedTestCompany.count} "Test Company" post(s) → Walmart Supercenter`);

  // Delete "Test Co" junk posts (fake place ID "test123")
  const deletedTest = await prisma.post.deleteMany({
    where: { employer_place_id: 'test123' },
  });
  console.log(`Deleted ${deletedTest.count} "Test Co" post(s) with fake place ID`);

  // Clear any cached logo entries for these IDs so they re-resolve cleanly
  await prisma.employerLogo.deleteMany({
    where: { place_id: { in: ['test123'] } },
  });
  console.log('Cleared logo cache for fake place IDs');

  // Verify final state
  const remaining = await prisma.post.groupBy({
    by: ['employer_place_id', 'employer_name'],
    _count: { id: true },
  });
  console.log('\nFinal post distribution:');
  for (const r of remaining) {
    console.log(`  ${r._count.id} posts | ${r.employer_place_id} | ${r.employer_name}`);
  }
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
