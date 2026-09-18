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
    assert.ok(result.includes('property="og:site_name" content="MiddelMen"'));
    assert.ok(result.includes('property="og:title"'));
    assert.ok(result.includes('property="og:description"'));
    assert.ok(result.includes('property="og:image"'));
    assert.ok(result.includes('property="og:image:secure_url"'));
    assert.ok(result.includes('property="og:image:type" content="image/jpeg"'));
    assert.ok(result.includes('property="og:image:width" content="1920"'));
    assert.ok(result.includes('property="og:image:height" content="1080"'));
    assert.ok(result.includes('property="og:url"'));
    // Should contain Twitter tags
    assert.ok(result.includes('name="twitter:card" content="summary_large_image"'));
    assert.ok(result.includes('name="twitter:site" content="@middelman"'));
    assert.ok(result.includes('name="twitter:title"'));
    assert.ok(result.includes('name="twitter:image"'));
  });

  it("trims display name and falls back to username cleanly", () => {
    const profileWithSpaces = makeTestProfile({
      displayName: "  Spaced Seller  ",
      username: "clean_username",
    });
    const meta1 = buildMetaTags(profileWithSpaces, BASE_URL);
    assert.equal(meta1.title, "Spaced Seller | MiddelMen Trust Profile");

    const profileEmptyDisplay = makeTestProfile({
      displayName: "   ",
      username: "clean_username",
    });
    const meta2 = buildMetaTags(profileEmptyDisplay, BASE_URL);
    assert.equal(meta2.title, "clean_username | MiddelMen Trust Profile");
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

  it("injects explicit robots index tag and removes any old robots tag", () => {
    const htmlWithOldRobots = `<!DOCTYPE html>
<html>
<head>
<title>Title</title>
<meta name="robots" content="noindex, nofollow" />
</head>
<body><div id="root"></div></body>
</html>`;
    const profile = makeTestProfile();
    const meta = buildMetaTags(profile, BASE_URL);
    const result = rewriteHtml(htmlWithOldRobots, meta);

    assert.ok(!result.includes('content="noindex, nofollow"'), "Must remove old noindex tag");
    assert.ok(
      result.includes('<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />'),
      "Must inject standard robots index meta tag",
    );
  });

  it("injects __INITIAL_PROFILE_BUNDLE__ script and SSR crawler prerender HTML when provided", () => {
    const profile = makeTestProfile();
    const fakeBundle = { user: { id: 1, username: "test-seller" }, profile: { displayName: "Test Seller" } };
    const fakePrerender = '<div id="ssr-profile-prerender"><h1>Test Seller</h1></div>';
    const meta = buildMetaTags(profile, BASE_URL, {
      initialBundle: fakeBundle,
      prerenderHtml: fakePrerender,
    });
    const result = rewriteHtml(sampleHtml, meta);

    assert.ok(result.includes('id="__INITIAL_PROFILE_BUNDLE__"'), "Must include initial bundle script tag");
    assert.ok(result.includes('"username":"test-seller"'), "Must contain bundle json content");
    assert.ok(result.includes('<div id="root"><div id="ssr-profile-prerender"><h1>Test Seller</h1></div></div>'), "Must inject prerender inside #root");
  });
});
