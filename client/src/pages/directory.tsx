import { useState, useMemo } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { SEO } from "@/components/seo";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Star,
  ShieldCheck,
  Search,
  ExternalLink,
  ChevronRight,
  Store,
  Users,
} from "lucide-react";
import { api, type PublicProfileItem } from "@/lib/api";
import { getAvatarUrl } from "@/lib/graphics";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 24;

export default function DirectoryPage() {
  const [offset, setOffset] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["public-directory", offset],
    queryFn: () => api.getPublicProfiles({ limit: PAGE_SIZE, offset }),
    staleTime: 60 * 1000,
  });

  const profiles: PublicProfileItem[] = data?.profiles ?? [];

  const filteredProfiles = useMemo(() => {
    if (!searchTerm.trim()) return profiles;
    const term = searchTerm.toLowerCase().trim();
    return profiles.filter((p) => {
      const usernameMatch = p.username?.toLowerCase().includes(term);
      const nameMatch = p.displayName?.toLowerCase().includes(term);
      const bioMatch = p.bio?.toLowerCase().includes(term);
      return usernameMatch || nameMatch || bioMatch;
    });
  }, [profiles, searchTerm]);

  return (
    <Layout>
      <SEO
        title="Verified Sellers Directory | MiddelMen Trust Profiles"
        description="Browse verified online sellers, creators, and social commerce stores. Inspect trust scores, verified customer reviews, and official profile links on MiddelMen."
        keywords={[
          "seller directory",
          "verified sellers",
          "browse sellers",
          "middelmen directory",
          "social commerce profiles",
          "trust passport",
          "verified merchants",
        ]}
      />

      <div className="min-h-screen bg-slate-50/50 dark:bg-zinc-950/50">
        {/* Hero Section */}
        <div className="border-b border-border/60 bg-background/80 backdrop-blur-md">
          <div className="container max-w-7xl mx-auto px-4 py-12 md:py-16">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 mb-4">
                <Store className="w-3.5 h-3.5" />
                Verified Merchant Directory
              </div>
              <h1 className="text-3xl md:text-5xl font-heading font-extrabold tracking-tight text-foreground">
                Explore Trusted Sellers
              </h1>
              <p className="mt-3 text-base md:text-lg text-muted-foreground leading-relaxed">
                Discover independent creators, brands, and social commerce sellers. Check verified
                customer reviews and reputation passports before you buy.
              </p>

              {/* In-page Filter Input */}
              <div className="mt-8 max-w-md relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Filter by name, username, or keyword..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-11 rounded-xl bg-background border-border/80 shadow-2xs"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Directory Grid */}
        <div className="container max-w-7xl mx-auto px-4 py-10 md:py-14">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {Array.from({ length: 8 }).map((_, index) => (
                <Card key={index} className="h-64 animate-pulse bg-muted/40 border-border/60 rounded-2xl" />
              ))}
            </div>
          ) : filteredProfiles.length === 0 ? (
            <div className="text-center py-20 px-4">
              <Users className="w-12 h-12 text-muted-foreground/60 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground">No sellers found</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                {searchTerm
                  ? `No sellers match "${searchTerm}". Try searching for another name or handle.`
                  : "No public seller profiles available right now. Check back soon!"}
              </p>
              {searchTerm && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSearchTerm("")}
                  className="mt-4 rounded-xl"
                >
                  Clear filter
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredProfiles.map((seller) => {
                const totalRev = Number(seller.totalReviews) || 0;
                const avgRat = Number(seller.avgRating) || 0;
                const displayName = seller.displayName || seller.username || "Seller";
                const profileHref = `/${encodeURIComponent(seller.username)}`;

                return (
                  <Link
                    key={seller.id}
                    href={profileHref}
                    className="group block focus:outline-hidden"
                  >
                    <Card className="h-full border border-border/70 hover:border-primary/50 hover:shadow-lg transition-all duration-200 rounded-2xl overflow-hidden bg-card flex flex-col justify-between group-hover:-translate-y-1">
                      <CardContent className="p-5 flex flex-col flex-1">
                        {/* Header: Avatar + Badges */}
                        <div className="flex items-start gap-3.5 mb-4">
                          <Avatar className="h-14 w-14 border-2 border-background shadow-xs shrink-0">
                            <AvatarImage
                              src={getAvatarUrl(seller.avatarUrl, seller.id)}
                              alt={displayName}
                              className="object-cover"
                            />
                            <AvatarFallback className="bg-primary/10 text-primary font-bold text-base">
                              {displayName.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <h2 className="font-bold text-base text-foreground truncate group-hover:text-primary transition-colors">
                                {displayName}
                              </h2>
                              {seller.isVerified && (
                                <ShieldCheck
                                  className="w-4 h-4 text-blue-500 shrink-0"
                                  fill="currentColor"
                                  stroke="white"
                                  aria-label="Verified Seller"
                                />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              @{seller.username}
                            </p>

                            {/* Rating snippet */}
                            <div className="flex items-center gap-1 mt-1.5 text-xs">
                              {totalRev > 0 ? (
                                <>
                                  <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                                  <span className="font-semibold text-foreground">
                                    {avgRat.toFixed(1)}
                                  </span>
                                  <span className="text-muted-foreground">
                                    ({totalRev} {totalRev === 1 ? "review" : "reviews"})
                                  </span>
                                </>
                              ) : (
                                <span className="text-slate-500 dark:text-slate-400 font-medium">
                                  New Seller
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Bio / Description */}
                        <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed mb-4 flex-1">
                          {seller.bio ||
                            "Verified seller profile on MiddelMen. Inspect customer reviews and ratings before transacting."}
                        </p>

                        {/* Action link */}
                        <div className="pt-3 border-t border-border/50 flex items-center justify-between text-xs font-semibold text-primary group-hover:translate-x-0.5 transition-transform">
                          <span>View Trust Profile</span>
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Pagination Controls */}
          {profiles.length > 0 && (
            <div className="mt-12 flex items-center justify-center gap-3">
              <Button
                variant="outline"
                size="sm"
                disabled={offset === 0 || isFetching}
                onClick={() => setOffset((prev) => Math.max(0, prev - PAGE_SIZE))}
                className="rounded-xl px-4"
              >
                Previous
              </Button>
              <span className="text-xs text-muted-foreground font-medium px-2">
                Page {Math.floor(offset / PAGE_SIZE) + 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={profiles.length < PAGE_SIZE || isFetching}
                onClick={() => setOffset((prev) => prev + PAGE_SIZE)}
                className="rounded-xl px-4"
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
