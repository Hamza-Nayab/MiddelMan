import { memo } from "react";
import {
  Check,
  ExternalLink,
  Palette,
  RotateCcw,
  Sparkles,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  PROFILE_GRADIENT_OPTIONS,
  PROFILE_THEME_OPTIONS,
  validateHexColor,
} from "@/lib/profile-appearance";
import { Antigravity, Aurora, Iridescence } from "@/components/backgrounds";

type AppearanceTabProps = {
  pendingTheme: "light" | "dark";
  setPendingTheme: (value: "light" | "dark") => void;
  pendingBackgroundPreset:
    | "gradient"
    | "antigravity"
    | "aurora"
    | "iridescence"
    | null;
  setPendingBackgroundPreset: (
    value:
      | "gradient"
      | "antigravity"
      | "aurora"
      | "iridescence"
      | null,
  ) => void;
  pendingGradientPreset:
    | "default"
    | "ocean"
    | "sunset"
    | "forest"
    | "berry"
    | "royal"
    | "ember"
    | "mono"
    | null;
  setPendingGradientPreset: (
    value:
      | "default"
      | "ocean"
      | "sunset"
      | "forest"
      | "berry"
      | "royal"
      | "ember"
      | "mono"
      | null,
  ) => void;
  pendingAccentColor: string | null;
  setPendingAccentColor: (value: string | null) => void;
  accentColorError: string | null;
  setAccentColorError: (value: string | null) => void;
  accentWarnings: string[];
  accentValidation: { valid: boolean; message?: string };
  previewAppearance: any;
  hasAppearanceChanges: boolean;
  updateAppearanceMutation: any;
};

const DESIGN_PRESETS = [
  {
    key: "minimal",
    name: "Minimal",
    description: "Clean, bright, trust-first layout.",
    theme: "light" as const,
    backgroundPreset: null,
    gradientPreset: null,
    accentColor: "#253c97",
  },
  {
    key: "midnight",
    name: "Midnight",
    description: "Dark premium feel with sharp contrast.",
    theme: "dark" as const,
    backgroundPreset: null,
    gradientPreset: null,
    accentColor: "#38b6ff",
  },
  {
    key: "coast",
    name: "Coast",
    description: "Soft gradient with fresh marketplace energy.",
    theme: "light" as const,
    backgroundPreset: "gradient" as const,
    gradientPreset: "ocean" as const,
    accentColor: "#0ea5e9",
  },
  {
    key: "neon",
    name: "Neon Glow",
    description: "Animated look for bold sellers.",
    theme: "dark" as const,
    backgroundPreset: "aurora" as const,
    gradientPreset: null,
    accentColor: "#7cff67",
  },
  {
    key: "royal",
    name: "Royal",
    description: "Confident luxury with deep blue-violet color.",
    theme: "dark" as const,
    backgroundPreset: "gradient" as const,
    gradientPreset: "royal" as const,
    accentColor: "#8b5cf6",
  },
  {
    key: "ember",
    name: "Ember",
    description: "Warm marketplace energy with rich orange contrast.",
    theme: "light" as const,
    backgroundPreset: "gradient" as const,
    gradientPreset: "ember" as const,
    accentColor: "#ea580c",
  },
];

const BACKGROUND_OPTIONS = [
  { key: null, label: "None", blurb: "Simple and focused" },
  { key: "gradient" as const, label: "Gradient", blurb: "Stylized and soft" },
  {
    key: "antigravity" as const,
    label: "Antigravity",
    blurb: "High-energy particles",
  },
  { key: "aurora" as const, label: "Aurora", blurb: "Ambient glow" },
  {
    key: "iridescence" as const,
    label: "Iridescence",
    blurb: "Shimmering motion",
  },
];

export const AppearanceTab = memo(function AppearanceTab({
  pendingTheme,
  setPendingTheme,
  pendingBackgroundPreset,
  setPendingBackgroundPreset,
  pendingGradientPreset,
  setPendingGradientPreset,
  pendingAccentColor,
  setPendingAccentColor,
  accentColorError,
  setAccentColorError,
  accentWarnings,
  accentValidation,
  previewAppearance,
  hasAppearanceChanges,
  updateAppearanceMutation,
}: AppearanceTabProps) {
  const applyPreset = (preset: (typeof DESIGN_PRESETS)[number]) => {
    setPendingTheme(preset.theme);
    setPendingBackgroundPreset(preset.backgroundPreset);
    setPendingGradientPreset(preset.gradientPreset);
    setPendingAccentColor(preset.accentColor);
    setAccentColorError(null);
  };

  const resetDesign = () => {
    setPendingTheme("light");
    setPendingBackgroundPreset(null);
    setPendingGradientPreset(null);
    setPendingAccentColor(null);
    setAccentColorError(null);
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-6">
        <Card className="overflow-hidden border-none shadow-lg">
          <CardContent className="p-0">
            <div className="relative overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(56,182,255,0.28),_transparent_38%),linear-gradient(135deg,#0f172a_0%,#111827_55%,#1e293b_100%)] px-4 py-6 text-white sm:px-6 sm:py-7">
              <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.18)_1px,transparent_1px)] [background-size:26px_26px]" />
              <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-2xl">
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-white/85">
                    <Sparkles className="h-3.5 w-3.5" />
                    Design Studio
                  </div>
                  <h3 className="text-2xl font-semibold tracking-tight">
                    Shape the storefront before buyers ever message you.
                  </h3>
                  <p className="mt-2 max-w-xl text-sm text-white/75">
                    Pick a mood, tune the background, and set one accent color.
                    Everything below feeds the same public profile renderer.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-3 text-left min-[560px]:grid-cols-2 xl:grid-cols-3 xl:min-w-[22rem]">
                  <div className="min-w-0 rounded-2xl border border-white/15 bg-white/10 px-3 py-3 backdrop-blur-sm sm:px-4">
                    <p className="truncate text-[10px] uppercase tracking-[0.14em] text-white/55 sm:text-[11px] sm:tracking-[0.18em]">
                      Theme
                    </p>
                    <p className="mt-1 truncate text-sm font-medium capitalize sm:text-base">
                      {pendingTheme}
                    </p>
                  </div>
                  <div className="min-w-0 rounded-2xl border border-white/15 bg-white/10 px-3 py-3 backdrop-blur-sm sm:px-4">
                    <p className="truncate text-[10px] uppercase tracking-[0.14em] text-white/55 sm:text-[11px] sm:tracking-[0.18em]">
                      Background
                    </p>
                    <p className="mt-1 truncate text-sm font-medium capitalize sm:text-base">
                      {pendingBackgroundPreset ?? "None"}
                    </p>
                  </div>
                  <div className="min-w-0 rounded-2xl border border-white/15 bg-white/10 px-3 py-3 backdrop-blur-sm sm:px-4">
                    <p className="truncate text-[10px] uppercase tracking-[0.14em] text-white/55 sm:text-[11px] sm:tracking-[0.18em]">
                      Accent
                    </p>
                    <div className="mt-1 flex min-w-0 items-center gap-2 text-sm font-medium sm:text-base">
                      <span
                        className="h-3.5 w-3.5 shrink-0 rounded-full border border-white/30"
                        style={{
                          backgroundColor: pendingAccentColor ?? "transparent",
                        }}
                      />
                      <span className="truncate">
                        {pendingAccentColor ?? "Default"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wand2 className="h-4 w-4" />
              Quick Presets
            </CardTitle>
            <CardDescription>
              Start with a curated look, then fine-tune the details below.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            {DESIGN_PRESETS.map((preset) => (
              <button
                key={preset.key}
                type="button"
                onClick={() => applyPreset(preset)}
                className="group overflow-hidden rounded-2xl border text-left transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div
                  className={cn(
                    "h-24 border-b",
                    preset.backgroundPreset === null &&
                      (preset.theme === "dark" ? "bg-slate-950" : "bg-white"),
                  )}
                  style={
                    preset.backgroundPreset === "gradient"
                      ? {
                          background:
                            PROFILE_GRADIENT_OPTIONS.find(
                              (option) => option.key === preset.gradientPreset,
                            )?.bg,
                        }
                      : undefined
                  }
                >
                  {preset.backgroundPreset === "aurora" && (
                    <div className="relative h-full bg-slate-950">
                      <Aurora
                        colorStops={["#5227FF", "#7cff67", "#5227FF"]}
                        amplitude={1}
                        blend={0.6}
                        className="absolute inset-0"
                      />
                    </div>
                  )}
                </div>
                <div className="space-y-2 p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{preset.name}</p>
                    <span
                      className="h-3.5 w-3.5 rounded-full border"
                      style={{ backgroundColor: preset.accentColor }}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {preset.description}
                  </p>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Base Theme</CardTitle>
              <CardDescription>
                Choose the underlying brightness and tone.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {PROFILE_THEME_OPTIONS.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setPendingTheme(option.key)}
                  className={cn(
                    "group relative overflow-hidden rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md",
                    pendingTheme === option.key
                      ? "border-primary ring-2 ring-primary/15"
                      : "border-border",
                  )}
                >
                  <div
                    className={cn(
                      "mb-4 rounded-xl border p-3",
                      option.key === "dark"
                        ? "border-slate-800 bg-slate-950"
                        : "border-slate-200 bg-slate-50",
                    )}
                  >
                    <div
                      className={cn(
                        "mb-3 h-10 rounded-lg",
                        option.key === "dark" ? "bg-slate-900" : "bg-white",
                      )}
                    />
                    <div className="space-y-2">
                      <div
                        className={cn(
                          "h-3 w-3/4 rounded-full",
                          option.key === "dark"
                            ? "bg-slate-700"
                            : "bg-slate-300",
                        )}
                      />
                      <div
                        className={cn(
                          "h-3 w-1/2 rounded-full",
                          option.key === "dark"
                            ? "bg-slate-800"
                            : "bg-slate-200",
                        )}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{option.label}</p>
                      <p className="text-sm text-muted-foreground">
                        {option.key === "dark"
                          ? "Premium and cinematic"
                          : "Bright and trust-first"}
                      </p>
                    </div>
                    {pendingTheme === option.key && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Background Mood</CardTitle>
              <CardDescription>
                Add atmosphere without losing readability.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {BACKGROUND_OPTIONS.map((option) => (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => {
                    setPendingBackgroundPreset(option.key);
                    if (option.key === "gradient" && !pendingGradientPreset) {
                      setPendingGradientPreset("default");
                    }
                    if (option.key !== "gradient") {
                      setPendingGradientPreset(null);
                    }
                  }}
                  className={cn(
                    "overflow-hidden rounded-2xl border text-left transition hover:-translate-y-0.5 hover:shadow-md",
                    pendingBackgroundPreset === option.key
                      ? "border-primary ring-2 ring-primary/15"
                      : "border-border",
                  )}
                >
                  <div className="relative h-24 overflow-hidden border-b bg-slate-100">
                    {option.key === null && (
                      <div className="absolute inset-0 bg-[linear-gradient(135deg,#f8fafc_0%,#e2e8f0_100%)]" />
                    )}
                    {option.key === "gradient" && (
                      <div
                        className="absolute inset-0"
                        style={{
                          background:
                            PROFILE_GRADIENT_OPTIONS.find(
                              (item) =>
                                item.key === (pendingGradientPreset ?? "default"),
                            )?.bg,
                        }}
                      />
                    )}
                    {option.key === "antigravity" && (
                      <Antigravity
                        count={60}
                        color="#FF9FFC"
                        particleSize={1.4}
                        className="absolute inset-0"
                      />
                    )}
                    {option.key === "aurora" && (
                      <Aurora
                        colorStops={["#5227FF", "#7cff67", "#5227FF"]}
                        amplitude={1}
                        blend={0.6}
                        className="absolute inset-0"
                      />
                    )}
                    {option.key === "iridescence" && (
                      <Iridescence
                        speed={1}
                        amplitude={0.1}
                        mouseReact={false}
                        className="absolute inset-0"
                      />
                    )}
                  </div>
                  <div className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-medium">{option.label}</p>
                      <p className="text-sm text-muted-foreground">
                        {option.blurb}
                      </p>
                    </div>
                    {pendingBackgroundPreset === option.key && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>

        {pendingBackgroundPreset === "gradient" && (
          <Card>
            <CardHeader>
              <CardTitle>Gradient Variations</CardTitle>
              <CardDescription>
                Pick a palette that matches your store personality.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {PROFILE_GRADIENT_OPTIONS.map(({ key, label, bg }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setPendingGradientPreset(key)}
                  className={cn(
                    "overflow-hidden rounded-2xl border text-left transition hover:-translate-y-0.5 hover:shadow-md",
                    pendingGradientPreset === key
                      ? "border-primary ring-2 ring-primary/15"
                      : "border-border",
                  )}
                >
                  <div className="h-24 border-b" style={{ background: bg }} />
                  <div className="flex items-center justify-between p-4">
                    <span className="font-medium">{label}</span>
                    {pendingGradientPreset === key && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Accent Color
            </CardTitle>
            <CardDescription>
              Use one brand color for buttons, borders, and key UI moments.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={pendingAccentColor || "#ffffff"}
                  onChange={(e) => {
                    setPendingAccentColor(e.target.value);
                    setAccentColorError(null);
                  }}
                  disabled={pendingAccentColor === null}
                  className="h-12 w-16 cursor-pointer rounded-xl border border-border disabled:cursor-not-allowed disabled:opacity-50"
                />
                <div className="space-y-1">
                  <Input
                    type="text"
                    placeholder="#38b6ff"
                    value={pendingAccentColor ?? ""}
                    onChange={(e) => {
                      const value = e.target.value.trim();
                      setPendingAccentColor(value || null);
                      if (value) {
                        const validation = validateHexColor(value);
                        setAccentColorError(validation.message ?? null);
                      } else {
                        setAccentColorError(null);
                      }
                    }}
                    className={cn(
                      "font-mono w-36",
                      accentColorError && "border-red-500",
                    )}
                  />
                  {accentColorError && (
                    <p className="text-xs text-red-500">{accentColorError}</p>
                  )}
                  {!accentColorError &&
                    accentWarnings.map((warning) => (
                      <p key={warning} className="text-xs text-amber-600">
                        {warning}
                      </p>
                    ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setPendingAccentColor("#38b6ff")}
                >
                  Brand Blue
                </Button>
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => {
                    setPendingAccentColor(null);
                    setAccentColorError(null);
                  }}
                >
                  Use Default
                </Button>
              </div>
            </div>

            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-8">
              {[
                "#38b6ff",
                "#253c97",
                "#0ea5e9",
                "#10b981",
                "#f97316",
                "#8b5cf6",
                "#ef4444",
                "#111827",
              ].map(
                (swatch) => (
                  <button
                    key={swatch}
                    type="button"
                    onClick={() => {
                      setPendingAccentColor(swatch);
                      setAccentColorError(null);
                    }}
                    className={cn(
                      "rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-md",
                      pendingAccentColor === swatch
                        ? "border-primary ring-2 ring-primary/15"
                        : "border-border",
                    )}
                  >
                    <div
                      className="mb-3 h-10 rounded-xl border border-black/5"
                      style={{ backgroundColor: swatch }}
                    />
                    <p className="font-mono text-xs">{swatch}</p>
                  </button>
                ),
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="xl:sticky xl:top-24">
          <CardHeader>
            <CardTitle>Current Direction</CardTitle>
            <CardDescription>
              A quick snapshot before you publish the new look.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div
              className={cn(
                "rounded-3xl border p-5 shadow-sm",
                previewAppearance.surfaceClass,
              )}
              style={previewAppearance.accentCardStyle}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p
                    className={cn(
                      "text-sm font-semibold",
                      previewAppearance.primaryTextClass,
                    )}
                  >
                    Seller card preview
                  </p>
                  <p
                    className={cn(
                      "text-xs",
                      previewAppearance.mutedTextClass,
                    )}
                  >
                    Shared with the public profile and phone preview.
                  </p>
                </div>
                <div
                  className={cn(
                    "h-10 w-10 rounded-full border flex items-center justify-center",
                    previewAppearance.linkIconClass,
                  )}
                  style={previewAppearance.accentIconStyle}
                >
                  <ExternalLink
                    className={cn("h-4 w-4", previewAppearance.iconColorClass)}
                    style={previewAppearance.accentTextStyle}
                  />
                </div>
              </div>
              <div className="mt-4 space-y-3">
                <div
                  className={cn(
                    "rounded-2xl border p-3",
                    previewAppearance.surfaceMutedClass,
                  )}
                >
                  <p
                    className={cn(
                      "text-sm font-medium",
                      previewAppearance.primaryTextClass,
                    )}
                  >
                    Theme system is synced
                  </p>
                  <p className={cn("text-xs", previewAppearance.mutedTextClass)}>
                    Cards, buttons, and reviews now derive from one appearance
                    source.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className={cn("w-full", previewAppearance.buttonClass)}
                  style={previewAppearance.accentButtonStyle}
                >
                  Preview button
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border bg-muted/30 p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                  Status
                </p>
                <p className="mt-2 text-sm font-medium">
                  {hasAppearanceChanges ? "Unsaved changes" : "Synced"}
                </p>
              </div>
              <div className="rounded-2xl border bg-muted/30 p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                  Contrast
                </p>
                <p className="mt-2 text-sm font-medium">
                  {accentWarnings.length > 0 ? "Needs review" : "Looks solid"}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Button
                type="button"
                className="w-full"
                onClick={() =>
                  updateAppearanceMutation.mutate({
                    theme: pendingTheme,
                    backgroundPreset: pendingBackgroundPreset,
                    gradientPreset:
                      pendingBackgroundPreset === "gradient"
                        ? (pendingGradientPreset ?? "default")
                        : null,
                    accentColor: pendingAccentColor,
                  })
                }
                disabled={
                  updateAppearanceMutation.isPending ||
                  !hasAppearanceChanges ||
                  !accentValidation.valid
                }
              >
                {updateAppearanceMutation.isPending
                  ? "Saving..."
                  : "Publish Design"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={resetDesign}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset To Neutral
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
});
