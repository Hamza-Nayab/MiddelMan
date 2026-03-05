import "dotenv/config";
import { z } from "zod";

// Frontend normalization simulation
const normalizeToE164 = (input: string): string | null => {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;

  // Simulate E.164 conversion
  const normalized = trimmed.startsWith("+") ? `+${digits}` : `+${digits}`;

  if (!/^\+[1-9]\d{7,14}$/.test(normalized)) return null;

  return normalized;
};

// Backend validation schema
const profileUpdateSchema = z.object({
  phoneNumber: z
    .string()
    .regex(/^\+[1-9]\d{7,14}$/, "Invalid E.164 phone format")
    .optional(),
  whatsappNumber: z
    .string()
    .regex(/^\+[1-9]\d{6,14}$/, "Invalid E.164 phone format")
    .optional(),
  contactEmail: z.string().email().max(254).optional(),
});

// Test cases from the screenshot
const testCases = [
  {
    name: "Contact Email",
    input: { contactEmail: "hamza.nayab47@gmail.com" },
  },
  {
    name: "Phone Number (with spaces)",
    input: { phoneNumber: normalizeToE164("+92 315 0015497") },
  },
  {
    name: "WhatsApp Number (with spaces)",
    input: { whatsappNumber: normalizeToE164("+971 55 724 6461") },
  },
  {
    name: "All fields combined",
    input: {
      contactEmail: "hamza.nayab47@gmail.com",
      phoneNumber: normalizeToE164("+92 315 0015497"),
      whatsappNumber: normalizeToE164("+971 55 724 6461"),
    },
  },
];

console.log("Testing phone validation...\n");

testCases.forEach((testCase) => {
  console.log(`Test: ${testCase.name}`);
  console.log(`Input:`, testCase.input);

  try {
    const validated = profileUpdateSchema.parse(testCase.input);
    console.log("✅ PASS - Validation succeeded");
    console.log("Validated data:", validated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.log("❌ FAIL - Validation errors:");
      error.errors.forEach((err) => {
        console.log(`  - ${err.path.join(".")}: ${err.message}`);
      });
    } else {
      console.log("❌ FAIL - Unknown error:", error);
    }
  }
  console.log("---\n");
});
