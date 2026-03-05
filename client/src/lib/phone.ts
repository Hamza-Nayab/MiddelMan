import {
  getCountryCallingCode,
  isValidPhoneNumber,
} from "react-phone-number-input";

const allowedPhoneChars = /^[0-9+\-()\s]+$/;

export const normalizeToE164 = (
  input: string,
  countryCode?: string,
): string | null => {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (!allowedPhoneChars.test(trimmed)) return null;

  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;

  let normalized = trimmed.startsWith("+") ? `+${digits}` : `+${digits}`;

  if (!trimmed.startsWith("+") && countryCode) {
    try {
      const callingCode = getCountryCallingCode(countryCode as any);
      normalized = `+${callingCode}${digits}`;
    } catch {
      normalized = `+${digits}`;
    }
  }

  if (!/^\+[1-9]\d{7,14}$/.test(normalized)) return null;

  try {
    if (!isValidPhoneNumber(normalized)) return null;
  } catch {
    return null;
  }

  return normalized;
};

export const buildWhatsAppUrl = (e164: string) =>
  `https://wa.me/${e164.replace(/\D/g, "")}`;
