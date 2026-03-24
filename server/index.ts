import path from "path";
import { config } from "dotenv";
if (process.env.NODE_ENV !== "production") {
  config({ path: path.resolve(process.cwd(), ".env") });
}
import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import MemoryStore from "memorystore";
import compression from "compression";
import { randomUUID } from "crypto";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { initAuth } from "./auth";
import { pool } from "./db";
import { error, toPublicErrorResponse } from "./lib/api-response";
import { appLog } from "./lib/logger";

const isProduction = process.env.NODE_ENV === "production";

if (isProduction) {
  const requiredProdEnv = [
    "DATABASE_URL",
    "SESSION_SECRET",
    "REVIEW_HASH_SALT",
    "APP_URL",
  ] as const;

  const missing = requiredProdEnv.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `FATAL: Missing required production environment variables: ${missing.join(", ")}`,
    );
  }

  const databaseUrl = process.env.DATABASE_URL!;
  if (/localhost|127\.0\.0\.1/i.test(databaseUrl)) {
    throw new Error(
      "FATAL: Refusing to start in production with a localhost DATABASE_URL",
    );
  }

  const hasGoogleClientId = Boolean(process.env.GOOGLE_CLIENT_ID);
  const hasGoogleClientSecret = Boolean(process.env.GOOGLE_CLIENT_SECRET);
  if (hasGoogleClientId !== hasGoogleClientSecret) {
    throw new Error(
      "FATAL: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be provided together",
    );
  }

  const r2Keys = [
    "R2_ACCOUNT_ID",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_ENDPOINT",
    "R2_BUCKET",
    "R2_PUBLIC_BASE_URL",
  ] as const;
  const providedR2Count = r2Keys.filter((key) =>
    Boolean(process.env[key]),
  ).length;
  if (providedR2Count > 0 && providedR2Count < r2Keys.length) {
    throw new Error(
      "FATAL: R2 configuration is incomplete. Set all R2_* variables or none.",
    );
  }
}

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

const app = express();
const httpServer = createServer(app);

app.disable("x-powered-by");
app.use((_req, res, next) => {
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    limit: "1mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: true, limit: "1mb" }));

const sessionSecret =
  process.env.SESSION_SECRET || "dev-session-secret-change-me";

if (!process.env.SESSION_SECRET && process.env.NODE_ENV === "production") {
  throw new Error(
    "FATAL: SESSION_SECRET environment variable is required in production",
  );
}

const PgSession = connectPgSimple(session);
const MemoryStoreFactory = MemoryStore(session);

app.set("trust proxy", 1);
app.use(
  session({
    store: process.env.DATABASE_URL
      ? new PgSession({ pool, createTableIfMissing: true })
      : new MemoryStoreFactory({ checkPeriod: 24 * 60 * 60 * 1000 }),
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax", // Strict same-site policy
      secure: process.env.NODE_ENV === "production", // HTTPS only in production
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    },
  }),
);

initAuth(app);

app.use(async (req, res, next) => {
  if (!req.path.startsWith("/api/me")) {
    return next();
  }

  const sessionUserId = req.session?.userId;
  if (!sessionUserId) {
    return next();
  }

  try {
    const result = await pool.query(
      "select is_disabled, disabled_reason from users where id = $1 limit 1",
      [sessionUserId],
    );

    const userRow = result.rows[0] as
      | { is_disabled?: boolean; disabled_reason?: string | null }
      | undefined;

    if (userRow?.is_disabled) {
      req.session.destroy(() => {
        res.clearCookie("connect.sid", {
          path: "/",
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
        });
        res.status(403).json(
          error("ACCOUNT_DISABLED", "Your account has been disabled", {
            reason: userRow.disabled_reason || undefined,
          }),
        );
      });
      return;
    }
  } catch (err) {
    appLog("error", "auth", "DISABLED_USER_GUARD_FAILED", {
      requestId: req.requestId,
      path: req.path,
      method: req.method,
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }

  return next();
});

// Middleware: Generate and attach requestId for tracing
app.use((req, res, next) => {
  req.requestId = randomUUID();
  res.setHeader("X-Request-Id", req.requestId);
  next();
});

// Enable HTTP compression for responses (gzip/brotli)
// Middleware automatically skips compression for file uploads and streaming
app.use(compression());

// Note: File upload routes (avatar, dispute evidence) use multer
// They bypass express.json/urlencoded and enforce their own 5MB limits separately

export function log(message: string, requestId?: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  const requestIdStr = requestId ? ` [${requestId}]` : "";
  console.log(`${formattedTime} [${source}]${requestIdStr} ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      // Only log response bodies in development to avoid exposing sensitive data
      if (capturedJsonResponse && process.env.NODE_ENV !== "production") {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine, req.requestId);
    }
  });

  next();
});

// Middleware: Add requestId to error responses (ok: false)
app.use((req, res, next) => {
  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    if (bodyJson && bodyJson.ok === false && bodyJson.error && req.requestId) {
      bodyJson.error.details = bodyJson.error.details || {};
      bodyJson.error.details.requestId = req.requestId;
    }
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
    const { status, body } = toPublicErrorResponse(err, req.requestId);
    res.status(status).json(body);
    appLog("error", "express", "UNHANDLED_ROUTE_ERROR", {
      requestId: req.requestId,
      status,
      path: req.path,
      method: req.method,
      error: err instanceof Error ? err.message : "Unknown error",
    });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5005 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5005", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
