import type { BookStatus, MemberStatus, LoanStatus } from "./types";

// ─── Color tokens (match globals.css @theme) ──────────────────────────────────

export const COLORS = {
  primary: "#2563eb",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  neutral: "#64748b",
  bgCard: "#f8fafc",
} as const;

// ─── Book status ──────────────────────────────────────────────────────────────

export const BOOK_STATUS_LABELS: Record<BookStatus, string> = {
  available: "Available",
  on_loan: "On Loan",
  lost: "Lost",
  damaged: "Damaged",
};

export const BOOK_STATUS_COLORS: Record<BookStatus, string> = {
  available: "success",
  on_loan: "danger",
  lost: "neutral",
  damaged: "neutral",
};

// ─── Member status ────────────────────────────────────────────────────────────

export const MEMBER_STATUS_LABELS: Record<MemberStatus | "expiring", string> = {
  active: "Active",
  expiring: "Expiring Soon",
  expired: "Expired",
  blocked: "Blocked",
};

export const MEMBER_STATUS_COLORS: Record<MemberStatus | "expiring", string> = {
  active: "success",
  expiring: "warning",
  expired: "danger",
  blocked: "danger",
};

// ─── Audit event labels ───────────────────────────────────────────────────────

export const AUDIT_TYPE_LABELS: Record<string, string> = {
  issue: "Issue",
  return: "Return",
  adjustFine: "Fine Adjust",
  addBook: "Add Book",
  editBook: "Edit Book",
  addMember: "Add Member",
  editMember: "Edit Member",
  settingsUpdate: "Settings Update",
  roleUpdate: "Role Update",
  addStaff: "Add Staff",
};

export const AUDIT_TYPE_COLORS: Record<string, string> = {
  issue: "primary",
  return: "success",
  adjustFine: "warning",
  addBook: "primary",
  editBook: "neutral",
  addMember: "primary",
  editMember: "neutral",
  settingsUpdate: "warning",
  roleUpdate: "danger",
  addStaff: "success",
};

// ─── Navigation ───────────────────────────────────────────────────────────────

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
  { href: "/books", label: "Books", icon: "BookOpen" },
  { href: "/members", label: "Members", icon: "Users" },
  { href: "/issue", label: "Issue Book", icon: "PlusCircle" },
  { href: "/return", label: "Return Book", icon: "Undo2" },
  { href: "/reports", label: "Reports", icon: "BarChart2" },
] as const;

export const ADMIN_NAV_ITEMS = [
  { href: "/settings", label: "Settings", icon: "Settings" },
  { href: "/audit", label: "Audit Log", icon: "ClipboardList" },
] as const;

// ─── Default settings ─────────────────────────────────────────────────────────

export const DEFAULT_SETTINGS = {
  loanPeriodDays: 14,
  maxBooksPerMember: 3,
  finePerDayFils: 100, // 1 AED/day
};
