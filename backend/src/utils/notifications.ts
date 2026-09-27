import { logger } from "../config/logger";

// Pluggable notification interface. In production, replace the console-log implementations
// with a real provider (e.g. Twilio for SMS, SES/SendGrid for email) — nothing else in the
// reminder pipeline needs to change since callers only depend on this interface.
export interface NotificationProvider {
  sendSms(to: string, message: string): Promise<void>;
  sendEmail(to: string, subject: string, body: string): Promise<void>;
}

class ConsoleNotificationProvider implements NotificationProvider {
  async sendSms(to: string, message: string) {
    logger.info(`[SMS STUB] To: ${to} | ${message}`);
  }
  async sendEmail(to: string, subject: string, body: string) {
    logger.info(`[EMAIL STUB] To: ${to} | Subject: ${subject} | ${body}`);
  }
}

export const notificationProvider: NotificationProvider = new ConsoleNotificationProvider();
