"use server";

import { db } from "@/lib/db";
import { auditEvents } from "@/lib/db/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import type { AuditEvent } from "@/lib/db/schema";

export async function getRecentAuditEvents(count = 10): Promise<AuditEvent[]> {
    return db.select().from(auditEvents).orderBy(desc(auditEvents.createdAt)).limit(count);
}

export type AuditQueryFilters = {
    type?: string;
    from?: Date;
    to?: Date;
    limit?: number;
};

export async function queryAuditEvents(filters: AuditQueryFilters = {}): Promise<AuditEvent[]> {
    const conditions = [];

    if (filters.type) conditions.push(eq(auditEvents.type, filters.type));
    if (filters.from) conditions.push(gte(auditEvents.createdAt, filters.from));
    if (filters.to) conditions.push(lte(auditEvents.createdAt, filters.to));

    const query = db
        .select()
        .from(auditEvents)
        .orderBy(desc(auditEvents.createdAt))
        .limit(filters.limit ?? 100);

    if (conditions.length > 0) {
        return query.where(and(...conditions));
    }

    return query;
}
