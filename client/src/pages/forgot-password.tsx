import { useState } from "react";
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

const ForgotPasswordSchema = z.object({
  email: z.string().email("Enter a valid email address"),
});

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const [sentMessage, setSentMessage] = useState<string | null>(null);

  const form = useForm<z.infer<typeof ForgotPasswordSchema>>({
    resolver: zodResolver(ForgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof ForgotPasswordSchema>) =>
      api.forgotPassword(values),
    onSuccess: (data) => {
      setSentMessage(data.message);
      toast({ title: "Check your inbox", description: data.message });
    },
    onError: (error) => {
      toast({
        title: "Unable to send reset email",
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
              Forgot password
            </CardTitle>
            <CardDescription>
              Enter your email and we&apos;ll send a reset link if the account
              exists.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {sentMessage ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {sentMessage}
              </div>
            ) : null}

            <Form {...form}>
              <form
                className="space-y-4"
                onSubmit={form.handleSubmit((values) =>
                  mutation.mutate(values),
                )}
              >
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="you@email.com"
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
                  {mutation.isPending ? "Sending..." : "Send reset link"}
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  Remembered it?{" "}
                  <Link href="/auth" className="text-primary hover:underline">
                    Back to sign in
                  </Link>
                </p>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
