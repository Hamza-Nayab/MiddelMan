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
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-sm text-muted-foreground">
            Live Preview
          </h3>
          <Link
            href={profileHref}
            target="_blank"
            className={cn(
              "text-xs font-medium text-primary hover:underline",
              !username && "pointer-events-none opacity-50",
            )}
          >
            Open public profile
          </Link>
        </div>

        <div className="border-[11px] border-slate-900 rounded-[2.64rem] h-[41.25rem] overflow-hidden bg-white shadow-2xl relative">
          <div className="absolute top-0 inset-x-0 h-5.5 bg-slate-900 rounded-b-lg w-32 mx-auto z-20" />

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
              "h-full w-full overflow-y-auto flex flex-col relative z-10",
              appearance.pageTextClass,
            )}
          >
            <div
              className={cn(
                "px-4 pt-12 pb-6 flex flex-col items-center text-center shrink-0",
                appearance.usesDynamicBackground ? "bg-transparent" : appearance.pageBgClass,
              )}
            >
              <div
                className={cn(
                  "flex items-center gap-1.5 text-xs font-semibold mb-6",
                  appearance.primaryTextClass,
                )}
              >
                <ShieldCheck className="w-3.5 h-3.5" fill="currentColor" />
                MiddelMen
              </div>

              <div
                className={cn(
                  "h-20 w-20 rounded-full flex items-center justify-center shadow-lg mb-4 overflow-hidden border-4",
                  appearance.usesDynamicBackground
                    ? appearance.usesBrightBackground
                      ? "bg-slate-100 border-slate-300"
                      : "bg-white/20 border-white/30"
                    : appearance.theme === "dark"
                      ? "bg-slate-700 border-slate-800"
                      : "bg-slate-200 border-white/70",
                )}
              >
                <img
                  src={getAvatarUrl(avatarValue, userId ?? undefined)}
                  alt={displayName}
                  className="h-full w-full object-cover"
                />
              </div>

              <div className={cn("text-lg font-bold mb-1", appearance.primaryTextClass)}>
                {displayName}
              </div>

              <div className={cn("text-xs mb-2", appearance.mutedTextClass)}>
                @{username || "username"}
              </div>

              {bio ? (
                <p className={cn("text-xs mb-4 line-clamp-2", appearance.mutedTextClass)}>
                  {bio}
                </p>
              ) : null}

              <div
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium shadow-sm",
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

              <div className="flex items-center gap-2 mt-3">
                {phoneE164 && (
                  <a
                    href={`tel:${phoneE164}`}
                    className={cn(
                      "h-8 w-8 rounded-full border flex items-center justify-center transition-colors",
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
                      "h-8 w-8 rounded-full border flex items-center justify-center transition-colors",
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
                      "h-8 w-8 rounded-full border flex items-center justify-center transition-colors",
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
                "px-4 pb-6 space-y-4",
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
                          "flex items-center justify-between rounded-2xl border transition-colors p-4 group cursor-pointer shadow-sm hover:shadow-md",
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
                              "h-9 w-9 rounded-full border flex items-center justify-center",
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
                <div className={cn("text-sm font-semibold mb-3", appearance.primaryTextClass)}>
                  Recent Reviews
                </div>
                <div className="space-y-3">
                  {MOCK_REVIEWS.map((review) => (
                    <div
                      key={review.id}
                      className={cn(
                        "rounded-xl border p-3 shadow-sm",
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
  );
});
