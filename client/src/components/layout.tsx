import { Link, useLocation } from "wouter";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/mock-api";
import { Loader2, LogOut, ShieldCheck } from "lucide-react";

export function Layout({ children, className }: { children: React.ReactNode; className?: string }) {
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery({
    queryKey: ["currentUser"],
    queryFn: api.getCurrentUser,
  });

  const logoutMutation = useMutation({
    mutationFn: api.logout,
    onSuccess: () => {
      queryClient.setQueryData(["currentUser"], null);
      setLocation("/");
    },
  });

  if (isLoading) return <div className="h-screen w-full flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen flex flex-col bg-background font-sans">
      <nav className="border-b border-border/40 bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="font-heading font-bold text-xl tracking-tight text-primary hover:opacity-80 transition-opacity flex items-center gap-2">
              <ShieldCheck className="w-6 h-6" />
              TrustThread
          </Link>

          <div className="flex items-center gap-4">
            <Link href="/search">
                <Button variant="ghost" size="sm" className={cn("text-muted-foreground", location === "/search" && "text-primary bg-accent")}>
                    Search
                </Button>
            </Link>
            {user ? (
              <>
                <Link href="/dashboard" className={cn(buttonVariants({ variant: "ghost" }), "text-sm", location === "/dashboard" && "bg-accent")}>
                    Dashboard
                </Link>
                <div className="flex items-center gap-2 pl-4 border-l border-border">
                  <span className="text-sm font-medium hidden sm:block">{user.displayName}</span>
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
      <main className={cn("flex-1", className)}>
        {children}
      </main>
      <footer className="py-8 border-t border-border/40 text-center text-sm text-muted-foreground">
        © 2025 TrustThread. All rights reserved.
      </footer>
    </div>
  );
}
