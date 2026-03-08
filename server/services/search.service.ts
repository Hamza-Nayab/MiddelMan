import { and, asc, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { db } from "../db";
import { profiles, reviews, users } from "@shared/schema";
import type { SearchResponse, SearchSuggestion } from "@shared/types";

const SEARCH_QUERY_MIN_LENGTH = 2;
const SEARCH_QUERY_MAX_LENGTH = 120;
const SEARCH_TOKEN_MAX_COUNT = 5;
const SEARCH_CACHE_TTL_MS = 30 * 1000;
const SEARCH_DEFAULT_PAGE_SIZE = 15;

const normalizeSearchQuery = (value: string) =>
  value.trim().replace(/\s+/g, " ").toLowerCase();

const tokenizeSearchQuery = (value: string) =>
  value
    .split(" ")
    .map((token) => token.trim())
    .filter(Boolean)
    .slice(0, SEARCH_TOKEN_MAX_COUNT);

const escapeLikePattern = (value: string) => value.replace(/[\\%_]/g, "\\$&");

const searchCache = new Map<
  string,
  {
    expiresAt: number;
    response: SearchResponse;
  }
>();

const getSearchCache = (key: string) => {
  const cached = searchCache.get(key);
  if (!cached) return null;
  if (Date.now() > cached.expiresAt) {
    searchCache.delete(key);
    return null;
  }
  return cached.response;
};

const setSearchCache = (key: string, response: SearchResponse) => {
  searchCache.set(key, {
    expiresAt: Date.now() + SEARCH_CACHE_TTL_MS,
    response,
  });
};

const emptySearchResponse: SearchResponse = {
  results: [],
  meta: {
    nextOffset: null,
    hasMore: false,
  },
};

export class SearchValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SearchValidationError";
  }
}

export type SearchExecutionResult = {
  response: SearchResponse;
  serverTiming?: string;
  cacheControl?: string;
  logLine?: string;
};

export async function executeSellerSearch(params: {
  rawQuery: string;
  rawLimit?: unknown;
  rawOffset?: unknown;
  requestId?: string;
}): Promise<SearchExecutionResult> {
  const requestStartedAt = Date.now();
  const normalizedQuery = normalizeSearchQuery(params.rawQuery);
  const parseEndedAt = Date.now();

  if (!normalizedQuery) {
    const total = Date.now() - requestStartedAt;
    return {
      response: emptySearchResponse,
      serverTiming: `parse;dur=${parseEndedAt - requestStartedAt},retrieve;dur=0,serialize;dur=0,total;dur=${total}`,
    };
  }

  if (normalizedQuery.length < SEARCH_QUERY_MIN_LENGTH) {
    return { response: emptySearchResponse };
  }

  if (normalizedQuery.length > SEARCH_QUERY_MAX_LENGTH) {
    throw new SearchValidationError("Search query is too long");
  }

  const tokens = tokenizeSearchQuery(normalizedQuery);
  if (tokens.length === 0) {
    return { response: emptySearchResponse };
  }

  const hasLimit = params.rawLimit !== undefined;
  const limitParam = hasLimit
    ? Number(params.rawLimit)
    : SEARCH_DEFAULT_PAGE_SIZE;
  const limit = Math.min(Math.max(1, limitParam), 50);
  if (hasLimit && Number.isNaN(limitParam)) {
    throw new SearchValidationError("Invalid limit");
  }

  const hasOffset = params.rawOffset !== undefined;
  const offsetParam = hasOffset ? Number(params.rawOffset) : 0;
  if (
    hasOffset &&
    (Number.isNaN(offsetParam) ||
      offsetParam < 0 ||
      !Number.isInteger(offsetParam))
  ) {
    throw new SearchValidationError("Invalid offset");
  }
  const offset = Math.max(0, offsetParam);

  const cacheKey = `${normalizedQuery}|${limit}|${offset}`;
  const cached = getSearchCache(cacheKey);
  if (cached) {
    const total = Date.now() - requestStartedAt;
    const parseMs = parseEndedAt - requestStartedAt;
    const retrieveMs = Math.max(0, total - parseMs);

    return {
      response: cached,
      cacheControl: "private, max-age=0, must-revalidate",
      serverTiming: `parse;dur=${parseMs},retrieve;dur=${retrieveMs},serialize;dur=0,total;dur=${total}`,
      logLine: `[search]${params.requestId ? ` [${params.requestId}]` : ""} q="${normalizedQuery}" offset=${offset} limit=${limit} tokens=${tokens.length} results=${cached.results.length} cache=hit parse=${parseMs}ms retrieve=${retrieveMs}ms serialize=0ms total=${total}ms`,
    };
  }

  const escapedNormalized = escapeLikePattern(normalizedQuery);
  const exactPattern = escapedNormalized;
  const prefixPattern = `${escapedNormalized}%`;
  const containsPattern = `%${escapedNormalized}%`;

  const matchByToken = tokens.map((token) => {
    const escaped = escapeLikePattern(token);
    const pattern = `%${escaped}%`;
    const usernamePrefixPattern = `${escaped}%`;
    return or(
      sql`lower(${users.username}) LIKE ${usernamePrefixPattern}`,
      ilike(profiles.displayName, pattern),
      ilike(profiles.contactEmail, pattern),
    );
  });

  const searchScore = sql<number>`
      (
        CASE WHEN lower(${users.username}) = ${exactPattern} THEN 100 ELSE 0 END +
        CASE WHEN ${profiles.displayName} ILIKE ${exactPattern} THEN 85 ELSE 0 END +
        CASE WHEN ${profiles.contactEmail} ILIKE ${exactPattern} THEN 80 ELSE 0 END +
        CASE WHEN lower(${users.username}) LIKE ${prefixPattern} THEN 50 ELSE 0 END +
        CASE WHEN ${profiles.displayName} ILIKE ${prefixPattern} THEN 35 ELSE 0 END +
        CASE WHEN ${profiles.contactEmail} ILIKE ${prefixPattern} THEN 30 ELSE 0 END +
        CASE WHEN lower(${users.username}) LIKE ${containsPattern} THEN 10 ELSE 0 END +
        CASE WHEN ${profiles.displayName} ILIKE ${containsPattern} THEN 8 ELSE 0 END +
        CASE WHEN ${profiles.contactEmail} ILIKE ${containsPattern} THEN 6 ELSE 0 END
      )
    `;

  const baseRows = await db
    .select({
      userId: users.id,
      username: users.username,
      displayName: profiles.displayName,
      bio: profiles.bio,
      avatarUrl: profiles.avatarUrl,
      searchScore,
    })
    .from(users)
    .leftJoin(profiles, eq(profiles.userId, users.id))
    .where(and(eq(users.role, "seller"), eq(users.isDisabled, false), ...matchByToken))
    .orderBy(desc(searchScore), asc(users.id))
    .limit(limit + 1)
    .offset(offset);

  const hasMore = baseRows.length > limit;
  const pageRows = hasMore ? baseRows.slice(0, limit) : baseRows;
  const sellerIds = pageRows.map((row) => row.userId);

  const statsRows =
    sellerIds.length > 0
      ? await db
          .select({
            sellerId: reviews.sellerId,
            avgRating: sql<number>`avg(${reviews.rating})`,
            totalReviews: sql<number>`count(*)`,
          })
          .from(reviews)
          .where(
            and(inArray(reviews.sellerId, sellerIds), eq(reviews.isHidden, false)),
          )
          .groupBy(reviews.sellerId)
      : [];

  const statsBySellerId = new Map(
    statsRows.map((row) => [
      row.sellerId,
      {
        avgRating: Number(row.avgRating ?? 0),
        totalReviews: Number(row.totalReviews ?? 0),
      },
    ]),
  );

  const rankedRows = pageRows
    .map((row) => ({
      ...row,
      stats: statsBySellerId.get(row.userId) || {
        avgRating: 0,
        totalReviews: 0,
      },
    }))
    .sort((a, b) => {
      const scoreDiff = Number(b.searchScore ?? 0) - Number(a.searchScore ?? 0);
      if (scoreDiff !== 0) return scoreDiff;
      const reviewDiff = b.stats.totalReviews - a.stats.totalReviews;
      if (reviewDiff !== 0) return reviewDiff;
      return a.userId - b.userId;
    });

  const retrievedAt = Date.now();

  const hydrated = rankedRows
    .filter((row) => row.username)
    .map((row) => ({
      username: row.username as string,
      displayName: row.displayName ?? row.username ?? "Seller",
      avatarUrl: row.avatarUrl ?? null,
      bio: row.bio ?? null,
      avgRating: row.stats.avgRating,
      totalReviews: row.stats.totalReviews,
    }));

  const serializedAt = Date.now();
  const parseMs = parseEndedAt - requestStartedAt;
  const retrieveMs = retrievedAt - parseEndedAt;
  const serializeMs = serializedAt - retrievedAt;
  const totalMs = serializedAt - requestStartedAt;

  const response: SearchResponse = {
    results: hydrated,
    meta: {
      nextOffset: hasMore ? offset + limit : null,
      hasMore,
    },
  };

  setSearchCache(cacheKey, response);

  return {
    response,
    cacheControl: "private, max-age=0, must-revalidate",
    serverTiming: `parse;dur=${parseMs},retrieve;dur=${retrieveMs},serialize;dur=${serializeMs},total;dur=${totalMs}`,
    logLine: `[search]${params.requestId ? ` [${params.requestId}]` : ""} q="${normalizedQuery}" offset=${offset} limit=${limit} tokens=${tokens.length} results=${hydrated.length} hasMore=${hasMore} cache=miss parse=${parseMs}ms retrieve=${retrieveMs}ms serialize=${serializeMs}ms total=${totalMs}ms`,
  };
}

export async function getSearchSuggestions(
  rawQuery: string,
): Promise<SearchSuggestion[]> {
  const normalizedQuery = normalizeSearchQuery(rawQuery);

  if (normalizedQuery.length < SEARCH_QUERY_MIN_LENGTH) {
    return [];
  }

  const prefixPattern = `${escapeLikePattern(normalizedQuery)}%`;

  const rows = await db
    .select({
      username: users.username,
      displayName: profiles.displayName,
    })
    .from(users)
    .leftJoin(profiles, eq(profiles.userId, users.id))
    .where(
      and(
        eq(users.role, "seller"),
        eq(users.isDisabled, false),
        sql`lower(${users.username}) LIKE ${prefixPattern}`,
      ),
    )
    .orderBy(asc(users.username))
    .limit(5);

  return rows
    .filter((row) => row.username)
    .map((row) => ({
      username: row.username as string,
      displayName: row.displayName || row.username || "Seller",
    }));
}
