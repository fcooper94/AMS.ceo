const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  if (process.env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: (process.env.SMTP_PASS || '').trim() }
    });
    console.log(`[Mailer] Using SMTP host ${process.env.SMTP_HOST} as ${process.env.SMTP_USER}`);
  } else if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    // Google shows App Passwords as "abcd efgh ijkl mnop" — strip any spaces so
    // a copy-paste with spaces doesn't cause a 535 auth failure.
    const appPassword = process.env.GMAIL_APP_PASSWORD.replace(/\s+/g, '');
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.GMAIL_USER, pass: appPassword }
    });
    console.log(`[Mailer] Using Gmail as ${process.env.GMAIL_USER} (app password ${appPassword.length} chars)`);
  } else {
    console.log('[Mailer] No SMTP_HOST or GMAIL_USER/GMAIL_APP_PASSWORD set — email disabled.');
  }

  return transporter;
}

function getFrom() {
  // Default the From address to the authenticated mailbox — providers like
  // PrivateEmail reject mail whose From doesn't match the SMTP user.
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || process.env.GMAIL_USER || 'noreply@ams.ceo';
  return `"AMS.ceo" <${from}>`;
}

/**
 * Send an email with proper headers to reduce spam flagging.
 * @param {object} opts - { to, subject, html, text }
 * @returns {Promise<boolean>} true if sent, false if no transporter
 */
async function sendEmail({ to, subject, html, text }) {
  const t = getTransporter();
  if (!t) {
    console.log(`[Mailer] No transporter configured. Would send "${subject}" to ${to}`);
    return false;
  }

  // Reply-To / unsubscribe default to the sending mailbox so replies reach a
  // real inbox and the message carries a valid List-Unsubscribe.
  const senderAddr = process.env.SMTP_FROM || process.env.SMTP_USER || process.env.GMAIL_USER;

  const headers = {
    'X-Mailer': 'AMS.ceo',
    // No 'Precedence: bulk' — these are transactional emails; marking them
    // bulk pushes them toward spam. Keep auto-reply suppression only.
    'X-Auto-Response-Suppress': 'OOF, AutoReply'
  };
  if (senderAddr) {
    headers['List-Unsubscribe'] = `<mailto:${senderAddr}?subject=unsubscribe>`;
  }

  await t.sendMail({
    from: getFrom(),
    to,
    replyTo: senderAddr || undefined,
    subject,
    html,
    text: text || htmlToPlainText(html),
    headers
  });

  return true;
}

/**
 * Strip HTML tags to create a plain text alternative.
 */
function htmlToPlainText(html) {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<hr[^>]*>/gi, '\n---\n')
    .replace(/<a[^>]+href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '$2 ($1)')
    .replace(/<strong>(.*?)<\/strong>/gi, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#9670;/g, '◆')
    .replace(/&copy;/g, '©')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

module.exports = { sendEmail, getTransporter, getFrom };
