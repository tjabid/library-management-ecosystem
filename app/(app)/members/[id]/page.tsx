"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import { getMemberById } from "@/lib/actions/members";
import { useMemberLoans } from "@/hooks/useLoans";
import { useSettings } from "@/hooks/useSettings";
import type { Member, Loan } from "@/lib/types";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { DataTable, Column } from "@/components/ui/DataTable";
import { MemberModal } from "@/components/members/MemberModal";
import {
  formatDate,
  formatAED,
  effectiveMemberStatus,
  calcOverdueDays,
} from "@/lib/utils";
import {
  MEMBER_STATUS_LABELS,
  MEMBER_STATUS_COLORS,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

type ActiveTab = "active" | "history";

export default function MemberDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [member, setMember] = useState<Member | null>(null);
  const [loadingMember, setLoadingMember] = useState(true);
  const [tab, setTab] = useState<ActiveTab>("active");
  const [editOpen, setEditOpen] = useState(false);
  const { activeLoans, loanHistory, loading: loansLoading, load } = useMemberLoans(id);
  const { settings } = useSettings();

  const reload = async () => {
    setLoadingMember(true);
    const m = await getMemberById(id);
    setMember(m);
    setLoadingMember(false);
    await load();
  };

  useEffect(() => {
    reload();
  }, [id]);

  if (loadingMember) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400">Loading member…</div>
    );
  }

  if (!member) {
    return (
      <div className="text-center py-24">
        <p className="text-slate-500">Member not found.</p>
        <Button variant="ghost" className="mt-4" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
      </div>
    );
  }

  const effStatus = effectiveMemberStatus(member.status, member.expiryDate);

  const activeLoanColumns: Column<Loan>[] = [
    { key: "bookTitle", header: "Book", render: (l) => <span className="font-medium">{l.bookTitle}</span> },
    { key: "issuedAt", header: "Issue Date", render: (l) => <span>{formatDate(l.issuedAt)}</span> },
    { key: "dueDate", header: "Due Date", render: (l) => <span>{formatDate(l.dueDate)}</span> },
    {
      key: "days",
      header: "Days Remaining",
      render: (l) => {
        const overdue = calcOverdueDays(l.dueDate);
        if (overdue > 0) {
          return <span className="text-red-600 font-medium">{overdue}d overdue</span>;
        }
        const remaining = -calcOverdueDays(l.dueDate);
        // remaining days = due - today; since calcOverdueDays returns 0 for not overdue, compute directly
        const dueDate = new Date(l.dueDate);
        const today = new Date();
        const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / 86400000);
        if (diffDays <= 3) {
          return <span className="text-amber-600 font-medium">{diffDays}d left</span>;
        }
        return <span className="text-emerald-600">{diffDays}d left</span>;
      },
    },
  ];

  const historyColumns: Column<Loan>[] = [
    { key: "bookTitle", header: "Book", render: (l) => <span className="font-medium">{l.bookTitle}</span> },
    { key: "issuedAt", header: "Issue Date", render: (l) => <span>{formatDate(l.issuedAt)}</span> },
    {
      key: "returnedAt",
      header: "Return Date",
      render: (l) => <span>{l.returnedAt ? formatDate(l.returnedAt) : "—"}</span>,
    },
    {
      key: "fine",
      header: "Fine Paid",
      render: (l) =>
        l.fineFils > 0 ? (
          <span className="text-red-600">{formatAED(l.fineFils)}</span>
        ) : (
          <span className="text-slate-400">None</span>
        ),
    },
  ];

  return (
    <div className="space-y-5">
      {/* Back button */}
      <button
        onClick={() => router.push("/members")}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Members
      </button>

      {/* Profile card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-start gap-4">
          {/* Avatar placeholder */}
          <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center text-xl font-bold text-slate-400 flex-shrink-0">
            {member.name.charAt(0).toUpperCase()}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-slate-900">{member.name}</h1>
              <StatusBadge
                label={MEMBER_STATUS_LABELS[effStatus]}
                variant={MEMBER_STATUS_COLORS[effStatus] as never}
              />
            </div>

            <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-500">
              <span>ID: <span className="font-medium text-slate-700">{member.memberNumber}</span></span>
              <span>Expires: <span className="font-medium text-slate-700">{formatDate(member.expiryDate)}</span></span>
              {member.email && <span>{member.email}</span>}
              {member.phone && <span>{member.phone}</span>}
            </div>

            {member.outstandingFineFils > 0 && (
              <div className="mt-3 inline-flex items-center gap-2 bg-red-50 text-red-700 text-sm font-medium px-3 py-1.5 rounded-lg">
                Outstanding fine: {formatAED(member.outstandingFineFils)}
              </div>
            )}
          </div>

          <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="h-3.5 w-3.5" /> Edit
          </Button>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100 text-sm text-slate-500">
          <span className="font-medium text-slate-700">{activeLoans.length}</span> of{" "}
          <span className="font-medium text-slate-700">{settings.maxBooksPerMember}</span> books currently issued
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
        {(["active", "history"] as ActiveTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-4 py-1.5 text-sm font-medium rounded-md transition-colors",
              tab === t ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            {t === "active" ? "Active Loans" : "Loan History"}
          </button>
        ))}
      </div>

      {/* Table */}
      {tab === "active" ? (
        <DataTable
          columns={activeLoanColumns}
          data={activeLoans}
          loading={loansLoading}
          keyExtractor={(l) => l.id}
          emptyMessage="No active loans."
        />
      ) : (
        <DataTable
          columns={historyColumns}
          data={loanHistory}
          loading={loansLoading}
          keyExtractor={(l) => l.id}
          emptyMessage="No loan history."
        />
      )}

      {/* Edit Modal */}
      <MemberModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        member={member}
        onSaved={reload}
      />
    </div>
  );
}
