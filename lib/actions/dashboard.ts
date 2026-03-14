"use server";

import { db } from "@/lib/db";
import { books, members, loans, auditEvents } from "@/lib/db/schema";
import { eq, lt, and, count, desc } from "drizzle-orm";
import type { AuditEvent } from "@/lib/db/schema";

export type DashboardStats = {
    totalBooks: number;
    booksOnLoan: number;
    activeMembers: number;
    overdueItems: number;
};

export async function getDashboardStats(): Promise<DashboardStats> {
    const [
        [{ totalBooks }],
        [{ booksOnLoan }],
        [{ activeMembers }],
        [{ overdueItems }],
    ] = await Promise.all([
        db.select({ totalBooks: count() }).from(books),
        db
            .select({ booksOnLoan: count() })
            .from(books)
            .where(eq(books.status, "on_loan")),
        db
            .select({ activeMembers: count() })
            .from(members)
            .where(eq(members.status, "active")),
        db
            .select({ overdueItems: count() })
            .from(loans)
            .where(and(eq(loans.status, "active"), lt(loans.dueDate, new Date()))),
    ]);

    return { totalBooks, booksOnLoan, activeMembers, overdueItems };
}

export async function getRecentActivity(limit = 10): Promise<AuditEvent[]> {
    return db.select().from(auditEvents).orderBy(desc(auditEvents.createdAt)).limit(limit);
}
