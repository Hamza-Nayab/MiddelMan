import type { Express } from "express";
import { type Server } from "http";
import { registerAuthRoutes } from "./routes/auth.routes";
import { registerProfileRoutes } from "./routes/profile.routes";
import { registerSearchRoutes } from "./routes/search.routes";
import { registerReviewRoutes } from "./routes/review.routes";
import { registerDisputeRoutes } from "./routes/dispute.routes";
import { registerAdminRoutes } from "./routes/admin.routes";

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  await registerAuthRoutes(app);
  await registerProfileRoutes(app);
  await registerSearchRoutes(app);
  await registerReviewRoutes(app);
  await registerDisputeRoutes(app);
  await registerAdminRoutes(app);

  return httpServer;
}
