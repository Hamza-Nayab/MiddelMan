import type { Express } from "express";
import { registerAllRoutes } from "./all.routes";

export async function registerProfileRoutes(app: Express) {
  await registerAllRoutes(app);
}
