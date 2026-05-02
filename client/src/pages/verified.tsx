import { useMemo } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, AlertTriangle } from "lucide-react";

export default function VerifiedPage() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const error = params.get("error");
  const message = params.get("message");

  const isSuccess = !error;

  return (
    <Layout>
      <div className="container mx-auto max-w-xl px-4 py-20">
        <Card className="border-border/60 shadow-lg">
          <CardContent className="space-y-6 p-8 text-center">
            {isSuccess ? (
              <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" />
            ) : (
              <AlertTriangle className="mx-auto h-14 w-14 text-amber-600" />
            )}
            <div className="space-y-2">
              <h1 className="text-2xl font-bold font-heading">
                {isSuccess
                  ? "Your email has been verified!"
                  : "We could not verify your email"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {isSuccess
                  ? "Your seller account is now verified and ready to use."
                  : message || "The verification link is invalid or expired."}
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button asChild>
                <Link href="/dashboard">Go to dashboard</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/auth">Sign in</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
