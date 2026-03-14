"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/SearchInput";
import { DataTable, Column } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { BookModal } from "@/components/books/BookModal";
import { useBooks } from "@/hooks/useBooks";
import type { Book } from "@/lib/types";
import { BOOK_STATUS_LABELS, BOOK_STATUS_COLORS } from "@/lib/constants";

type BookStatusFilter = "all" | "available" | "on_loan" | "lost" | "damaged";

const STATUS_FILTERS: { value: BookStatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "available", label: "Available" },
  { value: "on_loan", label: "On Loan" },
  { value: "lost", label: "Lost" },
  { value: "damaged", label: "Damaged" },
];

const VALID_BOOK_STATUSES = new Set<BookStatusFilter>(["available", "on_loan", "lost", "damaged"]);

export default function BooksPage() {
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get("status") as BookStatusFilter | null;

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<BookStatusFilter>(
    initialStatus && VALID_BOOK_STATUSES.has(initialStatus) ? initialStatus : "all"
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [editBook, setEditBook] = useState<Book | null>(null);
  const { books, loading, error, search: searchBooks, refresh } = useBooks();

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleSearch = useCallback(
    (value: string) => {
      setSearch(value);
      searchBooks(value);
    },
    [searchBooks]
  );

  const filteredBooks = statusFilter === "all"
    ? books
    : books.filter((b) => b.status === statusFilter);

  const handleEdit = (book: Book) => {
    setEditBook(book);
    setModalOpen(true);
  };

  const handleAdd = () => {
    setEditBook(null);
    setModalOpen(true);
  };

  const columns: Column<Book>[] = [
    {
      key: "code",
      header: "Book Code",
      render: (b) => <span className="font-mono text-xs font-semibold text-slate-600">{b.code}</span>,
      className: "w-28",
    },
    {
      key: "title",
      header: "Title",
      render: (b) => <span className="font-medium text-slate-900">{b.title}</span>,
    },
    {
      key: "author",
      header: "Author",
      render: (b) => <span className="text-slate-600">{b.author}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (b) => (
        <StatusBadge
          label={BOOK_STATUS_LABELS[b.status]}
          variant={BOOK_STATUS_COLORS[b.status] as never}
        />
      ),
      className: "w-32",
    },
    {
      key: "actions",
      header: "",
      render: (b) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            handleEdit(b);
          }}
          aria-label={`Edit ${b.title}`}
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
          <h1 className="text-2xl font-bold text-slate-900">Book Catalog</h1>
          <p className="text-sm text-slate-500 mt-0.5">{filteredBooks.length} books shown</p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="h-4 w-4" />
          Add Book
        </Button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <SearchInput
          value={search}
          onChange={handleSearch}
          placeholder="Search by title, author, or code…"
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
      {error && (
        <div className="bg-red-50 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>
      )}

      {/* Table */}
      <DataTable
        columns={columns}
        data={filteredBooks}
        loading={loading}
        keyExtractor={(b) => b.id}
        emptyMessage={search || statusFilter !== "all" ? `No books found matching your filters.` : "No books in catalog yet."}
      />

      {/* Modal */}
      <BookModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        book={editBook}
        onSaved={refresh}
      />
    </div>
  );
}
