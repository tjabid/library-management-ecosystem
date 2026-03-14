/**
 * Bootstrap first admin user.
 *
 * Requires the Firebase user to already exist in Firebase Auth.
 * This script upserts their record into the Neon staff_users table
 * and seeds default settings.
 *
 * Usage:
 *   ADMIN_FIREBASE_UID=<uid-from-firebase-console> \
 *   ADMIN_EMAIL=admin@librarymanagement.ae \
 *   ADMIN_NAME="Library Admin" \
 *   npx ts-node -P scripts/tsconfig.json scripts/seed-admin.ts
 */

import "dotenv/config";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { staffUsers, settings } from "../lib/db/schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

async function main() {
  const uid = process.env.ADMIN_FIREBASE_UID;
  const email = process.env.ADMIN_EMAIL;
  const name = process.env.ADMIN_NAME ?? "Admin";

  if (!uid || !email) {
    console.error("❌ Set ADMIN_FIREBASE_UID and ADMIN_EMAIL env vars");
    process.exit(1);
  }

  console.log(`Upserting admin staff record for: ${email} (uid: ${uid})…`);

  await db
    .insert(staffUsers)
    .values({ clerkUserId: uid, name, email, role: "admin" })
    .onConflictDoUpdate({
      target: staffUsers.clerkUserId,
      set: { name, email, role: "admin", updatedAt: new Date() },
    });

  console.log("  Upserted staff_users row with role=admin");

  // Seed default settings (singleton row id=1)
  const [existing] = await db.select().from(settings).limit(1);
  if (!existing) {
    await db.insert(settings).values({
      loanPeriodDays: 14,
      maxBooksPerMember: 3,
      finePerDayFils: 100,
      updatedBy: uid,
    });
    console.log("  Seeded default settings");
  } else {
    console.log("  Settings already exist — skipped");
  }

  console.log("\n✅ Admin user ready! They can now sign in and manage librarians via Settings.");
}

main().catch((err) => {
  console.error("❌ Failed:", err);
  process.exit(1);
});
