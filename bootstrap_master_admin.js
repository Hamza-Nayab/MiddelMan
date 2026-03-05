#!/usr/bin/env node
/**
 * MASTER ADMIN BOOTSTRAP SCRIPT
 *
 * This script safely sets isMasterAdmin=true for a chosen admin user.
 * USE THIS ONLY ONCE to set up the first master admin.
 *
 * Usage:
 *   node bootstrap_master_admin.js <userId>
 *
 * Example:
 *   node bootstrap_master_admin.js 1
 *
 * Requirements:
 * - User must exist in database
 * - User must have role='admin'
 * - User must not be disabled
 * - Only one master admin should be created initially
 */

import "dotenv/config";
import { db } from "./server/db.ts";
import { users } from "./shared/schema.ts";
import { eq } from "drizzle-orm";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("ERROR: DATABASE_URL not set");
  process.exit(1);
}

async function bootstrapMasterAdmin() {
  const userId = Number(process.argv[2]);

  if (!userId || Number.isNaN(userId) || userId < 1) {
    console.error("ERROR: Please provide a valid userId as argument");
    console.error("Usage: node bootstrap_master_admin.js <userId>");
    process.exit(1);
  }

  try {
    // Verify user exists and is an admin
    const userList = await db.select().from(users).where(eq(users.id, userId));

    if (!userList || userList.length === 0) {
      console.error(`ERROR: User with id ${userId} not found`);
      process.exit(1);
    }

    const user = userList[0];

    // Validation checks
    if (user.role !== "admin") {
      console.error(
        `ERROR: User ${userId} is not an admin (role=${user.role})`,
      );
      process.exit(1);
    }

    if (user.isDisabled) {
      console.error(`ERROR: User ${userId} is disabled`);
      process.exit(1);
    }

    if (user.isMasterAdmin) {
      console.warn(
        `WARNING: User ${userId} (${user.username}) is already a master admin`,
      );
      process.exit(0);
    }

    // Confirmation
    console.log("\n=== MASTER ADMIN BOOTSTRAP ===\n");
    console.log(`User ID: ${user.id}`);
    console.log(`Username: ${user.username}`);
    console.log(`Current Role: ${user.role}`);
    console.log(`Current Master Admin Status: ${user.isMasterAdmin}`);
    console.log("\nThis will set isMasterAdmin = true");
    console.log("Master admins can promote/demote other admins\n");

    // Ask for confirmation (in a real scenario, this could be an interactive prompt)
    console.log(
      "⚠️  IMPORTANT: Only set ONE master admin initially for security.\n",
    );

    // Update the user
    await db
      .update(users)
      .set({ isMasterAdmin: true, updatedAt: new Date() })
      .where(eq(users.id, userId));

    console.log(`✅ SUCCESS: User ${userId} is now a master admin\n`);
    console.log(`User "${user.username}" can now:`);
    console.log("  - Promote other admins (role buyer/seller -> admin)");
    console.log("  - Demote admins (role admin -> buyer/seller)");
    console.log("  - Hide/show reviews");
    console.log("  - View all reviews\n");

    process.exit(0);
  } catch (error) {
    console.error("ERROR:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

bootstrapMasterAdmin();
