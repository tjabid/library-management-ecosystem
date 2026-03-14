// Re-export Drizzle schema types as the canonical application types.
// UI code should import from here, not directly from lib/db/schema.
export type {
  StaffUser,
  Member,
  Book,
  Loan,
  Settings,
  AuditEvent,
  NewMember,
  NewBook,
  NewLoan,
} from "@/lib/db/schema";

// ─── Auth ─────────────────────────────────────────────────────────────────────

export type UserRole = "admin" | "librarian" | "disabled";

// ─── Status types (match Postgres enums in lib/db/schema.ts) ─────────────────

export type BookStatus = "available" | "on_loan" | "lost" | "damaged";
export type MemberStatus = "active" | "blocked" | "expired";
export type LoanStatus = "active" | "returned";
export type StaffRole = "admin" | "librarian" | "disabled";

// ─── Form data types ──────────────────────────────────────────────────────────

export type BookFormData = {
  code: string;       // barcode / book number (immutable after create)
  title: string;
  author: string;
  isbn?: string;
  status: BookStatus;
};

export type MemberFormData = {
  id?: string;           // UUID of existing member (omitted when creating)
  name: string;
  guardianName: string;
  email?: string;        // guardian email
  phone: string;         // guardian phone
  expiryDate: string;    // ISO date string ("yyyy-MM-dd") for form inputs
  status: MemberStatus;
};

// ─── Server Action payload types ──────────────────────────────────────────────

export type IssueBookPayload = {
  memberId: string;    // member UUID
  bookCodes: string[]; // one or more book codes
};

export type ReturnBookPayload = {
  bookCode: string;
  fineOverrideFils?: number;
  overrideReason?: string;
};

export type AdjustFinePayload = {
  loanId: string;
  newFineFils: number;
  reason: string;
};

export type UpdateStaffRolePayload = {
  targetClerkUserId: string;
  role: StaffRole;
};
