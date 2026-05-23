import { memo, useState, type ReactNode } from "react";
import {
  Check,
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
    value: "gradient" | "antigravity" | "aurora" | "iridescence" | null,
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
  previewSlot?: ReactNode;
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

const ACCENT_SWATCHES = [
  "#38b6ff",
  "#253c97",
  "#0ea5e9",
  "#10b981",
  "#f97316",
  "#8b5cf6",
  "#ef4444",
  "#111827",
];

const studioCardClass =
  "rounded-2xl border border-slate-200/70 bg-white/82 shadow-[0_14px_42px_rgba(15,23,42,0.05)] backdrop-blur-xl";

const liftClass =
  "transition-all duration-200 ease-[cubic-bezier(0.2,0,0,1)] hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(15,23,42,0.08)]";

const DESIGN_STEPS = [
  {
    title: "Preset",
    description: "Start with a curated direction.",
  },
  {
    title: "Surface",
    description: "Set theme and background mood.",
  },
  {
    title: "Accent",
    description: "Choose one brand color.",
  },
  {
    title: "Preview",
    description: "Review and publish.",
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
  previewSlot,
}: AppearanceTabProps) {
  const [activeStep, setActiveStep] = useState(0);
  const isFirstStep = activeStep === 0;
  const isLastStep = activeStep === DESIGN_STEPS.length - 1;

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

  const goToPreviousStep = () => {
    setActiveStep((step) => Math.max(0, step - 1));
  };

  const goToNextStep = () => {
    setActiveStep((step) => Math.min(DESIGN_STEPS.length - 1, step + 1));
  };

  return (
    <div className="-mx-4 rounded-2xl bg-[#F5F5F7] px-3 py-4 sm:-mx-6 sm:px-5 lg:py-5">
      <div className="mx-auto grid max-w-7xl gap-5 xl:grid-cols-[20rem_minmax(0,1fr)]">
        {previewSlot && (
          <aside className="order-2 xl:order-1">
            <div className="xl:sticky xl:top-20">{previewSlot}</div>
          </aside>
        )}

        <div className="order-1 min-w-0 space-y-4 xl:order-2">
          <Card className="rounded-2xl border border-white/80 bg-white/80 shadow-[0_14px_42px_rgba(15,23,42,0.06)] backdrop-blur-xl">
            <CardContent className="p-4 sm:p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-slate-950/5 bg-white/75 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500 shadow-sm backdrop-blur-md">
                    <Sparkles className="h-3.5 w-3.5" />
                    Design Studio
                  </div>
                  <h3 className="text-2xl font-semibold leading-tight tracking-tight text-slate-950 sm:text-3xl">
                    Design your seller profile
                  </h3>
                  <p className="mt-1 max-w-2xl text-sm leading-5 text-slate-500">
                    Preview stays beside every step while you tune the profile.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2 text-left lg:min-w-[24rem]">
                  {[
                    ["Theme", pendingTheme],
                    ["Background", pendingBackgroundPreset ?? "None"],
                    ["Accent", pendingAccentColor ?? "Default"],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="min-w-0 rounded-xl border border-slate-200/70 bg-white/80 px-3 py-2 shadow-sm backdrop-blur-xl"
                    >
                      <p className="truncate text-[10px] uppercase tracking-[0.16em] text-slate-400">
                        {label}
                      </p>
                      <div className="mt-1 flex min-w-0 items-center gap-2 text-sm font-semibold capitalize text-slate-950">
                        {label === "Accent" && (
                          <span
                            className="h-3.5 w-3.5 shrink-0 rounded-full border border-slate-200"
                            style={{
                              backgroundColor:
                                pendingAccentColor ?? "transparent",
                            }}
                          />
                        )}
                        <span className="truncate">{value}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={studioCardClass}>
            <CardContent className="p-2 sm:p-3">
              <div className="grid gap-2 sm:grid-cols-4">
                {DESIGN_STEPS.map((step, index) => {
                  const isActive = activeStep === index;
                  const isComplete = activeStep > index;

                  return (
                    <button
                      key={step.title}
                      type="button"
                      onClick={() => setActiveStep(index)}
                      className={cn(
                        "rounded-xl border p-3 text-left transition-all duration-200",
                        isActive
                          ? "border-slate-950/45 bg-slate-950 text-white shadow-[0_16px_38px_rgba(15,23,42,0.16)]"
                          : "border-slate-200/70 bg-white/76 text-slate-950 hover:-translate-y-0.5 hover:shadow-md",
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold",
                            isActive
                              ? "bg-white text-slate-950"
                              : isComplete
                                ? "bg-slate-950 text-white"
                                : "bg-slate-100 text-slate-500",
                          )}
                        >
                          {isComplete ? (
                            <Check className="h-3.5 w-3.5" />
                          ) : (
                            index + 1
                          )}
                        </span>
                        <div>
                          <p
                            className={cn(
                              "text-sm font-semibold",
                              isActive ? "text-white" : "text-slate-950",
                            )}
                          >
                            {step.title}
                          </p>
                          <p
                            className={cn(
                              "mt-0.5 hidden text-xs leading-4 md:block",
                              isActive ? "text-white/64" : "text-slate-500",
                            )}
                          >
                            {step.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {activeStep === 3 && (
            <Card className={studioCardClass}>
              <CardHeader className="px-4 pb-2 pt-4 sm:px-5 sm:pt-5">
                <CardTitle className="text-xl font-semibold text-slate-950">
                  Current Direction
                </CardTitle>
                <CardDescription className="text-slate-500">
                  Final check before publishing.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 px-4 pb-4 sm:px-5 sm:pb-5">
                <div
                  className={cn(
                    "rounded-xl border p-4 shadow-sm",
                    previewAppearance.surfaceClass,
                  )}
                  style={previewAppearance.accentCardStyle}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p
                        className={cn(
                          "text-sm font-semibold",
                          previewAppearance.primaryTextClass,
                        )}
                      >
                        Seller card
                      </p>
                      <p
                        className={cn(
                          "text-xs",
                          previewAppearance.mutedTextClass,
                        )}
                      >
                        Synced to the public profile.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-3xl border border-slate-200/70 bg-slate-50/80 p-5">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">
                      Status
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-950">
                      {hasAppearanceChanges ? "Unsaved changes" : "Synced"}
                    </p>
                  </div>
                  <div className="rounded-3xl border border-slate-200/70 bg-slate-50/80 p-5">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">
                      Contrast
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-950">
                      {accentWarnings.length > 0
                        ? "Needs review"
                        : "Looks solid"}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    type="button"
                    className="h-11 flex-1 rounded-full bg-slate-950 text-white shadow-[0_10px_30px_rgba(15,23,42,0.18)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-[0_16px_38px_rgba(15,23,42,0.22)] disabled:translate-y-0 disabled:shadow-none"
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
                    className="h-11 flex-1 rounded-full border-slate-200 bg-white text-slate-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-white hover:shadow-md"
                    onClick={resetDesign}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Reset To Neutral
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {activeStep === 0 && (
            <Card className={studioCardClass}>
              <CardHeader className="px-4 pb-2 pt-4 sm:px-5 sm:pt-5">
                <CardTitle className="flex items-center gap-2 text-xl font-semibold text-slate-950">
                  <Wand2 className="h-4 w-4" />
                  Quick Presets
                </CardTitle>
                <CardDescription className="text-slate-500">
                  Curated starting points, tuned for buyer trust.
                </CardDescription>
              </CardHeader>
              <CardContent className="scrollbar-minimal flex gap-3 overflow-x-auto px-4 pb-4 pt-2 sm:px-5 sm:pb-5">
                {DESIGN_PRESETS.map((preset) => (
                  <button
                    key={preset.key}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className={cn(
                      "group min-w-[168px] overflow-hidden rounded-xl border border-slate-200/70 bg-white text-left shadow-sm",
                      liftClass,
                    )}
                  >
                    <PreviewSwatch
                      backgroundPreset={preset.backgroundPreset}
                      gradientPreset={preset.gradientPreset}
                      theme={preset.theme}
                    />
                    <div className="space-y-2 p-4">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-slate-950">
                          {preset.name}
                        </p>
                        <span
                          className="h-3.5 w-3.5 rounded-full border border-slate-200"
                          style={{ backgroundColor: preset.accentColor }}
                        />
                      </div>
                      <p className="text-xs leading-5 text-slate-500">
                        {preset.description}
                      </p>
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>
          )}

          {activeStep === 1 && (
            <div className="grid gap-4 lg:grid-cols-2">
              <Card className={studioCardClass}>
                <CardHeader className="px-4 pb-2 pt-4 sm:px-5 sm:pt-5">
                  <CardTitle className="text-xl font-semibold text-slate-950">
                    Base Theme
                  </CardTitle>
                  <CardDescription className="text-slate-500">
                    Overall brightness and surface tone.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 px-4 pb-4 sm:grid-cols-2 sm:px-5 sm:pb-5">
                  {PROFILE_THEME_OPTIONS.map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => setPendingTheme(option.key)}
                      className={cn(
                        "group relative overflow-hidden rounded-xl border bg-white p-3 text-left",
                        liftClass,
                        pendingTheme === option.key
                          ? "border-slate-950/50 ring-4 ring-slate-950/5"
                          : "border-slate-200/80",
                      )}
                    >
                      <div
                        className={cn(
                          "mb-4 rounded-2xl border p-3",
                          option.key === "dark"
                            ? "border-slate-800 bg-slate-950"
                            : "border-slate-200 bg-slate-50",
                        )}
                      >
                        <div
                          className={cn(
                            "mb-3 h-8 rounded-lg",
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
                          <p className="font-semibold text-slate-950">
                            {option.label}
                          </p>
                          <p className="text-sm text-slate-500">
                            {option.key === "dark"
                              ? "Premium and cinematic"
                              : "Bright and trust-first"}
                          </p>
                        </div>
                        {pendingTheme === option.key && (
                          <Check className="h-4 w-4 text-slate-950" />
                        )}
                      </div>
                    </button>
                  ))}
                </CardContent>
              </Card>

              <Card className={studioCardClass}>
                <CardHeader className="px-4 pb-2 pt-4 sm:px-5 sm:pt-5">
                  <CardTitle className="text-xl font-semibold text-slate-950">
                    Background Mood
                  </CardTitle>
                  <CardDescription className="text-slate-500">
                    Subtle atmosphere with readable content.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 px-4 pb-4 sm:grid-cols-2 sm:px-5 sm:pb-5">
                  {BACKGROUND_OPTIONS.filter(
                    (opt) => opt.key !== "antigravity",
                  ).map((option) => (
                    <button
                      key={option.label}
                      type="button"
                      onClick={() => {
                        setPendingBackgroundPreset(option.key);
                        if (
                          option.key === "gradient" &&
                          !pendingGradientPreset
                        ) {
                          setPendingGradientPreset("default");
                        }
                        if (option.key !== "gradient") {
                          setPendingGradientPreset(null);
                        }
                      }}
                      className={cn(
                        "overflow-hidden rounded-xl border bg-white text-left",
                        liftClass,
                        pendingBackgroundPreset === option.key
                          ? "border-slate-950/50 ring-4 ring-slate-950/5"
                          : "border-slate-200/80",
                      )}
                    >
                      <PreviewSwatch
                        backgroundPreset={option.key}
                        gradientPreset={pendingGradientPreset ?? "default"}
                        theme="light"
                      />
                      <div className="flex items-center justify-between p-4">
                        <div>
                          <p className="font-semibold text-slate-950">
                            {option.label}
                          </p>
                          <p className="text-sm text-slate-500">
                            {option.blurb}
                          </p>
                        </div>
                        {pendingBackgroundPreset === option.key && (
                          <Check className="h-4 w-4 text-slate-950" />
                        )}
                      </div>
                    </button>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}

          {activeStep === 1 && pendingBackgroundPreset === "gradient" && (
            <Card className={studioCardClass}>
              <CardHeader className="px-4 pb-2 pt-4 sm:px-5 sm:pt-5">
                <CardTitle className="text-xl font-semibold text-slate-950">
                  Gradient Variations
                </CardTitle>
                <CardDescription className="text-slate-500">
                  Choose a restrained palette for your profile.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 px-4 pb-4 sm:grid-cols-2 sm:px-5 sm:pb-5 lg:grid-cols-3 2xl:grid-cols-4">
                {PROFILE_GRADIENT_OPTIONS.map(({ key, label, bg }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setPendingGradientPreset(key)}
                    className={cn(
                      "overflow-hidden rounded-xl border bg-white text-left",
                      liftClass,
                      pendingGradientPreset === key
                        ? "border-slate-950/50 ring-4 ring-slate-950/5"
                        : "border-slate-200/80",
                    )}
                  >
                    <div
                      className="h-16 border-b border-slate-200/70"
                      style={{ background: bg }}
                    />
                    <div className="flex items-center justify-between p-4">
                      <span className="font-semibold text-slate-950">
                        {label}
                      </span>
                      {pendingGradientPreset === key && (
                        <Check className="h-4 w-4 text-slate-950" />
                      )}
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>
          )}

          {activeStep === 2 && (
            <Card className={studioCardClass}>
              <CardHeader className="px-4 pb-2 pt-4 sm:px-5 sm:pt-5">
                <CardTitle className="flex items-center gap-2 text-xl font-semibold text-slate-950">
                  <Palette className="h-4 w-4" />
                  Accent Color
                </CardTitle>
                <CardDescription className="text-slate-500">
                  One quiet brand color for key actions.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 px-4 pb-4 sm:px-5 sm:pb-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={pendingAccentColor || "#ffffff"}
                      onChange={(event) => {
                        setPendingAccentColor(event.target.value);
                        setAccentColorError(null);
                      }}
                      disabled={pendingAccentColor === null}
                      className="h-12 w-16 cursor-pointer rounded-2xl border border-slate-200 bg-slate-100 p-1 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                    <div className="space-y-1">
                      <Input
                        type="text"
                        placeholder="#38b6ff"
                        value={pendingAccentColor ?? ""}
                        onChange={(event) => {
                          const value = event.target.value.trim();
                          setPendingAccentColor(value || null);
                          if (value) {
                            const validation = validateHexColor(value);
                            setAccentColorError(validation.message ?? null);
                          } else {
                            setAccentColorError(null);
                          }
                        }}
                        className={cn(
                          "w-36 rounded-2xl border-0 bg-slate-100/90 font-mono shadow-inner focus-visible:ring-slate-300",
                          accentColorError && "ring-1 ring-red-500",
                        )}
                      />
                      {accentColorError && (
                        <p className="text-xs text-red-500">
                          {accentColorError}
                        </p>
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
                      className="rounded-full border-slate-200 bg-white px-5 text-slate-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-white hover:shadow-md"
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
                      className="rounded-full px-5 text-slate-500 transition-all duration-200 hover:bg-slate-100 hover:text-slate-950"
                    >
                      Use Default
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-8">
                  {ACCENT_SWATCHES.map((swatch) => (
                    <button
                      key={swatch}
                      type="button"
                      onClick={() => {
                        setPendingAccentColor(swatch);
                        setAccentColorError(null);
                      }}
                      className={cn(
                        "rounded-[20px] border bg-white p-3 text-left",
                        liftClass,
                        pendingAccentColor === swatch
                          ? "border-slate-950/50 ring-4 ring-slate-950/5"
                          : "border-slate-200/80",
                      )}
                    >
                      <div
                        className="mb-2 h-8 rounded-xl border border-black/5"
                        style={{ backgroundColor: swatch }}
                      />
                      <p className="font-mono text-xs text-slate-500">
                        {swatch}
                      </p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="rounded-2xl border border-slate-200/70 bg-white/70 shadow-[0_14px_42px_rgba(15,23,42,0.04)] backdrop-blur-xl">
            <CardContent className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
              <Button
                type="button"
                variant="outline"
                onClick={goToPreviousStep}
                disabled={isFirstStep}
                className="h-11 rounded-full border-slate-200 bg-white px-6 text-slate-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-white hover:shadow-md disabled:translate-y-0 disabled:shadow-none"
              >
                Back
              </Button>
              <div className="text-center text-sm text-slate-500">
                Step {activeStep + 1} of {DESIGN_STEPS.length}
              </div>
              <Button
                type="button"
                onClick={goToNextStep}
                disabled={isLastStep}
                className="h-11 rounded-full bg-slate-950 px-6 text-white shadow-[0_10px_30px_rgba(15,23,42,0.16)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-[0_16px_38px_rgba(15,23,42,0.2)] disabled:translate-y-0 disabled:shadow-none"
              >
                {activeStep === 2 ? "Show Preview" : "Continue"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
});

function PreviewSwatch({
  backgroundPreset,
  gradientPreset,
  theme,
}: {
  backgroundPreset:
    | "gradient"
    | "antigravity"
    | "aurora"
    | "iridescence"
    | null;
  gradientPreset:
    | "default"
    | "ocean"
    | "sunset"
    | "forest"
    | "berry"
    | "royal"
    | "ember"
    | "mono"
    | null;
  theme: "light" | "dark";
}) {
  return (
    <div
      className={cn(
        "relative h-16 overflow-hidden border-b border-slate-200/70",
        backgroundPreset === null &&
          (theme === "dark" ? "bg-slate-950" : "bg-slate-50"),
      )}
      style={
        backgroundPreset === "gradient"
          ? {
              background: PROFILE_GRADIENT_OPTIONS.find(
                (option) => option.key === (gradientPreset ?? "default"),
              )?.bg,
            }
          : undefined
      }
    >
      {backgroundPreset === null && (
        <div className="absolute inset-4 rounded-2xl border border-slate-200/70 bg-white/70" />
      )}
      {backgroundPreset === "antigravity" && (
        <Antigravity
          count={60}
          color="#FF9FFC"
          particleSize={1.4}
          className="absolute inset-0"
        />
      )}
      {backgroundPreset === "aurora" && (
        <Aurora
          colorStops={["#5227FF", "#7cff67", "#5227FF"]}
          amplitude={1}
          blend={0.6}
          className="absolute inset-0"
        />
      )}
      {backgroundPreset === "iridescence" && (
        <Iridescence
          speed={1}
          amplitude={0.1}
          mouseReact={false}
          className="absolute inset-0"
        />
      )}
    </div>
  );
}
