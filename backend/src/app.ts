import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { config } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/error";
import { authRouter }            from "./modules/auth/auth.routes";
import { usersRouter }           from "./modules/users/users.routes";
import { rolesRouter }           from "./modules/roles/roles.routes";
import { departmentsRouter }     from "./modules/departments/departments.routes";
import { patientsRouter }        from "./modules/patients/patients.routes";
import { formTemplatesRouter }   from "./modules/form-templates/form-templates.routes";
import { formResponsesRouter }   from "./modules/form-responses/form-responses.routes";
import { appointmentsRouter }    from "./modules/appointments/appointments.routes";
import { waitingListRouter }     from "./modules/waiting-list/waiting-list.routes";
import { filesRouter }           from "./modules/files/files.routes";
import { reportsRouter }         from "./modules/reports/reports.routes";
import { dashboardRouter }       from "./modules/dashboard/dashboard.routes";
import { researchRouter }        from "./modules/research/research.routes";
import { auditRouter }           from "./modules/audit/audit.routes";
import { registrationsRouter }   from "./modules/admin/registrations.routes";
import { systemConfigRouter }    from "./modules/system-config/system-config.routes";
import { backupRouter }          from "./modules/backup/backup.routes";

export function createApp() {
  const app = express();

  if (process.env.VERCEL) app.set("trust proxy", 1);

  app.use(helmet());
  app.use(cors({ origin: config.corsOrigins, credentials: true }));
  app.use(express.json({ limit: "2mb" }));
  app.use(morgan(config.env === "production" ? "combined" : "dev"));
  app.use(
    rateLimit({
      windowMs: config.rateLimit.windowMs,
      max:      config.rateLimit.max,
      standardHeaders: true,
      legacyHeaders:   false,
    })
  );

  const healthHandler = (_req: express.Request, res: express.Response) =>
    res.json({
      status:  "ok",
      env:     config.env,
      db:      config.db.provider,
      storage: config.storage.provider,
      email:   config.email.user ? "gmail" : "console (dev stub)",
    });
  app.get("/health", healthHandler);
  app.get("/api/health", healthHandler);

  app.use("/api/auth",                 authRouter);
  app.use("/api/users",                usersRouter);
  app.use("/api/roles",                rolesRouter);
  app.use("/api/departments",          departmentsRouter);
  app.use("/api/patients",             patientsRouter);
  app.use("/api/form-templates",       formTemplatesRouter);
  app.use("/api/form-responses",       formResponsesRouter);
  app.use("/api/appointments",         appointmentsRouter);
  app.use("/api/waiting-list",         waitingListRouter);
  app.use("/api",                      filesRouter);
  app.use("/api/reports",              reportsRouter);
  app.use("/api/dashboard",            dashboardRouter);
  app.use("/api/research",             researchRouter);
  app.use("/api/audit",                auditRouter);
  app.use("/api/admin/registrations",  registrationsRouter);
  app.use("/api/system-config",        systemConfigRouter);
  app.use("/api/backup",               backupRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
