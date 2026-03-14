"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/hooks/useSettings";
import { getAllStaff, updateStaffRole, createStaffUser, removeStaffUser } from "@/lib/actions/staff";
import { updateSettings } from "@/lib/actions/settings";
import type { StaffUser } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { FieldWrapper, Input, Select } from "@/components/ui/FormField";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DataTable, Column } from "@/components/ui/DataTable";
import { filsToAed, aedToFils } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { UserPlus, ShieldAlert } from "lucide-react";

const schema = z.object({
  loanPeriodDays: z.coerce.number().int().min(1).max(365),
  maxBooksPerMember: z.coerce.number().int().min(1).max(20),
  finePerDayAed: z.coerce.number().min(0),
});

type SettingsFormData = z.infer<typeof schema>;

export default function SettingsPage() {
  const { user, role } = useAuth();
  const { settings, loading, refresh } = useSettings();
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [staffLoading, setStaffLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const router = useRouter();

  // Invite staff form state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<"librarian" | "admin">("librarian");
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    if (role && role !== "admin") {
      router.replace("/dashboard");
    }
  }, [role, router]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SettingsFormData>({
    resolver: zodResolver(schema),
    defaultValues: { loanPeriodDays: 14, maxBooksPerMember: 3, finePerDayAed: 1 },
  });

  useEffect(() => {
    if (!loading) {
      reset({
        loanPeriodDays: settings.loanPeriodDays,
        maxBooksPerMember: settings.maxBooksPerMember,
        finePerDayAed: filsToAed(settings.finePerDayFils),
      });
    }
  }, [loading, settings, reset]);

  useEffect(() => {
    getAllStaff()
      .then(setStaff)
      .finally(() => setStaffLoading(false));
  }, []);

  const onSubmit = async (data: SettingsFormData) => {
    await updateSettings({
      loanPeriodDays: data.loanPeriodDays,
      maxBooksPerMember: data.maxBooksPerMember,
      finePerDayFils: aedToFils(data.finePerDayAed),
      actorClerkUserId: user?.uid ?? "",
      actorName: user?.displayName ?? user?.email ?? "admin",
    });
    await refresh();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleRoleChange = async (staffUser: StaffUser, newRole: "admin" | "librarian") => {
    try {
      await updateStaffRole({
        targetClerkUserId: staffUser.clerkUserId,
        role: newRole,
        actorClerkUserId: user?.uid ?? "",
        actorName: user?.displayName ?? user?.email ?? "admin",
      });
      setStaff((prev) => prev.map((s) => s.clerkUserId === staffUser.clerkUserId ? { ...s, role: newRole } : s));
    } catch {
      alert("Failed to update role. Please try again.");
    }
  };

  const handleInviteStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    setInviteResult(null);
    try {
      const result = await createStaffUser({
        email: inviteEmail,
        name: inviteName,
        role: inviteRole,
        actorClerkUserId: user?.uid ?? "",
        actorName: user?.displayName ?? user?.email ?? "admin",
      });
      if (result.ok) {
        setInviteResult({ ok: true, message: `${inviteName} has been invited! A password reset link has been generated.` });
        setInviteEmail("");
        setInviteName("");
        setInviteRole("librarian");
        // Refresh staff list
        getAllStaff().then(setStaff);
      } else {
        setInviteResult({ ok: false, message: result.error });
      }
    } catch {
      setInviteResult({ ok: false, message: "Failed to invite staff. Please try again." });
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveStaff = async (staffUser: StaffUser) => {
    if (!confirm(`Are you sure you want to disable ${staffUser.name}'s account?`)) return;
    try {
      const result = await removeStaffUser({
        targetClerkUserId: staffUser.clerkUserId,
        actorClerkUserId: user?.uid ?? "",
        actorName: user?.displayName ?? user?.email ?? "admin",
      });
      if (result.ok) {
        setStaff((prev) => prev.map((s) =>
          s.clerkUserId === staffUser.clerkUserId ? { ...s, role: "disabled" } : s
        ));
      } else {
        alert(result.error);
      }
    } catch {
      alert("Failed to remove staff. Please try again.");
    }
  };

  const staffColumns: Column<StaffUser>[] = [
    {
      key: "name",
      header: "Name",
      render: (s) => (
        <span className={`font-medium ${s.role === "disabled" ? "text-slate-400 line-through" : "text-slate-900"}`}>
          {s.name}
        </span>
      ),
    },
    { key: "email", header: "Email", render: (s) => <span className="text-slate-600">{s.email}</span> },
    {
      key: "role",
      header: "Role",
      render: (s) => (
        <StatusBadge
          label={s.role === "admin" ? "Admin" : s.role === "disabled" ? "Disabled" : "Librarian"}
          variant={s.role === "admin" ? "primary" : s.role === "disabled" ? "danger" : "neutral"}
        />
      ),
      className: "w-32",
    },
    {
      key: "actions",
      header: "",
      render: (s) =>
        s.role === "disabled" ? (
          <span className="text-xs text-slate-400">Account disabled</span>
        ) : (
          <div className="flex items-center gap-2">
            <Select
              value={s.role}
              onChange={(e) => handleRoleChange(s, e.target.value as "admin" | "librarian")}
              className="h-8 text-xs w-32"
            >
              <option value="librarian">Librarian</option>
              <option value="admin">Admin</option>
            </Select>
            {s.clerkUserId !== user?.uid && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveStaff(s)}
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                aria-label={`Remove ${s.name}`}
              >
                <ShieldAlert className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        ),
      className: "w-52",
    },
  ];

  return (
    <div className="space-y-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-900">System Settings</h1>

      {/* Loan Rules */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h2 className="font-semibold text-slate-900 mb-4">Loan Rules</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FieldWrapper label="Loan Period (days)" htmlFor="loanPeriodDays" hint="Number of days a book can be borrowed" error={errors.loanPeriodDays?.message}>
            <Input id="loanPeriodDays" type="number" {...register("loanPeriodDays")} error={!!errors.loanPeriodDays} />
          </FieldWrapper>

          <FieldWrapper label="Max Books Per Member" htmlFor="maxBooksPerMember" hint="Maximum number of books a member can borrow at once" error={errors.maxBooksPerMember?.message}>
            <Input id="maxBooksPerMember" type="number" {...register("maxBooksPerMember")} error={!!errors.maxBooksPerMember} />
          </FieldWrapper>

          <FieldWrapper label="Fine Per Day (AED)" htmlFor="finePerDayAed" hint="Fine charged per overdue day" error={errors.finePerDayAed?.message}>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">د.إ</span>
              <Input id="finePerDayAed" type="number" step="0.01" min="0" {...register("finePerDayAed")} className="pl-10" error={!!errors.finePerDayAed} />
            </div>
          </FieldWrapper>

          <div className="flex items-center gap-3 pt-2">
            {saved && <span className="text-sm text-emerald-600 font-medium">Settings saved!</span>}
            <Button type="submit" loading={isSubmitting}>Save Changes</Button>
          </div>
        </form>
      </div>

      {/* Invite Staff */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="p-1.5 bg-emerald-100 rounded-lg">
            <UserPlus className="h-4 w-4 text-emerald-700" />
          </div>
          <h2 className="font-semibold text-slate-900">Invite Staff Member</h2>
        </div>
        <p className="text-sm text-slate-500 mb-4">
          Create a new staff account. They will receive an email to set their password.
        </p>
        <form onSubmit={handleInviteStaff} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FieldWrapper label="Full Name" htmlFor="inviteName" required>
              <Input
                id="inviteName"
                type="text"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="e.g. Ahmed Ali"
                required
              />
            </FieldWrapper>
            <FieldWrapper label="Email Address" htmlFor="inviteEmail" required>
              <Input
                id="inviteEmail"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="e.g. ahmed@librarymanagement.ae"
                required
              />
            </FieldWrapper>
          </div>
          <div className="flex items-end gap-3">
            <FieldWrapper label="Role" htmlFor="inviteRole">
              <Select
                id="inviteRole"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as "librarian" | "admin")}
                className="w-40"
              >
                <option value="librarian">Librarian</option>
                <option value="admin">Admin</option>
              </Select>
            </FieldWrapper>
            <Button type="submit" loading={inviting}>
              <UserPlus className="h-4 w-4" />
              Invite Staff
            </Button>
          </div>

          {inviteResult && (
            <div
              className={`text-sm rounded-lg px-4 py-3 ${
                inviteResult.ok
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {inviteResult.message}
            </div>
          )}
        </form>
      </div>

      {/* Staff Management */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h2 className="font-semibold text-slate-900 mb-4">Staff Management</h2>
        <DataTable
          columns={staffColumns}
          data={staff}
          loading={staffLoading}
          keyExtractor={(s) => s.id}
          emptyMessage="No staff accounts found."
        />
      </div>
    </div>
  );
}
