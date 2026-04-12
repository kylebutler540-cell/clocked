const nodemailer = require('nodemailer');

function getTransporter() {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.REPORT_EMAIL_USER,
      pass: process.env.REPORT_EMAIL_PASS,
    },
  });
}

/**
 * Send a report notification email.
 * @param {object} opts
 * @param {string} opts.reporterHandle  - username/anon handle of reporter
 * @param {string} opts.reason          - selected report reason
 * @param {string} opts.postId          - post ID
 * @param {string} opts.postEmployer    - employer name on the post
 * @param {string} opts.postBody        - truncated post body
 * @param {Date}   opts.timestamp       - when report was submitted
 */
async function sendReportEmail({ reporterHandle, reason, postId, postEmployer, postBody, timestamp }) {
  if (!process.env.REPORT_EMAIL_USER || !process.env.REPORT_EMAIL_PASS) {
    console.warn('[mailer] REPORT_EMAIL_USER or REPORT_EMAIL_PASS not set — skipping email');
    return;
  }

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

  console.log('[mailer] sending report email to clockedreports@gmail.com, reason:', reason);
  const transporter = getTransporter();
  await transporter.sendMail({
    from: `"Clocked Reports" <${process.env.REPORT_EMAIL_USER}>`,
    to: 'clockedreports@gmail.com',
    subject: `🚩 Report: ${reason} — ${postEmployer || postId}`,
    html,
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

module.exports = { sendReportEmail };
