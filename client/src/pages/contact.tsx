import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Layout } from "@/components/layout";
import { SEO } from "@/components/seo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/hooks/use-toast";
import { api, ApiError } from "@/lib/api";
import { useMutation } from "@tanstack/react-query";
import {
  Mail,
  Clock,
  Send,
  CheckCircle2,
  Phone,
  User,
  MessageSquare,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import {
  SiFacebook,
  SiInstagram,
  SiTiktok,
  SiX,
  SiThreads,
} from "react-icons/si";
import { FaLinkedin } from "react-icons/fa";
import { Link } from "wouter";

const ContactFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be at most 100 characters"),
  email: z
    .string()
    .trim()
    .email("Please enter a valid email address")
    .max(255, "Email is too long"),
  phone: z
    .string()
    .trim()
    .max(50, "Contact info must be at most 50 characters")
    .optional(),
  message: z
    .string()
    .trim()
    .min(10, "Message must be at least 10 characters")
    .max(2000, "Message must be at most 2000 characters"),
});

type ContactFormValues = z.infer<typeof ContactFormSchema>;

export default function ContactPage() {
  const { toast } = useToast();
  const [isSubmitted, setIsSubmitted] = useState(false);

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(ContactFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      message: "",
    },
  });

  const contactMutation = useMutation({
    mutationFn: (values: ContactFormValues) =>
      api.submitContact({
        name: values.name,
        email: values.email,
        phone: values.phone ? values.phone : undefined,
        message: values.message,
      }),
    onSuccess: () => {
      setIsSubmitted(true);
      form.reset();
      toast({
        title: "Message sent!",
        description: "Thank you for reaching out. We will get back to you shortly.",
      });
    },
    onError: (err) => {
      const message =
        err instanceof ApiError
          ? err.message
          : "Failed to send your message. Please try again.";
      toast({
        title: "Submission failed",
        description: message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: ContactFormValues) => {
    contactMutation.mutate(values);
  };

  return (
    <Layout>
      <SEO
        title="Contact MiddelMen | Support, Verification & Inquiries"
        description="Have a question about trust profiles, verification, or customer reviews? Get in touch with the MiddelMen team."
        keywords={[
          "Contact MiddelMen",
          "MiddelMen support",
          "MiddelMen inquiry",
          "seller verification help",
          "trust profile support",
        ]}
      />

      <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto space-y-12">
          {/* Hero Header */}
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-semibold uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5" />
              We're Here For You
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Get in Touch with{" "}
              <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                MiddelMen
              </span>
            </h1>
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300">
              Have questions about your seller profile, verification, reviews, or platform partnerships?
              Drop us a message and our team will get back to you.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Info & Official Channels */}
            <div className="lg:col-span-5 space-y-6">
              <Card className="border-slate-200/80 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
                    Direct Contact Info
                  </CardTitle>
                  <CardDescription className="text-sm text-slate-500 dark:text-slate-400">
                    Official channels managed by the MiddelMen team.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <div className="p-2 rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 shrink-0">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">
                        Support Email
                      </p>
                      <a
                        href="mailto:support@middelmen.com"
                        className="text-blue-600 dark:text-blue-400 hover:underline text-xs sm:text-sm break-all font-medium"
                      >
                        support@middelmen.com
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <div className="p-2 rounded-md bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 shrink-0">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">
                        Response Time
                      </p>
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                        Usually within 24 to 48 hours on business days.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <div className="p-2 rounded-md bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 shrink-0">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">
                        Seller Verification
                      </p>
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                        Looking for a verified badge?{" "}
                        <Link
                          href="/verified"
                          className="text-blue-600 dark:text-blue-400 font-medium hover:underline inline-flex items-center gap-0.5"
                        >
                          Learn how to get verified <ArrowRight className="w-3 h-3 inline" />
                        </Link>
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Social Channels Card */}
              <Card className="border-slate-200/80 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Follow Our Official Channels
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <a
                      href="https://www.linkedin.com/company/middelmen/about/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 rounded-md bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                    >
                      <FaLinkedin className="w-3.5 h-3.5 text-[#0A66C2]" />
                      <span className="font-medium">LinkedIn</span>
                    </a>
                    <a
                      href="https://www.facebook.com/profile.php?id=61593947706156"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 rounded-md bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                    >
                      <SiFacebook className="w-3.5 h-3.5 text-[#0866FF]" />
                      <span className="font-medium">Facebook</span>
                    </a>
                    <a
                      href="https://www.instagram.com/middel.men/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 rounded-md bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                    >
                      <SiInstagram className="w-3.5 h-3.5 text-[#E1306C]" />
                      <span className="font-medium">Instagram</span>
                    </a>
                    <a
                      href="https://www.tiktok.com/@middelmen"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 rounded-md bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                    >
                      <SiTiktok className="w-3.5 h-3.5 text-slate-900 dark:text-white" />
                      <span className="font-medium">TikTok</span>
                    </a>
                    <a
                      href="https://x.com/realMiddelMen"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 rounded-md bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                    >
                      <SiX className="w-3.5 h-3.5 text-slate-900 dark:text-white" />
                      <span className="font-medium">X / Twitter</span>
                    </a>
                    <a
                      href="https://www.threads.com/@middel.men"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 rounded-md bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                    >
                      <SiThreads className="w-3.5 h-3.5 text-slate-900 dark:text-white" />
                      <span className="font-medium">Threads</span>
                    </a>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Interactive Form */}
            <div className="lg:col-span-7">
              <Card className="border-slate-200/80 dark:border-slate-800 shadow-md bg-white dark:bg-slate-900 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-500" />
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    Send Us a Message
                  </CardTitle>
                  <CardDescription className="text-sm text-slate-500 dark:text-slate-400">
                    Fill in the form below and we'll reply as soon as possible.
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  {isSubmitted ? (
                    <div className="py-12 px-4 text-center space-y-4">
                      <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-inner">
                        <CheckCircle2 className="w-8 h-8" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                        Message Sent Successfully!
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto">
                        Thank you for getting in touch. Our moderation & support team has received your message and will review it promptly.
                      </p>
                      <div className="pt-4">
                        <Button
                          variant="outline"
                          onClick={() => setIsSubmitted(false)}
                          className="font-medium"
                        >
                          Send another message
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Form {...form}>
                      <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="space-y-4"
                      >
                        {/* Name */}
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                                <User className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                Name <span className="text-red-500">*</span>
                              </FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Your full name"
                                  className="h-10 bg-slate-50/50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Email */}
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                                <Mail className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                Email <span className="text-red-500">*</span>
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="email"
                                  placeholder="you@example.com"
                                  className="h-10 bg-slate-50/50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Contact (Optional) */}
                        <FormField
                          control={form.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <div className="flex items-center justify-between">
                                <FormLabel className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                                  <Phone className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                  Contact Information
                                </FormLabel>
                                <span className="text-[11px] text-slate-400 dark:text-slate-500 font-normal">
                                  Optional
                                </span>
                              </div>
                              <FormControl>
                                <Input
                                  placeholder="Phone, WhatsApp number, or social handle"
                                  className="h-10 bg-slate-50/50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Message */}
                        <FormField
                          control={form.control}
                          name="message"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                                <MessageSquare className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                Message <span className="text-red-500">*</span>
                              </FormLabel>
                              <FormControl>
                                <Textarea
                                  rows={5}
                                  placeholder="How can we help you? Please provide any relevant details..."
                                  className="resize-y bg-slate-50/50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 min-h-[120px]"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Submit Button */}
                        <div className="pt-2">
                          <Button
                            type="submit"
                            disabled={contactMutation.isPending}
                            className="w-full h-11 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold shadow-md cursor-pointer transition-all"
                          >
                            {contactMutation.isPending ? (
                              <span className="flex items-center gap-2">
                                <Spinner className="w-4 h-4" />
                                Sending Message...
                              </span>
                            ) : (
                              <span className="flex items-center gap-2">
                                <Send className="w-4 h-4" />
                                Send Message
                              </span>
                            )}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
