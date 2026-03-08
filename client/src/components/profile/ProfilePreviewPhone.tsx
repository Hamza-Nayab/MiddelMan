import { memo, useMemo } from "react";
import { Link } from "wouter";
import { Link as LinkType } from "@/lib/api";
import { Star, ExternalLink, ShieldCheck, Phone, Mail } from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import {
  getAvatarUrl,
  platformIconMap,
  type PlatformKey,
} from "@/lib/graphics";
import { cn } from "@/lib/utils";
import { normalizeToE164, buildWhatsAppUrl } from "@/lib/phone";

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
  theme?: "light" | "dark" | "gradient";
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
  const isDarkTheme = theme === "dark";
  const isGradientTheme = theme === "gradient";

  const headerClass = isDarkTheme
    ? "bg-slate-900"
    : isGradientTheme
      ? "bg-linear-to-br from-indigo-500 via-purple-500 to-pink-500"
      : "bg-white";

  const contentClass = isDarkTheme
    ? "bg-slate-950"
    : isGradientTheme
      ? "bg-linear-to-br from-indigo-500 via-purple-500 to-pink-500"
      : "bg-white";

  const sectionClass = isDarkTheme
    ? "text-slate-100"
    : isGradientTheme
      ? "text-white"
      : "text-slate-900";

  const mutedTextClass = isDarkTheme
    ? "text-slate-400"
    : isGradientTheme
      ? "text-white/80"
      : "text-slate-600";

  const cardClass = isDarkTheme
    ? "border-slate-800 bg-slate-900"
    : isGradientTheme
      ? "border-white/30 bg-white/15 backdrop-blur-md"
      : "border-slate-200 bg-white";

  return (
    <div className="hidden lg:block w-83.5 shrink-0">
      <div className="sticky top-24">
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
        <div className="border-11 border-slate-900 rounded-[2.64rem] h-165 overflow-hidden bg-white shadow-2xl relative">
          <div className="absolute top-0 inset-x-0 h-5.5 bg-slate-900 rounded-b-lg w-32 mx-auto z-20" />
          <div className="h-full w-full overflow-y-auto flex flex-col">
            {/* Header - Fixed */}
            <div
              className={cn(
                "px-4 pt-12 pb-6 flex flex-col items-center text-center shrink-0",
                headerClass,
              )}
            >
              <div
                className={cn(
                  "flex items-center gap-1.5 text-xs font-semibold mb-6",
                  sectionClass,
                )}
              >
                <ShieldCheck className="w-3.5 h-3.5" fill="currentColor" />
                MiddelMen
              </div>

              {/* Avatar */}
              <div
                className={cn(
                  "h-20 w-20 rounded-full flex items-center justify-center shadow-lg mb-4 overflow-hidden border-4",
                  isDarkTheme
                    ? "bg-slate-700 border-slate-800"
                    : isGradientTheme
                      ? "bg-white/20 border-white/30"
                      : "bg-slate-200 border-white/70",
                )}
              >
                <img
                  src={getAvatarUrl(avatarValue, userId ?? undefined)}
                  alt={displayName}
                  className="h-full w-full object-cover"
                />
              </div>

              {/* Name */}
              <div className={cn("text-lg font-bold mb-1", sectionClass)}>
                {displayName}
              </div>

              {/* Username */}
              <div className={cn("text-xs mb-2", mutedTextClass)}>
                @{username || "username"}
              </div>

              {/* Bio */}
              {bio ? (
                <p className={cn("text-xs mb-4 line-clamp-2", mutedTextClass)}>
                  {bio}
                </p>
              ) : null}

              {/* Rating Badge */}
              <div
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium shadow-sm",
                  isDarkTheme
                    ? "border-slate-700 bg-slate-800 text-slate-100"
                    : isGradientTheme
                      ? "border-white/30 bg-white/20 text-white"
                      : "border-slate-200 bg-white text-slate-900",
                )}
              >
                <Star className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500" />
                <span>{hasReviews ? avgRating?.toFixed(1) : "New"}</span>
                <span className={cn(mutedTextClass)}>({totalReviews || 0})</span>
              </div>

              {/* Contact Icons */}
              <div className="flex items-center gap-2 mt-3">
                {phoneE164 && (
                  <a
                    href={`tel:${phoneE164}`}
                    className={cn(
                      "h-8 w-8 rounded-full border flex items-center justify-center transition-colors",
                      isDarkTheme
                        ? "border-slate-700 bg-slate-800 hover:bg-slate-700"
                        : isGradientTheme
                          ? "border-white/30 bg-white/20 hover:bg-white/30"
                          : "border-slate-200 bg-white hover:bg-slate-50",
                    )}
                    aria-label="Call phone number"
                  >
                    <Phone
                      className={cn(
                        "w-3.5 h-3.5",
                        isDarkTheme || isGradientTheme
                          ? "text-white"
                          : "text-slate-700",
                      )}
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
                      isDarkTheme
                        ? "border-slate-700 bg-slate-800 hover:bg-slate-700"
                        : isGradientTheme
                          ? "border-white/30 bg-white/20 hover:bg-white/30"
                          : "border-slate-200 bg-white hover:bg-slate-50",
                    )}
                    aria-label="Open WhatsApp"
                  >
                    <SiWhatsapp
                      className={cn(
                        "w-3.5 h-3.5",
                        isDarkTheme || isGradientTheme
                          ? "text-white"
                          : "text-slate-700",
                      )}
                    />
                  </a>
                )}

                {contactEmail && (
                  <a
                    href={`mailto:${contactEmail}`}
                    className={cn(
                      "h-8 w-8 rounded-full border flex items-center justify-center transition-colors",
                      isDarkTheme
                        ? "border-slate-700 bg-slate-800 hover:bg-slate-700"
                        : isGradientTheme
                          ? "border-white/30 bg-white/20 hover:bg-white/30"
                          : "border-slate-200 bg-white hover:bg-slate-50",
                    )}
                    aria-label="Send email"
                  >
                    <Mail
                      className={cn(
                        "w-3.5 h-3.5",
                        isDarkTheme || isGradientTheme
                          ? "text-white"
                          : "text-slate-700",
                      )}
                    />
                  </a>
                )}
              </div>
            </div>

            {/* Links + Reviews - Scrollable */}
            <div className={cn("px-4 pb-6 space-y-4", contentClass)}>
              {/* Links Section */}
              {activeLinks.length === 0 ? (
                <div
                  className={cn(
                    "rounded-2xl border-2 border-dashed p-4 text-xs text-center",
                    isDarkTheme
                      ? "border-slate-700 text-slate-400"
                      : isGradientTheme
                        ? "border-white/40 text-white/80"
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
                          cardClass,
                          isDarkTheme && "hover:bg-slate-800",
                          isGradientTheme && "hover:bg-white/20",
                          !isDarkTheme && !isGradientTheme && "hover:bg-slate-50",
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "h-9 w-9 rounded-full border flex items-center justify-center",
                              isDarkTheme
                                ? "bg-slate-800 border-slate-700"
                                : isGradientTheme
                                  ? "bg-white/20 border-white/30"
                                  : "bg-slate-100 border-slate-200",
                            )}
                          >
                            <Icon
                              className={cn(
                                "h-5 w-5",
                                isDarkTheme || isGradientTheme
                                  ? "text-white"
                                  : "text-slate-700",
                              )}
                            />
                          </div>
                          <span className={cn("text-sm font-semibold", sectionClass)}>
                            {link.title}
                          </span>
                        </div>
                        <ExternalLink
                          className={cn(
                            "w-4 h-4 opacity-0 group-hover:opacity-60 transition-opacity",
                            isDarkTheme || isGradientTheme
                              ? "text-white/70"
                              : "text-slate-400",
                          )}
                        />
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Reviews Section */}
              <div
                className={cn(
                  "border-t pt-4",
                  isDarkTheme
                    ? "border-slate-800"
                    : isGradientTheme
                      ? "border-white/30"
                      : "border-slate-200",
                )}
              >
                <div className={cn("text-sm font-semibold mb-3", sectionClass)}>
                  Recent Reviews
                </div>
                <div className="space-y-3">
                  {MOCK_REVIEWS.map((review) => (
                    <div
                      key={review.id}
                      className={cn("rounded-xl border p-3 shadow-sm", cardClass)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={cn("text-xs font-semibold", sectionClass)}>
                          {review.author}
                        </span>
                        <div className="flex gap-0.5">
                          {Array.from({ length: review.rating }).map((_, i) => (
                            <Star
                              key={i}
                              className="h-3 w-3 fill-yellow-500 text-yellow-500"
                            />
                          ))}
                        </div>
                      </div>
                      <p className={cn("text-xs line-clamp-2", mutedTextClass)}>
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
