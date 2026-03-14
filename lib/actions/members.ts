"use server";

import { db } from "@/lib/db";
import { members, memberCounter } from "@/lib/db/schema";
import { eq, ilike, or, asc, sql } from "drizzle-orm";
import type { Member } from "@/lib/db/schema";

// ─── Types ────────────────────────────────────────────────────────────────────

export type MemberFormInput = {
    id?: string;           // UUID of existing member (required for edit)
    name: string;
    guardianName: string;
    email?: string;
    phone: string;
    expiryDate: Date;
    status: "active" | "blocked" | "expired";
};

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function searchMembers(term: string, pageSize = 50): Promise<Member[]> {
    const t = term.trim();
    if (t) {
        return db
            .select()
            .from(members)
            .where(
                or(
                    ilike(members.name, `%${t}%`),
                    ilike(members.guardianName, `%${t}%`),
                    ilike(members.memberNumber, `%${t}%`),
                    ilike(members.phone, `%${t}%`)
                )
            )
            .orderBy(asc(members.name))
            .limit(pageSize);
    }
    return db.select().from(members).orderBy(asc(members.name)).limit(pageSize);
}

/** Look up a member by their member number (e.g. "606"). */
export async function getMember(memberNumber: string): Promise<Member | null> {
    const rows = await db
        .select()
        .from(members)
        .where(eq(members.memberNumber, memberNumber.trim()))
        .limit(1);
    return rows[0] ?? null;
}

export async function getMemberById(id: string): Promise<Member | null> {
    const rows = await db.select().from(members).where(eq(members.id, id)).limit(1);
    return rows[0] ?? null;
}

// ─── Mutations ────────────────────────────────────────────────────────────────

/**
 * Create or update a member.
 * For new members, generates atomic sequential member numbers via SQL transaction.
 * Returns the member's UUID.
 */
export async function saveMember(data: MemberFormInput, isNew: boolean): Promise<string> {
    if (isNew) {
        return db.transaction(async (tx) => {
            // Lock the counter row so concurrent inserts don't race
            const [counter] = await tx
                .select()
                .from(memberCounter)
                .for("update")
                .limit(1);

            const lastId = counter?.lastId ?? 0;
            const newId = lastId + 1;
            const memberNumber = String(newId);

            // Upsert the counter
            await tx
                .insert(memberCounter)
                .values({ id: 1, lastId: newId })
                .onConflictDoUpdate({ target: memberCounter.id, set: { lastId: newId } });

            // Insert the new member
            const [inserted] = await tx
                .insert(members)
                .values({
                    memberNumber,
                    name: data.name.trim(),
                    guardianName: data.guardianName.trim(),
                    email: data.email?.trim() || null,
                    phone: data.phone.trim(),
                    expiryDate: data.expiryDate,
                    status: data.status,
                    outstandingFineFils: 0,
                })
                .returning({ id: members.id });

            return inserted.id;
        });
    } else {
        await db
            .update(members)
            .set({
                name: data.name.trim(),
                guardianName: data.guardianName.trim(),
                email: data.email?.trim() || null,
                phone: data.phone.trim(),
                expiryDate: data.expiryDate,
                status: data.status,
                updatedAt: new Date(),
            })
            .where(eq(members.id, data.id!));

        return data.id!;
    }
}
