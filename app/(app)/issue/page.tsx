"use client";

import { useState, useCallback } from "react";
import { Camera, X, UserSearch, CheckCircle, AlertCircle } from "lucide-react";
import { searchMembers } from "@/lib/actions/members";
import { searchBooks } from "@/lib/actions/books";
import { issueBook } from "@/lib/actions/loans";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/hooks/useSettings";
import type { Member, Book } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/SearchInput";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { BarcodeScanner } from "@/components/circulation/BarcodeScanner";
import {
  formatDate,
  formatAED,
  effectiveMemberStatus,
  calcDueDateFromToday,
} from "@/lib/utils";
import {
  MEMBER_STATUS_LABELS,
  MEMBER_STATUS_COLORS,
  BOOK_STATUS_LABELS,
  BOOK_STATUS_COLORS,
} from "@/lib/constants";

export default function IssuePage() {
  const { user } = useAuth();
  const { settings } = useSettings();

  // Member state
  const [memberSearch, setMemberSearch] = useState("");
  const [memberResults, setMemberResults] = useState<Member[]>([]);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [memberLoading, setMemberLoading] = useState(false);

  // Book state
  const [bookSearch, setBookSearch] = useState("");
  const [bookResults, setBookResults] = useState<Book[]>([]);
  const [selectedBooks, setSelectedBooks] = useState<Book[]>([]);
  const [bookLoading, setBookLoading] = useState(false);

  // Scanner
  const [scanTarget, setScanTarget] = useState<"member" | "book" | null>(null);

  // Submit state
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleMemberSearch = useCallback(async (value: string) => {
    setMemberSearch(value);
    if (!value.trim()) { setMemberResults([]); return; }
    setMemberLoading(true);
    const results = await searchMembers(value);
    setMemberResults(results);
    setMemberLoading(false);
  }, []);

  const handleBookSearch = useCallback(async (value: string) => {
    setBookSearch(value);
    if (!value.trim()) { setBookResults([]); return; }
    setBookLoading(true);
    const results = await searchBooks(value);
    setBookResults(results.filter((b) => b.status === "available"));
    setBookLoading(false);
  }, []);

  const addBook = (book: Book) => {
    if (!selectedBooks.find((b) => b.id === book.id)) {
      setSelectedBooks((prev) => [...prev, book]);
    }
    setBookSearch("");
    setBookResults([]);
  };

  const removeBook = (bookId: string) => {
    setSelectedBooks((prev) => prev.filter((b) => b.id !== bookId));
  };

  const handleScan = (value: string) => {
    setScanTarget(null);
    if (scanTarget === "member") handleMemberSearch(value);
    else if (scanTarget === "book") handleBookSearch(value);
  };

  const handleIssue = async () => {
    if (!selectedMember || selectedBooks.length === 0) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await issueBook({
        memberId: selectedMember.id,
        bookCodes: selectedBooks.map((b) => b.code),
        actorClerkUserId: user?.uid ?? "",
        actorName: user?.displayName ?? user?.email ?? "staff",
      });
      if (!result.ok) {
        setSubmitError(result.error);
        return;
      }
      setSuccess(true);
      setSelectedMember(null);
      setSelectedBooks([]);
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Issue failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setSuccess(false);
    setSubmitError(null);
    setSelectedMember(null);
    setSelectedBooks([]);
    setMemberSearch("");
    setBookSearch("");
  };

  // Validation
  const effStatus = selectedMember
    ? effectiveMemberStatus(selectedMember.status, selectedMember.expiryDate)
    : null;
  const memberBlocked = effStatus === "expired" || effStatus === "blocked";

  // Count active loans by checking the loans table is handled server-side;
  // for UI display, we rely on the server action rejecting if over limit.
  const canIssue = selectedMember && selectedBooks.length > 0 && !memberBlocked;
  const dueDate = calcDueDateFromToday(settings.loanPeriodDays);

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <CheckCircle className="h-16 w-16 text-emerald-500" />
        <h2 className="text-xl font-bold text-slate-900">Books Issued Successfully</h2>
        <p className="text-slate-500 text-sm">Due date: {formatDate(dueDate)}</p>
        <Button onClick={reset}>Issue Another</Button>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <h1 className="text-2xl font-bold text-slate-900">Issue Book</h1>

      <div className="grid md:grid-cols-2 gap-5">
        {/* ── Left: Select Member ── */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Select Member</h2>
            <Button variant="ghost" size="sm" onClick={() => setScanTarget("member")} aria-label="Scan member barcode">
              <Camera className="h-4 w-4" />
            </Button>
          </div>

          {selectedMember ? (
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900">{selectedMember.name}</span>
                    <StatusBadge label={MEMBER_STATUS_LABELS[effStatus!]} variant={MEMBER_STATUS_COLORS[effStatus!] as never} />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    ID: {selectedMember.memberNumber} · Expires: {formatDate(selectedMember.expiryDate)}
                  </p>
                  {selectedMember.outstandingFineFils > 0 && (
                    <p className="text-xs text-red-600 mt-0.5">
                      Fine: {formatAED(selectedMember.outstandingFineFils)}
                    </p>
                  )}
                </div>
                <button onClick={() => setSelectedMember(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="relative">
              <SearchInput value={memberSearch} onChange={handleMemberSearch} placeholder="Search by name or ID…" />
              {memberResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {memberResults.map((m) => {
                    const s = effectiveMemberStatus(m.status, m.expiryDate);
                    return (
                      <button
                        key={m.id}
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between gap-2 border-b border-slate-100 last:border-0"
                        onClick={() => { setSelectedMember(m); setMemberSearch(""); setMemberResults([]); }}
                      >
                        <div>
                          <p className="text-sm font-medium text-slate-900">{m.name}</p>
                          <p className="text-xs text-slate-500">{m.memberNumber}</p>
                        </div>
                        <StatusBadge label={MEMBER_STATUS_LABELS[s]} variant={MEMBER_STATUS_COLORS[s] as never} />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {memberBlocked && (
            <div className="flex items-center gap-2 bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              Member is {effStatus}. Cannot issue books.
            </div>
          )}
        </div>

        {/* ── Right: Select Books ── */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Select Books</h2>
            <Button variant="ghost" size="sm" onClick={() => setScanTarget("book")} aria-label="Scan book barcode">
              <Camera className="h-4 w-4" />
            </Button>
          </div>

          <div className="relative">
            <SearchInput value={bookSearch} onChange={handleBookSearch} placeholder="Scan or search book code, title…" />
            {bookResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {bookResults.map((b) => (
                  <button
                    key={b.id}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between gap-2 border-b border-slate-100 last:border-0"
                    onClick={() => addBook(b)}
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900">{b.title}</p>
                      <p className="text-xs text-slate-500">{b.code} · {b.author}</p>
                    </div>
                    <StatusBadge label={BOOK_STATUS_LABELS[b.status]} variant={BOOK_STATUS_COLORS[b.status] as never} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedBooks.length > 0 && (
            <div className="space-y-2">
              {selectedBooks.map((b) => (
                <div key={b.id} className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{b.title}</p>
                    <p className="text-xs text-slate-500">{b.code}</p>
                  </div>
                  <button onClick={() => removeBook(b.id)} className="text-slate-400 hover:text-red-500">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="text-sm text-slate-600">
            <span>Due date: </span>
            <span className="font-semibold text-slate-900">{formatDate(dueDate)}</span>
            <span className="text-slate-400 ml-2">({settings.loanPeriodDays} days)</span>
          </div>
          <div className="flex gap-3 items-center">
            {submitError && <p className="text-sm text-red-600">{submitError}</p>}
            <Button onClick={handleIssue} disabled={!canIssue} loading={submitting} size="lg">
              Issue Books
            </Button>
          </div>
        </div>
      </div>

      {scanTarget && <BarcodeScanner onScan={handleScan} onClose={() => setScanTarget(null)} />}
    </div>
  );
}
