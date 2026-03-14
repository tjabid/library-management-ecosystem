"use client";

import { useState, useCallback, useEffect } from "react";
import { queryAuditEvents } from "@/lib/actions/audit";
import { useAuth } from "@/context/AuthContext";
import type { AuditEvent } from "@/lib/types";
import { DataTable, Column } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { FieldWrapper, Input, Select } from "@/components/ui/FormField";
import { AUDIT_TYPE_LABELS, AUDIT_TYPE_COLORS } from "@/lib/constants";
import { formatDateTime, timeAgo, formatAED } from "@/lib/utils";
import { useRouter } from "next/navigation";

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

export default function AuditPage() {
  const { role } = useAuth();
  const router = useRouter();

  // useEffect(() => {
  //   if (role && role !== "admin") {
  //     router.replace("/dashboard");
  //   }
  // }, [role, router]);

  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [actionType, setActionType] = useState("");

  // Auto-load events on mount
  useEffect(() => {
    queryAuditEvents({ limit: 200 }).then(setEvents).finally(() => setLoading(false));
  }, []);

  const handleFilter = useCallback(async () => {
    setLoading(true);
    const to = toDate ? new Date(toDate) : undefined;
    if (to) to.setHours(23, 59, 59);

    const results = await queryAuditEvents({
      type: actionType || undefined,
      from: fromDate ? new Date(fromDate) : undefined,
      to,
      limit: 200,
    });
    setEvents(results);
    setLoading(false);
  }, [fromDate, toDate, actionType]);

  const columns: Column<AuditEvent>[] = [
    {
      key: "createdAt",
      header: "Timestamp",
      render: (e) => (
        <span className="text-slate-600 text-xs whitespace-nowrap" title={e.createdAt ? formatDateTime(e.createdAt) : ""}>
          {e.createdAt ? timeAgo(e.createdAt) : "—"}
        </span>
      ),
      className: "w-32",
    },
    {
      key: "actorName",
      header: "Staff",
      render: (e) => <span className="font-medium text-slate-900">{e.actorName}</span>,
      className: "w-40",
    },
    {
      key: "type",
      header: "Action",
      render: (e) => (
        <StatusBadge
          label={AUDIT_TYPE_LABELS[e.type] ?? e.type}
          variant={AUDIT_TYPE_COLORS[e.type] as never ?? "neutral"}
        />
      ),
      className: "w-36",
    },
    {
      key: "details",
      header: "Details",
      render: (e) => (
        <span className="text-slate-600 text-sm">
          {describeEvent(e.type, (e.payload ?? {}) as Record<string, unknown>)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-slate-900">Audit Log</h1>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <FieldWrapper label="From" htmlFor="fromDate">
            <Input
              id="fromDate"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-40"
            />
          </FieldWrapper>
          <FieldWrapper label="To" htmlFor="toDate">
            <Input
              id="toDate"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-40"
            />
          </FieldWrapper>
          <FieldWrapper label="Action Type" htmlFor="actionType">
            <Select
              id="actionType"
              value={actionType}
              onChange={(e) => setActionType(e.target.value)}
              className="w-40"
            >
              <option value="">All actions</option>
              <option value="issue">Issue</option>
              <option value="return">Return</option>
              {/* <option value="adjustFine">Fine Adjust</option> */}
              {/* <option value="addBook">Add Book</option>
              <option value="editBook">Edit Book</option>
              <option value="addMember">Add Member</option>
              <option value="editMember">Edit Member</option>
              <option value="settingsUpdate">Settings Update</option>
              <option value="roleUpdate">Role Update</option> */}
            </Select>
          </FieldWrapper>
          <Button onClick={handleFilter} loading={loading} className="mb-0.5">
            Apply Filters
          </Button>
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={events}
        loading={loading}
        keyExtractor={(e) => e.id}
        emptyMessage="No audit events found."
      />
    </div>
  );
}
