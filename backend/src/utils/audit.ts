import { prisma } from "../config/prisma";
import { logger } from "../config/logger";

export interface AuditEntry {
  userId?: string;
  action: string;        // e.g. "PATIENT_CREATE", "APPOINTMENT_CANCEL", "USER_LOGIN"
  entityType?: string;   // e.g. "Patient", "Appointment"
  entityId?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
}

/**
 * Write an audit log entry. Fire-and-forget — never throws, so a logging
 * failure never breaks the calling operation.
 */
export async function audit(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({ data: entry });
  } catch (err) {
    logger.warn("Failed to write audit log", { entry, err });
  }
}

// Canonical action names — keeping them as constants prevents typos and makes
// searching the audit log consistent.
export const AuditAction = {
  // Auth
  LOGIN:                "LOGIN",
  LOGOUT:               "LOGOUT",
  PASSWORD_CHANGE:      "PASSWORD_CHANGE",
  PASSWORD_RESET:       "PASSWORD_RESET",

  // Users
  USER_CREATE:          "USER_CREATE",
  USER_UPDATE:          "USER_UPDATE",
  USER_DISABLE:         "USER_DISABLE",

  // Patients
  PATIENT_CREATE:       "PATIENT_CREATE",
  PATIENT_UPDATE:       "PATIENT_UPDATE",
  PATIENT_ARCHIVE:      "PATIENT_ARCHIVE",
  PATIENT_RESTORE:      "PATIENT_RESTORE",
  PATIENT_ENROLL:       "PATIENT_ENROLL",

  // Clinical
  MEDICAL_HISTORY_SAVE: "MEDICAL_HISTORY_SAVE",
  FORM_RESPONSE_SUBMIT: "FORM_RESPONSE_SUBMIT",

  // Appointments
  APPOINTMENT_CREATE:   "APPOINTMENT_CREATE",
  APPOINTMENT_RESCHEDULE: "APPOINTMENT_RESCHEDULE",
  APPOINTMENT_CANCEL:   "APPOINTMENT_CANCEL",
  APPOINTMENT_STATUS:   "APPOINTMENT_STATUS",

  // Files
  FILE_UPLOAD:          "FILE_UPLOAD",
  FILE_DELETE:          "FILE_DELETE",

  // Research
  RESEARCH_SUBMIT:      "RESEARCH_SUBMIT",
  RESEARCH_APPROVE:     "RESEARCH_APPROVE",
  RESEARCH_DENY:        "RESEARCH_DENY",
  RESEARCH_EXPORT:      "RESEARCH_EXPORT",

  // System
  DEPARTMENT_CREATE:    "DEPARTMENT_CREATE",
  DEPARTMENT_UPDATE:    "DEPARTMENT_UPDATE",
  FORM_TEMPLATE_CHANGE: "FORM_TEMPLATE_CHANGE",
} as const;
