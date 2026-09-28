export type Role = "Administrator" | "Orthodontist" | "Assistant" | "Researcher" | string;

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  departmentId: string | null;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
}

export interface PatientEnrollment {
  id: string;
  departmentId: string;
  department: Department;
}

export interface Patient {
  id: string;
  fileNumber: string;
  fullName: string;
  birthDate: string;
  gender: "MALE" | "FEMALE";
  nationality?: string | null;
  phoneNumber?: string | null;
  guardianContact?: string | null;
  assignedDoctorName?: string | null;
  supervisorName?: string | null;
  entryDate: string;
  isArchived: boolean;
  enrollments: PatientEnrollment[];
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export type FieldType = "TEXT" | "NUMBER" | "CHECKBOX" | "RADIO" | "SELECT" | "MULTISELECT" | "TEXTAREA" | "DATE";

export interface FormField {
  id: string;
  label: string;
  fieldKey: string;
  type: FieldType;
  options?: string[] | null;
  isRequired: boolean;
  order: number;
  isEnabled: boolean;
}

export interface FormSection {
  id: string;
  title: string;
  order: number;
  isEnabled: boolean;
  fields: FormField[];
}

export interface FormTemplate {
  id: string;
  departmentId: string;
  name: string;
  moduleKey: string;
  version: number;
  isActive: boolean;
  sections: FormSection[];
}

export interface FormResponse {
  id: string;
  templateId: string;
  patientId: string;
  data: Record<string, any>;
  createdAt: string;
}

export type AppointmentStatus = "SCHEDULED" | "CONFIRMED" | "CHECKED_IN" | "COMPLETED" | "CANCELLED" | "NO_SHOW";

export interface Appointment {
  id: string;
  patientId: string;
  patient: { id: string; fileNumber: string; fullName: string; phoneNumber?: string | null };
  departmentId: string;
  department: { id: string; name: string };
  providerId: string;
  provider: { id: string; fullName: string };
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  reason?: string | null;
  notes?: string | null;
}

export interface PatientVisit {
  id: string;
  clientDraftId?: string | null;
  patientId: string;
  appointmentId?: string | null;
  visitDate: string;
  treatmentPlan?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  appointment?: {
    id: string;
    startTime: string;
    endTime: string;
    status: AppointmentStatus;
    reason?: string | null;
    provider: { fullName: string };
  } | null;
}

export interface WaitingListEntry {
  id: string;
  patientId: string;
  patient: { id: string; fileNumber: string; fullName: string; phoneNumber?: string | null };
  departmentId: string;
  department: { id: string; name: string };
  preferredNotes?: string | null;
  createdAt: string;
}

export interface UserSummary {
  id: string;
  fullName: string;
  role: { id: string; name: string };
  departmentId: string | null;
}

export type UserStatus = "ACTIVE" | "DISABLED" | "PENDING";

export interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  status: UserStatus;
  roleId: string;
  role: { id: string; name: string };
  departmentId: string | null;
  department: { id: string; name: string } | null;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface RoleSummary {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  userCount: number;
  permissionCount: number;
}

export const FILE_CATEGORIES = [
  "INTRAORAL_PHOTO",
  "EXTRAORAL_PHOTO",
  "PANORAMIC_XRAY",
  "CEPHALOMETRIC_XRAY",
  "CBCT",
  "STUDY_MODEL",
  "DOCUMENT",
  "OTHER",
] as const;

export type FileCategory = (typeof FILE_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<FileCategory, string> = {
  INTRAORAL_PHOTO:    "Intraoral Photos",
  EXTRAORAL_PHOTO:    "Extraoral Photos",
  PANORAMIC_XRAY:     "Panoramic X-Ray",
  CEPHALOMETRIC_XRAY: "Cephalometric X-Ray",
  CBCT:               "CBCT",
  STUDY_MODEL:        "Study Models",
  DOCUMENT:           "Documents",
  OTHER:              "Other",
};

export interface ClinicalFile {
  id: string;
  patientId: string;
  category: FileCategory;
  storageProvider: string;
  fileId: string;
  url: string;
  thumbnailUrl: string | null;
  filename: string;
  mimeType: string;
  size: number;
  notes: string | null;
  uploadedById: string;
  createdAt: string;
}
