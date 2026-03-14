"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/SearchInput";
import { DataTable, Column } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { MemberModal } from "@/components/members/MemberModal";
import { useMembers } from "@/hooks/useMembers";
import type { Member } from "@/lib/types";
import {
  MEMBER_STATUS_LABELS,
  MEMBER_STATUS_COLORS,
} from "@/lib/constants";
import { formatDate, formatAED, effectiveMemberStatus } from "@/lib/utils";

type MemberStatusFilter = "all" | "active" | "expiring" | "expired" | "blocked" | "has_fines";

const STATUS_FILTERS: { value: MemberStatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "expiring", label: "Expiring Soon" },
  { value: "expired", label: "Expired" },
  { value: "blocked", label: "Blocked" },
  { value: "has_fines", label: "Has Fines" },
];

const VALID_MEMBER_STATUSES = new Set<MemberStatusFilter>(["active", "expiring", "expired", "blocked", "has_fines"]);

export default function MembersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get("status") as MemberStatusFilter | null;

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<MemberStatusFilter>(
    initialStatus && VALID_MEMBER_STATUSES.has(initialStatus) ? initialStatus : "all"
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [editMember, setEditMember] = useState<Member | null>(null);
  const { members, loading, error, search: searchMembers, refresh } = useMembers();

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleSearch = useCallback(
    (value: string) => {
      setSearch(value);
      searchMembers(value);
    },
    [searchMembers]
  );

  const filteredMembers = statusFilter === "all"
    ? members
    : members.filter((m) => {
        if (statusFilter === "has_fines") return m.outstandingFineFils > 0;
        const eff = effectiveMemberStatus(m.status, m.expiryDate);
        return eff === statusFilter;
      });

  const handleEdit = (member: Member) => {
    setEditMember(member);
    setModalOpen(true);
  };

  const handleAdd = () => {
    setEditMember(null);
    setModalOpen(true);
  };

  const columns: Column<Member>[] = [
    {
      key: "memberNumber",
      header: "Member ID",
      render: (m) => <span className="font-mono text-xs font-semibold text-slate-600">{m.memberNumber}</span>,
      className: "w-28",
    },
    {
      key: "name",
      header: "Name",
      render: (m) => <span className="font-medium text-slate-900">{m.name}</span>,
    },
    {
      key: "expiryDate",
      header: "Expiry Date",
      render: (m) => <span className="text-slate-600">{formatDate(m.expiryDate)}</span>,
      className: "w-36",
    },
    {
      key: "status",
      header: "Status",
      render: (m) => {
        const eff = effectiveMemberStatus(m.status, m.expiryDate);
        return (
          <StatusBadge
            label={MEMBER_STATUS_LABELS[eff]}
            variant={MEMBER_STATUS_COLORS[eff] as never}
          />
        );
      },
      className: "w-36",
    },
    {
      key: "fines",
      header: "Outstanding Fines",
      render: (m) =>
        m.outstandingFineFils > 0 ? (
          <span className="text-red-600 font-medium">{formatAED(m.outstandingFineFils)}</span>
        ) : (
          <span className="text-slate-400">—</span>
        ),
      className: "w-40",
    },
    {
      key: "actions",
      header: "",
      render: (m) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            handleEdit(m);
          }}
          aria-label={`Edit ${m.name}`}
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </Button>
      ),
      className: "w-24",
    },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Members</h1>
          <p className="text-sm text-slate-500 mt-0.5">{filteredMembers.length} members shown</p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="h-4 w-4" />
          Add Member
        </Button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <SearchInput
          value={search}
          onChange={handleSearch}
          placeholder="Search by name or member ID…"
          className="max-w-lg"
        />
        <div className="flex items-center gap-1.5 flex-wrap">
          {STATUS_FILTERS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setStatusFilter(value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                statusFilter === value
                  ? "bg-emerald-700 text-white border-emerald-700"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && <div className="bg-red-50 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>}

      {/* Table */}
      <DataTable
        columns={columns}
        data={filteredMembers}
        loading={loading}
        keyExtractor={(m) => m.id}
        onRowClick={(m) => router.push(`/members/${m.id}`)}
        emptyMessage={search || statusFilter !== "all" ? `No members found matching your filters.` : "No members yet."}
      />

      {/* Modal */}
      <MemberModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        member={editMember}
        onSaved={refresh}
      />
    </div>
  );
}
