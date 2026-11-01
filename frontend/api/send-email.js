import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Security check: only allow requests originating from our own backend
  // We expect the backend to pass the credentials
  const { to, subject, text, html, user, pass } = req.body;

  if (!user || !pass) {
    return res.status(401).json({ error: 'Missing SMTP credentials' });
  }
  if (!to || !subject) {
    return res.status(400).json({ error: 'Missing email details' });
  }

  try {
    // Create the SMTP transporter using Gmail
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: user,
        pass: pass,
      },
    });

    // Send the email
    const info = await transporter.sendMail({
      from: user,
      to: to,
      subject: subject,
      text: text,
      html: html,
    });

    return res.status(200).json({ success: true, messageId: info.messageId });
  } catch (error) {
    console.error("Nodemailer error:", error);
    return res.status(500).json({ error: 'Failed to send email via SMTP', details: error.message });
  }
}
