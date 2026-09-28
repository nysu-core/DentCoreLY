import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

// Full permission catalogue. Admins can later assign these to custom roles too.
const PERMISSIONS: { key: string; module: string; description: string }[] = [
  // Users & RBAC
  { key: "users.manage", module: "users", description: "Create/edit/disable users and assign roles" },
  { key: "roles.manage", module: "roles", description: "Create/edit roles and permissions" },
  // Patients
  { key: "patients.create", module: "patients", description: "Register new patients" },
  { key: "patients.read", module: "patients", description: "View patient records" },
  { key: "patients.update", module: "patients", description: "Edit patient demographic data" },
  { key: "patients.archive", module: "patients", description: "Archive/deactivate patients" },
  // Medical history
  { key: "medical_history.manage", module: "medical_history", description: "Record/edit medical history" },
  // Clinical (examinations, diagnosis, treatment)
  { key: "examinations.manage", module: "examinations", description: "Record clinical examinations" },
  { key: "diagnoses.manage", module: "diagnoses", description: "Create/edit diagnoses" },
  { key: "treatment_plans.manage", module: "treatment_plans", description: "Create/edit treatment plans" },
  // Appointments
  { key: "appointments.manage", module: "appointments", description: "Schedule/reschedule/cancel appointments" },
  { key: "appointments.read", module: "appointments", description: "View appointment calendar" },
  { key: "visits.manage", module: "visits", description: "Record visit treatment plans and notes" },
  // Files / images
  { key: "files.manage", module: "files", description: "Upload/manage clinical images and files" },
  // Reports
  { key: "reports.generate", module: "reports", description: "Generate and print reports/PDFs" },
  // Research
  { key: "research.submit", module: "research", description: "Submit research data requests" },
  { key: "research.approve", module: "research", description: "Approve/deny research requests" },
  { key: "research.export", module: "research", description: "Export anonymized datasets" },
  // System
  { key: "system.config", module: "system", description: "Edit system configuration, form templates, departments" },
  { key: "audit.read", module: "audit", description: "View audit logs" },
  { key: "backup.manage", module: "backup", description: "Trigger/restore backups" },
  { key: "dashboard.read", module: "dashboard", description: "View analytics dashboard" },
];

const ROLE_PERMISSIONS: Record<string, string[]> = {
  Administrator: PERMISSIONS.map((p) => p.key), // full access
  Orthodontist: [
    "patients.create",
    "patients.read",
    "patients.update",
    "medical_history.manage",
    "examinations.manage",
    "diagnoses.manage",
    "treatment_plans.manage",
    "files.manage",
    "reports.generate",
    "appointments.read",
    "visits.manage",
    "dashboard.read",
  ],
  Assistant: [
    "patients.create",
    "patients.read",
    "patients.update",
    "appointments.manage",
    "appointments.read",
    "visits.manage",
    "reports.generate", // patient cards only, enforced at controller level
  ],
  Researcher: ["research.submit", "research.export", "dashboard.read"],
};

async function main() {
  console.log("Seeding permissions...");
  for (const p of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: p.key },
      update: {},
      create: p,
    });
  }

  console.log("Seeding roles...");
  for (const roleName of Object.keys(ROLE_PERMISSIONS)) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName, isSystem: true, description: `${roleName} (baseline system role)` },
    });

    const permKeys = ROLE_PERMISSIONS[roleName];
    const perms = await prisma.permission.findMany({ where: { key: { in: permKeys } } });
    for (const perm of perms) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
        update: {},
        create: { roleId: role.id, permissionId: perm.id },
      });
    }
  }

  console.log("Seeding default department...");
  const orthoDept = await prisma.department.upsert({
    where: { code: "ORTHO" },
    update: {},
    create: { name: "Orthodontics", code: "ORTHO" },
  });

  console.log("Seeding default admin user...");
  const adminRole = await prisma.role.findUniqueOrThrow({ where: { name: "Administrator" } });
  const adminEmail = process.env.ADMIN_EMAIL || "Admin@dentcore.ly";
  const adminPassword = process.env.ADMIN_PASSWORD;
  const existingAdmin = await prisma.user.findFirst({
    where: { email: { in: [adminEmail, "admin@orthocore.local"] } },
  });
  if (!existingAdmin && !adminPassword) {
    throw new Error("Set ADMIN_PASSWORD in backend/.env before creating the admin account.");
  }
  const passwordHash = adminPassword ? await bcrypt.hash(adminPassword, 12) : undefined;
  if (!existingAdmin) {
    await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash: passwordHash!,
        fullName: "System Administrator",
        roleId: adminRole.id,
        departmentId: orthoDept.id,
      },
    });
    console.log(`Created default admin: ${adminEmail}`);
  } else {
    await prisma.user.update({
      where: { id: existingAdmin.id },
      data: { email: adminEmail, ...(passwordHash ? { passwordHash } : {}) },
    });
    console.log(`Updated default admin account: ${adminEmail}`);
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

// ── System configuration defaults ──────────────────────────────────────────
async function seedSystemConfig() {
  const defaults: { key: string; value: string; description: string }[] = [
    { key: "clinic.name",                   value: "Orthodontics Department - Benghazi", description: "Clinic display name used in emails and PDF headers" },
    { key: "clinic.address",                value: "",                         description: "Clinic address shown on reports" },
    { key: "clinic.phone",                  value: "",                         description: "Clinic phone number shown on reports" },
    { key: "clinic.email",                  value: "",                         description: "Clinic contact email shown on reports" },
    { key: "appointments.defaultDuration",  value: "30",                       description: "Default appointment slot duration in minutes" },
    { key: "appointments.workdayStart",     value: "08:00",                    description: "Clinic opening time (HH:MM)" },
    { key: "appointments.workdayEnd",       value: "17:00",                    description: "Clinic closing time (HH:MM)" },
    { key: "reminders.defaultHoursBefore",  value: "24,2",                     description: "Comma-separated hours before appointment to send reminders" },
    { key: "registration.requiresApproval", value: "true",                     description: "Whether self-registrations require admin approval" },
    { key: "registration.allowedRoles",     value: "Orthodontist,Assistant,Researcher", description: "Roles available for self-registration" },
    { key: "files.maxSizeMb",               value: "25",                       description: "Maximum upload size in MB" },
    { key: "research.anonSaltConfigured",   value: "false",                    description: "Whether ANON_SALT has been set to a production value" },
  ];

  for (const cfg of defaults) {
    await (prisma as any).systemConfig.upsert({
      where:  { key: cfg.key },
      update: {},
      create: cfg,
    });
  }
  console.log("System config defaults seeded.");
}
