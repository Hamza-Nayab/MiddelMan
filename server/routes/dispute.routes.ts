import type { Express } from "express";
import { registerAllRoutes } from "./all.routes";

export async function registerDisputeRoutes(app: Express) {
  await registerAllRoutes(app);
}
