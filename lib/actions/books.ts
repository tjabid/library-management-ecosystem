"use server";

import { db } from "@/lib/db";
import { books } from "@/lib/db/schema";
import { eq, ilike, or, asc } from "drizzle-orm";
import type { Book } from "@/lib/db/schema";

// ─── Types ────────────────────────────────────────────────────────────────────

export type BookFormInput = {
    code: string;
    title: string;
    author: string;
    isbn?: string;
    status: "available" | "on_loan" | "lost" | "damaged";
};

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function searchBooks(term: string, pageSize = 50): Promise<Book[]> {
    const t = term.trim();
    if (t) {
        return db
            .select()
            .from(books)
            .where(
                or(
                    ilike(books.title, `%${t}%`),
                    ilike(books.author, `%${t}%`),
                    ilike(books.code, `%${t}%`)
                )
            )
            .orderBy(asc(books.title))
            .limit(pageSize);
    }
    return db.select().from(books).orderBy(asc(books.title)).limit(pageSize);
}

/** Look up a book by its barcode/code (e.g. "EN001"). */
export async function getBook(code: string): Promise<Book | null> {
    const rows = await db
        .select()
        .from(books)
        .where(eq(books.code, code.trim().toUpperCase()))
        .limit(1);
    return rows[0] ?? null;
}

export async function getBookById(id: string): Promise<Book | null> {
    const rows = await db.select().from(books).where(eq(books.id, id)).limit(1);
    return rows[0] ?? null;
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function saveBook(data: BookFormInput, isNew: boolean): Promise<void> {
    const code = data.code.trim().toUpperCase();

    if (isNew) {
        await db.insert(books).values({
            code,
            title: data.title.trim(),
            author: data.author.trim(),
            isbn: data.isbn?.trim() || null,
            status: data.status,
        });
    } else {
        await db
            .update(books)
            .set({
                title: data.title.trim(),
                author: data.author.trim(),
                isbn: data.isbn?.trim() || null,
                status: data.status,
                updatedAt: new Date(),
            })
            .where(eq(books.code, code));
    }
}
