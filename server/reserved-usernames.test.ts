import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isReservedUsername,
  RESERVED_USERNAMES,
  RESERVED_USERNAME_ERROR_MESSAGE,
} from "../shared/reserved-usernames";
import { usernameSchema } from "./routes/_shared";
import {
  normalizeUsernameSeed,
  generateUniqueUsername,
  generateUsernameSuggestions,
} from "./user-helpers";

describe("Reserved Usernames Protection", () => {
  describe("isReservedUsername", () => {
    it("identifies application route names as reserved", () => {
      const routes = [
        "admin",
        "administrator",
        "api",
        "app",
        "assets",
        "auth",
        "blog",
        "buyer",
        "buyers",
        "checkout",
        "contact",
        "dashboard",
        "deals",
        "dispute",
        "disputes",
        "escrow",
        "faq",
        "featured",
        "help",
        "home",
        "index",
        "legal",
        "login",
        "logout",
        "middelmen",
        "notifications",
        "order",
        "orders",
        "payment",
        "payments",
        "privacy",
        "profile",
        "register",
        "reviews",
        "robots.txt",
        "search",
        "seller",
        "sellers",
        "settings",
        "signin",
        "signout",
        "signup",
        "sitemap",
        "sitemap.xml",
        "support",
        "terms",
        "terms-of-service",
        "transactions",
        "trust",
        "user",
        "users",
        "verify",
        "webhook",
      ];
      for (const route of routes) {
        assert.equal(
          isReservedUsername(route),
          true,
          `Expected '${route}' to be reserved`,
        );
      }
    });

    it("identifies brand names and variations as reserved", () => {
      const brandNames = [
        "middelmen",
        "middleman",
        "middelman",
        "middel.men",
        "middle.man",
        "middel_men",
        "trusthread",
        "official",
      ];
      for (const brand of brandNames) {
        assert.equal(
          isReservedUsername(brand),
          true,
          `Expected '${brand}' to be reserved`,
        );
      }
    });

    it("is case-insensitive", () => {
      assert.equal(isReservedUsername("Admin"), true);
      assert.equal(isReservedUsername("ADMIN"), true);
      assert.equal(isReservedUsername("Dashboard"), true);
      assert.equal(isReservedUsername("MiddelMen"), true);
      assert.equal(isReservedUsername("TeRms"), true);
    });

    it("detects reserved words with surrounding punctuation", () => {
      assert.equal(isReservedUsername("_admin_"), true);
      assert.equal(isReservedUsername(".terms."), true);
      assert.equal(isReservedUsername("-about-"), true);
      assert.equal(isReservedUsername("..dashboard.."), true);
    });

    it("allows valid non-reserved usernames", () => {
      const validUsernames = [
        "alice",
        "bob_builder",
        "seller-pro",
        "tech.store",
        "admin1",
        "aboutus",
        "terms123",
        "supermarket",
      ];
      for (const valid of validUsernames) {
        assert.equal(
          isReservedUsername(valid),
          false,
          `Expected '${valid}' to NOT be reserved`,
        );
      }
    });

    it("handles null, undefined, empty, and non-string inputs safely", () => {
      assert.equal(isReservedUsername(null as any), false);
      assert.equal(isReservedUsername(undefined as any), false);
      assert.equal(isReservedUsername("" as any), false);
      assert.equal(isReservedUsername(12345 as any), false);
    });
  });

  describe("usernameSchema Zod validation", () => {
    it("rejects reserved usernames with standard error message", () => {
      const reserved = ["admin", "about", "terms", "dashboard", "middelmen"];
      for (const r of reserved) {
        const result = usernameSchema.safeParse(r);
        assert.equal(result.success, false, `Expected '${r}' to fail validation`);
        if (!result.success) {
          const hasReservedMsg = result.error.issues.some((issue) =>
            issue.message.includes(RESERVED_USERNAME_ERROR_MESSAGE),
          );
          assert.equal(
            hasReservedMsg,
            true,
            `Expected error message '${RESERVED_USERNAME_ERROR_MESSAGE}' for '${r}'`,
          );
        }
      }
    });

    it("accepts valid, non-reserved usernames", () => {
      const valid = ["admin1", "seller_shop", "my.store", "john-doe"];
      for (const v of valid) {
        const result = usernameSchema.safeParse(v);
        assert.equal(result.success, true, `Expected '${v}' to be valid`);
      }
    });
  });

  describe("normalizeUsernameSeed", () => {
    it("normalizes and sanitizes username seeds properly", () => {
      assert.equal(normalizeUsernameSeed("Admin User"), "adminuser");
      assert.equal(normalizeUsernameSeed("John.Doe@example.com"), "john.doeexample.com");
      assert.equal(normalizeUsernameSeed("___test___"), "test");
      assert.equal(normalizeUsernameSeed(""), "user");
    });
  });

  describe("generateUniqueUsername & generateUsernameSuggestions", () => {
    it("skips reserved words when generating unique username for Google sign-up", async () => {
      const { db } = await import("./db");
      const origSelect = db.select;
      (db as any).select = () => ({
        from: () => ({
          where: () => Promise.resolve([]),
        }),
      });

      try {
        // Seed is "admin"
        const generated = await generateUniqueUsername("admin");
        assert.equal(generated, "admin1");

        // Seed is "about"
        const generatedAbout = await generateUniqueUsername("about");
        assert.equal(generatedAbout, "about1");

        // Seed is "middelmen"
        const generatedBrand = await generateUniqueUsername("middelmen");
        assert.equal(generatedBrand, "middelmen1");

        // Normal seed
        const generatedNormal = await generateUniqueUsername("normaluser");
        assert.equal(generatedNormal, "normaluser");
      } finally {
        (db as any).select = origSelect;
      }
    });

    it("does not suggest reserved words in generateUsernameSuggestions", async () => {
      const { db } = await import("./db");
      const origSelect = db.select;
      (db as any).select = () => ({
        from: () => ({
          where: () => Promise.resolve([]),
        }),
      });

      try {
        const suggestions = await generateUsernameSuggestions("admin", 5);
        assert.equal(suggestions.length, 5);
        for (const sug of suggestions) {
          assert.equal(
            isReservedUsername(sug),
            false,
            `Suggestion '${sug}' should not be reserved`,
          );
        }
      } finally {
        (db as any).select = origSelect;
      }
    });
  });
});

