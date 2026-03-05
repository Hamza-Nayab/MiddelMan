/**
 * Preset avatar URLs for seller onboarding
 * Uses local SVG files from assets/preset-avatars
 */

export const PRESET_AVATARS = [
  new URL("@/assets/preset-avatars/avatar-1.svg", import.meta.url).href,
  new URL("@/assets/preset-avatars/avatar-2.svg", import.meta.url).href,
  new URL("@/assets/preset-avatars/avatar-3.svg", import.meta.url).href,
  new URL("@/assets/preset-avatars/avatar-4.svg", import.meta.url).href,
  new URL("@/assets/preset-avatars/avatar-5.svg", import.meta.url).href,
  new URL("@/assets/preset-avatars/avatar-6.svg", import.meta.url).href,
  new URL("@/assets/preset-avatars/avatar-7.svg", import.meta.url).href,
  new URL("@/assets/preset-avatars/avatar-8.svg", import.meta.url).href,
  new URL("@/assets/preset-avatars/avatar-9.svg", import.meta.url).href,
  new URL("@/assets/preset-avatars/avatar-10.svg", import.meta.url).href,
  new URL("@/assets/preset-avatars/avatar-11.svg", import.meta.url).href,
  new URL("@/assets/preset-avatars/avatar-12.svg", import.meta.url).href,
  new URL("@/assets/preset-avatars/avatar-13.svg", import.meta.url).href,
  new URL("@/assets/preset-avatars/avatar-14.svg", import.meta.url).href,
  new URL("@/assets/preset-avatars/avatar-15.svg", import.meta.url).href,
];

export function getDefaultPresetAvatar(): string {
  return PRESET_AVATARS[0];
}
