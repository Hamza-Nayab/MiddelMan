import type { Express } from "express";
import { registerAllRoutes } from "./all.routes";

export async function registerReviewRoutes(app: Express) {
  await registerAllRoutes(app);
}
