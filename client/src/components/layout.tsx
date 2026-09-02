import { Link, useLocation } from "wouter";
import { useState } from "react";
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
      {/* Defined navbar layer with clean border and subtle elevation shadow */}
      <nav className="border-b border-border/80 bg-background/95 backdrop-blur-md shadow-xs sticky top-0 z-50 transition-all">
        <div className="container mx-auto px-4 max-w-7xl h-16 flex items-center justify-between gap-4">
          {/* Left Zone: Brand Logo with visual weight & Nav Links */}
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="flex items-center gap-2.5 font-heading font-extrabold text-xl tracking-tight text-foreground hover:opacity-90 transition-opacity"
            >
              <img
                src={logoImg}
                alt="MiddelMen"
                className="h-9 w-9 rounded-lg object-contain shadow-xs"
              />
              <span className="bg-gradient-to-r from-foreground via-foreground to-primary/80 bg-clip-text">
                MiddelMen
              </span>
            </Link>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center gap-1">
              <Link
                href="/search"
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5",
                  location.startsWith("/search")
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-foreground hover:bg-muted/70",
                )}
              >
                <Search className="w-3.5 h-3.5" />
                Search
              </Link>
              <Link
                href="/about"
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-lg transition-colors",
                  location === "/about"
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-foreground hover:bg-muted/70",
                )}
              >
                About
              </Link>
            </div>
          </div>

          {/* Center Zone: Quick Search Bar on larger viewports */}
          <div className="hidden lg:flex flex-1 max-w-xs mx-4">
            <form onSubmit={handleSearchSubmit} className="relative w-full">
              <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input
                type="text"
                placeholder="Search sellers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8.5 w-full pl-8.5 pr-3 rounded-full border-border/70 bg-muted/30 hover:bg-muted/60 focus:bg-background text-xs transition-all duration-300"
              />
            </form>
          </div>

          {/* Right Zone: User Area / CTA Actions */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                {/* Primary Role Quick Action */}
                {user.role === "seller" && (
                  <Link
                    href="/dashboard"
                    className={cn(
                      buttonVariants({ size: "sm" }),
                      "h-8.5 px-3.5 text-xs font-semibold gap-1.5 shadow-xs transition-all",
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
                      "h-8.5 px-3.5 text-xs font-semibold gap-1.5 transition-all",
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
                      "h-8.5 px-3.5 text-xs font-semibold gap-1.5 transition-all",
                    )}
                  >
                    <Shield className="w-3.5 h-3.5" />
                    Admin
                  </Link>
                )}

                {/* Notifications Bell */}
                <NotificationBell />

                {/* Grouped User Avatar Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="flex items-center gap-2 p-1 pl-1.5 pr-2 rounded-full border border-border/70 bg-muted/20 hover:bg-muted/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
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
                      <span className="text-xs font-semibold max-w-[110px] truncate text-foreground">
                        {profile?.displayName || user.username}
                      </span>
                      <ChevronDown className="w-3 h-3 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="end" className="w-56 p-1.5 shadow-md">
                    {/* User Header */}
                    <div className="px-2 py-2 border-b border-border/60 mb-1">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {profile?.displayName || user.username}
                      </p>
                      <div className="flex items-center justify-between gap-2 mt-0.5">
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
                            className="flex items-center gap-2 cursor-pointer text-xs py-2"
                          >
                            <LayoutDashboard className="w-3.5 h-3.5 text-muted-foreground" />
                            <span>Seller Dashboard</span>
                          </Link>
                        </DropdownMenuItem>
                        {user.username && (
                          <DropdownMenuItem asChild>
                            <Link
                              href={`/${user.username}`}
                              className="flex items-center gap-2 cursor-pointer text-xs py-2"
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
                          className="flex items-center gap-2 cursor-pointer text-xs py-2"
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
                          className="flex items-center gap-2 cursor-pointer text-xs py-2"
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
                      className="flex items-center gap-2 cursor-pointer text-xs py-2 text-destructive focus:text-destructive focus:bg-destructive/10"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Log Out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/auth"
                  className="text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-foreground px-3 py-1.5 transition-colors"
                >
                  Sign In
                </Link>
                <Link href="/auth">
                  <Button size="sm" className="h-8.5 px-4 text-xs font-semibold shadow-xs">
                    Get Started
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Navigation Trigger */}
          <div className="flex md:hidden items-center gap-2">
            {user && <NotificationBell />}

            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-foreground"
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
                        <span>MiddelMen</span>
                      </Link>
                    </SheetTitle>
                  </SheetHeader>

                  {/* Mobile Quick Search */}
                  <form
                    onSubmit={(e) => {
                      handleSearchSubmit(e);
                      setIsMobileMenuOpen(false);
                    }}
                    className="relative"
                  >
                    <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <Input
                      type="text"
                      placeholder="Search sellers..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-10 rounded-full border-border/80 bg-muted/40 pl-10 pr-4 text-sm w-full focus:bg-background transition-all"
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
                          : "text-slate-600 dark:text-slate-400 hover:bg-muted/70 hover:text-foreground",
                      )}
                    >
                      <Search className="w-4 h-4" />
                      Search Sellers
                    </Link>
                    <Link
                      href="/about"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors",
                        location === "/about"
                          ? "bg-primary text-primary-foreground font-semibold"
                          : "text-slate-600 dark:text-slate-400 hover:bg-muted/70 hover:text-foreground",
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
                                : "text-slate-600 dark:text-slate-400 hover:bg-muted/70 hover:text-foreground",
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
                                : "text-slate-600 dark:text-slate-400 hover:bg-muted/70 hover:text-foreground",
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
                                : "text-slate-600 dark:text-slate-400 hover:bg-muted/70 hover:text-foreground",
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
                          Get Started
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
