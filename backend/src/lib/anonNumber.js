const prisma = require('./prisma');

async function generateUniqueAnonNumber() {
  for (let i = 0; i < 30; i++) {
    const num = Math.floor(Math.random() * 9000) + 1000;
    const existing = await prisma.user.findUnique({ where: { anon_number: num } });
    if (!existing) return num;
  }
  // If we exhausted the 4-digit range somehow, use 5-digit
  return Math.floor(Math.random() * 90000) + 10000;
}

module.exports = { generateUniqueAnonNumber };
