import nodemailer from "nodemailer";
import { config } from "../config/env";
import { logger } from "../config/logger";

// Returns a configured transporter, or null if email is not set up.
// When null, all send calls log to console — so local SQLite dev works without Gmail.
function createTransporter() {
  if (!config.email.user || !config.email.appPassword) {
    return null;
  }
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: config.email.user,
      pass: config.email.appPassword, // 16-char App Password from Google Account settings
    },
  });
}

const transporter = createTransporter();

export interface MailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendMail(opts: MailOptions): Promise<void> {
  if (!transporter) {
    // Development fallback — print email content to the console
    logger.info(
      `[EMAIL STUB — configure GMAIL_USER + GMAIL_APP_PASSWORD to send real emails]\n` +
      `To:      ${opts.to}\n` +
      `Subject: ${opts.subject}\n` +
      `---\n${opts.html.replace(/<[^>]+>/g, "").trim()}\n---`
    );
    return;
  }

  try {
    const info = await transporter.sendMail({
      from: `"${config.email.clinicName}" <${config.email.from}>`,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    });
    logger.info(`Email sent to ${opts.to}: ${info.messageId}`);
  } catch (err) {
    logger.error(`Failed to send email to ${opts.to}`, { err });
    // Don't rethrow — a failed email must never break the API response
  }
}
