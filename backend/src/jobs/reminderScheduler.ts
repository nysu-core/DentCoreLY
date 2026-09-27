import { logger } from "../config/logger";
import { notificationProvider } from "../utils/notifications";
import * as appointmentsService from "../modules/appointments/appointments.service";

export async function dispatchDueReminders() {
  const due = await appointmentsService.getDueReminders();
  for (const reminder of due) {
    try {
      const appt = reminder.appointment;
      const message = `Reminder: ${appt.patient.fullName}, you have an appointment with ${appt.provider.fullName} on ${appt.startTime.toLocaleString()}.`;
      if (reminder.channel === "SMS" && appt.patient.phoneNumber) {
        await notificationProvider.sendSms(appt.patient.phoneNumber, message);
      } else {
        await notificationProvider.sendEmail("patient-email-placeholder", "Appointment Reminder", message);
      }
      await appointmentsService.markReminderSent(reminder.id);
    } catch (err) {
      logger.error("Failed to dispatch reminder", { reminderId: reminder.id, err });
      await appointmentsService.markReminderFailed(reminder.id);
    }
  }
  if (due.length > 0) logger.info(`Dispatched ${due.length} appointment reminder(s)`);
}

// Polls every minute. In a multi-instance deployment, replace this with a single dedicated
// worker process or a proper job scheduler to avoid duplicate sends.
export function startReminderScheduler() {
  setInterval(() => {
    dispatchDueReminders().catch((err) => logger.error("Reminder scheduler tick failed", { err }));
  }, 60 * 1000);
  logger.info("Reminder scheduler started (60s interval)");
}
