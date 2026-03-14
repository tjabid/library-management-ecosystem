"use client";

import { useState, useCallback } from "react";
import {
  getMemberActiveLoans,
  getMemberLoanHistory,
  getOverdueLoans,
  getLoanByBookCode,
} from "@/lib/actions/loans";
import type { Loan } from "@/lib/types";

export function useMemberLoans(memberId: string | null) {
  const [activeLoans, setActiveLoans] = useState<Loan[]>([]);
  const [loanHistory, setLoanHistory] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!memberId) return;
    setLoading(true);
    try {
      const [active, history] = await Promise.all([
        getMemberActiveLoans(memberId),
        getMemberLoanHistory(memberId),
      ]);
      setActiveLoans(active);
      setLoanHistory(history);
    } finally {
      setLoading(false);
    }
  }, [memberId]);

  return { activeLoans, loanHistory, loading, load };
}

export function useOverdueLoans() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const results = await getOverdueLoans();
      setLoans(results);
    } catch {
      setError("Failed to load overdue loans.");
    } finally {
      setLoading(false);
    }
  }, []);

  return { loans, loading, error, load };
}

export function useLoanByBookCode() {
  const [loan, setLoan] = useState<Loan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lookup = useCallback(async (bookCode: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getLoanByBookCode(bookCode);
      setLoan(result);
    } catch {
      setError("Failed to look up loan.");
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => setLoan(null), []);

  return { loan, loading, error, lookup, reset };
}
