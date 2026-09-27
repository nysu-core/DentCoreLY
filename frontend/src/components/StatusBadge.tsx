import { AppointmentStatus } from "../types";

const STATUS_STYLES: Record<AppointmentStatus, string> = {
  SCHEDULED:  "bg-blue-100 text-blue-700",
  CONFIRMED:  "bg-indigo-100 text-indigo-700",
  CHECKED_IN: "bg-amber-100 text-amber-700",
  COMPLETED:  "bg-green-100 text-green-700",
  CANCELLED:  "bg-red-100 text-red-600",
  NO_SHOW:    "bg-slate-100 text-slate-500",
};

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  return (
    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[status]}`}>
      {status.replace("_", " ")}
    </span>
  );
}
