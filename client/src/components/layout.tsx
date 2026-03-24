import { Link, useLocation } from "wouter";
import { useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Loader2, LogOut } from "lucide-react";
import logoImg from "@/assets/middelman-bg.png";
import { NotificationBell } from "@/components/notification-bell";
import { useMeQuery } from "@/hooks/use-me";

export function Layout({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: me, isLoading } = useMeQuery();

  const user = me?.user ?? null;
  const profile = user ? me?.profile : null;

  const logoutMutation = useMutation({
    mutationFn: api.logout,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
      setLocation("/");
    },
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    const trimmed = searchQuery.trim();

    // If there's no query yet, just toggle open state instead of navigating
    if (!trimmed) {
      setIsSearchExpanded(true);
      return;
    }

    const params = new URLSearchParams({ q: trimmed });
    setLocation(`/search?${params.toString()}`);
  };

  if (isLoading)
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" />
      </div>
    );

  return (
    <div className="min-h-screen flex flex-col bg-background font-sans">
      <nav className="border-b border-border/40 bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="font-heading font-bold text-xl tracking-tight text-primary hover:opacity-80 transition-opacity flex items-center gap-2"
          >
            <img
              src={logoImg}
              alt=""
              className="h-10 w-10 rounded-[4px] object-cover"
            />
            MiddelMen
          </Link>

          <div className="flex items-center gap-4">
            <form
              onSubmit={handleSearchSubmit}
              className={cn(
                "flex items-center gap-2 transition-all duration-300 group",
                isSearchExpanded ? "w-64" : "w-[88px]",
              )}
              onMouseEnter={() => setIsSearchExpanded(true)}
              onMouseLeave={() => {
                if (!searchQuery.trim()) {
                  setIsSearchExpanded(false);
                }
              }}
            >
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                className={cn(
                  "text-muted-foreground whitespace-nowrap",
                  location.startsWith("/search") && "text-primary bg-accent",
                )}
              >
                Search
              </Button>
              <Input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn(
                  "h-8 rounded-full border-border/60 bg-background/80 pl-3 pr-3 text-sm transition-all duration-300 ease-out",
                  "focus-visible:ring-0 focus-visible:ring-offset-0",
                  isSearchExpanded
                    ? "opacity-100 w-40 ml-1"
                    : "opacity-0 w-0 ml-0 pointer-events-none",
                )}
              />
            </form>
            <Link
              href="/about"
              className={cn(
                buttonVariants({ variant: "ghost" }),
                "text-sm",
                location === "/about" && "bg-accent",
              )}
            >
              About
            </Link>
            {user ? (
              <>
                {user.role === "seller" ? (
                  <Link
                    href="/dashboard"
                    className={cn(
                      buttonVariants({ variant: "ghost" }),
                      "text-sm",
                      location === "/dashboard" && "bg-accent",
                    )}
                  >
                    Dashboard
                  </Link>
                ) : null}
                {user.role === "buyer" ? (
                  <Link
                    href="/my-reviews"
                    className={cn(
                      buttonVariants({ variant: "ghost" }),
                      "text-sm",
                      location === "/my-reviews" && "bg-accent",
                    )}
                  >
                    My Reviews
                  </Link>
                ) : null}
                {user.role === "admin" ? (
                  <Link
                    href="/admin"
                    className={cn(
                      buttonVariants({ variant: "ghost" }),
                      "text-sm",
                      location === "/admin" && "bg-accent",
                    )}
                  >
                    Admin
                  </Link>
                ) : null}
                <div className="flex items-center gap-2 pl-4 border-l border-border">
                  <NotificationBell />
                  <span className="text-sm font-medium hidden sm:block">
                    {profile?.displayName || user.username || "Account"}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => logoutMutation.mutate()}
                    disabled={logoutMutation.isPending}
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </div>
              </>
            ) : (
              <Link href="/auth">
                <Button>Get Started</Button>
              </Link>
            )}
          </div>
        </div>
      </nav>
      <main className={cn("flex-1", className)}>{children}</main>
    </div>
  );
}
