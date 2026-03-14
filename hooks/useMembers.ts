"use client";

import { useState, useCallback } from "react";
import { searchMembers } from "@/lib/actions/members";
import type { Member } from "@/lib/types";

export function useMembers() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (term: string) => {
    setLoading(true);
    setError(null);
    try {
      const results = await searchMembers(term);
      setMembers(results);
    } catch {
      setError("Failed to load members. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(() => search(""), [search]);

  return { members, loading, error, search, refresh };
}
