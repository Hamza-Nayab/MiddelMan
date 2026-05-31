import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { rewriteHtml } from "./ssr-meta";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // Serve robots.txt with proper headers
  app.get("/robots.txt", (_req, res) => {
    const robotsPath = path.resolve(distPath, "robots.txt");
    if (fs.existsSync(robotsPath)) {
      res.setHeader("Content-Type", "text/plain");
      res.setHeader("Cache-Control", "public, max-age=86400");
      return res.sendFile(robotsPath);
    }
    res.status(404).send("Not Found");
  });

  // Serve favicon.ico with proper headers
  app.get("/favicon.ico", (_req, res) => {
    const faviconPath = path.resolve(distPath, "favicon.ico");
    if (fs.existsSync(faviconPath)) {
      res.setHeader("Content-Type", "image/x-icon");
      res.setHeader("Cache-Control", "public, max-age=86400");
      return res.sendFile(faviconPath);
    }
    res.status(404).send("Not Found");
  });

  // fall through to index.html if the file doesn't exist
  // Apply SSR meta tag rewriting for profile pages
  app.use("*", (_req, res) => {
    let html = fs.readFileSync(
      path.resolve(distPath, "index.html"),
      "utf-8",
    );

    const ssrMeta = (_req as any).__ssrMeta;
    if (ssrMeta) {
      html = rewriteHtml(html, ssrMeta);
    }

    res.setHeader("Content-Type", "text/html");
    res.send(html);
  });
}
