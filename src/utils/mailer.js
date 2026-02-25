const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  if (process.env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
  } else if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD }
    });
  }

  return transporter;
}

function getFrom() {
  return `"AMS.ceo" <${process.env.SMTP_FROM || process.env.GMAIL_USER || 'noreply@ams.ceo'}>`;
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

  await t.sendMail({
    from: getFrom(),
    to,
    subject,
    html,
    text: text || htmlToPlainText(html),
    headers: {
      'X-Mailer': 'AMS.ceo',
      'Precedence': 'bulk',
      'X-Auto-Response-Suppress': 'OOF, AutoReply'
    }
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
