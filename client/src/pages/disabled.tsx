import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useLocation } from "wouter";

export default function DisabledPage() {
  const [, setLocation] = useLocation();

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl">Account Disabled</CardTitle>
          <CardDescription>Your account has been disabled</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Your account has been disabled and you cannot access the platform at
            this time. If you believe this is an error, please contact our
            support team.
          </p>

          <div className="bg-muted p-3 rounded-md">
            <p className="text-xs font-medium text-muted-foreground">
              Support Email
            </p>
            <a
              href="mailto:support@middlemen.com"
              className="text-sm text-primary hover:underline"
            >
              support@middlemen.com
            </a>
          </div>

          <Button
            onClick={() => setLocation("/auth")}
            variant="outline"
            className="w-full"
          >
            Back to Login
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
