import { avatarOptions } from "./graphics";

export const PRESET_AVATARS: string[] = avatarOptions
  .filter((option) => option.id !== "custom")
  .map((option) => option.url);

export function getDefaultPresetAvatar(): string {
  return PRESET_AVATARS[0];
}

