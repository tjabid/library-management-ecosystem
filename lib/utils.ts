import { formatInTimeZone } from "date-fns-tz";
import { differenceInCalendarDays } from "date-fns";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { MemberStatus } from "@/lib/types";

export const DUBAI_TZ = "Asia/Dubai";

// ─── Tailwind helpers ─────────────────────────────────────────────────────────

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

/** Normalise any date-like value to a JS Date. */
export function toDate(ts: Date | string | number): Date {
  if (ts instanceof Date) return ts;
  return new Date(ts);
}

export function formatDate(ts: Date | string | number, fmt = "dd MMM yyyy"): string {
  return formatInTimeZone(toDate(ts), DUBAI_TZ, fmt);
}

export function formatDateTime(ts: Date | string | number): string {
  return formatInTimeZone(toDate(ts), DUBAI_TZ, "dd MMM yyyy, h:mm a");
}

export function nowInDubai(): Date {
  return new Date();
}

export function calcDueDateFromToday(loanPeriodDays: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + loanPeriodDays);
  return d;
}

/** Returns number of calendar days overdue (0 if not overdue). */
export function calcOverdueDays(dueDate: Date | string): number {
  const due = toDate(dueDate);
  const today = new Date();
  return Math.max(0, differenceInCalendarDays(today, due));
}

/** Returns fine in fils (integer). */
export function calcFineFils(dueDate: Date | string, finePerDayFils: number): number {
  return calcOverdueDays(dueDate) * finePerDayFils;
}

// ─── Currency ─────────────────────────────────────────────────────────────────

/** Format fils as AED display string, e.g. "د.إ 2.50" */
export function formatAED(fils: number): string {
  const aed = fils / 100;
  return `د.إ ${aed.toFixed(2)}`;
}

export function aedToFils(aed: number): number {
  return Math.round(aed * 100);
}

export function filsToAed(fils: number): number {
  return fils / 100;
}

// ─── Relative time ───────────────────────────────────────────────────────────

/** Returns a human-friendly relative time string like "2 min ago", "3 hours ago". */
export function timeAgo(ts: Date | string | number): string {
  const now = Date.now();
  const then = toDate(ts).getTime();
  const seconds = Math.round((now - then) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(ts, "dd MMM yyyy");
}

// ─── Status helpers ───────────────────────────────────────────────────────────

export function isMemberExpiringSoon(expiryDate: Date | string): boolean {
  const expiry = toDate(expiryDate);
  const today = new Date();
  const daysLeft = differenceInCalendarDays(expiry, today);
  return daysLeft >= 0 && daysLeft <= 30;
}

export function effectiveMemberStatus(
  status: string,
  expiryDate: Date | string
): "active" | "expiring" | "expired" | "blocked" {
  if (status === "blocked") return "blocked";
  const expiry = toDate(expiryDate);
  if (expiry < new Date()) return "expired";
  if (isMemberExpiringSoon(expiryDate)) return "expiring";
  return "active";
}
