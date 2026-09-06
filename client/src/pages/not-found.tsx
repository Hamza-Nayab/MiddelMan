import { SEO } from "@/components/seo";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
      <SEO
        title="404 - Page Not Found | MiddelMen"
        description="The page you are looking for could not be found."
        robots="noindex, nofollow"
      />
      <Card className="w-full max-w-md mx-4 border-border/60 shadow-lg">
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <h1 className="text-2xl font-bold text-foreground font-heading">
              404 - Page Not Found
            </h1>
          </div>

          <p className="text-sm text-muted-foreground">
            The page you are looking for doesn't exist or may have been moved.
          </p>

          <Button asChild className="w-full">
            <Link href="/">Back to Home</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
