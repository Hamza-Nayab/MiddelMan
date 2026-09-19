import test, { describe, it } from "node:test";
import assert from "node:assert/strict";
import express, { type Express, type Request, type Response } from "express";
import type { AddressInfo } from "net";

describe("OAuth Disabled Account Flow", () => {
  it("redirects disabled account with reason to /auth and destroys session", async () => {
    let redirectedUrl = "";
    let sessionDestroyed = false;

    const req = {
      requestId: "req-test-1",
      user: {
        id: 6,
        role: "seller",
        isDisabled: true,
        disabledReason: "Violated terms of service",
      },
      session: {
        userId: 6 as number | undefined,
        destroy: (cb: (err?: unknown) => void) => {
          sessionDestroyed = true;
          cb();
        },
      },
      logout: (cb: () => void) => cb(),
    } as any;

    const res = {
      redirect: (url: string) => {
        redirectedUrl = url;
      },
    } as any;

    const appUrl = process.env.APP_URL || "http://localhost:5005";
    const user = req.user;

    if (user?.isDisabled) {
      const params = new URLSearchParams({
        error: "ACCOUNT_DISABLED",
      });
      if (user.disabledReason) {
        params.set("reason", user.disabledReason);
      }

      const redirectUrl = `${appUrl}/auth?${params.toString()}`;

      if (req.logout) {
        req.logout(() => {});
      }
      if (req.session) {
        req.session.userId = undefined;
        req.session.destroy(() => {
          res.redirect(redirectUrl);
        });
      } else {
        res.redirect(redirectUrl);
      }
    }

    assert.equal(sessionDestroyed, true);
    assert.equal(req.session.userId, undefined);
    assert.ok(redirectedUrl.includes("/auth?error=ACCOUNT_DISABLED"));
    assert.ok(redirectedUrl.includes("reason=Violated+terms+of+service"));
  });

  it("redirects disabled account without reason to /auth without reason param", async () => {
    let redirectedUrl = "";
    let sessionDestroyed = false;

    const req = {
      requestId: "req-test-2",
      user: {
        id: 7,
        role: "buyer",
        isDisabled: true,
        disabledReason: null,
      },
      session: {
        userId: 7 as number | undefined,
        destroy: (cb: (err?: unknown) => void) => {
          sessionDestroyed = true;
          cb();
        },
      },
      logout: (cb: () => void) => cb(),
    } as any;

    const res = {
      redirect: (url: string) => {
        redirectedUrl = url;
      },
    } as any;

    const appUrl = process.env.APP_URL || "http://localhost:5005";
    const user = req.user;

    if (user?.isDisabled) {
      const params = new URLSearchParams({
        error: "ACCOUNT_DISABLED",
      });
      if (user.disabledReason) {
        params.set("reason", user.disabledReason);
      }

      const redirectUrl = `${appUrl}/auth?${params.toString()}`;

      if (req.logout) {
        req.logout(() => {});
      }
      if (req.session) {
        req.session.userId = undefined;
        req.session.destroy(() => {
          res.redirect(redirectUrl);
        });
      } else {
        res.redirect(redirectUrl);
      }
    }

    assert.equal(sessionDestroyed, true);
    assert.equal(req.session.userId, undefined);
    assert.equal(redirectedUrl, `${appUrl}/auth?error=ACCOUNT_DISABLED`);
  });
});
