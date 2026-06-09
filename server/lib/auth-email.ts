import { resend, hasResendApiKey, getFrontendUrl } from "./resend";

const EMAIL_FROM = process.env.RESEND_FROM || "onboarding@resend.dev";

const buildEmailShell = (title: string, body: string, action: string) => `
  <div style="margin:0;padding:0;background:#f6f7fb;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
    <div style="max-width:640px;margin:0 auto;padding:40px 20px;">
      <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:20px;padding:32px;box-shadow:0 10px 30px rgba(15,23,42,.08);">
        <p style="margin:0 0 12px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#6b7280;">MiddelMen</p>
        <h1 style="margin:0 0 16px;font-size:24px;line-height:1.3;">${title}</h1>
        <p style="margin:0 0 24px;font-size:16px;line-height:1.7;color:#4b5563;">${body}</p>
        <a href="${action}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:14px 22px;border-radius:9999px;font-weight:700;">Open request</a>
        <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#6b7280;word-break:break-word;">If the button does not work, copy and paste this link: <br /><span style="color:#111827;">${action}</span></p>
      </div>
    </div>
  </div>
`;

const sendAuthEmail = async (params: {
  to: string;
  subject: string;
  title: string;
  body: string;
  actionUrl: string;
}) => {
  if (process.env.NODE_ENV === "test") {
    return { id: "test-email" };
  }

  if (!hasResendApiKey) {
    throw new Error("RESEND_API_KEY is required to send auth emails");
  }

  return resend.emails.send({
    from: EMAIL_FROM,
    to: params.to,
    subject: params.subject,
    html: buildEmailShell(params.title, params.body, params.actionUrl),
  });
};

export const sendVerificationEmail = async (params: {
  to: string;
  token: string;
}) => {
  const actionUrl = `${getFrontendUrl()}/api/auth/verify-email?token=${encodeURIComponent(params.token)}`;
  return sendAuthEmail({
    to: params.to,
    subject: "Verify your account",
    title: "Verify your account",
    body: "Welcome to MiddelMen. Click the button below to verify your email address and activate your seller profile.",
    actionUrl,
  });
};

export const sendPasswordResetEmail = async (params: {
  to: string;
  token: string;
}) => {
  const actionUrl = `${getFrontendUrl()}/reset-password?token=${encodeURIComponent(params.token)}`;
  return sendAuthEmail({
    to: params.to,
    subject: "Reset your password",
    title: "Reset your password",
    body: "We received a request to reset your password. Use the button below to choose a new password.",
    actionUrl,
  });
};
