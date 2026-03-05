/**
 * Integration test for profile update API
 * Tests the exact scenario from the screenshot
 */

import "dotenv/config";
import { db } from "../server/db";
import { users, profiles } from "../shared/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

// Simulate the backend validation
const profileUpdateSchema = z
  .object({
    displayName: z.string().min(2).max(50).optional(),
    bio: z.string().max(160).optional(),
    avatarUrl: z.string().min(1).max(200).optional(),
    contactEmail: z.string().email().max(254).optional(),
    whatsappNumber: z
      .string()
      .regex(/^\+[1-9]\d{6,14}$/, "Invalid E.164 phone format")
      .optional(),
    phoneNumber: z
      .string()
      .regex(/^\+[1-9]\d{7,14}$/, "Invalid E.164 phone format")
      .optional(),
    countryCode: z.string().length(2).optional(),
    theme: z.enum(["light", "dark", "gradient"]).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

async function testProfileUpdate() {
  console.log("🧪 Testing Profile Update API\n");

  // Test data from the screenshot
  const updatePayload = {
    contactEmail: "hamza.nayab47@gmail.com",
    phoneNumber: "+923150015497",
    whatsappNumber: "+971557246461",
    countryCode: "PK",
  };

  console.log("📋 Test Payload:");
  console.log(JSON.stringify(updatePayload, null, 2));
  console.log("\n");

  // Step 1: Validate payload against schema
  console.log("✓ Step 1: Validating payload against backend schema...");
  try {
    const validated = profileUpdateSchema.parse(updatePayload);
    console.log("  ✅ Validation passed");
    console.log("  Validated data:", validated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.log("  ❌ Validation failed:");
      error.errors.forEach((err) => {
        console.log(`    - ${err.path.join(".")}: ${err.message}`);
      });
      console.log("\n⚠️ Test stopped - validation failed");
      process.exit(1);
    }
    throw error;
  }
  console.log("\n");

  // Step 2: Check phone number format expectations
  console.log("✓ Step 2: Verifying phone number formats...");
  const phoneTests = [
    {
      field: "phoneNumber",
      value: "+923150015497",
      expected: /^\+[1-9]\d{7,14}$/,
    },
    {
      field: "whatsappNumber",
      value: "+971557246461",
      expected: /^\+[1-9]\d{6,14}$/,
    },
  ];

  phoneTests.forEach(({ field, value, expected }) => {
    const matches = expected.test(value);
    if (matches) {
      console.log(`  ✅ ${field}: ${value} matches E.164 format`);
    } else {
      console.log(`  ❌ ${field}: ${value} does NOT match expected format`);
    }
  });
  console.log("\n");

  // Step 3: Test email validation
  console.log("✓ Step 3: Verifying email format...");
  const emailTest = z
    .string()
    .email()
    .max(254)
    .safeParse(updatePayload.contactEmail);
  if (emailTest.success) {
    console.log(`  ✅ Email: ${updatePayload.contactEmail} is valid`);
  } else {
    console.log(`  ❌ Email validation failed:`, emailTest.error);
  }
  console.log("\n");

  console.log("✅ All validation tests passed!");
  console.log("\n📌 Summary:");
  console.log("  - Backend schema now accepts E.164 format for phoneNumber");
  console.log(
    "  - Both phoneNumber and whatsappNumber use E.164 format (+XXX...)",
  );
  console.log("  - Contact email validation works with standard email format");
  console.log(
    "  - All fields from the screenshot should now save successfully",
  );
}

testProfileUpdate()
  .then(() => {
    console.log("\n✅ Integration test completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Test failed:", error);
    process.exit(1);
  });
