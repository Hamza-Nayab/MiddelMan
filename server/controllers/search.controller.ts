import type { Request, Response } from "express";
import {
  executeSellerSearch,
  getSearchSuggestions,
  SearchValidationError,
} from "../services/search.service";

type OkFn = <T>(data: T) => { ok: boolean; data: T };
type ErrorFn = (
  code: string,
  message: string,
  details?: Record<string, unknown>,
) => {
  ok: boolean;
  error: {
    code: string;
    message: string;
    details: Record<string, unknown>;
  };
};

type SearchRequest = Request & {
  requestId?: string;
};

export function createSearchController(deps: { ok: OkFn; error: ErrorFn }) {
  const search = async (req: SearchRequest, res: Response) => {
    const rawQuery =
      typeof req.query.q === "string"
        ? req.query.q
        : typeof req.query.query === "string"
          ? req.query.query
          : "";

    try {
      const result = await executeSellerSearch({
        rawQuery,
        rawLimit: req.query.limit,
        rawOffset: req.query.offset,
        requestId: req.requestId,
      });

      if (result.cacheControl) {
        res.setHeader("Cache-Control", result.cacheControl);
      }
      if (result.serverTiming) {
        res.setHeader("Server-Timing", result.serverTiming);
      }
      return res.status(200).json(deps.ok(result.response));
    } catch (err) {
      if (err instanceof SearchValidationError) {
        return res
          .status(400)
          .json(deps.error("VALIDATION_ERROR", err.message));
      }
      throw err;
    }
  };

  const suggest = async (req: Request, res: Response) => {
    const rawQuery = typeof req.query.q === "string" ? req.query.q : "";
    const suggestions = await getSearchSuggestions(rawQuery);
    return res.status(200).json(deps.ok({ suggestions }));
  };

  return {
    search,
    suggest,
  };
}
