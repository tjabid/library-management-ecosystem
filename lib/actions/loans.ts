"use server";

import { db } from "@/lib/db";
import { books, members, loans, settings, auditEvents } from "@/lib/db/schema";
import { eq, lt, and, count, sql } from "drizzle-orm";
import type { Loan } from "@/lib/db/schema";
import { differenceInCalendarDays } from "date-fns";

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getMemberActiveLoans(memberId: string): Promise<Loan[]> {
    return db
        .select()
        .from(loans)
        .where(and(eq(loans.memberId, memberId), eq(loans.status, "active")))
        .orderBy(loans.dueDate);
}

export async function getMemberLoanHistory(memberId: string, limit = 50): Promise<Loan[]> {
    return db
        .select()
        .from(loans)
        .where(and(eq(loans.memberId, memberId), eq(loans.status, "returned")))
        .orderBy(sql`${loans.returnedAt} desc nulls last`)
        .limit(limit);
}

export async function getActiveLoans(pageSize = 200): Promise<Loan[]> {
    return db
        .select()
        .from(loans)
        .where(eq(loans.status, "active"))
        .orderBy(loans.dueDate)
        .limit(pageSize);
}

export async function getOverdueLoans(): Promise<Loan[]> {
    return db
        .select()
        .from(loans)
        .where(and(eq(loans.status, "active"), lt(loans.dueDate, new Date())))
        .orderBy(loans.dueDate);
}

export async function getLoanByBookCode(bookCode: string): Promise<Loan | null> {
    const book = await db
        .select({ id: books.id })
        .from(books)
        .where(eq(books.code, bookCode.trim().toUpperCase()))
        .limit(1);
    if (!book[0]) return null;

    const rows = await db
        .select()
        .from(loans)
        .where(and(eq(loans.bookId, book[0].id), eq(loans.status, "active")))
        .limit(1);
    return rows[0] ?? null;
}

// ─── Issue Book ───────────────────────────────────────────────────────────────

export type IssueBookInput = {
    memberId: string;   // member UUID
    bookCodes: string[]; // one or more book codes (e.g. ["EN001"])
    actorClerkUserId: string;
    actorName: string;
};

export type ActionResult<T = void> =
    | { ok: true; data: T }
    | { ok: false; error: string };

export async function issueBook(input: IssueBookInput): Promise<ActionResult> {
    return db.transaction(async (tx) => {
        // 1. Load settings
        const [cfg] = await tx.select().from(settings).where(eq(settings.id, 1)).limit(1);
        const loanPeriodDays = cfg?.loanPeriodDays ?? 14;
        const maxBooks = cfg?.maxBooksPerMember ?? 3;

        // 2. Load and validate member
        const [member] = await tx
            .select()
            .from(members)
            .where(eq(members.id, input.memberId))
            .for("update")
            .limit(1);

        if (!member) return { ok: false, error: "Member not found." };
        if (member.status !== "active") return { ok: false, error: `Member is ${member.status}.` };
        if (member.expiryDate < new Date()) return { ok: false, error: "Member membership has expired." };

        // 3. Check current open loan count
        const [{ openCount }] = await tx
            .select({ openCount: count() })
            .from(loans)
            .where(and(eq(loans.memberId, input.memberId), eq(loans.status, "active")));

        if (openCount + input.bookCodes.length > maxBooks) {
            return {
                ok: false,
                error: `Member already has ${openCount} open loan(s). Max allowed is ${maxBooks}.`,
            };
        }

        // 4. Load and validate each book
        const issuedAt = new Date();
        const dueDate = new Date(issuedAt);
        dueDate.setDate(dueDate.getDate() + loanPeriodDays);

        for (const code of input.bookCodes) {
            const [book] = await tx
                .select()
                .from(books)
                .where(eq(books.code, code.trim().toUpperCase()))
                .for("update")
                .limit(1);

            if (!book) return { ok: false, error: `Book "${code}" not found.` };
            if (book.status !== "available") {
                return { ok: false, error: `Book "${code}" is not available (status: ${book.status}).` };
            }

            // 5. Create loan
            await tx.insert(loans).values({
                bookId: book.id,
                bookTitle: book.title,
                memberId: member.id,
                memberName: member.name,
                issuedAt,
                dueDate,
                status: "active",
                fineFils: 0,
            });

            // 6. Mark book on loan
            await tx
                .update(books)
                .set({ status: "on_loan", updatedAt: new Date() })
                .where(eq(books.id, book.id));

            // 7. Audit
            await tx.insert(auditEvents).values({
                type: "issue",
                actorClerkUserId: input.actorClerkUserId,
                actorName: input.actorName,
                bookId: book.code,
                memberId: member.memberNumber,
                payload: {
                    bookTitle: book.title,
                    memberName: member.name,
                    issuedAt: issuedAt.toISOString(),
                    dueDate: dueDate.toISOString(),
                },
            });
        }

        return { ok: true, data: undefined };
    });
}

// ─── Return Book ──────────────────────────────────────────────────────────────

export type ReturnBookInput = {
    bookCode: string;
    fineOverrideFils?: number;
    overrideReason?: string;
    actorClerkUserId: string;
    actorName: string;
};

export async function returnBook(input: ReturnBookInput): Promise<ActionResult<{ fineFils: number }>> {
    return db.transaction(async (tx) => {
        // 1. Find the book
        const [book] = await tx
            .select()
            .from(books)
            .where(eq(books.code, input.bookCode.trim().toUpperCase()))
            .for("update")
            .limit(1);

        if (!book) return { ok: false, error: `Book "${input.bookCode}" not found.` };

        // 2. Find the active loan
        const [loan] = await tx
            .select()
            .from(loans)
            .where(and(eq(loans.bookId, book.id), eq(loans.status, "active")))
            .for("update")
            .limit(1);

        if (!loan) return { ok: false, error: `No active loan found for book "${input.bookCode}".` };

        // 3. Load settings for fine calculation
        const [cfg] = await tx.select().from(settings).where(eq(settings.id, 1)).limit(1);
        const finePerDayFils = cfg?.finePerDayFils ?? 100;

        // 4. Calculate fine
        const returnedAt = new Date();
        const overdueDays = Math.max(0, differenceInCalendarDays(returnedAt, loan.dueDate));
        const calculatedFine = overdueDays * finePerDayFils;
        const finalFine =
            input.fineOverrideFils !== undefined ? input.fineOverrideFils : calculatedFine;

        // 5. Close the loan
        await tx
            .update(loans)
            .set({
                returnedAt,
                fineFils: finalFine,
                status: "returned",
                ...(input.fineOverrideFils !== undefined && {
                    fineOverriddenBy: input.actorClerkUserId,
                    fineOverrideReason: input.overrideReason ?? "No reason provided",
                }),
            })
            .where(eq(loans.id, loan.id));

        // 6. Mark book available
        await tx
            .update(books)
            .set({ status: "available", updatedAt: new Date() })
            .where(eq(books.id, book.id));

        // 7. Add fine to member's outstanding balance
        if (finalFine > 0) {
            await tx
                .update(members)
                .set({
                    outstandingFineFils: sql`${members.outstandingFineFils} + ${finalFine}`,
                    updatedAt: new Date(),
                })
                .where(eq(members.id, loan.memberId));
        }

        // 8. Audit
        await tx.insert(auditEvents).values({
            type: "return",
            actorClerkUserId: input.actorClerkUserId,
            actorName: input.actorName,
            bookId: book.code,
            memberId: loan.memberId,
            payload: {
                bookTitle: book.title,
                memberName: loan.memberName,
                returnedAt: returnedAt.toISOString(),
                fineFils: finalFine,
                fineOverridden: input.fineOverrideFils !== undefined,
            },
        });

        return { ok: true, data: { fineFils: finalFine } };
    });
}

// ─── Adjust Fine ──────────────────────────────────────────────────────────────

export type AdjustFineInput = {
    loanId: string;
    newFineFils: number;
    reason: string;
    actorClerkUserId: string;
    actorName: string;
};

export async function adjustFine(input: AdjustFineInput): Promise<ActionResult> {
    return db.transaction(async (tx) => {
        const [loan] = await tx
            .select()
            .from(loans)
            .where(eq(loans.id, input.loanId))
            .for("update")
            .limit(1);

        if (!loan) return { ok: false, error: "Loan not found." };
        if (loan.status !== "returned") return { ok: false, error: "Can only adjust fine on returned loans." };

        const diff = input.newFineFils - loan.fineFils;

        await tx
            .update(loans)
            .set({
                fineFils: input.newFineFils,
                fineOverriddenBy: input.actorClerkUserId,
                fineOverrideReason: input.reason,
            })
            .where(eq(loans.id, input.loanId));

        // Adjust outstanding balance on member
        if (diff !== 0) {
            await tx
                .update(members)
                .set({
                    outstandingFineFils: sql`${members.outstandingFineFils} + ${diff}`,
                    updatedAt: new Date(),
                })
                .where(eq(members.id, loan.memberId));
        }

        await tx.insert(auditEvents).values({
            type: "adjustFine",
            actorClerkUserId: input.actorClerkUserId,
            actorName: input.actorName,
            memberId: loan.memberId,
            payload: {
                loanId: loan.id,
                oldFineFils: loan.fineFils,
                newFineFils: input.newFineFils,
                reason: input.reason,
            },
        });

        return { ok: true, data: undefined };
    });
}
