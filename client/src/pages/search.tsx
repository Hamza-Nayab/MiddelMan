import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Layout } from "@/components/layout";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Search as SearchIcon, ExternalLink } from "lucide-react";
import { getAvatarUrl } from "@/lib/graphics";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [location, navigate] = useLocation();
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Extract query parameter from URL
    const params = new URLSearchParams(window.location.search);
    const urlQuery = params.get("q");
    if (urlQuery) {
      setQuery(decodeURIComponent(urlQuery));
    }
  }, [location]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 150);

    return () => window.clearTimeout(handle);
  }, [query]);

  // Handle clicks outside the search container
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useInfiniteQuery({
      queryKey: ["search", debouncedQuery],
      queryFn: ({ pageParam = 0, signal }) =>
        api.search(debouncedQuery, { limit: 15, offset: pageParam, signal }),
      enabled: debouncedQuery.length >= 2,
      initialPageParam: 0,
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      getNextPageParam: (lastPage) =>
        lastPage?.meta?.hasMore ? lastPage.meta.nextOffset : undefined,
    });

  const { data: suggestData } = useQuery({
    queryKey: ["search-suggest", debouncedQuery],
    queryFn: ({ signal }) => api.searchSuggest(debouncedQuery, { signal }),
    enabled: debouncedQuery.length >= 2,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });

  const results = data?.pages.flatMap((page) => page.results) || [];
  const suggestions = suggestData?.suggestions || [];

  return (
    <Layout>
      <div className="container max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold font-heading mb-4">
            Discover Creators
          </h1>
          <p className="text-muted-foreground mb-8">
            Find people, inspiration, and connections.
          </p>

          <div className="relative max-w-lg mx-auto" ref={searchContainerRef}>
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input
              className="pl-10 h-12 rounded-full shadow-sm"
              placeholder="Search by username or name..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
            />

            {showSuggestions &&
              debouncedQuery.length >= 2 &&
              suggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-2 rounded-xl border border-border bg-background shadow-lg z-20 overflow-hidden">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion.username}
                      type="button"
                      className="w-full px-4 py-3 text-left hover:bg-accent transition-colors"
                      onClick={() => {
                        setShowSuggestions(false);
                        navigate(`/${encodeURIComponent(suggestion.username)}`);
                      }}
                    >
                      <div className="font-medium">@{suggestion.username}</div>
                      <div className="text-sm text-muted-foreground">
                        {suggestion.displayName}
                      </div>
                    </button>
                  ))}
                </div>
              )}
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-10 text-muted-foreground">
            Searching...
          </div>
        ) : debouncedQuery.length < 2 ? (
          <div className="text-center py-20 text-muted-foreground">
            Type at least 2 characters to search.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {results.map((result) => (
              <Link key={result.username} href={`/${encodeURIComponent(result.username)}`}>
                <Card className="hover:shadow-md transition-all cursor-pointer group h-full overflow-hidden border-border/60">
                  <CardContent className="p-0">
                    <div className="h-24 bg-gradient-to-r from-primary/10 to-purple-400/10 group-hover:from-primary/20 group-hover:to-purple-400/20 transition-colors" />
                    <div className="px-6 pb-6 -mt-10">
                      <Avatar className="w-20 h-20 border-4 border-background shadow-sm mb-3">
                        <AvatarImage
                          src={getAvatarUrl(result.avatarUrl, result.username)}
                        />
                        <AvatarFallback>
                          {result.username?.[0]?.toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors">
                            {result.displayName}
                          </h3>
                          <p className="text-sm text-muted-foreground mb-2">
                            @{result.username}
                          </p>
                        </div>
                        <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>

                      <p className="text-sm text-slate-600 line-clamp-2 min-h-[2.5em]">
                        {result.bio || "No bio available."}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}

            {results.length === 0 && (
              <div className="col-span-full text-center py-20 text-muted-foreground">
                No users found matching "{query}"
              </div>
            )}
          </div>
        )}

        {results.length > 0 && hasNextPage && (
          <div className="mt-10 flex justify-center">
            <Button
              variant="outline"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
            >
              {isFetchingNextPage ? "Loading..." : "Load More"}
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
}
