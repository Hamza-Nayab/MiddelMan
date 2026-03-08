import type { Express } from "express";
import { registerAllRoutes } from "./all.routes";

export async function registerAdminRoutes(app: Express) {
  await registerAllRoutes(app);
}
