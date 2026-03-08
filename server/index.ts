import path from "path";
import { config } from "dotenv";
config({ path: path.resolve(process.cwd(), "../.env") });
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
import { toPublicErrorResponse } from "./lib/api-response";


console.log(process.env.NODE_ENV);

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

const app = express();
const httpServer = createServer(app);

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
    saveUninitialized: true, // Save session immediately so cookie is set
    cookie: {
      httpOnly: true,
      sameSite: "lax", // Strict same-site policy
      secure: process.env.NODE_ENV === "production", // HTTPS only in production
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    },
  }),
);

initAuth(app);

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
    console.error("[express] Unhandled error", err);
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
