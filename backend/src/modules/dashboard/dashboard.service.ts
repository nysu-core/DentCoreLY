import { prisma } from "../../config/prisma";

function startOfDay(d = new Date()) {
  const dt = new Date(d);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

function endOfDay(d = new Date()) {
  const dt = new Date(d);
  dt.setHours(23, 59, 59, 999);
  return dt;
}

function startOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function lastNMonths(n: number): string[] {
  const keys: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    keys.push(monthKey(new Date(now.getFullYear(), now.getMonth() - i, 1)));
  }
  return keys;
}

// Aggregate an array of records by month using a date field,
// counting how many fall in each of the last `months` months.
function bucketByMonth<T>(items: T[], getDate: (item: T) => Date, months = 6) {
  const keys = lastNMonths(months);
  const counts = Object.fromEntries(keys.map((k) => [k, 0]));
  for (const item of items) {
    const k = monthKey(getDate(item));
    if (k in counts) counts[k]++;
  }
  return keys.map((k) => ({ month: k, count: counts[k] }));
}

export async function getDashboardStats() {
  const today = new Date();
  const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 5, 1);

  const [
    totalPatients,
    archivedPatients,
    newPatientsThisMonth,
    todayAppointments,
    pendingAppointments,
    completedThisMonth,
    appointmentsByStatus,
    recentPatients,
    upcomingAppointments,
    allAppointmentsLast6M,
    allPatientsLast6M,
    departmentEnrollments,
    waitingListCount,
    pendingReminders,
  ] = await Promise.all([
    // Patient counts
    prisma.patient.count({ where: { isArchived: false } }),
    prisma.patient.count({ where: { isArchived: true } }),
    prisma.patient.count({ where: { createdAt: { gte: startOfMonth() } } }),

    // Today's appointments
    prisma.appointment.count({
      where: { startTime: { gte: startOfDay(), lte: endOfDay() } },
    }),

    // Pending (not yet done)
    prisma.appointment.count({
      where: { status: { in: ["SCHEDULED", "CONFIRMED"] } },
    }),

    // Completed this month
    prisma.appointment.count({
      where: { status: "COMPLETED", updatedAt: { gte: startOfMonth() } },
    }),

    // Breakdown by status (for donut chart)
    prisma.appointment.groupBy({
      by: ["status"],
      _count: { status: true },
    }),

    // 5 most recent patients
    prisma.patient.findMany({
      where: { isArchived: false },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, fileNumber: true, fullName: true, gender: true, createdAt: true },
    }),

    // Next 8 upcoming appointments
    prisma.appointment.findMany({
      where: {
        startTime: { gte: new Date() },
        status: { in: ["SCHEDULED", "CONFIRMED"] },
      },
      orderBy: { startTime: "asc" },
      take: 8,
      include: {
        patient: { select: { id: true, fullName: true, fileNumber: true } },
        provider: { select: { fullName: true } },
        department: { select: { name: true } },
      },
    }),

    // Last 6 months appointments (for trend chart)
    prisma.appointment.findMany({
      where: { startTime: { gte: sixMonthsAgo } },
      select: { startTime: true, status: true },
    }),

    // Last 6 months patient registrations (for trend chart)
    prisma.patient.findMany({
      where: { createdAt: { gte: sixMonthsAgo } },
      select: { createdAt: true },
    }),

    // Department enrollment distribution (for pie chart)
    prisma.patientDepartmentEnrollment.groupBy({
      by: ["departmentId"],
      _count: { patientId: true },
    }),

    // Waiting list size
    prisma.waitingListEntry.count({ where: { isActive: true } }),

    // Pending reminders
    prisma.appointmentReminder.count({ where: { status: "PENDING" } }),
  ]);

  // Enrich department data
  const departments = await prisma.department.findMany({
    select: { id: true, name: true },
  });
  const deptMap = Object.fromEntries(departments.map((d) => [d.id, d.name]));

  const departmentBreakdown = departmentEnrollments.map((e) => ({
    department: deptMap[e.departmentId] ?? "Unknown",
    count: e._count.patientId,
  }));

  // Monthly trends (JS aggregation — works on SQLite + PostgreSQL)
  const appointmentTrend = bucketByMonth(
    allAppointmentsLast6M,
    (a) => new Date(a.startTime),
    6
  );
  const patientTrend = bucketByMonth(
    allPatientsLast6M,
    (p) => new Date(p.createdAt),
    6
  );

  // Status breakdown for donut chart
  const statusBreakdown = appointmentsByStatus.map((s) => ({
    status: s.status,
    count: s._count.status,
  }));

  return {
    summary: {
      totalPatients,
      archivedPatients,
      newPatientsThisMonth,
      todayAppointments,
      pendingAppointments,
      completedThisMonth,
      waitingListCount,
      pendingReminders,
    },
    charts: {
      appointmentTrend,
      patientTrend,
      statusBreakdown,
      departmentBreakdown,
    },
    recent: {
      patients: recentPatients,
      upcomingAppointments,
    },
  };
}
