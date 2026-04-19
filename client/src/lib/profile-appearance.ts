import type { CSSProperties } from "react";

export type ProfileBaseTheme = "light" | "dark";
export type ProfileThemeInput = ProfileBaseTheme | "gradient";
export type ProfileBackgroundPreset =
  | "gradient"
  | "antigravity"
  | "aurora"
  | "iridescence"
  | null;
export type ProfileGradientPreset =
  | "default"
  | "ocean"
  | "sunset"
  | "forest"
  | "berry"
  | "royal"
  | "ember"
  | "mono"
  | null;

export type ProfileAppearanceInput = {
  theme?: ProfileThemeInput | null;
  backgroundPreset?: ProfileBackgroundPreset;
  gradientPreset?: ProfileGradientPreset;
  accentColor?: string | null;
};

type GradientOption = {
  key: NonNullable<ProfileGradientPreset>;
  label: string;
  bg: string;
};

export const PROFILE_GRADIENT_OPTIONS: GradientOption[] = [
  {
    key: "default",
    label: "Default",
    bg: "linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%)",
  },
  {
    key: "ocean",
    label: "Ocean",
    bg: "linear-gradient(135deg, #0ea5e9 0%, #06b6d4 50%, #22d3ee 100%)",
  },
  {
    key: "sunset",
    label: "Sunset",
    bg: "linear-gradient(135deg, #f97316 0%, #ec4899 50%, #a855f7 100%)",
  },
  {
    key: "forest",
    label: "Forest",
    bg: "linear-gradient(135deg, #059669 0%, #10b981 50%, #34d399 100%)",
  },
  {
    key: "berry",
    label: "Berry",
    bg: "linear-gradient(135deg, #7c3aed 0%, #db2777 50%, #dc2626 100%)",
  },
  {
    key: "royal",
    label: "Royal",
    bg: "linear-gradient(135deg, #1d4ed8 0%, #4338ca 48%, #7c3aed 100%)",
  },
  {
    key: "ember",
    label: "Ember",
    bg: "linear-gradient(135deg, #7f1d1d 0%, #ea580c 52%, #f59e0b 100%)",
  },
  {
    key: "mono",
    label: "Mono",
    bg: "linear-gradient(135deg, #111827 0%, #374151 50%, #9ca3af 100%)",
  },
];

export const PROFILE_GRADIENT_PRESETS = Object.fromEntries(
  PROFILE_GRADIENT_OPTIONS.map((option) => [option.key, option.bg]),
) as Record<NonNullable<ProfileGradientPreset>, string>;

export const PROFILE_BACKGROUND_OPTIONS: Array<{
  key: Exclude<ProfileBackgroundPreset, null> | "none";
  label: string;
}> = [
  { key: "none", label: "None" },
  { key: "gradient", label: "Gradient" },
  { key: "antigravity", label: "Antigravity" },
  { key: "aurora", label: "Aurora" },
  { key: "iridescence", label: "Iridescence" },
];

export const PROFILE_THEME_OPTIONS: Array<{
  key: ProfileBaseTheme;
  label: string;
}> = [
  { key: "light", label: "Light" },
  { key: "dark", label: "Dark" },
];

export const isLightGradient = (preset?: ProfileGradientPreset): boolean =>
  preset === "ocean" || preset === "sunset";

export const hexToRgb = (hex: string): [number, number, number] | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;
  return [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16),
  ];
};

export const getRelativeLuminance = (
  rgb: [number, number, number],
): number => {
  const [r, g, b] = rgb.map((value) => {
    const normalized = value / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : Math.pow((normalized + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export const getContrastRatio = (color1: string, color2: string): number => {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  if (!rgb1 || !rgb2) return 0;

  const luminance1 = getRelativeLuminance(rgb1);
  const luminance2 = getRelativeLuminance(rgb2);
  const lighter = Math.max(luminance1, luminance2);
  const darker = Math.min(luminance1, luminance2);
  return (lighter + 0.05) / (darker + 0.05);
};

export const validateHexColor = (
  value: string,
): { valid: boolean; message?: string } => {
  if (!value) return { valid: true };
  if (!/^#[0-9A-Fa-f]{6}$/.test(value)) {
    return { valid: false, message: "Must be valid hex color (#RRGGBB)" };
  }
  return { valid: true };
};

export const getAccentContrastWarnings = (accentColor: string): string[] => {
  const validation = validateHexColor(accentColor);
  if (!validation.valid) return [];

  const warnings: string[] = [];
  const contrastOnWhite = getContrastRatio(accentColor, "#ffffff");
  const contrastOnSlate = getContrastRatio(accentColor, "#0f172a");

  if (contrastOnWhite < 3) {
    warnings.push("Accent may feel faint on light surfaces.");
  }
  if (contrastOnSlate < 3) {
    warnings.push("Accent may feel faint on dark or animated backgrounds.");
  }

  return warnings;
};

const baseThemes: Record<
  ProfileBaseTheme,
  {
    pageBgClass: string;
    pageTextClass: string;
    surfaceClass: string;
    surfaceMutedClass: string;
    buttonClass: string;
    dividerClass: string;
    mutedTextClass: string;
    linkIconClass: string;
    contactButtonClass: string;
  }
> = {
  light: {
    pageBgClass: "bg-slate-50",
    pageTextClass: "text-slate-900",
    surfaceClass: "bg-white border-slate-200 shadow-sm",
    surfaceMutedClass: "bg-slate-50 border-slate-200",
    buttonClass: "bg-white/80 hover:bg-white text-slate-900",
    dividerClass: "border-slate-200",
    mutedTextClass: "text-slate-600",
    linkIconClass: "bg-slate-100 border-slate-200 text-slate-900",
    contactButtonClass: "border-slate-300 bg-white hover:bg-slate-50",
  },
  dark: {
    pageBgClass: "bg-slate-950",
    pageTextClass: "text-white",
    surfaceClass: "bg-slate-900 border-slate-800 shadow-sm",
    surfaceMutedClass: "bg-slate-800/80 border-slate-700",
    buttonClass: "bg-slate-800 hover:bg-slate-700 text-white",
    dividerClass: "border-slate-800",
    mutedTextClass: "text-slate-300",
    linkIconClass: "bg-slate-800 border-slate-700 text-slate-100",
    contactButtonClass: "border-slate-700 bg-slate-800 hover:bg-slate-700",
  },
};

export type ResolvedProfileAppearance = {
  theme: ProfileBaseTheme;
  backgroundPreset: ProfileBackgroundPreset;
  gradientPreset: ProfileGradientPreset;
  accentColor: string | null;
  hasGradientBackground: boolean;
  hasAnimatedBackground: boolean;
  usesDynamicBackground: boolean;
  usesBrightBackground: boolean;
  gradientBackground: string | null;
  pageBgClass: string;
  pageTextClass: string;
  primaryTextClass: string;
  mutedTextClass: string;
  surfaceClass: string;
  surfaceMutedClass: string;
  buttonClass: string;
  dividerClass: string;
  linkIconClass: string;
  contactButtonClass: string;
  iconColorClass: string;
  overlayClass: string | null;
  accentCardStyle?: CSSProperties;
  accentButtonStyle?: CSSProperties;
  accentIconStyle?: CSSProperties;
  accentTextStyle?: CSSProperties;
};

export const resolveProfileAppearance = (
  input: ProfileAppearanceInput,
): ResolvedProfileAppearance => {
  const theme = input.theme === "dark" ? "dark" : "light";
  const backgroundPreset =
    input.backgroundPreset ?? (input.theme === "gradient" ? "gradient" : null);
  const gradientPreset =
    backgroundPreset === "gradient" ? (input.gradientPreset ?? "default") : null;
  const hasGradientBackground = backgroundPreset === "gradient";
  const hasAnimatedBackground =
    backgroundPreset === "antigravity" ||
    backgroundPreset === "aurora" ||
    backgroundPreset === "iridescence";
  const usesDynamicBackground = hasGradientBackground || hasAnimatedBackground;
  const usesBrightBackground =
    hasGradientBackground && isLightGradient(gradientPreset);
  const gradientBackground = hasGradientBackground
    ? PROFILE_GRADIENT_PRESETS[gradientPreset ?? "default"]
    : null;

  const baseTheme = baseThemes[theme];

  const surfaceClass = usesDynamicBackground
    ? usesBrightBackground
      ? "bg-white/82 border-slate-200 text-slate-900 shadow-sm"
      : "bg-white/15 border-white/30 text-white shadow-sm backdrop-blur-md"
    : baseTheme.surfaceClass;
  const surfaceMutedClass = usesDynamicBackground
    ? usesBrightBackground
      ? "bg-white/72 border-slate-200 text-slate-900"
      : "bg-white/10 border-white/20 text-white backdrop-blur-sm"
    : baseTheme.surfaceMutedClass;
  const buttonClass = usesDynamicBackground
    ? usesBrightBackground
      ? "bg-white/90 hover:bg-white border border-slate-300 text-slate-900"
      : "bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 text-white"
    : baseTheme.buttonClass;
  const linkIconClass = usesDynamicBackground
    ? usesBrightBackground
      ? "bg-slate-100 border-slate-300 text-slate-900"
      : "bg-white/20 border-white/30 text-white"
    : baseTheme.linkIconClass;
  const contactButtonClass = usesDynamicBackground
    ? usesBrightBackground
      ? "border-slate-300 bg-white hover:bg-slate-50"
      : "border-white/30 bg-white/20 hover:bg-white/30"
    : baseTheme.contactButtonClass;

  const accentColor = input.accentColor ?? null;

  return {
    theme,
    backgroundPreset,
    gradientPreset,
    accentColor,
    hasGradientBackground,
    hasAnimatedBackground,
    usesDynamicBackground,
    usesBrightBackground,
    gradientBackground,
    pageBgClass: usesDynamicBackground ? "bg-transparent" : baseTheme.pageBgClass,
    pageTextClass: usesDynamicBackground
      ? usesBrightBackground
        ? "text-slate-900"
        : "text-white"
      : baseTheme.pageTextClass,
    primaryTextClass: usesDynamicBackground
      ? usesBrightBackground
        ? "text-slate-900"
        : "text-white"
      : baseTheme.pageTextClass,
    mutedTextClass: usesDynamicBackground
      ? usesBrightBackground
        ? "text-slate-700"
        : "text-white/80"
      : baseTheme.mutedTextClass,
    surfaceClass,
    surfaceMutedClass,
    buttonClass,
    dividerClass: usesDynamicBackground
      ? usesBrightBackground
        ? "border-slate-300/80"
        : "border-white/30"
      : baseTheme.dividerClass,
    linkIconClass,
    contactButtonClass,
    iconColorClass: usesDynamicBackground
      ? usesBrightBackground
        ? "text-slate-900"
        : "text-white"
      : theme === "dark"
        ? "text-slate-100"
        : "text-slate-900",
    overlayClass: hasGradientBackground
      ? usesBrightBackground
        ? "bg-white/22"
        : "bg-black/18"
      : hasAnimatedBackground
        ? "bg-black/30"
        : null,
    accentCardStyle: accentColor
      ? {
          borderColor: accentColor,
          boxShadow: `${accentColor}22 0px 10px 30px -18px`,
        }
      : undefined,
    accentButtonStyle: accentColor
      ? {
          borderColor: accentColor,
          backgroundColor: usesDynamicBackground
            ? `${accentColor}30`
            : `${accentColor}12`,
        }
      : undefined,
    accentIconStyle: accentColor
      ? {
          borderColor: accentColor,
          backgroundColor: usesDynamicBackground
            ? `${accentColor}30`
            : `${accentColor}12`,
        }
      : undefined,
    accentTextStyle:
      accentColor && !usesDynamicBackground
        ? { color: accentColor }
        : undefined,
  };
};
