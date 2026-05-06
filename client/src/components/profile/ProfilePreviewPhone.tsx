import { memo, useMemo } from "react";
import { Link } from "wouter";
import { Link as LinkType } from "@/lib/api";
import { ExternalLink, Mail, Phone, ShieldCheck, Star } from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import {
  getAvatarUrl,
  platformIconMap,
  type PlatformKey,
} from "@/lib/graphics";
import { cn } from "@/lib/utils";
import { normalizeToE164, buildWhatsAppUrl } from "@/lib/phone";
import { Antigravity, Aurora, Iridescence } from "@/components/backgrounds";
import {
  resolveProfileAppearance,
  type ProfileBackgroundPreset,
  type ProfileBaseTheme,
  type ProfileGradientPreset,
} from "@/lib/profile-appearance";

type ProfilePreviewPhoneProps = {
  displayName: string;
  username: string;
  bio?: string | null;
  avatarValue?: string | null;
  userId?: number | null;
  links: LinkType[];
  avgRating?: number;
  totalReviews?: number;
  phoneNumber?: string | null;
  whatsappNumber?: string | null;
  countryCode?: string | null;
  contactEmail?: string | null;
  theme?: ProfileBaseTheme;
  backgroundPreset?: ProfileBackgroundPreset;
  gradientPreset?: ProfileGradientPreset;
  accentColor?: string | null;
};

const MOCK_REVIEWS = [
  {
    id: 1,
    author: "Sarah M.",
    rating: 5,
    text: "Highly trusted! Great quality.",
  },
  {
    id: 2,
    author: "John K.",
    rating: 5,
    text: "Excellent experience, would recommend!",
  },
  {
    id: 3,
    author: "Emily R.",
    rating: 4,
    text: "Very professional and reliable.",
  },
];

export const ProfilePreviewPhone = memo(function ProfilePreviewPhone({
  displayName,
  username,
  bio,
  avatarValue,
  userId,
  links,
  avgRating,
  totalReviews,
  phoneNumber,
  whatsappNumber,
  countryCode,
  contactEmail,
  theme = "light",
  backgroundPreset,
  gradientPreset,
  accentColor,
}: ProfilePreviewPhoneProps) {
  const activeLinks = useMemo(
    () => links.filter((link) => link.isActive),
    [links],
  );
  const hasReviews = (totalReviews ?? 0) > 0;
  const phoneE164 = useMemo(
    () => normalizeToE164(phoneNumber ?? "", countryCode ?? undefined),
    [phoneNumber, countryCode],
  );
  const whatsappUrl = useMemo(() => {
    const whatsappE164 = normalizeToE164(
      whatsappNumber ?? "",
      countryCode ?? undefined,
    );
    return whatsappE164 ? buildWhatsAppUrl(whatsappE164) : null;
  }, [whatsappNumber, countryCode]);

  const profileHref = username ? `/${username}` : "/";
  const appearance = resolveProfileAppearance({
    theme,
    backgroundPreset,
    gradientPreset,
    accentColor,
  });

  return (
    <div className="w-full max-w-[22rem] shrink-0 mx-auto xl:mx-0">
      <div className="xl:sticky xl:top-24">
        <div className="mb-4 flex items-center justify-between rounded-full border border-slate-200/70 bg-white/70 px-4 py-2 shadow-sm backdrop-blur-xl">
          <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            Live Preview
          </h3>
          <Link
            href={profileHref}
            target="_blank"
            className={cn(
              "rounded-full px-2 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950",
              !username && "pointer-events-none opacity-50",
            )}
          >
            Open
          </Link>
        </div>

        <div className="relative rounded-[2.85rem] bg-linear-to-br from-slate-900 via-slate-800 to-black p-[7px] shadow-[0_28px_90px_rgba(15,23,42,0.22)]">
          <div className="pointer-events-none absolute -inset-4 -z-10 rounded-[3.4rem] bg-white/50 blur-2xl" />
          <div className="relative h-[41.25rem] overflow-hidden rounded-[2.45rem] bg-white">
          <div className="absolute top-0 inset-x-0 z-20 mx-auto h-5 w-28 rounded-b-2xl bg-black/90" />

          {appearance.usesDynamicBackground ? (
            <div
              className="absolute inset-0 z-0 overflow-hidden"
              style={
                appearance.hasGradientBackground && appearance.gradientBackground
                  ? { background: appearance.gradientBackground }
                  : undefined
              }
            >
              {appearance.backgroundPreset === "antigravity" && (
                <Antigravity count={120} color="#FF9FFC" particleSize={1.5} />
              )}
              {appearance.backgroundPreset === "aurora" && (
                <Aurora
                  colorStops={["#5227FF", "#7cff67", "#5227FF"]}
                  amplitude={1}
                  blend={0.5}
                />
              )}
              {appearance.backgroundPreset === "iridescence" && (
                <Iridescence speed={1} amplitude={0.1} mouseReact={false} />
              )}
              {appearance.overlayClass && (
                <div className={cn("absolute inset-0", appearance.overlayClass)} />
              )}
            </div>
          ) : null}

          <div
            className={cn(
              "scrollbar-stage relative z-10 flex h-full w-full flex-col overflow-y-auto",
              appearance.pageTextClass,
            )}
          >
            <div
              className={cn(
                "flex shrink-0 flex-col items-center px-5 pb-7 pt-14 text-center",
                appearance.usesDynamicBackground ? "bg-transparent" : appearance.pageBgClass,
              )}
            >
              <div
                className={cn(
                  "mb-7 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em]",
                  appearance.primaryTextClass,
                )}
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                MiddelMen
              </div>

              <div
                className={cn(
                  "mb-4 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border shadow-[0_12px_34px_rgba(15,23,42,0.14)]",
                  appearance.usesDynamicBackground
                    ? appearance.usesBrightBackground
                      ? "bg-slate-100 border-white/80"
                      : "bg-white/20 border-white/35"
                    : appearance.theme === "dark"
                      ? "bg-slate-700 border-slate-800"
                      : "bg-slate-100 border-white",
                )}
              >
                <img
                  src={getAvatarUrl(avatarValue, userId ?? undefined)}
                  alt={displayName}
                  className="h-full w-full object-cover"
                />
              </div>

              <div className={cn("mb-1 text-lg font-semibold tracking-tight", appearance.primaryTextClass)}>
                {displayName}
              </div>

              <div className={cn("mb-3 text-xs", appearance.mutedTextClass)}>
                @{username || "username"}
              </div>

              {bio ? (
                <p className={cn("mb-5 max-w-[17rem] text-xs leading-5 line-clamp-2", appearance.mutedTextClass)}>
                  {bio}
                </p>
              ) : null}

              <div
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium shadow-sm backdrop-blur-md",
                  appearance.surfaceClass,
                )}
                style={appearance.accentButtonStyle}
              >
                <Star className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500" />
                <span>{hasReviews ? avgRating?.toFixed(1) : "New"}</span>
                <span className={cn(appearance.mutedTextClass)}>
                  ({totalReviews || 0})
                </span>
              </div>

              <div className="mt-4 flex items-center gap-2">
                {phoneE164 && (
                  <a
                    href={`tel:${phoneE164}`}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full border transition-all duration-200 hover:-translate-y-0.5",
                      appearance.contactButtonClass,
                    )}
                    style={appearance.accentIconStyle}
                    aria-label="Call phone number"
                  >
                    <Phone
                      className={cn("w-3.5 h-3.5", appearance.iconColorClass)}
                      style={appearance.accentTextStyle}
                    />
                  </a>
                )}

                {whatsappUrl && (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full border transition-all duration-200 hover:-translate-y-0.5",
                      appearance.contactButtonClass,
                    )}
                    style={appearance.accentIconStyle}
                    aria-label="Open WhatsApp"
                  >
                    <SiWhatsapp
                      className={cn("w-3.5 h-3.5", appearance.iconColorClass)}
                      style={appearance.accentTextStyle}
                    />
                  </a>
                )}

                {contactEmail && (
                  <a
                    href={`mailto:${contactEmail}`}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full border transition-all duration-200 hover:-translate-y-0.5",
                      appearance.contactButtonClass,
                    )}
                    style={appearance.accentIconStyle}
                    aria-label="Send email"
                  >
                    <Mail
                      className={cn("w-3.5 h-3.5", appearance.iconColorClass)}
                      style={appearance.accentTextStyle}
                    />
                  </a>
                )}
              </div>
            </div>

            <div
              className={cn(
                "space-y-4 px-5 pb-7",
                appearance.usesDynamicBackground ? "bg-transparent" : appearance.pageBgClass,
              )}
            >
              {activeLinks.length === 0 ? (
                <div
                  className={cn(
                    "rounded-2xl border-2 border-dashed p-4 text-xs text-center",
                    appearance.usesDynamicBackground
                      ? appearance.usesBrightBackground
                        ? "border-slate-300 text-slate-700"
                        : "border-white/40 text-white/80"
                      : appearance.theme === "dark"
                        ? "border-slate-700 text-slate-400"
                        : "border-slate-300 text-slate-600",
                  )}
                >
                  Add your first link to preview it here.
                </div>
              ) : (
                <div className="space-y-3">
                  {activeLinks.map((link) => {
                    const Icon =
                      platformIconMap[
                        (link.icon as PlatformKey) || "website"
                      ] || platformIconMap.website;

                    return (
                      <div
                        key={link.id}
                        className={cn(
                          "group flex cursor-pointer items-center justify-between rounded-[20px] border p-3.5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
                          appearance.surfaceClass,
                          appearance.usesDynamicBackground
                            ? appearance.usesBrightBackground
                              ? "hover:bg-white"
                              : "hover:bg-white/20"
                            : appearance.theme === "dark"
                              ? "hover:bg-slate-800"
                              : "hover:bg-slate-50",
                        )}
                        style={appearance.accentCardStyle}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "flex h-9 w-9 items-center justify-center rounded-full border",
                              appearance.linkIconClass,
                            )}
                            style={appearance.accentIconStyle}
                          >
                            <Icon
                              className={cn("h-5 w-5", appearance.iconColorClass)}
                              style={appearance.accentTextStyle}
                            />
                          </div>
                          <span
                            className={cn(
                              "text-sm font-semibold",
                              appearance.primaryTextClass,
                            )}
                            style={appearance.accentTextStyle}
                          >
                            {link.title}
                          </span>
                        </div>
                        <ExternalLink
                          className={cn(
                            "w-4 h-4 opacity-0 group-hover:opacity-60 transition-opacity",
                            appearance.iconColorClass,
                          )}
                        />
                      </div>
                    );
                  })}
                </div>
              )}

              <div className={cn("border-t pt-4", appearance.dividerClass)}>
                <div className={cn("mb-3 text-sm font-semibold", appearance.primaryTextClass)}>
                  Recent Reviews
                </div>
                <div className="space-y-3">
                  {MOCK_REVIEWS.map((review) => (
                    <div
                      key={review.id}
                      className={cn(
                        "rounded-[18px] border p-3 shadow-sm",
                        appearance.surfaceClass,
                      )}
                      style={appearance.accentCardStyle}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className={cn("text-xs font-semibold", appearance.primaryTextClass)}
                        >
                          {review.author}
                        </span>
                        <div className="flex gap-0.5">
                          {Array.from({ length: review.rating }).map((_, index) => (
                            <Star
                              key={index}
                              className="h-3 w-3 fill-yellow-500 text-yellow-500"
                            />
                          ))}
                        </div>
                      </div>
                      <p className={cn("text-xs line-clamp-2", appearance.mutedTextClass)}>
                        {review.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
});
