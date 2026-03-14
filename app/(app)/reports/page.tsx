"use client";

import { useEffect } from "react";
import { Download } from "lucide-react";
import Papa from "papaparse";
import { useOverdueLoans } from "@/hooks/useLoans";
import { useSettings } from "@/hooks/useSettings";
import { DataTable, Column } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import type { Loan } from "@/lib/types";
import { formatDate, formatAED, calcOverdueDays, calcFineFils } from "@/lib/utils";

export default function ReportsPage() {
  const { loans, loading, load } = useOverdueLoans();
  const { settings } = useSettings();

  useEffect(() => {
    load();
  }, [load]);

  const overdueWithFines = loans.map((l) => ({
    ...l,
    overdueDays: calcOverdueDays(l.dueDate),
    calcFine: calcFineFils(l.dueDate, settings.finePerDayFils),
  }));

  const totalFine = overdueWithFines.reduce((sum, l) => sum + l.calcFine, 0);

  const handleExport = () => {
    const rows = overdueWithFines.map((l) => ({
      "Member Name": l.memberName,
      "Member ID": l.memberId,
      "Book Title": l.bookTitle,
      "Book Code": l.bookId,
      "Issue Date": formatDate(l.issuedAt),
      "Due Date": formatDate(l.dueDate),
      "Days Overdue": l.overdueDays,
      "Fine (AED)": (l.calcFine / 100).toFixed(2),
    }));
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `overdue-report-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const columns: Column<(typeof overdueWithFines)[0]>[] = [
    {
      key: "memberName",
      header: "Member",
      render: (l) => <span className="font-medium text-slate-900">{l.memberName}</span>,
    },
    {
      key: "memberId",
      header: "Member ID",
      render: (l) => <span className="font-mono text-xs text-slate-600">{l.memberId}</span>,
      className: "w-28",
    },
    {
      key: "bookTitle",
      header: "Book",
      render: (l) => <span>{l.bookTitle}</span>,
    },
    {
      key: "bookId",
      header: "Code",
      render: (l) => <span className="font-mono text-xs text-slate-600">{l.bookId}</span>,
      className: "w-24",
    },
    {
      key: "dueDate",
      header: "Due Date",
      render: (l) => <span>{formatDate(l.dueDate)}</span>,
      className: "w-32",
    },
    {
      key: "overdueDays",
      header: "Days Overdue",
      render: (l) => <span className="text-red-600 font-bold">{l.overdueDays}d</span>,
      className: "w-32",
    },
    {
      key: "fine",
      header: "Fine",
      render: (l) => <span className="text-red-600 font-medium">{formatAED(l.calcFine)}</span>,
      className: "w-32",
    },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Overdue Books Report</h1>
          <p className="text-sm text-slate-500 mt-0.5">{loans.length} overdue loans</p>
        </div>
        <Button onClick={handleExport} variant="secondary" disabled={loans.length === 0}>
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={overdueWithFines}
        loading={loading}
        keyExtractor={(l) => l.id}
        emptyMessage="No overdue loans. Great job!"
      />

      {/* Summary */}
      {overdueWithFines.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-4 flex items-center justify-between">
          <span className="text-sm text-slate-600">
            <span className="font-semibold text-slate-900">{loans.length}</span> overdue books
          </span>
          <span className="text-sm text-slate-600">
            Total fines:{" "}
            <span className="font-semibold text-red-600">{formatAED(totalFine)}</span>
          </span>
        </div>
      )}
    </div>
  );
}
