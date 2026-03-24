import type { Express } from "express";
import { registerDisputesRoutes } from "./disputes.routes";

export function registerDisputeRoutes(app: Express): void {
  registerDisputesRoutes(app);
}
