// Helper: create a notification silently (non-fatal)
const prisma = require('./prisma');

async function notify({ userId, type, message, data }) {
  if (!userId) return;
  try {
    await prisma.notification.create({
      data: { user_id: userId, type, message, data: data || {} },
    });
  } catch (e) { /* non-fatal */ }
}

module.exports = { notify };
