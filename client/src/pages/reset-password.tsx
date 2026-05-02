import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { api, ApiError } from "@/lib/api";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

const ResetPasswordSchema = z
  .object({
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z
      .string()
      .min(8, "Password must be at least 8 characters"),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export default function ResetPasswordPage() {
  const { toast } = useToast();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const token = useMemo(
    () => new URLSearchParams(window.location.search).get("token") || "",
    [],
  );

  const form = useForm<z.infer<typeof ResetPasswordSchema>>({
    resolver: zodResolver(ResetPasswordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof ResetPasswordSchema>) =>
      api.resetPassword({ token, newPassword: values.newPassword }),
    onSuccess: (data) => {
      setSuccessMessage(data.message);
      toast({ title: "Password changed", description: data.message });
    },
    onError: (error) => {
      toast({
        title: "Password reset failed",
        description:
          error instanceof ApiError ? error.message : "Something went wrong",
        variant: "destructive",
      });
    },
  });

  return (
    <Layout>
      <div className="container mx-auto max-w-md px-4 py-20">
        <Card className="border-border/60 shadow-lg">
          <CardHeader>
            <CardTitle className="font-heading text-2xl">
              Reset password
            </CardTitle>
            <CardDescription>
              Choose a new password for your seller account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {successMessage ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {successMessage}{" "}
                <Link href="/auth" className="font-semibold underline">
                  Sign in
                </Link>
              </div>
            ) : null}

            {!token ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                The reset link is missing a token.
              </div>
            ) : (
              <Form {...form}>
                <form
                  className="space-y-4"
                  onSubmit={form.handleSubmit((values) =>
                    mutation.mutate(values),
                  )}
                >
                  <FormField
                    control={form.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="••••••••"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="••••••••"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    className="w-full"
                    type="submit"
                    disabled={mutation.isPending}
                  >
                    {mutation.isPending ? "Updating..." : "Change password"}
                  </Button>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
