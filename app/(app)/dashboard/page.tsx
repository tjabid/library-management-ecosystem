"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Users,
  BookMarked,
  AlertTriangle,
  PlusCircle,
  Undo2,
  BookCheck,
  UserPlus,
  DollarSign,
  Pencil,
  UserCog,
  Settings,
  ShieldAlert,
  ArrowRight,
  Activity,
} from "lucide-react";
import { StatCard } from "@/components/ui/StatCard";
import { getDashboardStats, getRecentActivity } from "@/lib/actions/dashboard";
import { AuditEvent } from "@/lib/types";
import { formatDateTime, timeAgo, formatAED } from "@/lib/utils";
import { AUDIT_TYPE_LABELS, AUDIT_TYPE_COLORS } from "@/lib/constants";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

interface Stats {
  totalBooks: number;
  booksOnLoan: number;
  activeMembers: number;
  overdueItems: number;
}

const EVENT_ICONS: Record<string, { icon: React.ElementType; bg: string; color: string }> = {
  issue:          { icon: BookMarked, bg: "bg-emerald-100",  color: "text-emerald-700" },
  return:         { icon: BookCheck,  bg: "bg-emerald-100", color: "text-emerald-600" },
  adjustFine:     { icon: DollarSign, bg: "bg-amber-100",   color: "text-amber-600" },
  addBook:        { icon: PlusCircle, bg: "bg-emerald-100",  color: "text-emerald-700" },
  editBook:       { icon: Pencil,     bg: "bg-slate-100",   color: "text-slate-500" },
  addMember:      { icon: UserPlus,   bg: "bg-emerald-100",  color: "text-emerald-700" },
  editMember:     { icon: UserCog,    bg: "bg-slate-100",   color: "text-slate-500" },
  settingsUpdate: { icon: Settings,   bg: "bg-amber-100",   color: "text-amber-600" },
  roleUpdate:     { icon: ShieldAlert,bg: "bg-red-100",     color: "text-red-600" },
  addStaff:       { icon: UserPlus,   bg: "bg-emerald-100", color: "text-emerald-700" },
};

/** Build a human-readable description from an audit event's type + payload. */
function describeEvent(type: string, payload: Record<string, unknown>): string {
  const book = (payload.bookTitle as string) ?? null;
  const member = (payload.memberName as string) ?? null;

  switch (type) {
    case "issue":
      return book && member ? `Issued "${book}" to ${member}` : "Issued a book";
    case "return": {
      const fine = payload.fineFils as number | undefined;
      const base = book ? `Returned "${book}"` : "Returned a book";
      return fine && fine > 0 ? `${base} · Fine ${formatAED(fine)}` : base;
    }
    case "adjustFine": {
      const newFine = payload.newFineFils as number | undefined;
      return newFine !== undefined
        ? `Adjusted fine to ${formatAED(newFine)}`
        : "Adjusted a fine";
    }
    case "addBook":
      return book ? `Added "${book}" to catalog` : "Added a new book";
    case "editBook":
      return book ? `Updated "${book}"` : "Updated a book";
    case "addMember":
      return member ? `Registered ${member}` : "Added a new member";
    case "editMember":
      return member ? `Updated ${member}'s details` : "Updated a member";
    case "addStaff": {
      const targetName = (payload.targetName as string) ?? (payload.targetEmail as string);
      return targetName ? `Invited ${targetName} as staff` : "Invited a new staff member";
    }
    case "settingsUpdate":
      return "Updated library settings";
    case "roleUpdate": {
      const target = (payload.targetName as string) ?? (payload.targetEmail as string);
      const role = payload.newRole as string | undefined;
      if (target && role) return `Changed ${target}'s role to ${role}`;
      return "Updated a staff role";
    }
    default:
      return "Performed an action";
  }
}

const QUICK_ACTIONS = [
  { href: "/issue",   label: "Issue Book",   icon: PlusCircle, color: "from-emerald-700 to-emerald-800" },
  { href: "/return",  label: "Return Book",  icon: Undo2,       color: "from-emerald-500 to-teal-600" },
  { href: "/books",   label: "Manage Books", icon: BookOpen,    color: "from-red-600 to-red-700" },
  { href: "/members", label: "Members",      icon: Users,       color: "from-sky-500 to-blue-600" },
];

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-emerald-50 p-5 shadow-sm animate-pulse">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="h-3 w-24 bg-slate-200 rounded mb-3" />
          <div className="h-8 w-16 bg-slate-200 rounded" />
        </div>
        <div className="h-11 w-11 bg-slate-200 rounded-xl" />
      </div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="px-5 py-3.5 flex items-center gap-3 animate-pulse">
      <div className="h-9 w-9 rounded-xl bg-slate-200 flex-shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 w-48 bg-slate-200 rounded" />
        <div className="h-2.5 w-24 bg-slate-100 rounded" />
      </div>
      <div className="h-5 w-14 bg-slate-100 rounded-full" />
    </div>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentActivity, setRecentActivity] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const displayName = user?.displayName || user?.email?.split("@")[0] || "Staff";

  useEffect(() => {
    Promise.all([getDashboardStats(), getRecentActivity(10)])
      .then(([s, events]) => {
        setStats(s);
        setRecentActivity(events);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm font-medium text-emerald-600 mb-0.5">
            {getGreeting()}, {displayName}
          </p>
          <h1 className="text-2xl font-bold text-slate-900">Library Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {new Date().toLocaleDateString("en-AE", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>

        {/* Overdue alert chip */}
        {!loading && stats && stats.overdueItems > 0 && (
          <Link
            href="/reports"
            className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 text-sm font-medium px-4 py-2 rounded-full hover:bg-amber-100 transition-colors cursor-pointer"
          >
            <AlertTriangle className="h-4 w-4" />
            {stats.overdueItems} overdue item{stats.overdueItems > 1 ? "s" : ""}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>

      {/* ── Stat Cards ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <StatCard
              label="Total Books"
              value={stats?.totalBooks ?? 0}
              icon={BookOpen}
              description="In the collection"
              href="/books"
            />
            <StatCard
              label="Books on Loan"
              value={stats?.booksOnLoan ?? 0}
              icon={BookMarked}
              variant="default"
              description="Currently issued"
              href="/books?status=on_loan"
            />
            <StatCard
              label="Active Members"
              value={stats?.activeMembers ?? 0}
              icon={Users}
              variant="success"
              description="Registered members"
              href="/members?status=active"
            />
            <StatCard
              label="Overdue Items"
              value={stats?.overdueItems ?? 0}
              icon={AlertTriangle}
              variant={stats && stats.overdueItems > 0 ? "warning" : "default"}
              description={stats?.overdueItems ? "Require attention" : "All on time"}
              href="/reports"
            />
          </>
        )}
      </div>

      {/* ── Quick Actions ────────────────────────────────────────── */}
      <div>
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {QUICK_ACTIONS.map(({ href, label, icon: Icon, color }) => (
            <Link
              key={href}
              href={href}
              className="group flex flex-col items-center justify-center gap-2.5 bg-white rounded-2xl border border-slate-100 p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
            >
              <div className={cn("p-3 rounded-xl bg-gradient-to-br shadow-sm", color)}>
                <Icon className="h-5 w-5 text-white" />
              </div>
              <span className="text-xs font-semibold text-slate-600 group-hover:text-slate-900 transition-colors text-center leading-tight">
                {label}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Recent Activity ──────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-emerald-100 rounded-lg">
              <Activity className="h-4 w-4 text-emerald-700" />
            </div>
            <h2 className="font-semibold text-slate-900">Recent Activity</h2>
          </div>
          <Link
            href="/audit"
            className="text-xs font-medium text-emerald-600 hover:text-emerald-800 flex items-center gap-1 transition-colors"
          >
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {loading ? (
          <div className="divide-y divide-slate-50">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </div>
        ) : recentActivity.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
              <Activity className="h-5 w-5 text-slate-300" />
            </div>
            <p className="text-sm text-slate-400 font-medium">No activity yet</p>
            <p className="text-xs text-slate-300 mt-1">Actions will appear here as you use the system</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {recentActivity.map((event, idx) => {
              const eventMeta = EVENT_ICONS[event.type] ?? EVENT_ICONS["editBook"];
              const EventIcon = eventMeta.icon;
              return (
                <div
                  key={event.id}
                  className={cn(
                    "px-5 py-3.5 flex items-center gap-3 transition-colors hover:bg-slate-50/70",
                    idx === 0 && "bg-emerald-50/30"
                  )}
                >
                  {/* Icon */}
                  <div className={cn("flex-shrink-0 p-2 rounded-xl", eventMeta.bg)}>
                    <EventIcon className={cn("h-4 w-4", eventMeta.color)} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700 truncate">
                      <span className="font-semibold">{event.actorName}</span>
                      <span className="text-slate-400"> · </span>
                      <span>{describeEvent(event.type, (event.payload ?? {}) as Record<string, unknown>)}</span>
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5" title={event.createdAt ? formatDateTime(event.createdAt) : ""}>
                      {event.createdAt ? timeAgo(event.createdAt) : ""}
                    </p>
                  </div>

                  {/* Badge */}
                  <div className="flex-shrink-0">
                    <StatusBadge
                      label={AUDIT_TYPE_LABELS[event.type]}
                      variant={AUDIT_TYPE_COLORS[event.type] as never}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
