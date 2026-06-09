import assert from "node:assert/strict";
import { describe, it } from "node:test";

process.env.DATABASE_URL ||= "postgres://test:test@localhost:5432/test";
process.env.REVIEW_HASH_SALT ||= "test-salt";
process.env.APP_URL ||= "https://middelmen.com";

import { buildMetaTags, rewriteHtml } from "./ssr-meta";

const BASE_URL = "https://middelmen.com";

const makeTestProfile = (
  overrides: Partial<{
    username: string;
    displayName: string;
    bio: string | null;
    avatarUrl: string | null;
    isVerified: boolean;
    avgRating: number;
    totalReviews: number;
  }> = {},
) => ({
  username: "test-seller",
  displayName: "Test Seller",
  bio: "A trusted seller bio",
  avatarUrl: null,
  isVerified: false,
  avgRating: 4.5,
  totalReviews: 12,
  ...overrides,
});

describe("ssr-meta: JSON-LD structured data", () => {
  it("no Person object contains aggregateRating (seller with reviews)", () => {
    const profile = makeTestProfile({ avgRating: 4.5, totalReviews: 12 });
    const meta = buildMetaTags(profile, BASE_URL);
    const jsonLd = JSON.parse(meta.jsonLd);

    // The top-level type should be ProfilePage
    assert.equal(jsonLd["@type"], "ProfilePage");

    // mainEntity should be a Person
    assert.equal(jsonLd.mainEntity["@type"], "Person");

    // Person MUST NOT contain aggregateRating (Google rejects this)
    assert.equal(
      jsonLd.mainEntity.aggregateRating,
      undefined,
      "Person schema must not contain aggregateRating — Google does not support it",
    );
  });

  it("no Person object contains aggregateRating (seller with zero reviews)", () => {
    const profile = makeTestProfile({ avgRating: 0, totalReviews: 0 });
    const meta = buildMetaTags(profile, BASE_URL);
    const jsonLd = JSON.parse(meta.jsonLd);

    assert.equal(jsonLd.mainEntity["@type"], "Person");
    assert.equal(jsonLd.mainEntity.aggregateRating, undefined);
  });

  it("no invalid Review or AggregateRating schema is emitted anywhere in JSON-LD", () => {
    const profile = makeTestProfile({ avgRating: 4.8, totalReviews: 100 });
    const meta = buildMetaTags(profile, BASE_URL);
    const jsonLdStr = meta.jsonLd;

    // The serialized JSON-LD should not contain AggregateRating at all
    assert.ok(
      !jsonLdStr.includes("AggregateRating"),
      "JSON-LD must not contain AggregateRating type",
    );
    // And should not contain a standalone Review type either
    assert.ok(
      !jsonLdStr.includes('"@type":"Review"'),
      "JSON-LD must not contain standalone Review type",
    );
  });

  it("ProfilePage and Person schema are preserved", () => {
    const profile = makeTestProfile();
    const meta = buildMetaTags(profile, BASE_URL);
    const jsonLd = JSON.parse(meta.jsonLd);

    assert.equal(jsonLd["@context"], "https://schema.org");
    assert.equal(jsonLd["@type"], "ProfilePage");
    assert.equal(jsonLd.mainEntity["@type"], "Person");
    assert.equal(jsonLd.mainEntity.name, "Test Seller");
    assert.equal(jsonLd.mainEntity.alternateName, "test-seller");
  });

  it("canonical URL is https://middelmen.com/{username}", () => {
    const profile = makeTestProfile({ username: "my-shop" });
    const meta = buildMetaTags(profile, BASE_URL);

    assert.equal(meta.canonicalUrl, "https://middelmen.com/my-shop");
  });

  it("canonical URL is correctly encoded for special characters", () => {
    const profile = makeTestProfile({ username: "seller with spaces" });
    const meta = buildMetaTags(profile, BASE_URL);

    assert.equal(
      meta.canonicalUrl,
      "https://middelmen.com/seller%20with%20spaces",
    );
  });
});

describe("ssr-meta: rewriteHtml", () => {
  const sampleHtml = `<!DOCTYPE html>
<html>
<head>
<title>Old Title</title>
<meta name="description" content="old desc" />
</head>
<body><div id="root"></div></body>
</html>`;

  it("injects profile meta tags into HTML", () => {
    const profile = makeTestProfile();
    const meta = buildMetaTags(profile, BASE_URL);
    const result = rewriteHtml(sampleHtml, meta);

    // Should contain the new title
    assert.ok(result.includes("<title>Test Seller | MiddelMen Trust Profile</title>"));
    // Should contain canonical
    assert.ok(result.includes('rel="canonical"'));
    assert.ok(result.includes("https://middelmen.com/test-seller"));
    // Should contain OG tags
    assert.ok(result.includes('property="og:title"'));
    assert.ok(result.includes('property="og:description"'));
    assert.ok(result.includes('property="og:image"'));
    assert.ok(result.includes('property="og:url"'));
    // Should contain Twitter tags
    assert.ok(result.includes('name="twitter:card"'));
    assert.ok(result.includes('name="twitter:title"'));
  });

  it("injected JSON-LD does not contain aggregateRating", () => {
    const profile = makeTestProfile({ avgRating: 4.8, totalReviews: 50 });
    const meta = buildMetaTags(profile, BASE_URL);
    const result = rewriteHtml(sampleHtml, meta);

    // Extract the JSON-LD script content
    const match = result.match(
      /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
    );
    assert.ok(match, "JSON-LD script tag should be present in HTML");

    const jsonLd = JSON.parse(match![1]);
    assert.equal(jsonLd["@type"], "ProfilePage");
    assert.equal(jsonLd.mainEntity["@type"], "Person");
    assert.equal(
      jsonLd.mainEntity.aggregateRating,
      undefined,
      "Person schema in HTML must not contain aggregateRating",
    );
  });

  it("removes old title and description to prevent duplicates", () => {
    const profile = makeTestProfile();
    const meta = buildMetaTags(profile, BASE_URL);
    const result = rewriteHtml(sampleHtml, meta);

    // Should not contain the old title
    assert.ok(!result.includes("Old Title"));
    // Should not contain the old description
    assert.ok(!result.includes("old desc"));
  });
});
