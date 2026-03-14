"use client";

import { useState, useCallback } from "react";
import { searchBooks } from "@/lib/actions/books";
import type { Book } from "@/lib/types";

export function useBooks() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (term: string) => {
    setLoading(true);
    setError(null);
    try {
      const results = await searchBooks(term);
      setBooks(results);
    } catch {
      setError("Failed to load books. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(() => search(""), [search]);

  return { books, loading, error, search, refresh };
}
