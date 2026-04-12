const { Resend } = require('resend');

async function sendReportEmail({ reporterHandle, reason, postId, postEmployer, postBody, timestamp }) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[mailer] RESEND_API_KEY not set — skipping email');
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const postUrl = `https://frontend-production-d4bd.up.railway.app/post/${postId}`;
  const ts = (timestamp || new Date()).toLocaleString('en-US', { timeZone: 'America/Detroit', hour12: true });

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#A855F7;margin-bottom:4px">🚩 New Post Report</h2>
      <p style="color:#888;font-size:13px;margin-top:0">${ts} ET</p>
      <table style="width:100%;border-collapse:collapse;margin-top:16px">
        <tr>
          <td style="padding:10px 12px;background:#f9f9f9;border:1px solid #eee;font-weight:600;width:140px">Reporter</td>
          <td style="padding:10px 12px;border:1px solid #eee">${escapeHtml(reporterHandle)}</td>
        </tr>
        <tr>
          <td style="padding:10px 12px;background:#f9f9f9;border:1px solid #eee;font-weight:600">Reason</td>
          <td style="padding:10px 12px;border:1px solid #eee">${escapeHtml(reason)}</td>
        </tr>
        <tr>
          <td style="padding:10px 12px;background:#f9f9f9;border:1px solid #eee;font-weight:600">Employer</td>
          <td style="padding:10px 12px;border:1px solid #eee">${escapeHtml(postEmployer || '—')}</td>
        </tr>
        <tr>
          <td style="padding:10px 12px;background:#f9f9f9;border:1px solid #eee;font-weight:600">Post Preview</td>
          <td style="padding:10px 12px;border:1px solid #eee;color:#555">${escapeHtml((postBody || '').slice(0, 200))}${(postBody || '').length > 200 ? '…' : ''}</td>
        </tr>
        <tr>
          <td style="padding:10px 12px;background:#f9f9f9;border:1px solid #eee;font-weight:600">Post Link</td>
          <td style="padding:10px 12px;border:1px solid #eee">
            <a href="${postUrl}" style="color:#A855F7;font-weight:600">${postUrl}</a>
          </td>
        </tr>
      </table>
      <div style="margin-top:24px">
        <a href="${postUrl}" style="background:#A855F7;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
          View Reported Post →
        </a>
      </div>
    </div>
  `;

  const { data, error } = await resend.emails.send({
    from: 'Clocked Reports <reports@theclocked.com>',
    to: 'kylebutler540@gmail.com',
    subject: `🚩 Report: ${reason} — ${postEmployer || postId}`,
    html,
  });

  if (error) {
    console.error('[mailer] Resend error:', error);
    throw error;
  }

  console.log('[mailer] email sent, id:', data?.id);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

module.exports = { sendReportEmail };
