import { Resend } from "resend";

const resendApiKey =
  process.env.RESEND_API_KEY || process.env.Resend_API_KEY || "";

export const hasResendApiKey = Boolean(resendApiKey);

/** Lazily initialised — avoids crashing at import time when the key is missing (e.g. in CI). */
let _resend: Resend | null = null;
export const resend = new Proxy({} as Resend, {
  get(_target, prop, receiver) {
    if (!_resend) {
      _resend = new Resend(resendApiKey);
    }
    return Reflect.get(_resend, prop, receiver);
  },
});

export const getFrontendUrl = () =>
  process.env.FRONTEND_URL || process.env.APP_URL || "http://localhost:5005";
