"use client";

import { useState } from "react";
import { Camera, CheckCircle } from "lucide-react";
import { getLoanByBookCode, returnBook } from "@/lib/actions/loans";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/hooks/useSettings";
import type { Loan } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/SearchInput";
import { FieldWrapper, Input, Textarea } from "@/components/ui/FormField";
import { BarcodeScanner } from "@/components/circulation/BarcodeScanner";
import { formatDate, formatAED, calcOverdueDays, calcFineFils, filsToAed, aedToFils } from "@/lib/utils";

export default function ReturnPage() {
  const { user } = useAuth();
  const { settings } = useSettings();

  const [bookCode, setBookCode] = useState("");
  const [loan, setLoan] = useState<Loan | null>(null);
  const [looking, setLooking] = useState(false);
  const [notFound, setNotFound] = useState(false);

  // Fine override
  const [overrideFine, setOverrideFine] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [useOverride, setUseOverride] = useState(false);

  // Scanning
  const [scanOpen, setScanOpen] = useState(false);

  // Submit
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lookupBook = async (code: string) => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setLooking(true);
    setLoan(null);
    setNotFound(false);
    setUseOverride(false);
    setOverrideFine("");
    setOverrideReason("");
    const found = await getLoanByBookCode(trimmed);
    if (found) {
      setLoan(found);
    } else {
      setNotFound(true);
    }
    setLooking(false);
  };

  const handleScan = (value: string) => {
    setScanOpen(false);
    setBookCode(value);
    lookupBook(value);
  };

  const handleReturn = async () => {
    if (!loan) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await returnBook({
        bookCode: bookCode.trim().toUpperCase(),
        fineOverrideFils: useOverride && overrideFine ? aedToFils(parseFloat(overrideFine)) : undefined,
        overrideReason: useOverride && overrideReason ? overrideReason : undefined,
        actorClerkUserId: user?.uid ?? "",
        actorName: user?.displayName ?? user?.email ?? "staff",
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Return failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setSuccess(false);
    setLoan(null);
    setBookCode("");
    setNotFound(false);
    setError(null);
  };

  const autoFine = loan ? calcFineFils(loan.dueDate, settings.finePerDayFils) : 0;
  const overdueDays = loan ? calcOverdueDays(loan.dueDate) : 0;
  const effectiveFine = useOverride && overrideFine ? aedToFils(parseFloat(overrideFine) || 0) : autoFine;

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <CheckCircle className="h-16 w-16 text-emerald-500" />
        <h2 className="text-xl font-bold text-slate-900">Book Returned Successfully</h2>
        {effectiveFine > 0 && (
          <p className="text-slate-500 text-sm">Fine charged: {formatAED(effectiveFine)}</p>
        )}
        <Button onClick={reset}>Return Another</Button>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-lg">
      <h1 className="text-2xl font-bold text-slate-900">Return Book</h1>

      {/* Scan / Enter */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
        <h2 className="font-semibold text-slate-900">Scan or Enter Book Code</h2>

        <Button className="w-full h-16 text-base" onClick={() => setScanOpen(true)}>
          <Camera className="h-6 w-6" />
          Scan Book to Return
        </Button>

        <div className="flex items-center gap-3 text-xs text-slate-400">
          <div className="flex-1 h-px bg-slate-200" />
          OR
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        <div className="flex gap-2">
          <SearchInput value={bookCode} onChange={setBookCode} placeholder="Enter book code, e.g. EN001" className="flex-1" />
          <Button variant="secondary" onClick={() => lookupBook(bookCode)} loading={looking} disabled={!bookCode.trim()}>
            Look up
          </Button>
        </div>

        {notFound && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
            No active loan found for that book code.
          </p>
        )}
      </div>

      {/* Loan Details */}
      {loan && (
        <>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
            <h2 className="font-semibold text-slate-900">Loan Details</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Member</span>
                <span className="font-medium text-slate-900">{loan.memberName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Book</span>
                <span className="font-medium text-slate-900">{loan.bookTitle}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Issue Date</span>
                <span className="text-slate-700">{formatDate(loan.issuedAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Due Date</span>
                <span className="text-slate-700">{formatDate(loan.dueDate)}</span>
              </div>
              {overdueDays > 0 && (
                <div className="flex justify-between bg-red-50 px-3 py-2 rounded-lg -mx-1">
                  <span className="text-red-700 font-medium">Days Overdue</span>
                  <span className="text-red-700 font-bold">{overdueDays} days</span>
                </div>
              )}
            </div>
          </div>

          {/* Fine Section */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-4">
            <h2 className="font-semibold text-slate-900">Fine</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-slate-900">{formatAED(autoFine)}</p>
                <p className="text-xs text-slate-400 mt-0.5">Auto-calculated</p>
              </div>
              {autoFine === 0 && (
                <span className="text-emerald-600 text-sm font-medium">No fine — returned on time</span>
              )}
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input type="checkbox" checked={useOverride} onChange={(e) => setUseOverride(e.target.checked)} className="rounded" />
              Adjust fine manually
            </label>

            {useOverride && (
              <div className="space-y-3">
                <FieldWrapper label="Adjusted Fine (AED)" htmlFor="overrideFine">
                  <Input id="overrideFine" type="number" min="0" step="0.01" value={overrideFine} onChange={(e) => setOverrideFine(e.target.value)} placeholder="0.00" />
                </FieldWrapper>
                <FieldWrapper label="Reason for Adjustment" htmlFor="overrideReason">
                  <Textarea id="overrideReason" value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} placeholder="e.g. Member paid in cash previously" />
                </FieldWrapper>
              </div>
            )}
          </div>

          {/* Confirm */}
          <div className="flex items-center gap-3">
            {error && <p className="text-sm text-red-600 flex-1">{error}</p>}
            <Button variant="secondary" onClick={reset}>Cancel</Button>
            <Button onClick={handleReturn} loading={submitting} className="flex-1" size="lg">
              Complete Return
            </Button>
          </div>
        </>
      )}

      {scanOpen && <BarcodeScanner onScan={handleScan} onClose={() => setScanOpen(false)} />}
    </div>
  );
}
