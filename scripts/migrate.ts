/**
 * Data Migration Script: Excel → Firestore
 *
 * Usage:
 *   1. Set GOOGLE_APPLICATION_CREDENTIALS to your service account JSON path
 *   2. Place Excel files:
 *        - books.xlsx   (columns: BookCode, Title, Author, ISBN, Status)
 *        - members.xlsx (columns: MemberID, Name, Email, Phone, Address, ExpiryDate, Status)
 *        - loans.xlsx   (columns: LoanID, BookCode, MemberID, IssueDate, DueDate, ReturnDate, FinePaid)
 *   3. Run: npx ts-node -P scripts/tsconfig.json scripts/migrate.ts
 *
 * Optional env vars:
 *   FIREBASE_PROJECT_ID — overrides the project in service account JSON
 *   DRY_RUN=true        — validate and log without writing to Firestore
 */

import * as admin from "firebase-admin";
import * as xlsx from "xlsx";
import * as path from "path";
import * as fs from "fs";

// ─── Init ─────────────────────────────────────────────────────────────────────

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  ...(process.env.FIREBASE_PROJECT_ID ? { projectId: process.env.FIREBASE_PROJECT_ID } : {}),
});

const db = admin.firestore();
const DRY_RUN = process.env.DRY_RUN === "true";

if (DRY_RUN) console.log("🟡 DRY RUN MODE — no data will be written\n");

// ─── Helpers ──────────────────────────────────────────────────────────────────

function readSheet(filename: string): Record<string, unknown>[] {
  const filePath = path.join(process.cwd(), "data", filename);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    process.exit(1);
  }
  const wb = xlsx.readFile(filePath);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  return xlsx.utils.sheet_to_json(sheet) as Record<string, unknown>[];
}

function generateSearchTerms(...fields: (string | undefined)[]): string[] {
  const terms = new Set<string>();
  for (const field of fields) {
    if (!field) continue;
    const words = String(field).toLowerCase().split(/[\s\-_/,;:.]+/).filter(Boolean);
    for (const word of words) {
      terms.add(word);
      for (let i = 2; i < word.length; i++) {
        terms.add(word.slice(0, i));
      }
    }
  }
  return Array.from(terms);
}

function parseDate(val: unknown): admin.firestore.Timestamp | null {
  if (!val) return null;
  // Excel serial number
  if (typeof val === "number") {
    const date = xlsx.SSF.parse_date_code(val);
    if (date) {
      const d = new Date(date.y, date.m - 1, date.d);
      return admin.firestore.Timestamp.fromDate(d);
    }
  }
  // String date
  const d = new Date(String(val));
  if (isNaN(d.getTime())) {
    console.warn(`  ⚠️  Could not parse date: ${val}`);
    return null;
  }
  return admin.firestore.Timestamp.fromDate(d);
}

async function batchWrite(
  col: FirebaseFirestore.CollectionReference,
  docs: { id: string; data: Record<string, unknown> }[]
) {
  const BATCH_SIZE = 400;
  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const chunk = docs.slice(i, i + BATCH_SIZE);
    for (const { id, data } of chunk) {
      batch.set(col.doc(id), data, { merge: true });
    }
    if (!DRY_RUN) await batch.commit();
    console.log(`  Wrote ${Math.min(i + BATCH_SIZE, docs.length)}/${docs.length}`);
  }
}

// ─── Migrate Books ─────────────────────────────────────────────────────────────

async function migrateBooks() {
  console.log("\n📚 Migrating books…");
  const rows = readSheet("books.xlsx");
  const now = admin.firestore.Timestamp.now();
  const docs = [];

  for (const row of rows) {
    const id = String(row.BookCode ?? row["Book Code"] ?? row.ID ?? "").trim();
    const title = String(row.Title ?? "").trim();
    const author = String(row.Author ?? "").trim();
    const isbn = String(row.ISBN ?? "").trim();
    const rawStatus = String(row.Status ?? "available").toLowerCase().trim();

    if (!id || !title) {
      console.warn(`  ⚠️  Skipping book with missing ID or title: ${JSON.stringify(row)}`);
      continue;
    }

    const statusMap: Record<string, string> = {
      available: "available",
      onloan: "onLoan",
      "on loan": "onLoan",
      lost: "lost",
      damaged: "damaged",
    };
    const status = statusMap[rawStatus] ?? "available";

    docs.push({
      id,
      data: {
        id,
        title,
        author,
        isbn: isbn || null,
        status,
        searchTerms: generateSearchTerms(id, title, author, isbn),
        createdAt: now,
        updatedAt: now,
      },
    });
  }

  console.log(`  Found ${docs.length} books`);
  await batchWrite(db.collection("books"), docs);
  console.log(`✅ Books done`);
  return docs.length;
}

// ─── Migrate Members ───────────────────────────────────────────────────────────

async function migrateMembers() {
  console.log("\n👤 Migrating members…");
  const rows = readSheet("members.xlsx");
  const now = admin.firestore.Timestamp.now();
  const docs = [];

  for (const row of rows) {
    const id = String(row.MemberID ?? row["Member ID"] ?? row.ID ?? "").trim();
    const name = String(row.Name ?? row["Full Name"] ?? "").trim();
    const email = String(row.Email ?? "").trim();
    const phone = String(row.Phone ?? "").trim();
    const address = String(row.Address ?? "").trim();
    const rawStatus = String(row.Status ?? "active").toLowerCase().trim();
    const expiryDate = parseDate(row.ExpiryDate ?? row["Expiry Date"]);

    if (!id || !name) {
      console.warn(`  ⚠️  Skipping member with missing ID or name: ${JSON.stringify(row)}`);
      continue;
    }

    const statusMap: Record<string, string> = {
      active: "active",
      expired: "expired",
      blocked: "blocked",
      suspended: "blocked",
    };
    const status = statusMap[rawStatus] ?? "active";

    docs.push({
      id,
      data: {
        id,
        name,
        email: email || null,
        phone: phone || null,
        address: address || null,
        expiryDate: expiryDate ?? admin.firestore.Timestamp.fromDate(new Date("2025-01-01")),
        status,
        outstandingFineFils: 0,
        activeLoanCount: 0,
        searchTerms: generateSearchTerms(id, name, email, phone),
        createdAt: now,
        updatedAt: now,
      },
    });
  }

  console.log(`  Found ${docs.length} members`);
  await batchWrite(db.collection("members"), docs);
  console.log(`✅ Members done`);
  return docs.length;
}

// ─── Seed Settings ─────────────────────────────────────────────────────────────

async function seedSettings() {
  console.log("\n⚙️  Seeding default settings…");
  if (!DRY_RUN) {
    await db.doc("settings/config").set({
      loanPeriodDays: 14,
      maxBooksPerMember: 3,
      finePerDayFils: 100, // 1 AED/day
      updatedAt: admin.firestore.Timestamp.now(),
      updatedBy: "migration-script",
    }, { merge: true });
  }
  console.log("✅ Settings done");
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🚀 Starting migration…");
  console.log(`   Project: ${process.env.FIREBASE_PROJECT_ID ?? "from service account"}`);

  const bookCount = await migrateBooks();
  const memberCount = await migrateMembers();
  await seedSettings();

  console.log("\n✅ Migration complete!");
  console.log(`   Books:   ${bookCount}`);
  console.log(`   Members: ${memberCount}`);

  if (DRY_RUN) {
    console.log("\n🟡 DRY RUN — no data was written");
  }
}

main().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
