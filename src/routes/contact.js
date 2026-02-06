const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');

// Create transporter - uses environment variables for configuration
const createTransporter = () => {
  // For production, use a real SMTP service (Gmail, SendGrid, etc.)
  // For now, we'll support multiple configurations

  if (process.env.SMTP_HOST) {
    // Custom SMTP configuration
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  } else if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    // Gmail configuration (requires App Password, not regular password)
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      }
    });
  }

  return null;
};

/**
 * POST /api/contact
 * Send a contact form email
 */
router.post('/', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    const transporter = createTransporter();

    if (!transporter) {
      // Log the message if no email configuration (development fallback)
      console.log('\n========== CONTACT FORM SUBMISSION ==========');
      console.log(`From: ${name} <${email}>`);
      console.log(`Subject: [Airline Manager Contact] ${subject}`);
      console.log(`Message:\n${message}`);
      console.log('==============================================\n');

      // Still return success in development
      if (process.env.NODE_ENV === 'development') {
        return res.json({
          message: 'Message logged (email not configured)',
          note: 'Configure SMTP settings in .env to send real emails'
        });
      }

      return res.status(500).json({ error: 'Email service not configured' });
    }

    // Email to site owner
    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.GMAIL_USER || 'noreply@airlinemanager.com',
      to: 'fcooper94@icloud.com',
      replyTo: email,
      subject: `[Airline Manager Contact] ${subject}`,
      text: `
New contact form submission from Airline Manager

From: ${name}
Email: ${email}
Subject: ${subject}

Message:
${message}

---
This email was sent from the Airline Manager contact form.
      `,
      html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: #1a1a2e; color: #fff; padding: 20px; text-align: center;">
    <h1 style="margin: 0; font-size: 24px;">Airline Manager</h1>
    <p style="margin: 5px 0 0 0; color: #888;">Contact Form Submission</p>
  </div>

  <div style="padding: 20px; background: #f5f5f5;">
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; font-weight: bold; width: 100px;">From:</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${name}</td>
      </tr>
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; font-weight: bold;">Email:</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;"><a href="mailto:${email}">${email}</a></td>
      </tr>
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; font-weight: bold;">Subject:</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${subject}</td>
      </tr>
    </table>

    <div style="margin-top: 20px; padding: 15px; background: #fff; border-radius: 4px;">
      <h3 style="margin: 0 0 10px 0; color: #333;">Message:</h3>
      <p style="margin: 0; white-space: pre-wrap; color: #555;">${message}</p>
    </div>
  </div>

  <div style="padding: 15px; background: #1a1a2e; color: #888; text-align: center; font-size: 12px;">
    <p style="margin: 0;">You can reply directly to this email to respond to ${name}.</p>
  </div>
</div>
      `
    };

    await transporter.sendMail(mailOptions);

    console.log(`[CONTACT] Email sent from ${name} <${email}> - Subject: ${subject}`);

    res.json({ message: 'Message sent successfully' });
  } catch (error) {
    console.error('Error sending contact email:', error);

    // In development, log the message anyway so it's not lost
    if (process.env.NODE_ENV === 'development') {
      console.log('\n========== CONTACT FORM (Email Failed) ==========');
      console.log(`From: ${req.body.name} <${req.body.email}>`);
      console.log(`Subject: [Airline Manager Contact] ${req.body.subject}`);
      console.log(`Message:\n${req.body.message}`);
      console.log('==================================================\n');

      return res.json({
        message: 'Message received (email delivery failed, logged to console)',
        note: 'Check your SMTP/Gmail credentials in .env'
      });
    }

    res.status(500).json({ error: 'Failed to send message. Please try again later.' });
  }
});

module.exports = router;
