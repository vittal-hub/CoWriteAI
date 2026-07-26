import "../config/loadEnv.js";
import nodemailer from "nodemailer";

// Falls back to logging the verification link when SMTP isn't configured,
// rather than silently dropping it or crashing.
const hasSmtpConfig = () => Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

let cachedTransporter = null;
function getTransporter() {
  if (!hasSmtpConfig()) return null;
  if (!cachedTransporter) {
    cachedTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === "true", // true for port 465, false for 587/STARTTLS
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return cachedTransporter;
}

async function sendMail({ to, subject, html, text }) {
  const from = process.env.SMTP_FROM || "CoWriteAI <no-reply@cowriteai.local>";
  const transporter = getTransporter();

  if (!transporter) {
    console.warn(
      `[mailer] SMTP not configured — email NOT actually sent. Would have sent to ${to}:\n` +
        `  Subject: ${subject}\n  ${text}`,
    );
    return { delivered: false };
  }

  await transporter.sendMail({ from, to, subject, html, text });
  return { delivered: true };
}

export function sendVerificationEmail(user, rawToken) {
  // CLIENT_URL (also used for CORS in app.js) should be the deployed
  // frontend origin in production — https://cowriteai.netlify.app.
  const verifyUrl = `${process.env.CLIENT_URL || "http://localhost:5173"}/verify-email/${rawToken}`;
  return sendMail({
    to: user.email,
    subject: "Verify your CoWriteAI account",
    text: `Hi ${user.name},\n\nVerify your email to activate your CoWriteAI account:\n${verifyUrl}\n\nThis link expires in 24 hours. If you didn't create this account, you can ignore this email.`,
    html: `<p>Hi ${user.name},</p><p>Verify your email to activate your CoWriteAI account:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p><p>This link expires in 24 hours. If you didn't create this account, you can ignore this email.</p>`,
  });
}
