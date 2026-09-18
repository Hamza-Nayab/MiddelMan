import "dotenv/config";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "../server/db";
import { users } from "../shared/schema/users.schema";

const args = process.argv.slice(2);
const username = process.env.MASTER_ADMIN_USERNAME || args[0];
const email = process.env.MASTER_ADMIN_EMAIL || args[1];
const password = process.env.MASTER_ADMIN_PASSWORD || args[2];

if (!username || !password) {
  console.error(
    "Error: Master admin credentials must be provided via environment variables or CLI arguments.\n" +
      "Usage:\n" +
      "  MASTER_ADMIN_USERNAME=admin MASTER_ADMIN_EMAIL=admin@example.com MASTER_ADMIN_PASSWORD=secret npx tsx script/create_master_admin.ts\n" +
      "  OR:\n" +
      "  npx tsx script/create_master_admin.ts <username> <email> <password>"
  );
  process.exit(1);
}

const adminEmail = email || `${username}@middelmen.com`;

async function createMasterAdmin() {
  const passwordHash = await bcrypt.hash(password, 10);

  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  let userId: number;

  if (existingUser) {
    const [updatedUser] = await db
      .update(users)
      .set({
        email: existingUser.email ?? adminEmail,
        passwordHash,
        role: "admin",
        isMasterAdmin: true,
        isDisabled: false,
        disabledReason: null,
        disabledAt: null,
        disabledByAdminId: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, existingUser.id))
      .returning();

    userId = updatedUser.id;
    console.log(
      `Updated existing user "${username}" to master admin (id=${userId})`,
    );
  } else {
    const [newUser] = await db
      .insert(users)
      .values({
        username,
        email: adminEmail,
        passwordHash,
        role: "admin",
        isMasterAdmin: true,
        isDisabled: false,
      })
      .returning();

    userId = newUser.id;
    console.log(
      `Created master admin user "${username}" (id=${userId})`,
    );
  }

  console.log(`Master admin "${username}" (id=${userId}) is ready.`);
}

createMasterAdmin()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Failed to create master admin:", error);
    process.exit(1);
  });
