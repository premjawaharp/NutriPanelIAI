/**
 * List users, verify one by Clerk id, or delete exactly one user (never bulk-deletes all).
 *
 * Usage:
 *   node scripts/db-check.mjs
 *   npm run db:users
 *   node scripts/db-check.mjs --id user_xxxxxxxxxxxxxxxxxxxxxxxx   # exists?
 *   node scripts/db-check.mjs --delete-id user_xxxxxxxxxxxxxxxxxxxxxxxx
 */
import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

const argv = process.argv.slice(2);
const deleteIdx = argv.indexOf("--delete-id");
const deleteId =
  deleteIdx !== -1 && argv[deleteIdx + 1] ? argv[deleteIdx + 1] : null;
const checkIdIdx = argv.indexOf("--id");
const checkId =
  checkIdIdx !== -1 && argv[checkIdIdx + 1] ? argv[checkIdIdx + 1] : null;

async function main() {
  if (argv.includes("--delete")) {
    console.error(
      "\n❌ Unsafe: --delete was removed. Use --delete-id <clerk_user_id> to remove one user.\n",
    );
    process.exit(1);
  }

  if (checkId) {
    if (!checkId.startsWith("user_")) {
      console.error(
        "\n❌ Expected Clerk user id (e.g. user_xxx). Got:",
        checkId,
        "\n",
      );
      process.exit(1);
    }
    const row = await db.user.findUnique({
      where: { id: checkId },
      select: { id: true, email: true, firstName: true, lastName: true, createdAt: true },
    });
    if (row) {
      console.log("\n✅ User exists in database:\n");
      console.table([row]);
    } else {
      console.log("\n❌ No user row for id:", checkId, "\n");
      process.exit(1);
    }
    return;
  }

  const users = await db.user.findMany({
    select: { id: true, email: true, firstName: true, lastName: true, createdAt: true },
  });

  console.log("\n📋 Users in database:", users.length);
  if (users.length === 0) {
    console.log("   (no users)\n");
    console.log("✅ DB query completed (empty table).\n");
    return;
  }
  console.table(users);
  console.log("✅ DB query completed.\n");

  if (deleteId) {
    if (!deleteId.startsWith("user_")) {
      console.error(
        "\n❌ Expected Clerk user id (e.g. user_xxx). Got:",
        deleteId,
        "\n",
      );
      process.exit(1);
    }
    const result = await db.user.deleteMany({ where: { id: deleteId } });
    if (result.count === 0) {
      console.log("\n⚠️  No row matched id:", deleteId, "\n");
    } else {
      console.log("\n🗑️  Deleted 1 user:", deleteId, "\n");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
