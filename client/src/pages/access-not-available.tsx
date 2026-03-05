import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useLocation } from "wouter";
import { Lock } from "lucide-react";

export default function AccessNotAvailablePage() {
  const [, setLocation] = useLocation();

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2">
          <div className="flex items-center gap-2">
            <Lock className="w-6 h-6 text-destructive" />
            <CardTitle className="text-2xl">Access Not Available</CardTitle>
          </div>
          <CardDescription>
            You don't have permission to access this page
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            You do not have the required permissions to access this section of
            the platform. If you believe this is an error, please contact an
            administrator.
          </p>

          <div className="bg-muted p-3 rounded-md">
            <p className="text-xs font-medium text-muted-foreground">
              Need Help?
            </p>
            <a
              href="mailto:support@middlemen.com"
              className="text-sm text-primary hover:underline"
            >
              support@middlemen.com
            </a>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => setLocation("/dashboard")}
              className="flex-1"
            >
              Go to Dashboard
            </Button>
            <Button
              onClick={() => setLocation("/")}
              variant="outline"
              className="flex-1"
            >
              Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
