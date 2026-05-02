import { Resend } from "resend";

const resendApiKey =
  process.env.RESEND_API_KEY || process.env.Resend_API_KEY || "";

export const resend = new Resend(resendApiKey);

export const hasResendApiKey = Boolean(resendApiKey);

export const getFrontendUrl = () =>
  process.env.FRONTEND_URL || process.env.APP_URL || "http://localhost:5005";
