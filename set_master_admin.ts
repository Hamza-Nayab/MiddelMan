import "dotenv/config";
import { db } from "./server/db";
import { users } from "./shared/schema";
import { eq } from "drizzle-orm";

async function setMasterAdmin() {
  // Find the admin user
  const [adminUser] = await db
    .select()
    .from(users)
    .where(eq(users.username, "admin"));

  if (!adminUser) {
    console.log("Admin user not found");
    process.exit(1);
  }

  console.log(
    "Found user:",
    adminUser.id,
    adminUser.username,
    adminUser.role,
    "isMasterAdmin:",
    adminUser.isMasterAdmin,
  );

  if (adminUser.isMasterAdmin) {
    console.log("User already has master admin permissions");
    process.exit(0);
  }

  // Update to master admin
  const [updated] = await db
    .update(users)
    .set({ isMasterAdmin: true })
    .where(eq(users.id, adminUser.id))
    .returning();

  console.log("Updated user to master admin:", updated.isMasterAdmin);
  process.exit(0);
}

setMasterAdmin();
