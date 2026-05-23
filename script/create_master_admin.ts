import "dotenv/config";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "../server/db";
import { profiles } from "../shared/schema/profiles.schema";
import { users } from "../shared/schema/users.schema";

const MASTER_ADMIN_USERNAME = "mmhamzanb";
const MASTER_ADMIN_EMAIL = "mmhamzanb@example.com";
const MASTER_ADMIN_PASSWORD = "13@Hamz12!Za99";

async function createMasterAdmin() {
  const passwordHash = await bcrypt.hash(MASTER_ADMIN_PASSWORD, 10);

  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.username, MASTER_ADMIN_USERNAME))
    .limit(1);

  let userId: number;

  if (existingUser) {
    const [updatedUser] = await db
      .update(users)
      .set({
        email: existingUser.email ?? MASTER_ADMIN_EMAIL,
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
      `Updated existing user "${MASTER_ADMIN_USERNAME}" to master admin (id=${userId})`,
    );
  } else {
    const [newUser] = await db
      .insert(users)
      .values({
        username: MASTER_ADMIN_USERNAME,
        email: MASTER_ADMIN_EMAIL,
        passwordHash,
        role: "admin",
        isMasterAdmin: true,
        isDisabled: false,
      })
      .returning();

    userId = newUser.id;
    console.log(
      `Created master admin user "${MASTER_ADMIN_USERNAME}" (id=${userId})`,
    );
  }

  const [existingProfile] = await db
    .select({ userId: profiles.userId })
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);

  if (!existingProfile) {
    await db.insert(profiles).values({
      userId,
      displayName: MASTER_ADMIN_USERNAME,
    });
    console.log(`Created profile for user id=${userId}`);
  }

  console.log("Master admin is ready:");
  console.log(`  username: ${MASTER_ADMIN_USERNAME}`);
  console.log(`  password: ${MASTER_ADMIN_PASSWORD}`);
}

createMasterAdmin().catch((error) => {
  console.error("Failed to create master admin:", error);
  process.exit(1);
});