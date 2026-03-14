"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FieldWrapper, Input, Select } from "@/components/ui/FormField";
import { saveBook } from "@/lib/actions/books";
import type { Book, BookFormData } from "@/lib/types";

const schema = z.object({
  code: z.string().min(1, "Book code is required").max(20),
  title: z.string().min(1, "Title is required"),
  author: z.string().min(1, "Author is required"),
  isbn: z.string().optional(),
  status: z.enum(["available", "on_loan", "lost", "damaged"]),
});

interface BookModalProps {
  open: boolean;
  onClose: () => void;
  book?: Book | null;
  onSaved: () => void;
}

export function BookModal({ open, onClose, book, onSaved }: BookModalProps) {
  const isNew = !book;
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BookFormData>({
    resolver: zodResolver(schema),
    defaultValues: { code: "", title: "", author: "", isbn: "", status: "available" },
  });

  useEffect(() => {
    if (open) {
      reset(
        book
          ? { code: book.code, title: book.title, author: book.author, isbn: book.isbn ?? "", status: book.status }
          : { code: "", title: "", author: "", isbn: "", status: "available" }
      );
      setSubmitError(null);
    }
  }, [open, book, reset]);

  const onSubmit = async (data: BookFormData) => {
    setSubmitError(null);
    try {
      await saveBook({ ...data, isbn: data.isbn || undefined }, isNew);
      onSaved();
      onClose();
    } catch (err: unknown) {
      const msg = (err as { message?: string }).message ?? "Unknown error";
      setSubmitError(msg);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isNew ? "Add Book" : "Edit Book"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} type="button">Cancel</Button>
          <Button type="submit" form="book-form" loading={isSubmitting}>
            {isNew ? "Add Book" : "Save Changes"}
          </Button>
        </>
      }
    >
      <form id="book-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FieldWrapper label="Book Code" htmlFor="code" required error={errors.code?.message}>
          <Input id="code" {...register("code")} disabled={!isNew} placeholder="EN001" error={!!errors.code} />
        </FieldWrapper>

        <FieldWrapper label="Title" htmlFor="title" required error={errors.title?.message}>
          <Input id="title" {...register("title")} placeholder="The Alchemist" error={!!errors.title} />
        </FieldWrapper>

        <FieldWrapper label="Author" htmlFor="author" required error={errors.author?.message}>
          <Input id="author" {...register("author")} placeholder="Paulo Coelho" error={!!errors.author} />
        </FieldWrapper>

        <FieldWrapper label="ISBN" htmlFor="isbn" hint="Optional">
          <Input id="isbn" {...register("isbn")} placeholder="978-0-06-112008-4" />
        </FieldWrapper>

        <FieldWrapper label="Status" htmlFor="status" required>
          <Select id="status" {...register("status")}>
            <option value="available">Available</option>
            <option value="on_loan">On Loan</option>
            <option value="lost">Lost</option>
            <option value="damaged">Damaged</option>
          </Select>
        </FieldWrapper>

        {submitError && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 break-all">{submitError}</p>
        )}
      </form>
    </Modal>
  );
}
