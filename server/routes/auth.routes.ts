import type { Express } from "express";
import { registerAllRoutes } from "./all.routes";

export async function registerAuthRoutes(app: Express) {
  await registerAllRoutes(app);
}
