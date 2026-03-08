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

  return (
    <div className="hidden lg:block w-[334px] shrink-0">
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
        <div className="border-[11px] border-slate-900 rounded-[2.64rem] h-[660px] overflow-hidden bg-white shadow-2xl relative">
          <div className="absolute top-0 inset-x-0 h-[22px] bg-slate-900 rounded-b-lg w-32 mx-auto z-20" />
          <div className="h-full w-full overflow-y-auto flex flex-col">
            {/* Header - Fixed */}
            <div className="px-4 pt-12 pb-6 flex flex-col items-center text-center shrink-0 bg-white">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900 mb-6">
                <ShieldCheck className="w-3.5 h-3.5" fill="currentColor" />
                MiddelMen
              </div>

              {/* Avatar */}
              <div className="h-20 w-20 rounded-full bg-slate-200 flex items-center justify-center shadow-lg mb-4 overflow-hidden border-4 border-white/70">
                <img
                  src={getAvatarUrl(avatarValue, userId ?? undefined)}
                  alt={displayName}
                  className="h-full w-full object-cover"
                />
              </div>

              {/* Name */}
              <div className="text-lg font-bold text-slate-900 mb-1">
                {displayName}
              </div>

              {/* Username */}
              <div className="text-xs text-slate-600 mb-2">
                @{username || "username"}
              </div>

              {/* Bio */}
              {bio ? (
                <p className="text-xs text-slate-600 mb-4 line-clamp-2">
                  {bio}
                </p>
              ) : null}

              {/* Rating Badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 bg-white text-xs font-medium text-slate-900 shadow-sm">
                <Star className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500" />
                <span>{hasReviews ? avgRating?.toFixed(1) : "New"}</span>
                <span className="text-slate-600">({totalReviews || 0})</span>
              </div>

              {/* Contact Icons */}
              <div className="flex items-center gap-2 mt-3">
                {phoneE164 && (
                  <a
                    href={`tel:${phoneE164}`}
                    className="h-8 w-8 rounded-full border border-slate-200 bg-white flex items-center justify-center hover:bg-slate-50 transition-colors"
                    aria-label="Call phone number"
                  >
                    <Phone className="w-3.5 h-3.5 text-slate-700" />
                  </a>
                )}

                {whatsappUrl && (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-8 w-8 rounded-full border border-slate-200 bg-white flex items-center justify-center hover:bg-slate-50 transition-colors"
                    aria-label="Open WhatsApp"
                  >
                    <SiWhatsapp className="w-3.5 h-3.5 text-slate-700" />
                  </a>
                )}

                {contactEmail && (
                  <a
                    href={`mailto:${contactEmail}`}
                    className="h-8 w-8 rounded-full border border-slate-200 bg-white flex items-center justify-center hover:bg-slate-50 transition-colors"
                    aria-label="Send email"
                  >
                    <Mail className="w-3.5 h-3.5 text-slate-700" />
                  </a>
                )}
              </div>
            </div>

            {/* Links + Reviews - Scrollable */}
            <div className="px-4 pb-6 space-y-4">
              {/* Links Section */}
              {activeLinks.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-slate-300 p-4 text-xs text-slate-600 text-center">
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
                        className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors p-4 group cursor-pointer shadow-sm hover:shadow-md"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
                            <Icon className="h-5 w-5 text-slate-700" />
                          </div>
                          <span className="text-sm font-semibold text-slate-900">
                            {link.title}
                          </span>
                        </div>
                        <ExternalLink className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-60 transition-opacity" />
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Reviews Section */}
              <div className="border-t border-slate-200 pt-4">
                <div className="text-sm font-semibold text-slate-900 mb-3">
                  Recent Reviews
                </div>
                <div className="space-y-3">
                  {MOCK_REVIEWS.map((review) => (
                    <div
                      key={review.id}
                      className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-900">
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
                      <p className="text-xs text-slate-600 line-clamp-2">
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
