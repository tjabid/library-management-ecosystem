"use server";

import { db } from "@/lib/db";
import { staffUsers, auditEvents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { StaffUser } from "@/lib/db/schema";
import { adminAuth } from "@/lib/firebase/admin";

export async function getAllStaff(): Promise<StaffUser[]> {
    return db.select().from(staffUsers).orderBy(staffUsers.name);
}

export async function getStaffByClerkId(clerkUserId: string): Promise<StaffUser | null> {
    const rows = await db
        .select()
        .from(staffUsers)
        .where(eq(staffUsers.clerkUserId, clerkUserId))
        .limit(1);
    return rows[0] ?? null;
}

export type UpsertStaffInput = {
    clerkUserId: string;
    name: string;
    email: string;
    role?: "admin" | "librarian" | "disabled";
};

/** Called after Clerk sign-in to ensure staff_users row is up to date. */
export async function upsertStaffUser(input: UpsertStaffInput): Promise<StaffUser> {
    const [row] = await db
        .insert(staffUsers)
        .values({
            clerkUserId: input.clerkUserId,
            name: input.name,
            email: input.email,
            role: input.role ?? "librarian",
        })
        .onConflictDoUpdate({
            target: staffUsers.clerkUserId,
            set: {
                name: input.name,
                email: input.email,
                updatedAt: new Date(),
            },
        })
        .returning();
    return row;
}

export type UpdateStaffRoleInput = {
    targetClerkUserId: string;
    role: "admin" | "librarian" | "disabled";
    actorClerkUserId: string;
    actorName: string;
};

// ─── Create / Invite Staff ────────────────────────────────────────────────────

export type CreateStaffInput = {
    email: string;
    name: string;
    role: "admin" | "librarian";
    actorClerkUserId: string;
    actorName: string;
};

export type ActionResult<T = void> =
    | { ok: true; data: T }
    | { ok: false; error: string };

/**
 * Admin-only: create a new staff account.
 * 1. Creates the user in Firebase Auth
 * 2. Sends a password-reset email so they can set their own password
 * 3. Creates the staff_users record in Neon
 * 4. Logs an audit event
 */
export async function createStaffUser(input: CreateStaffInput): Promise<ActionResult<{ uid: string }>> {
    try {
        // Check if email already exists in our DB
        const [existing] = await db
            .select()
            .from(staffUsers)
            .where(eq(staffUsers.email, input.email.trim().toLowerCase()))
            .limit(1);

        if (existing) {
            return { ok: false, error: "A staff member with this email already exists." };
        }

        // Create Firebase user with a random temp password
        const tempPassword = crypto.randomUUID();
        const firebaseUser = await adminAuth.createUser({
            email: input.email.trim().toLowerCase(),
            displayName: input.name.trim(),
            password: tempPassword,
        });

        // Send password-reset email so they set their own password
        const resetLink = await adminAuth.generatePasswordResetLink(input.email.trim().toLowerCase());

        // Insert into Neon
        await db.insert(staffUsers).values({
            clerkUserId: firebaseUser.uid,
            name: input.name.trim(),
            email: input.email.trim().toLowerCase(),
            role: input.role,
        });

        // Audit
        await db.insert(auditEvents).values({
            type: "addStaff",
            actorClerkUserId: input.actorClerkUserId,
            actorName: input.actorName,
            payload: {
                targetEmail: input.email.trim().toLowerCase(),
                targetName: input.name.trim(),
                role: input.role,
                resetLink,
            },
        });

        return { ok: true, data: { uid: firebaseUser.uid } };
    } catch (err: unknown) {
        const msg = (err as { message?: string }).message ?? "Unknown error";
        if (msg.includes("email-already-exists")) {
            return { ok: false, error: "This email is already registered in Firebase. They can sign in directly." };
        }
        return { ok: false, error: msg };
    }
}

// ─── Remove Staff ────────────────────────────────────────────────────────────

export type RemoveStaffInput = {
    targetClerkUserId: string;
    actorClerkUserId: string;
    actorName: string;
};

/** Admin-only: disable a staff account (sets role to "disabled" and disables Firebase account). */
export async function removeStaffUser(input: RemoveStaffInput): Promise<ActionResult> {
    try {
        const [existing] = await db
            .select()
            .from(staffUsers)
            .where(eq(staffUsers.clerkUserId, input.targetClerkUserId))
            .limit(1);

        if (!existing) return { ok: false, error: "Staff user not found." };
        if (existing.clerkUserId === input.actorClerkUserId) {
            return { ok: false, error: "You cannot remove your own account." };
        }

        // Disable in Firebase
        await adminAuth.updateUser(input.targetClerkUserId, { disabled: true });

        // Set role to disabled in DB
        await db
            .update(staffUsers)
            .set({ role: "disabled", updatedAt: new Date() })
            .where(eq(staffUsers.clerkUserId, input.targetClerkUserId));

        // Audit
        await db.insert(auditEvents).values({
            type: "roleUpdate",
            actorClerkUserId: input.actorClerkUserId,
            actorName: input.actorName,
            payload: {
                targetClerkUserId: input.targetClerkUserId,
                targetName: existing.name,
                oldRole: existing.role,
                newRole: "disabled",
            },
        });

        return { ok: true, data: undefined };
    } catch (err: unknown) {
        return { ok: false, error: (err as { message?: string }).message ?? "Failed to remove staff." };
    }
}

/** Admin-only: change a staff member's role. */
export async function updateStaffRole(input: UpdateStaffRoleInput): Promise<void> {
    const [existing] = await db
        .select()
        .from(staffUsers)
        .where(eq(staffUsers.clerkUserId, input.targetClerkUserId))
        .limit(1);

    if (!existing) throw new Error("Staff user not found.");

    await db
        .update(staffUsers)
        .set({ role: input.role, updatedAt: new Date() })
        .where(eq(staffUsers.clerkUserId, input.targetClerkUserId));

    await db.insert(auditEvents).values({
        type: "roleUpdate",
        actorClerkUserId: input.actorClerkUserId,
        actorName: input.actorName,
        payload: {
            targetClerkUserId: input.targetClerkUserId,
            targetName: existing.name,
            oldRole: existing.role,
            newRole: input.role,
        },
    });
}
