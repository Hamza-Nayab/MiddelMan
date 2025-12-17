import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { api } from "@/lib/mock-api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const AuthSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("login");

  const form = useForm<z.infer<typeof AuthSchema>>({
    resolver: zodResolver(AuthSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: (values: z.infer<typeof AuthSchema>) => api.login(values.username),
    onSuccess: (user) => {
      queryClient.setQueryData(["currentUser"], user);
      toast({ title: "Welcome back!", description: `Logged in as ${user.displayName}` });
      setLocation("/dashboard");
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (values: z.infer<typeof AuthSchema>) => {
    // For this mock, signup and login do the same thing: try to log in as 'demo'
    // In a real app, signup would create a user.
    if (values.username !== "demo") {
        toast({ title: "Demo Mode", description: "Please use username 'demo' to log in.", variant: "destructive" });
        return;
    }
    loginMutation.mutate(values);
  };

  return (
    <Layout>
      <div className="container max-w-md mx-auto px-4 py-20">
        <Card className="w-full shadow-lg border-border/60">
          <CardHeader className="text-center space-y-2">
            <CardTitle className="text-2xl font-bold font-heading">Welcome to LinkSphere</CardTitle>
            <CardDescription>
              Sign in to manage your links and profile
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input placeholder="demo" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
                      {loginMutation.isPending ? "Logging in..." : "Login"}
                    </Button>
                    <p className="text-xs text-center text-muted-foreground mt-4">
                        Tip: Use username <strong>demo</strong> and any password.
                    </p>
                  </form>
                </Form>
              </TabsContent>
              
              <TabsContent value="signup">
                 <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Choose Username</FormLabel>
                          <FormControl>
                            <Input placeholder="newuser" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Choose Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
                      {loginMutation.isPending ? "Creating Account..." : "Create Account"}
                    </Button>
                    <p className="text-xs text-center text-muted-foreground mt-4">
                        (Simulated Signup - Logs you in as Demo User)
                    </p>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
