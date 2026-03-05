import { useEffect, useState } from "react";
import { useLocation } from "wouter";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Spinner } from "@/components/ui/spinner";
import { api, ApiError } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useUsernameAvailability } from "@/hooks/use-username-availability";
import { Check, AlertCircle } from "lucide-react";

const BuyerLoginSchema = z.object({
  loginType: z.literal("buyer"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const SellerLoginSchema = z.object({
  loginType: z.literal("seller"),
  usernameOrEmail: z.string().min(3, "Enter a username or email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const LoginSchema = z.union([BuyerLoginSchema, SellerLoginSchema]);

const RegisterSchema = z
  .object({
    displayName: z
      .string()
      .min(2, "Display name must be at least 2 characters")
      .max(50, "Display name must be at most 50 characters"),
    email: z.string().email("Enter a valid email"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
    role: z.enum(["buyer", "seller"]),
    username: z
      .string()
      .transform((val) => (val.trim() === "" ? undefined : val.trim()))
      .pipe(
        z
          .string()
          .min(5, "Username must be at least 5 characters")
          .max(20, "Username must be at most 20 characters")
          .regex(
            /^[a-z0-9._-]+$/,
            "Only lowercase letters, numbers, dots, underscores, and hyphens",
          )
          .optional(),
      ),
    avatarUrl: z.string().url().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine(
    (data) => {
      if (data.role === "seller" && !data.username) {
        return false;
      }
      return true;
    },
    {
      message: "Username is required for sellers",
      path: ["username"],
    },
  );

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("login");
  const [loginType, setLoginType] = useState<"buyer" | "seller">("buyer");

  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: api.getMe,
    retry: false,
  });

  useEffect(() => {
    if (!me?.user) return;
    if (me.user.role === "seller") {
      setLocation("/dashboard");
    } else if (me.user.role === "admin") {
      setLocation("/admin");
    } else if (me.user.role === "buyer") {
      setLocation("/my-reviews");
    }
  }, [me, setLocation]);

  const loginForm = useForm<z.infer<typeof LoginSchema>>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      loginType: "buyer",
      email: "",
      usernameOrEmail: "",
      password: "",
    } as z.infer<typeof LoginSchema>,
  });

  const registerForm = useForm<z.infer<typeof RegisterSchema>>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: {
      displayName: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: "buyer",
      username: "",
      avatarUrl: undefined,
    },
  });

  const loginMutation = useMutation({
    mutationFn: (values: z.infer<typeof LoginSchema>) => api.login(values),
    onSuccess: async (data) => {
      // Ensure getMe query is refetched and completed before redirecting
      try {
        await queryClient.refetchQueries({ queryKey: ["me"] });
      } catch (err) {
        console.error("Error refetching me:", err);
      }

      toast({ title: "Welcome back!", description: "Logged in successfully." });
      if (data.user.role === "seller") {
        setLocation("/dashboard");
      } else if (data.user.role === "admin") {
        setLocation("/admin");
      } else if (data.user.role === "buyer") {
        setLocation("/my-reviews");
      }
    },
    onError: (error: unknown) => {
      // Handle account disabled error specially
      if (error instanceof ApiError && error.code === "ACCOUNT_DISABLED") {
        toast({
          title: "Account Disabled",
          description: error.details?.reason
            ? `Your account has been disabled: ${error.details.reason}`
            : "Your account has been disabled. Please contact support@middlemen.com for assistance.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Login failed",
        description:
          error instanceof ApiError ? error.message : "An error occurred",
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: (values: z.infer<typeof RegisterSchema>) => {
      console.log("📝 Register mutation called with values:", values);
      return api.register(values);
    },
    onSuccess: async (data) => {
      console.log("✅ Registration successful:", data);
      // Ensure getMe query is refetched and completed before redirecting
      try {
        await queryClient.refetchQueries({ queryKey: ["me"] });
      } catch (err) {
        console.error("Error refetching me:", err);
      }

      toast({
        title: "Account created",
        description: "Welcome to MiddelMen!",
      });
      if (data.user.role === "seller") {
        setLocation("/dashboard");
      } else {
        setLocation("/my-reviews");
      }
    },
    onError: (error) => {
      console.error("❌ Registration error:", error);
      toast({
        title: "Sign up failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  return (
    <Layout>
      <div className="container max-w-md mx-auto px-4 py-20">
        <Card className="w-full shadow-lg border-border/60">
          <CardHeader className="text-center space-y-2">
            <CardTitle className="text-2xl font-bold font-heading">
              Welcome to MiddelMen
            </CardTitle>
            <CardDescription>
              Sign in to manage your links and profile
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <Form {...loginForm}>
                  <form
                    onSubmit={loginForm.handleSubmit((values) => {
                      const loginData = { ...values, loginType };
                      loginMutation.mutate(
                        loginData as z.infer<typeof LoginSchema>,
                      );
                    })}
                    className="space-y-2"
                  >
                    {/* Login Type Toggle - Segmented Control */}
                    <div className="flex gap-0.5 mb-1 bg-muted/30 border border-border rounded-full p-0.5 w-fit ml-auto">
                      <button
                        type="button"
                        onClick={() => {
                          setLoginType("buyer");
                          loginForm.reset({
                            loginType: "buyer",
                            email: "",
                            usernameOrEmail: "",
                            password: "",
                          } as z.infer<typeof LoginSchema>);
                        }}
                        className={`px-3 py-1 text-xs font-medium transition-all duration-200 ${
                          loginType === "buyer"
                            ? "bg-primary text-primary-foreground rounded-full shadow-md"
                            : "text-muted-foreground hover:text-foreground rounded"
                        }`}
                      >
                        Buyer
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setLoginType("seller");
                          loginForm.reset({
                            loginType: "seller",
                            email: "",
                            usernameOrEmail: "",
                            password: "",
                          } as z.infer<typeof LoginSchema>);
                        }}
                        className={`px-3 py-1 text-xs font-medium transition-all duration-200 ${
                          loginType === "seller"
                            ? "bg-primary text-primary-foreground rounded-full shadow-md"
                            : "text-muted-foreground hover:text-foreground rounded"
                        }`}
                      >
                        Seller
                      </button>
                    </div>

                    {/* Conditional Login Field */}
                    {loginType === "buyer" ? (
                      <FormField
                        control={loginForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input placeholder="you@email.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ) : (
                      <FormField
                        control={loginForm.control}
                        name="usernameOrEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username or Email</FormLabel>
                            <FormControl>
                              <Input placeholder="Username/ Email" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
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
                      type="submit"
                      className="w-full"
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? "Logging in..." : "Login"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        window.location.href = "/api/auth/google";
                      }}
                    >
                      Continue with Google
                    </Button>
                  </form>
                </Form>
              </TabsContent>

              <TabsContent value="signup">
                <Form {...registerForm}>
                  <form
                    onSubmit={(e) => {
                      console.log("🔘 Form submit event fired");
                      registerForm.handleSubmit((values) => {
                        console.log(
                          "✍️  Form validation passed, values:",
                          values,
                        );
                        registerMutation.mutate(values);
                      })(e);
                    }}
                    className="space-y-4"
                  >
                    {/* Display Name */}
                    <FormField
                      control={registerForm.control}
                      name="displayName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Display Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Jane Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Email */}
                    <FormField
                      control={registerForm.control}
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

                    {/* Role Selection */}
                    <FormField
                      control={registerForm.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>I am a...</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              className="space-y-2"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="buyer" id="buyer" />
                                <label
                                  htmlFor="buyer"
                                  className="cursor-pointer text-sm font-normal"
                                >
                                  Buyer (find links)
                                </label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="seller" id="seller" />
                                <label
                                  htmlFor="seller"
                                  className="cursor-pointer text-sm font-normal"
                                >
                                  Seller (share links)
                                </label>
                              </div>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Username (Seller only) */}
                    {registerForm.watch("role") === "seller" && (
                      <UsernameField
                        form={registerForm}
                        onUsernameChange={(username) => {
                          registerForm.setValue("username", username);
                        }}
                      />
                    )}

                    {/* Password */}
                    <FormField
                      control={registerForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Choose Password</FormLabel>
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

                    {/* Confirm Password */}
                    <FormField
                      control={registerForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm Password</FormLabel>
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
                      type="submit"
                      className="w-full"
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending
                        ? "Creating Account..."
                        : "Create Account"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        window.location.href = "/api/auth/google";
                      }}
                    >
                      Continue with Google
                    </Button>
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

interface UsernameFieldProps {
  form: any;
  onUsernameChange: (username: string) => void;
}

function UsernameField({ form, onUsernameChange }: UsernameFieldProps) {
  const [username, setUsername] = useState("");
  const usernameAvailability = useUsernameAvailability(username);

  return (
    <FormField
      control={form.control}
      name="username"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Username</FormLabel>
          <FormControl>
            <Input
              placeholder="5-20 chars, lowercase only"
              {...field}
              onChange={(e) => {
                const value = e.target.value.toLowerCase();
                field.onChange(value);
                setUsername(value);
                onUsernameChange(value);
              }}
            />
          </FormControl>

          {/* Status indicator */}
          {username && (
            <div className="mt-2 text-sm">
              {usernameAvailability.status === "checking" && (
                <div className="flex items-center gap-2 text-blue-600">
                  <Spinner className="h-4 w-4" />
                  Checking...
                </div>
              )}
              {usernameAvailability.status === "available" && (
                <div className="flex items-center gap-2 text-green-600">
                  <Check className="h-4 w-4" />
                  Available!
                </div>
              )}
              {usernameAvailability.status === "taken" && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-amber-600">
                    <AlertCircle className="h-4 w-4" />
                    Username taken
                  </div>
                  {usernameAvailability.suggestions.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium">Try these:</p>
                      <div className="flex flex-wrap gap-1">
                        {usernameAvailability.suggestions.map((sug) => (
                          <button
                            key={sug}
                            type="button"
                            onClick={() => {
                              form.setValue("username", sug);
                              setUsername(sug);
                              onUsernameChange(sug);
                            }}
                            className="text-xs px-2 py-1 bg-secondary hover:bg-secondary/80 rounded cursor-pointer"
                          >
                            {sug}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {usernameAvailability.status === "invalid" && (
                <div className="text-xs text-destructive">
                  5-20 chars, lowercase only (a-z, 0-9, ._-)
                </div>
              )}
            </div>
          )}

          <FormMessage />
        </FormItem>
      )}
    />
  );
}
