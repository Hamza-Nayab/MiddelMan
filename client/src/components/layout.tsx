import { Link, useLocation } from "wouter";
import { useState, useRef, useEffect } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  Loader2,
  LogOut,
  Menu,
  X,
  Search,
  LayoutDashboard,
  MessageSquare,
  Shield,
  ChevronDown,
  User,
  Compass,
} from "lucide-react";
import logoImg from "@/assets/middelman-bg.png";
import { NotificationBell } from "@/components/notification-bell";
import { useMeQuery } from "@/hooks/use-me";
import { getAvatarUrl } from "@/lib/graphics";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function Layout({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { data: me, isLoading } = useMeQuery();

  const user = me?.user ?? null;
  const profile = user ? me?.profile : null;

  const logoutMutation = useMutation({
    mutationFn: api.logout,
    onSuccess: () => {
      queryClient.clear();
      queryClient.invalidateQueries({ queryKey: ["me"] });
      setLocation("/");
    },
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Keyboard shortcut listener for ⌘K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setLocation("/search");
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
      {/* Distinct navbar layer with crisp bottom border, subtle elevation shadow, and backdrop blur */}
      <nav className="border-b border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md shadow-[0_2px_15px_-3px_rgba(0,0,0,0.06),0_1px_4px_-1px_rgba(0,0,0,0.03)] dark:shadow-[0_2px_15px_-3px_rgba(0,0,0,0.4)] sticky top-0 z-50 transition-all">
        <div className="container mx-auto px-4 max-w-7xl h-16 flex items-center justify-between gap-2 sm:gap-4">
          
          {/* ZONE 1: Left - Brand Logo with Micro-interaction & Primary Nav Links */}
          <div className="flex items-center gap-6 lg:gap-8 shrink-0">
            <Link
              href="/"
              className="group flex items-center gap-2.5 font-heading font-extrabold text-xl tracking-tight text-foreground transition-opacity"
            >
              <div className="relative overflow-hidden rounded-lg p-0.5 transition-transform duration-200 ease-out group-hover:scale-105 group-active:scale-95">
                <img
                  src={logoImg}
                  alt="MiddelMen"
                  className="h-9 w-9 rounded-lg object-contain shadow-2xs"
                />
              </div>
              <span className="text-slate-900 dark:text-slate-50 font-black tracking-tight transition-colors duration-200">
                MiddelMen
              </span>
            </Link>

            {/* Desktop Navigation Links (Removed redundant Search link; replaced with Explore) */}
            <div className="hidden md:flex items-center gap-1">
              <Link
                href="/search"
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-150 flex items-center gap-1.5 active:scale-95",
                  location.startsWith("/search")
                    ? "bg-primary/10 text-primary font-semibold dark:bg-primary/20"
                    : "text-slate-700 dark:text-slate-200 hover:text-primary dark:hover:text-primary hover:bg-slate-100 dark:hover:bg-zinc-900",
                )}
              >
                <Compass className="w-3.5 h-3.5 text-sky-500 transition-transform duration-200 group-hover:rotate-45" />
                Explore
              </Link>
              <Link
                href="/about"
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-150 active:scale-95",
                  location === "/about"
                    ? "bg-primary/10 text-primary font-semibold dark:bg-primary/20"
                    : "text-slate-700 dark:text-slate-200 hover:text-primary dark:hover:text-primary hover:bg-slate-100 dark:hover:bg-zinc-900",
                )}
              >
                About
              </Link>
            </div>
          </div>

          {/* ZONE 2: Center - Centered Search Bar with ⌘K Shortcut Hint and Accent Color */}
          <div className="hidden md:flex flex-1 max-w-sm lg:max-w-md mx-3 lg:mx-6">
            <form onSubmit={handleSearchSubmit} className="relative w-full group">
              {/* Vibrant Sky Blue Search Icon as Brand Accent */}
              <Search className="w-4 h-4 text-sky-500 dark:text-sky-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-200 group-focus-within:text-primary" />
              <Input
                ref={searchInputRef}
                type="text"
                placeholder="Quick search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 w-full pl-10 pr-12 rounded-full border border-slate-200 dark:border-slate-700/80 bg-slate-50/80 dark:bg-zinc-900/90 hover:bg-slate-100/90 dark:hover:bg-zinc-850 focus:bg-white dark:focus:bg-zinc-900 focus:border-primary/60 focus:ring-4 focus:ring-primary/10 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-400 transition-all duration-200 shadow-2xs"
              />
              {/* Keyboard Shortcut Hint */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none flex items-center">
                <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono font-medium text-slate-500 dark:text-slate-400 bg-slate-200/60 dark:bg-zinc-800 border border-slate-300/60 dark:border-slate-700/60 rounded shadow-2xs">
                  <span className="text-[11px]">⌘</span>K
                </kbd>
              </div>
            </form>
          </div>

          {/* ZONE 3: Right - Grouped User Dropdown & High-Contrast CTAs */}
          <div className="hidden md:flex items-center gap-3 shrink-0">
            {user ? (
              <>
                {/* Contextual Quick Action Button */}
                {user.role === "seller" && (
                  <Link
                    href="/dashboard"
                    className={cn(
                      buttonVariants({ size: "sm" }),
                      "h-8.5 px-3.5 text-xs font-semibold gap-1.5 shadow-xs transition-all duration-150 hover:shadow-md active:scale-95",
                      location === "/dashboard"
                        ? "bg-primary text-primary-foreground"
                        : "bg-primary/90 hover:bg-primary text-primary-foreground",
                    )}
                  >
                    <LayoutDashboard className="w-3.5 h-3.5" />
                    Dashboard
                  </Link>
                )}

                {user.role === "buyer" && (
                  <Link
                    href="/my-reviews"
                    className={cn(
                      buttonVariants({
                        size: "sm",
                        variant: location === "/my-reviews" ? "default" : "outline",
                      }),
                      "h-8.5 px-3.5 text-xs font-semibold gap-1.5 transition-all duration-150 active:scale-95",
                    )}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    My Reviews
                  </Link>
                )}

                {user.role === "admin" && (
                  <Link
                    href="/admin"
                    className={cn(
                      buttonVariants({
                        size: "sm",
                        variant: location.startsWith("/admin") ? "default" : "outline",
                      }),
                      "h-8.5 px-3.5 text-xs font-semibold gap-1.5 transition-all duration-150 active:scale-95",
                    )}
                  >
                    <Shield className="w-3.5 h-3.5" />
                    Admin
                  </Link>
                )}

                {/* Notifications Bell */}
                <NotificationBell />

                {/* Grouped User Avatar Dropdown (Collapses username + role + logout) */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="flex items-center gap-2 p-1 pl-1.5 pr-2 rounded-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-zinc-900/60 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-95"
                      aria-label="User account menu"
                    >
                      <Avatar className="h-7 w-7 border border-border/80">
                        <AvatarImage
                          src={getAvatarUrl(profile?.avatarUrl, user.id)}
                          alt={profile?.displayName || user.username || "Avatar"}
                          className="object-cover"
                        />
                        <AvatarFallback className="text-[11px] font-semibold bg-primary/10 text-primary">
                          {(profile?.displayName || user.username || "U")
                            .slice(0, 2)
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-semibold max-w-[110px] truncate text-slate-800 dark:text-slate-200">
                        {profile?.displayName || user.username}
                      </span>
                      <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-foreground transition-colors" />
                    </button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="end" className="w-56 p-1.5 shadow-lg border-slate-200 dark:border-zinc-800 animate-in fade-in-50 zoom-in-95">
                    {/* User Profile Header */}
                    <div className="px-2.5 py-2.5 border-b border-border/60 mb-1">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {profile?.displayName || user.username}
                      </p>
                      <div className="flex items-center justify-between gap-2 mt-1">
                        <p className="text-xs text-muted-foreground truncate">
                          @{user.username || "user"}
                        </p>
                        <span
                          className={cn(
                            "text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded",
                            user.role === "seller"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              : user.role === "admin"
                              ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20"
                              : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20",
                          )}
                        >
                          {user.role}
                        </span>
                      </div>
                    </div>

                    {/* Role Specific Actions */}
                    {user.role === "seller" && (
                      <>
                        <DropdownMenuItem asChild>
                          <Link
                            href="/dashboard"
                            className="flex items-center gap-2.5 cursor-pointer text-xs py-2 hover:bg-muted"
                          >
                            <LayoutDashboard className="w-3.5 h-3.5 text-muted-foreground" />
                            <span>Seller Dashboard</span>
                          </Link>
                        </DropdownMenuItem>
                        {user.username && (
                          <DropdownMenuItem asChild>
                            <Link
                              href={`/${user.username}`}
                              className="flex items-center gap-2.5 cursor-pointer text-xs py-2 hover:bg-muted"
                            >
                              <User className="w-3.5 h-3.5 text-muted-foreground" />
                              <span>View Public Profile</span>
                            </Link>
                          </DropdownMenuItem>
                        )}
                      </>
                    )}

                    {user.role === "buyer" && (
                      <DropdownMenuItem asChild>
                        <Link
                          href="/my-reviews"
                          className="flex items-center gap-2.5 cursor-pointer text-xs py-2 hover:bg-muted"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>My Reviews</span>
                        </Link>
                      </DropdownMenuItem>
                    )}

                    {user.role === "admin" && (
                      <DropdownMenuItem asChild>
                        <Link
                          href="/admin"
                          className="flex items-center gap-2.5 cursor-pointer text-xs py-2 hover:bg-muted"
                        >
                          <Shield className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>Admin Console</span>
                        </Link>
                      </DropdownMenuItem>
                    )}

                    <DropdownMenuSeparator className="my-1" />

                    {/* Log out */}
                    <DropdownMenuItem
                      onClick={() => logoutMutation.mutate()}
                      disabled={logoutMutation.isPending}
                      className="flex items-center gap-2.5 cursor-pointer text-xs py-2 text-destructive focus:text-destructive focus:bg-destructive/10"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Log Out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="flex items-center gap-3">
                {/* High Contrast Sign In Link (Clickable, not grayed out) */}
                <Link
                  href="/auth"
                  className="text-sm font-semibold text-slate-800 dark:text-slate-100 hover:text-primary dark:hover:text-primary px-2.5 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-900 transition-all duration-150 active:scale-95"
                >
                  Sign In
                </Link>
                {/* Strong Visual Anchor: Get Started CTA */}
                <Link href="/auth">
                  <Button
                    size="sm"
                    className="h-9 px-4 text-xs font-semibold shadow-xs hover:shadow-md hover:brightness-105 active:scale-95 transition-all duration-150"
                  >
                    Get Started
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* MOBILE NAVIGATION CONTROLS: Keeps Get Started CTA Visible & Shrinks Navigation into Drawer */}
          <div className="flex md:hidden items-center gap-2">
            {!user && (
              <Link href="/auth">
                <Button
                  size="sm"
                  className="h-8 px-3 text-xs font-semibold shadow-xs active:scale-95 transition-all"
                >
                  Get Started
                </Button>
              </Link>
            )}

            {user && <NotificationBell />}

            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-zinc-900 active:scale-95 transition-transform"
                  aria-label="Toggle navigation menu"
                >
                  {isMobileMenuOpen ? (
                    <X className="h-5 w-5" />
                  ) : (
                    <Menu className="h-5 w-5" />
                  )}
                </Button>
              </SheetTrigger>

              <SheetContent
                side="right"
                className="w-[300px] sm:w-[360px] flex flex-col justify-between p-6 bg-background/98 backdrop-blur-xl border-l border-border"
              >
                <div className="flex flex-col gap-6">
                  <SheetHeader className="text-left pb-2 border-b border-border/60">
                    <SheetTitle>
                      <Link
                        href="/"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="font-heading font-extrabold text-xl tracking-tight text-foreground flex items-center gap-2.5"
                      >
                        <img
                          src={logoImg}
                          alt="MiddelMen"
                          className="h-8 w-8 rounded-lg object-contain shadow-xs"
                        />
                        <span className="text-slate-900 dark:text-slate-50">MiddelMen</span>
                      </Link>
                    </SheetTitle>
                    <SheetDescription className="sr-only">
                      Mobile navigation menu
                    </SheetDescription>
                  </SheetHeader>

                  {/* Mobile Search Bar */}
                  <form
                    onSubmit={(e) => {
                      handleSearchSubmit(e);
                      setIsMobileMenuOpen(false);
                    }}
                    className="relative"
                  >
                    <Search className="w-4 h-4 text-sky-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <Input
                      type="text"
                      placeholder="Quick search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-10 rounded-full border-border/80 bg-muted/40 pl-10 pr-4 text-sm w-full text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-400 focus:bg-background transition-all"
                    />
                  </form>

                  {/* Nav Links */}
                  <div className="flex flex-col gap-1">
                    <Link
                      href="/search"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors",
                        location.startsWith("/search")
                          ? "bg-primary text-primary-foreground font-semibold"
                          : "text-slate-800 dark:text-slate-200 hover:bg-muted/70 hover:text-foreground",
                      )}
                    >
                      <Compass className="w-4 h-4 text-sky-500" />
                      Explore Sellers
                    </Link>
                    <Link
                      href="/about"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors",
                        location === "/about"
                          ? "bg-primary text-primary-foreground font-semibold"
                          : "text-slate-800 dark:text-slate-200 hover:bg-muted/70 hover:text-foreground",
                      )}
                    >
                      About MiddelMen
                    </Link>

                    {user && (
                      <>
                        {user.role === "seller" && (
                          <Link
                            href="/dashboard"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={cn(
                              "flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors",
                              location === "/dashboard"
                                ? "bg-primary text-primary-foreground font-semibold"
                                : "text-slate-800 dark:text-slate-200 hover:bg-muted/70 hover:text-foreground",
                            )}
                          >
                            <LayoutDashboard className="w-4 h-4" />
                            Seller Dashboard
                          </Link>
                        )}
                        {user.role === "buyer" && (
                          <Link
                            href="/my-reviews"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={cn(
                              "flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors",
                              location === "/my-reviews"
                                ? "bg-primary text-primary-foreground font-semibold"
                                : "text-slate-800 dark:text-slate-200 hover:bg-muted/70 hover:text-foreground",
                            )}
                          >
                            <MessageSquare className="w-4 h-4" />
                            My Reviews
                          </Link>
                        )}
                        {user.role === "admin" && (
                          <Link
                            href="/admin"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={cn(
                              "flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors",
                              location.startsWith("/admin")
                                ? "bg-primary text-primary-foreground font-semibold"
                                : "text-slate-800 dark:text-slate-200 hover:bg-muted/70 hover:text-foreground",
                            )}
                          >
                            <Shield className="w-4 h-4" />
                            Admin Console
                          </Link>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Mobile Drawer Footer */}
                <div className="pt-6 border-t border-border/70 mt-auto">
                  {user ? (
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center gap-3 px-1">
                        <Avatar className="h-9 w-9 border border-border/80">
                          <AvatarImage
                            src={getAvatarUrl(profile?.avatarUrl, user.id)}
                            alt={profile?.displayName || user.username || "Avatar"}
                            className="object-cover"
                          />
                          <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                            {(profile?.displayName || user.username || "U")
                              .slice(0, 2)
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-semibold text-foreground truncate">
                            {profile?.displayName || user.username}
                          </span>
                          <span className="text-xs text-muted-foreground capitalize">
                            {user.role} Account
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        className="w-full flex items-center justify-center gap-2 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive active:bg-destructive/20 transition-all"
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          logoutMutation.mutate();
                        }}
                        disabled={logoutMutation.isPending}
                      >
                        <LogOut className="w-4 h-4" />
                        Log Out
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <Link
                        href="/auth"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="w-full"
                      >
                        <Button className="w-full justify-center text-sm font-semibold shadow-xs">
                          Sign In / Register
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>
      <main className={cn("flex-1", className)}>{children}</main>
    </div>
  );
}
