const https = require('https');

async function sendTelegramReport({ reporterHandle, reason, postId, postEmployer, postBody }) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const adminSecret = process.env.ADMIN_DELETE_SECRET;
  if (!token || !chatId) {
    console.warn('[telegram] TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set');
    return;
  }

  const postUrl = `https://frontend-production-d4bd.up.railway.app/post/${postId}`;
  const deleteUrl = `https://backend-production-7798f.up.railway.app/api/posts/${postId}/admin-delete?secret=${adminSecret}`;
  const preview = (postBody || '').slice(0, 150) + ((postBody || '').length > 150 ? '…' : '');

  const text = [
    `🚩 *New Report*`,
    ``,
    `*Employer:* ${escape(postEmployer || '—')}`,
    `*Reporter:* ${escape(reporterHandle)}`,
    `*Reason:* ${escape(reason)}`,
    `*Preview:* ${escape(preview)}`,
  ].join('\n');

  const body = JSON.stringify({
    chat_id: chatId,
    text,
    parse_mode: 'Markdown',
    disable_web_page_preview: true,
    reply_markup: {
      inline_keyboard: [[
        { text: '👁 View Post', url: postUrl },
        { text: '🗑 Delete Post', url: deleteUrl },
      ]],
    },
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.telegram.org',
      path: `/bot${token}/sendMessage`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        const json = JSON.parse(data);
        if (!json.ok) { console.error('[telegram] error:', json.description); reject(new Error(json.description)); }
        else { console.log('[telegram] report notification sent'); resolve(); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function escape(str) {
  return String(str || '').replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
}

module.exports = { sendTelegramReport };
