import { useEffect } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export default function RoleOnboardingPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: me, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: api.getMe,
    retry: false,
  });

  useEffect(() => {
    if (!isLoading && !me?.user) {
      setLocation("/auth");
    }
  }, [isLoading, me, setLocation]);

  const updateRoleMutation = useMutation({
    mutationFn: (role: "buyer" | "seller") => api.updateRole(role),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
      toast({
        title: "All set!",
        description: "Your account type is updated.",
      });

      if (data.user.role === "seller") {
        setLocation("/dashboard");
      } else {
        setLocation("/my-reviews");
      }
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading || !me?.user) return null;

  return (
    <Layout>
      <div className="container max-w-md mx-auto px-4 py-20">
        <Card className="w-full shadow-lg border-border/60">
          <CardHeader className="text-center space-y-2">
            <CardTitle className="text-2xl font-bold font-heading">
              Choose your account type
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              type="button"
              className="w-full"
              disabled={updateRoleMutation.isPending}
              onClick={() => updateRoleMutation.mutate("buyer")}
            >
              Buyer (leave reviews)
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={updateRoleMutation.isPending}
              onClick={() => updateRoleMutation.mutate("seller")}
            >
              Seller (get reviews)
            </Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
