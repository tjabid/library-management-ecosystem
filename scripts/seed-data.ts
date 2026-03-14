/**
 * Seed script: insert books (from books.md) and mock members into Neon.
 *
 * Usage:
 *   npx ts-node -P scripts/tsconfig.json scripts/seed-data.ts
 *
 * The script is idempotent — rows that already exist (by code / member_number)
 * are skipped.  Run it as many times as you like.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { books, members, memberCounter, settings } from "../lib/db/schema";

if (!process.env.DATABASE_URL) {
    console.error("❌  DATABASE_URL is not set. Check your .env.local file.");
    process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql);

// ─── Books ────────────────────────────────────────────────────────────────────

const BOOKS_DATA = [
    { code: "EN001", title: "Know Why", author: "Wordworx Team" },
    { code: "EN002", title: "I Wonder Why Camels Have Humps And Other Questions About Animals", author: "Anita Ganeri" },
    { code: "EN003", title: "A Day In The Life Of A Beekeeper", author: "Penny Michels and Judith Tropea" },
    { code: "EN004", title: "My First Book Of The Human Body", author: "Dr. John H.R. Brook" },
    { code: "EN005", title: "Big Bird's Sesame Street Dictionary", author: "Linda Hayward" },
    { code: "EN006", title: "Living Dinosaurs", author: "Jonathan And Angela Scott" },
    { code: "EN007", title: "The Fun-To-Learn Picture Encyclopedia", author: "Anne McKie" },
    { code: "EN008", title: "A Day In The Life Of A Marine Biologist", author: "David Paige" },
    { code: "EN009", title: "Oxford Children's Pocket Book Of Facts", author: "John Stidworthy" },
    { code: "EN010", title: "Mighty Mammals Of The Past", author: "Carole Hay" },
    { code: "EN011", title: "The Young Children's Encyclopedia Vol 8", author: "Barbara Taylor" },
    { code: "EN012", title: "Ladybird Computers", author: "Carl G. Moore" },
    { code: "EN013", title: "In The Rainforest", author: "Keith Faulkner" },
    { code: "EN014", title: "The Fishing Dictionary: Everything You'll Say About The One That Got Away", author: "Brenda Apsley" },
    { code: "EN015", title: "First Questions About The Human Body", author: "Peter Robson" },
    { code: "EN016", title: "My First Book Of Questions And Answers", author: "Nancy Goodman" },
    { code: "EN017", title: "My First Picture Atlas", author: "Young Discovery Series" },
    { code: "EN018", title: "Discover How Things Work", author: "Young Discovery Series" },
    { code: "EN019", title: "Animals", author: "Young Discovery Series" },
    { code: "EN020", title: "Earth", author: "Mandy Holloway" },
    { code: "EN021", title: "Universe", author: "Harcourt School Publishers" },
    { code: "EN022", title: "The Children's Encyclopedia Of Animals", author: "Dorling Kindersley" },
    { code: "EN023", title: "Harcourt Science", author: "Laura Buller Carey Scott" },
    { code: "EN024", title: "Ultimate Visual Dictionary", author: "Scholastic" },
    { code: "EN025", title: "Dinosaurium", author: "World Book" },
    { code: "EN026", title: "Children's Dictionary", author: "World Book" },
    { code: "EN027", title: "The Green Kingdom", author: "Sumer-nots Show Daim" },
    { code: "EN028", title: "Childcraft Dictionary", author: "World Book" },
];

// ─── Members ──────────────────────────────────────────────────────────────────

// Expiry dates relative to the seed date (2026-03-07)
const d = (offsetDays: number) => new Date(Date.now() + offsetDays * 86_400_000);

const MEMBERS_DATA = [
    {
        memberNumber: "1",
        name: "Aisha Mohammed Al-Rashid",
        guardianName: "Mohammed Al-Rashid",
        email: "m.alrashid@gmail.com",
        phone: "+971501234567",
        status: "active" as const,
        expiryDate: d(365),
    },
    {
        memberNumber: "2",
        name: "Omar Abdullah Hassan",
        guardianName: "Abdullah Hassan",
        email: "a.hassan@hotmail.com",
        phone: "+971509876543",
        status: "active" as const,
        expiryDate: d(240),
    },
    {
        memberNumber: "3",
        name: "Fatima Khalid Al-Mansouri",
        guardianName: "Khalid Al-Mansouri",
        email: null,
        phone: "+971551122334",
        status: "active" as const,
        expiryDate: d(180),
    },
    {
        memberNumber: "4",
        name: "Yusuf Ibrahim Nasser",
        guardianName: "Ibrahim Nasser",
        email: "i.nasser@yahoo.com",
        phone: "+971526667788",
        status: "active" as const,
        expiryDate: d(300),
    },
    {
        memberNumber: "5",
        name: "Mariam Saeed Al-Zaabi",
        guardianName: "Saeed Al-Zaabi",
        email: null,
        phone: "+971509990011",
        status: "active" as const,
        expiryDate: d(15),   // expiring soon
    },
    {
        memberNumber: "6",
        name: "Hassan Ali Al-Farsi",
        guardianName: "Ali Al-Farsi",
        email: "ali.alfarsi@outlook.com",
        phone: "+971554433221",
        status: "active" as const,
        expiryDate: d(410),
    },
    {
        memberNumber: "7",
        name: "Zainab Tariq Al-Qasimi",
        guardianName: "Tariq Al-Qasimi",
        email: "t.alqasimi@gmail.com",
        phone: "+971506655443",
        status: "blocked" as const,
        expiryDate: d(200),
    },
    {
        memberNumber: "8",
        name: "Adam Bilal Siddiqui",
        guardianName: "Bilal Siddiqui",
        email: "b.siddiqui@gmail.com",
        phone: "+971521234321",
        status: "active" as const,
        expiryDate: d(90),
    },
    {
        memberNumber: "9",
        name: "Nour Faisal Al-Blooshi",
        guardianName: "Faisal Al-Blooshi",
        email: null,
        phone: "+971505556677",
        status: "expired" as const,
        expiryDate: d(-30),  // already expired
    },
    {
        memberNumber: "10",
        name: "Khalid Rashid Al-Nuaimi",
        guardianName: "Rashid Al-Nuaimi",
        email: "r.alnuaimi@hotmail.com",
        phone: "+971557788990",
        status: "active" as const,
        expiryDate: d(500),
    },
    {
        memberNumber: "11",
        name: "Sara Ahmed Al-Mazrouei",
        guardianName: "Ahmed Al-Mazrouei",
        email: "a.almazrouei@gmail.com",
        phone: "+971509112233",
        status: "active" as const,
        expiryDate: d(270),
    },
    {
        memberNumber: "12",
        name: "Hamza Usman Chaudhry",
        guardianName: "Usman Chaudhry",
        email: "u.chaudhry@yahoo.com",
        phone: "+971553344556",
        status: "active" as const,
        expiryDate: d(60),
    },
    {
        memberNumber: "13",
        name: "Layla Jassim Al-Thani",
        guardianName: "Jassim Al-Thani",
        email: null,
        phone: "+971526677889",
        status: "expired" as const,
        expiryDate: d(-90),  // expired 90 days ago
    },
    {
        memberNumber: "14",
        name: "Ibrahim Salim Al-Ketbi",
        guardianName: "Salim Al-Ketbi",
        email: "s.alketbi@gmail.com",
        phone: "+971508899001",
        status: "active" as const,
        expiryDate: d(330),
    },
    {
        memberNumber: "15",
        name: "Rania Karim Hassan",
        guardianName: "Karim Hassan",
        email: "k.hassan@outlook.com",
        phone: "+971551122001",
        status: "active" as const,
        expiryDate: d(22),   // expiring soon
    },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    console.log("🌱  Seeding Neon database…\n");

    // 1. Books
    console.log(`📚  Inserting ${BOOKS_DATA.length} books…`);
    const bookRows = BOOKS_DATA.map((b) => ({
        code: b.code,
        title: b.title,
        author: b.author,
        isbn: null,
        status: "available" as const,
    }));
    const insertedBooks = await db
        .insert(books)
        .values(bookRows)
        .onConflictDoNothing({ target: books.code })
        .returning({ code: books.code });
    console.log(`   ✓ ${insertedBooks.length} books inserted (${BOOKS_DATA.length - insertedBooks.length} already existed)\n`);

    // 2. Members
    console.log(`👥  Inserting ${MEMBERS_DATA.length} members…`);
    const memberRows = MEMBERS_DATA.map((m) => ({
        memberNumber: m.memberNumber,
        name: m.name,
        guardianName: m.guardianName,
        email: m.email ?? null,
        phone: m.phone,
        status: m.status,
        expiryDate: m.expiryDate,
        outstandingFineFils: 0,
    }));
    const insertedMembers = await db
        .insert(members)
        .values(memberRows)
        .onConflictDoNothing({ target: members.memberNumber })
        .returning({ memberNumber: members.memberNumber });
    console.log(`   ✓ ${insertedMembers.length} members inserted (${MEMBERS_DATA.length - insertedMembers.length} already existed)\n`);

    // 3. Update member counter to the highest seeded member number
    if (insertedMembers.length > 0) {
        const highestId = MEMBERS_DATA.length;
        await db
            .insert(memberCounter)
            .values({ id: 1, lastId: highestId })
            .onConflictDoUpdate({
                target: memberCounter.id,
                set: { lastId: highestId },
            });
        console.log(`   ✓ member_counter set to ${highestId}\n`);
    }

    // 4. Default settings (skip if already seeded)
    console.log("⚙️   Seeding default settings…");
    await db
        .insert(settings)
        .values({ id: 1, loanPeriodDays: 14, maxBooksPerMember: 3, finePerDayFils: 100, updatedBy: "seed-script" })
        .onConflictDoNothing({ target: settings.id });
    console.log("   ✓ settings ready\n");

    console.log("✅  Seed complete!");
}

main().catch((err) => {
    console.error("❌  Seed failed:", err);
    process.exit(1);
});
