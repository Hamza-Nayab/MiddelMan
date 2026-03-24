import type { Express } from "express";
import { registerReviewsRoutes } from "./reviews.routes";

export function registerReviewRoutes(app: Express): void {
  registerReviewsRoutes(app);
}
