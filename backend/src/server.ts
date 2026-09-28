import { createApp } from "./app";
import { config } from "./config/env";
import { logger } from "./config/logger";
import { startReminderScheduler } from "./jobs/reminderScheduler";

const app = createApp();

app.listen(config.port, () => {
  logger.info(`Orthodontics Department - Faculty of Dentistry - Benghazi API listening on port ${config.port} [${config.env}]`);
  startReminderScheduler();
});

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled rejection", { reason });
});
