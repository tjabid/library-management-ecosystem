"use server";

import { db } from "@/lib/db";
import { settings, auditEvents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { Settings } from "@/lib/db/schema";

export async function getSettings(): Promise<Settings | null> {
    const rows = await db.select().from(settings).where(eq(settings.id, 1)).limit(1);
    return rows[0] ?? null;
}

export type UpdateSettingsInput = {
    loanPeriodDays: number;
    maxBooksPerMember: number;
    finePerDayFils: number;
    actorClerkUserId: string;
    actorName: string;
};

export async function updateSettings(input: UpdateSettingsInput): Promise<void> {
    await db
        .insert(settings)
        .values({
            id: 1,
            loanPeriodDays: input.loanPeriodDays,
            maxBooksPerMember: input.maxBooksPerMember,
            finePerDayFils: input.finePerDayFils,
            updatedBy: input.actorClerkUserId,
        })
        .onConflictDoUpdate({
            target: settings.id,
            set: {
                loanPeriodDays: input.loanPeriodDays,
                maxBooksPerMember: input.maxBooksPerMember,
                finePerDayFils: input.finePerDayFils,
                updatedAt: new Date(),
                updatedBy: input.actorClerkUserId,
            },
        });

    await db.insert(auditEvents).values({
        type: "settingsUpdate",
        actorClerkUserId: input.actorClerkUserId,
        actorName: input.actorName,
        payload: {
            loanPeriodDays: input.loanPeriodDays,
            maxBooksPerMember: input.maxBooksPerMember,
            finePerDayFils: input.finePerDayFils,
        },
    });
}
