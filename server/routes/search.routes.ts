import type { Express } from "express";
import { registerAllRoutes } from "./all.routes";

export async function registerSearchRoutes(app: Express) {
  await registerAllRoutes(app);
}
