import {
    pgTable,
    uuid,
    text,
    integer,
    timestamp,
    jsonb,
    pgEnum,
    uniqueIndex,
    index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const staffRoleEnum = pgEnum("staff_role", [
    "admin",
    "librarian",
    "disabled",
]);

export const memberStatusEnum = pgEnum("member_status", [
    "active",
    "blocked",
    "expired",
]);

export const bookStatusEnum = pgEnum("book_status", [
    "available",
    "on_loan",
    "lost",
    "damaged",
]);

export const loanStatusEnum = pgEnum("loan_status", ["active", "returned"]);

// ─── Tables ───────────────────────────────────────────────────────────────────

export const staffUsers = pgTable("staff_users", {
    id: uuid("id").primaryKey().defaultRandom(),
    clerkUserId: text("clerk_user_id").unique().notNull(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    role: staffRoleEnum("role").notNull().default("librarian"),
    createdAt: timestamp("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
});

export const members = pgTable(
    "members",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        memberNumber: text("member_number").unique().notNull(),
        name: text("name").notNull(),
        guardianName: text("guardian_name").notNull(),
        email: text("email"), // guardian email, nullable
        phone: text("phone").notNull(), // guardian phone
        status: memberStatusEnum("status").notNull().default("active"),
        expiryDate: timestamp("expiry_date", { withTimezone: true }).notNull(),
        outstandingFineFils: integer("outstanding_fine_fils").notNull().default(0),
        createdAt: timestamp("created_at", { withTimezone: true })
            .notNull()
            .defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true })
            .notNull()
            .defaultNow(),
    },
    (t) => [
        index("members_name_idx").on(t.name),
        index("members_status_idx").on(t.status),
    ]
);

export const books = pgTable(
    "books",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        code: text("code").unique().notNull(), // barcode / book number e.g. "EN001"
        title: text("title").notNull(),
        author: text("author").notNull(),
        isbn: text("isbn"), // nullable; NOT unique (multiple copies allowed)
        status: bookStatusEnum("status").notNull().default("available"),
        createdAt: timestamp("created_at", { withTimezone: true })
            .notNull()
            .defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true })
            .notNull()
            .defaultNow(),
    },
    (t) => [
        index("books_title_idx").on(t.title),
        index("books_status_idx").on(t.status),
        index("books_code_idx").on(t.code),
    ]
);

export const loans = pgTable(
    "loans",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        bookId: uuid("book_id")
            .notNull()
            .references(() => books.id),
        bookTitle: text("book_title").notNull(), // denormalized
        memberId: uuid("member_id")
            .notNull()
            .references(() => members.id),
        memberName: text("member_name").notNull(), // denormalized
        issuedAt: timestamp("issued_at", { withTimezone: true }).notNull(),
        dueDate: timestamp("due_date", { withTimezone: true }).notNull(),
        returnedAt: timestamp("returned_at", { withTimezone: true }),
        status: loanStatusEnum("status").notNull().default("active"),
        fineFils: integer("fine_fils").notNull().default(0),
        fineOverriddenBy: text("fine_overridden_by"),
        fineOverrideReason: text("fine_override_reason"),
        createdAt: timestamp("created_at", { withTimezone: true })
            .notNull()
            .defaultNow(),
    },
    (t) => [
        // Prevent double-loan of the same book copy
        uniqueIndex("loans_active_book_unique_idx")
            .on(t.bookId)
            .where(sql`status = 'active'`),
        index("loans_member_status_idx").on(t.memberId, t.status),
        index("loans_due_date_status_idx").on(t.dueDate, t.status),
        index("loans_book_status_idx").on(t.bookId, t.status),
        index("loans_member_status_returned_idx").on(
            t.memberId,
            t.status,
            t.returnedAt
        ),
    ]
);

export const auditEvents = pgTable(
    "audit_events",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        type: text("type").notNull(), // issue | return | adjustFine | addBook | editBook | addMember | editMember | settingsUpdate | roleUpdate
        actorClerkUserId: text("actor_clerk_user_id").notNull(),
        actorName: text("actor_name").notNull(),
        bookId: text("book_id"), // book code (nullable)
        memberId: text("member_id"), // member number (nullable)
        payload: jsonb("payload").notNull().default({}),
        createdAt: timestamp("created_at", { withTimezone: true })
            .notNull()
            .defaultNow(),
    },
    (t) => [
        index("audit_events_type_created_idx").on(t.type, t.createdAt),
        index("audit_events_actor_created_idx").on(
            t.actorClerkUserId,
            t.createdAt
        ),
        index("audit_events_created_idx").on(t.createdAt),
    ]
);

export const settings = pgTable("settings", {
    id: integer("id").primaryKey().default(1),
    loanPeriodDays: integer("loan_period_days").notNull().default(14),
    maxBooksPerMember: integer("max_books_per_member").notNull().default(3),
    finePerDayFils: integer("fine_per_day_fils").notNull().default(100), // 1 AED/day
    updatedAt: timestamp("updated_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedBy: text("updated_by").notNull().default("system"),
});

export const memberCounter = pgTable("member_counter", {
    id: integer("id").primaryKey().default(1),
    lastId: integer("last_id").notNull().default(0),
});

// ─── Type exports ─────────────────────────────────────────────────────────────

export type StaffUser = typeof staffUsers.$inferSelect;
export type NewStaffUser = typeof staffUsers.$inferInsert;

export type Member = typeof members.$inferSelect;
export type NewMember = typeof members.$inferInsert;

export type Book = typeof books.$inferSelect;
export type NewBook = typeof books.$inferInsert;

export type Loan = typeof loans.$inferSelect;
export type NewLoan = typeof loans.$inferInsert;

export type AuditEvent = typeof auditEvents.$inferSelect;
export type NewAuditEvent = typeof auditEvents.$inferInsert;

export type Settings = typeof settings.$inferSelect;

export type MemberCounter = typeof memberCounter.$inferSelect;
