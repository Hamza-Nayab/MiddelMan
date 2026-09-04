import { useState, useRef, lazy, Suspense } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/layout";
import { SEO } from "@/components/seo";
import { Footer } from "@/components/footer";
import {
  UserRound,
  BadgeCheck,
  ShieldCheck,
  Star,
  Link2,
  Shield,
  CheckCircle,
  CheckCircle2,
  Lock,
  Clock,
  Clock3,
  ListChecks,
  Share2,
  MessageSquareQuote,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import type { Link as LinkType } from "@/lib/api";

const ProfilePreviewPhone = lazy(() =>
  import("@/components/profile/ProfilePreviewPhone").then((m) => ({
    default: m.ProfilePreviewPhone,
  })),
);

const DEMO_PREVIEW_LINKS: LinkType[] = [
  {
    id: 1,
    userId: 1,
    title: "Instagram Store",
    url: "https://instagram.com/alexrivera",
    icon: "instagram",
    isActive: true,
    sortOrder: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 2,
    userId: 1,
    title: "WhatsApp Inquiries",
    url: "https://wa.me/1234567890",
    icon: "whatsapp",
    isActive: true,
    sortOrder: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 3,
    userId: 1,
    title: "Depop Shop",
    url: "https://depop.com/alexrivera",
    icon: "shopify",
    isActive: true,
    sortOrder: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [, navigate] = useLocation();
  const [parallax, setParallax] = useState({ x: 0, y: 0 });
  const heroRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const handleSearch = () => {
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (prefersReducedMotion || !heroRef.current) return;

    const rect = heroRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) * 0.02;
    const y = (e.clientY - rect.top - rect.height / 2) * 0.02;

    setParallax({ x, y });
  };

  return (
    <Layout>
      <SEO
        title="MiddelMen | Verified Reviews, Seller Trust Profiles & Social Commerce"
        description="MiddelMen (MiddleMen) is the trust infrastructure for online commerce. Check verified seller reviews, verify seller reputations, and create trusted link-in-bio profiles."
        keywords={[
          "MiddelMen",
          "MiddleMen",
          "Middleman",
          "Middel Men",
          "Middle Man",
          "reviews",
          "seller reviews",
          "check seller reviews",
          "middleman reviews",
          "middelmen reviews",
          "trust profile",
          "verified reviews",
          "social commerce trust",
          "seller reputation",
          "trust score",
        ]}
        schema={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebSite",
              "@id": "https://middelmen.com/#website",
              "url": "https://middelmen.com",
              "name": "MiddelMen",
              "alternateName": ["MiddleMen", "Middleman", "Middel Men", "Middle Man"],
              "description": "Verified seller reviews, trust scores, and reputation profiles for social commerce.",
              "publisher": {
                "@id": "https://middelmen.com/#organization"
              },
              "potentialAction": {
                "@type": "SearchAction",
                "target": {
                  "@type": "EntryPoint",
                  "urlTemplate": "https://middelmen.com/search?q={search_term_string}"
                },
                "query-input": "required name=search_term_string"
              }
            },
            {
              "@type": "Organization",
              "@id": "https://middelmen.com/#organization",
              "name": "MiddelMen",
              "alternateName": ["MiddleMen", "Middleman", "Middel Men", "Middle Man"],
              "url": "https://middelmen.com",
              "logo": {
                "@type": "ImageObject",
                "url": "https://middelmen.com/favicon.png"
              },
              "sameAs": [
                "https://twitter.com/middelman",
                "https://instagram.com/middelman"
              ]
            }
          ]
        }}
      />
      {/* Hero Section */}
      <section
        className="relative overflow-hidden pt-2 lg:pt-3 pb-8 lg:pb-12"
        onMouseMove={handleMouseMove}
        ref={heroRef}
      >
        <style>{`
          @keyframes float-subtle {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(3px); }
          }
          @keyframes float-slow {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(4px); }
          }
          .float-animation {
            animation: float-slow 7s ease-in-out infinite;
          }
          .float-animation-2 {
            animation: float-slow 8s ease-in-out infinite;
            animation-delay: 0.3s;
          }
          .float-animation-3 {
            animation: float-slow 9s ease-in-out infinite;
            animation-delay: 0.6s;
          }
          .badge-parallax {
            will-change: transform;
          }
          @keyframes hero-elegant-float {
            0%, 100% {
              transform: translateY(0px) scale(1) rotateZ(0deg);
              opacity: 1;
            }
            25% {
              transform: translateY(-8px) scale(1.02) rotateZ(-0.5deg);
            }
            50% {
              transform: translateY(0px) scale(1) rotateZ(0deg);
            }
            75% {
              transform: translateY(-5px) scale(1.01) rotateZ(0.5deg);
            }
          }
          .hero-svg-animation {
            animation: hero-elegant-float 8s ease-in-out infinite;
          }
          @keyframes slide-up-fade {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .hero-slide-up {
            animation: slide-up-fade 0.6s ease-out forwards;
          }
          .hero-slide-up-1 { animation-delay: 0.1s; }
          .hero-slide-up-2 { animation-delay: 0.2s; }
          .hero-slide-up-3 { animation-delay: 0.3s; }
          .hero-slide-up-4 { animation-delay: 0.4s; }
          .hero-slide-up-5 { animation-delay: 0.5s; }
          @media (prefers-reduced-motion: reduce) {
            .hero-svg-animation,
            .hero-slide-up,
            .float-animation,
            .float-animation-2,
            .float-animation-3 {
              animation: none !important;
            }
          }
        `}</style>

        {/* Background gradient accent */}
        <div className="absolute inset-0 -z-10">
          <div
            className="absolute top-0 right-0 w-96 h-96 bg-blue-200/30 rounded-full blur-3xl"
            style={{ backgroundColor: "rgba(56,182,255,0.15)" }}
          />
          <div
            className="absolute bottom-0 left-0 w-96 h-96 bg-blue-900/20 rounded-full blur-3xl"
            style={{ backgroundColor: "rgba(37,60,151,0.12)" }}
          />
        </div>

        <div className="container mx-auto px-4 max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center min-h-[450px] lg:min-h-[550px]">
            {/* Left: Content */}
            <div className="space-y-5 lg:space-y-6">
              <div className="space-y-3 hero-slide-up hero-slide-up-1">
                <h1 className="text-5xl md:text-7xl font-bold font-heading leading-tight tracking-tight text-primary">
                  Build Trust
                  <br />
                  Then Pay.
                </h1>
                <p className="text-lg md:text-xl text-gray-700 max-w-lg leading-relaxed">
                  Create a public{" "}
                  <span className="font-semibold text-sky-500">
                    trust profile
                  </span>
                  , collect{" "}
                  <span className="font-semibold text-sky-500">
                    verified reviews
                  </span>
                  , and share{" "}
                  <span className="font-semibold text-sky-500">
                    one link
                  </span>{" "}
                  buyers can trust.
                </p>
              </div>

              {/* Trust Signals */}
              <div className="hero-slide-up hero-slide-up-2 flex flex-wrap gap-3 text-sm text-gray-600">
                <span className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
                  Free to start
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
                  Dispute protection
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
                  No spam
                </span>
              </div>

              {/* Premium Search Bar */}
              <div className="max-w-md hero-slide-up hero-slide-up-3">
                <div className="relative group">
                  <input
                    type="text"
                    placeholder="Search a seller username…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="w-full px-5 py-4 pl-13 text-foreground placeholder-gray-500 border border-gray-300 rounded-2xl bg-white shadow-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 group-hover:border-gray-400"
                    style={
                      {
                        boxShadow: "rgba(56,182,255,0.1) 0 4px 12px",
                      } as React.CSSProperties
                    }
                  />
                  <button
                    onClick={handleSearch}
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-primary transition-all duration-200 hover:scale-105"
                    aria-label="Search"
                  >
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2 pl-4">Try: seller4</p>
              </div>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-4 pt-2 hero-slide-up hero-slide-up-4">
                <Link href="/auth">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto px-8 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl transition-all duration-200 shadow-md hover:shadow-lg active:scale-95"
                  >
                    Create Seller Profile
                  </Button>
                </Link>
              </div>

              {/* Micro Feature Cards */}
              <div className="hero-slide-up hero-slide-up-5 pt-4 lg:pt-5 border-t border-gray-200">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <MicroFeatureCard
                    icon={UserRound}
                    title="Public Profile"
                    subtitle="Build your seller identity"
                  />
                  <MicroFeatureCard
                    icon={BadgeCheck}
                    title="Verified Reviews"
                    subtitle="Earn buyer confidence"
                  />
                  <MicroFeatureCard
                    icon={ShieldCheck}
                    title="Dispute Resolution"
                    subtitle="Protected transactions"
                  />
                </div>
              </div>
            </div>

            {/* Right: Visual - Soft Blob + Glow with Floating Badges */}
            <div
              className="relative h-[520px] lg:h-[750px] hidden lg:flex items-center justify-center perspective"
              style={{ perspective: "1000px" }}
            >
              {/* Soft Blob Background */}
              <div
                className="absolute inset-0 badge-parallax"
                style={{
                  transform: `translate(${!prefersReducedMotion ? parallax.x * 0.3 : 0}px, ${!prefersReducedMotion ? parallax.y * 0.3 : 0}px)`,
                  transition: !prefersReducedMotion
                    ? "transform 0.15s ease-out"
                    : "none",
                  pointerEvents: "none",
                }}
              >
                {/* Blob Shape */}
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background:
                      "radial-gradient(ellipse 600px 400px at 50% 40%, rgba(56,182,255,0.18) 0%, rgba(37,60,151,0.10) 60%, transparent 90%)",
                    filter: "blur(60px)",
                    top: "-10%",
                    left: "-5%",
                    right: "-5%",
                    bottom: "-10%",
                  }}
                />
                {/* Subtle Radial Glow */}
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background:
                      "radial-gradient(circle at 50% 50%, rgba(56,182,255,0.08) 0%, transparent 70%)",
                    filter: "blur(40px)",
                  }}
                />
              </div>

              {/* Illustration */}
              <div
                className="relative z-10 w-full h-full flex items-center justify-center gap-4"
                style={{
                  transform: `translate(${!prefersReducedMotion ? parallax.x * 0.5 : 0}px, ${!prefersReducedMotion ? parallax.y * 0.5 : 0}px)`,
                  transition: !prefersReducedMotion
                    ? "transform 0.1s ease-out"
                    : "none",
                }}
              >
                <img
                  src="/illustrations/Hero.svg"
                  alt="Build Trust Then Pay"
                  className="w-1/2 h-full object-contain hero-svg-animation"
                  style={{
                    filter: "drop-shadow(0 4px 12px rgba(37,60,151,0.08))",
                    transform: "scale(1.32)",
                    transformOrigin: "center",
                  }}
                />
                <img
                  src="/illustrations/talk.svg"
                  alt="Trust Communication"
                  className="w-1/2 h-full object-contain hero-svg-animation"
                  style={{
                    filter: "drop-shadow(0 4px 12px rgba(37,60,151,0.08))",
                    transform: "scale(1.62)",
                    transformOrigin: "center",
                  }}
                />
              </div>

              {/* Floating Badge 1: Top Right */}
              <div
                className="absolute top-14 right-8 lg:right-12 float-animation z-20 badge-parallax pointer-events-auto"
                style={{
                  transform: `translate(${!prefersReducedMotion ? parallax.x * 0.2 : 0}px, ${!prefersReducedMotion ? parallax.y * 0.2 : 0}px)`,
                }}
              >
                <PillBadge icon="✓" text="Verified Reviews" />
              </div>

              {/* Floating Badge 2: Left of SVGs */}
              <div
                className="absolute -left-16 lg:-left-28 top-[36%] -translate-y-1/2 float-animation-2 z-20 badge-parallax pointer-events-auto"
                style={{
                  transform: `translate(${!prefersReducedMotion ? parallax.x * 0.15 : 0}px, ${!prefersReducedMotion ? parallax.y * 0.15 : 0}px)`,
                }}
              >
                <PillBadge icon="🛡️" text="Dispute Support" />
              </div>

              {/* Floating Badge 3: Bottom Right */}
              <div
                className="absolute bottom-14 right-8 lg:right-12 float-animation-3 z-20 badge-parallax pointer-events-auto"
                style={{
                  transform: `translate(${!prefersReducedMotion ? parallax.x * 0.2 : 0}px, ${!prefersReducedMotion ? parallax.y * 0.2 : 0}px)`,
                }}
              >
                <PillBadge icon="✨" text="Shareable Link" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3 Steps to Global Trust Section - Premium Animated Process Flow */}
      <section className="relative py-20 overflow-hidden bg-gradient-to-b from-background to-card border-t border-border">
        <style>{`
          .process-connector {
            position: absolute;
            left: 16%;
            right: 16%;
            top: 56px;
            border-top: 2px dashed rgba(56, 182, 255, 0.45);
            z-index: 0;
          }
          .process-step-card {
            transition: box-shadow 0.3s ease-out, transform 0.3s ease-out;
            will-change: transform;
          }
          .process-step-card:hover {
            box-shadow: 0 12px 28px rgba(45,75,155,0.08), 0 2px 8px rgba(56,182,255,0.06);
            transform: translateY(-6px) scale(1.02);
          }
        `}</style>
        <div className="container mx-auto max-w-6xl px-4 relative">
          <div className="text-center mb-14">
            <h2
              className="text-4xl md:text-5xl font-bold font-heading leading-tight tracking-tight bg-clip-text text-transparent mb-3"
              style={{
                backgroundImage:
                  "linear-gradient(135deg, #253c97 0%, #38b6ff 100%)",
              }}
            >
              3 Steps to Global Trust
            </h2>
            <div className="w-12 h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent mx-auto mb-4" />
            <p className="text-text-secondary text-base leading-relaxed max-w-2xl mx-auto">
              Build credibility and confidence with a comprehensive trust
              ecosystem designed for the modern marketplace.
            </p>
          </div>

          <div className="relative w-full">
            {/* Visual connector line running behind number circles from first to last (desktop) */}
            <div className="process-connector hidden md:block" aria-hidden />

            <div className="grid gap-6 md:grid-cols-3 md:gap-8 relative z-10 w-full">
              {/* Step 1 */}
              <div className="process-step-wrapper relative z-10">
                <div className="process-step-card group h-full bg-white rounded-2xl p-8 border border-slate-100 shadow-sm flex flex-col">
                  <div className="mb-6">
                    <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground font-bold text-lg shadow-md shadow-primary/25">
                      1
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-3">
                    Link Accounts
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed flex-grow">
                    Connect your social profiles, payment methods, and identity
                    verification. Create a unified digital presence that buyers
                    can trust and verify across all platforms.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="process-step-wrapper relative z-10">
                <div className="process-step-card group h-full bg-white rounded-2xl p-8 border border-slate-100 shadow-sm flex flex-col">
                  <div className="mb-6">
                    <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground font-bold text-lg shadow-md shadow-primary/25">
                      2
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-3">
                    Verified Proofs
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed flex-grow">
                    Collect authenticated reviews, transaction histories, and
                    reputation badges. Each proof is cryptographically verified,
                    creating an immutable record of your trustworthiness.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="process-step-wrapper relative z-10">
                <div className="process-step-card group h-full bg-white rounded-2xl p-8 border border-slate-100 shadow-sm flex flex-col">
                  <div className="mb-6">
                    <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground font-bold text-lg shadow-md shadow-primary/25">
                      3
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-3">
                    Escrow & Payment Integration
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed flex-grow">
                    Secure transactions with automated escrow protection.
                    Integrated payment gateways ensure funds are held safely until
                    both parties confirm successful completion.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Product Experience Section: Dashboard & Live Trust Profile Preview */}
      <section className="py-20 md:py-28 bg-gradient-to-b from-slate-50 via-white to-slate-50 border-t border-slate-200/80 overflow-hidden">
        <div className="container mx-auto px-4 max-w-7xl">
          {/* Centered Heading */}
          <div className="text-center mb-16">
            <h2
              className="text-4xl md:text-5xl font-bold font-heading leading-tight tracking-tight bg-clip-text text-transparent mb-3"
              style={{
                backgroundImage:
                  "linear-gradient(135deg, #253c97 0%, #38b6ff 100%)",
              }}
            >
              Your Dashboard, Your Trust Profile
            </h2>
            <div className="w-12 h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent mx-auto mb-4" />
            <p className="text-slate-600 text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
              Manage everything from one dashboard, and share a profile buyers actually trust.
            </p>
          </div>

          {/* Two-Column Showcase */}
          <div className="max-w-6xl mx-auto grid lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.95fr)] gap-10 lg:gap-14 items-center">
            {/* Left Column: Dashboard Preview */}
            <div className="flex flex-col justify-between">
              {/* Browser Window Mockup */}
              <div className="rounded-2xl border border-slate-200/90 bg-white shadow-[0_16px_40px_-8px_rgba(15,23,42,0.08)] overflow-hidden">
                {/* Browser Chrome Header */}
                <div className="bg-slate-100/90 border-b border-slate-200/80 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-rose-400/80" />
                    <div className="w-3 h-3 rounded-full bg-amber-400/80" />
                    <div className="w-3 h-3 rounded-full bg-emerald-400/80" />
                  </div>
                  <div className="flex items-center gap-1.5 bg-white border border-slate-200/80 rounded-md px-3 py-1 text-xs text-slate-500 font-mono shadow-2xs">
                    <Lock size={11} className="text-slate-400" />
                    <span>middelmen.com/dashboard</span>
                  </div>
                  <div className="w-10" />
                </div>

                {/* Dashboard Interior */}
                <div className="p-5 sm:p-7 bg-slate-50/60 space-y-4">
                  {/* Greeting & Verification Badge */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/70 pb-4">
                    <div>
                      <h4 className="text-base font-bold text-slate-900">Welcome back, Alex 👋</h4>
                      <p className="text-xs text-slate-500">Seller Dashboard • Authentic Vintage</p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold shadow-2xs">
                      <BadgeCheck size={14} className="text-emerald-600" />
                      Verified Seller
                    </span>
                  </div>

                  {/* Launch Checklist Card */}
                  <div className="p-4 sm:p-5 rounded-xl border border-slate-200/80 bg-white shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Setup Progress</span>
                        <p className="text-sm font-bold text-slate-800">Launch Checklist</p>
                      </div>
                      <div className="text-right">
                        <span className="text-base font-bold text-primary">75%</span>
                        <span className="text-xs text-slate-400 block">3 of 4 done</span>
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-sky-400 w-3/4 transition-all" />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                      <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50/70 border border-emerald-200/50 rounded-lg px-2.5 py-1.5 font-medium">
                        <CheckCircle2 size={13} className="shrink-0 text-emerald-600" />
                        <span className="truncate">Create Account</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50/70 border border-emerald-200/50 rounded-lg px-2.5 py-1.5 font-medium">
                        <CheckCircle2 size={13} className="shrink-0 text-emerald-600" />
                        <span className="truncate">Add Store Links</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50/70 border border-emerald-200/50 rounded-lg px-2.5 py-1.5 font-medium">
                        <CheckCircle2 size={13} className="shrink-0 text-emerald-600" />
                        <span className="truncate">Identity Verified</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-500 bg-slate-100/60 border border-slate-200/60 rounded-lg px-2.5 py-1.5 font-medium">
                        <Clock3 size={13} className="shrink-0 text-slate-400" />
                        <span className="truncate">Share on Bio</span>
                      </div>
                    </div>
                  </div>

                  {/* Active Links Snippet */}
                  <div className="p-4 sm:p-5 rounded-xl border border-slate-200/80 bg-white shadow-2xs space-y-2.5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Active Links (3)</p>
                      <span className="text-xs text-blue-600 font-semibold cursor-default">+ Add Link</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                          <span className="font-semibold text-slate-800">Instagram Store</span>
                        </div>
                        <span className="text-slate-400 font-mono text-[11px]">1,420 clicks</span>
                      </div>
                      <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                          <span className="font-semibold text-slate-800">WhatsApp Inquiries</span>
                        </div>
                        <span className="text-slate-400 font-mono text-[11px]">840 clicks</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4 Feature Bullet Points */}
              <div className="grid sm:grid-cols-2 gap-3.5 mt-6">
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white border border-slate-200/70 shadow-2xs">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <ListChecks size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">Track your launch checklist</p>
                    <p className="text-[11px] text-slate-500 leading-snug mt-0.5">Know exactly what you need before going live.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white border border-slate-200/70 shadow-2xs">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Share2 size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">Manage all links in one place</p>
                    <p className="text-[11px] text-slate-500 leading-snug mt-0.5">Toggle, reorder, and track clicks in seconds.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white border border-slate-200/70 shadow-2xs">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <ShieldCheck size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">Request verification with 1 click</p>
                    <p className="text-[11px] text-slate-500 leading-snug mt-0.5">Get verified to stand out from impersonators.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white border border-slate-200/70 shadow-2xs">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <MessageSquareQuote size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">See reviews & respond directly</p>
                    <p className="text-[11px] text-slate-500 leading-snug mt-0.5">Collect real feedback that builds buyer trust.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Public Profile Preview */}
            <div className="flex flex-col items-center justify-center">
              <div className="w-full flex justify-center relative">
                {/* Visual Connector / Sync Badge (Desktop) */}
                <div className="hidden lg:flex absolute -left-8 top-1/2 -translate-y-1/2 z-20 items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200/90 shadow-md text-[11px] font-bold text-blue-700 whitespace-nowrap">
                  <span>Live Sync</span>
                  <ArrowRight size={13} className="text-blue-500" />
                </div>

                <Suspense
                  fallback={
                    <div className="h-[560px] w-[300px] rounded-[36px] border border-slate-200 dark:border-white/10 bg-slate-100/60 dark:bg-zinc-900/60 animate-pulse flex items-center justify-center text-xs text-muted-foreground">
                      Loading preview...
                    </div>
                  }
                >
                  <ProfilePreviewPhone
                    displayName="Alex Rivera"
                    username="alexrivera"
                    bio="Curated vintage streetwear & luxury sneakers. Shipping worldwide with guaranteed authenticity."
                    avatarValue="avatar-1"
                    links={DEMO_PREVIEW_LINKS}
                    avgRating={4.9}
                    totalReviews={28}
                    phoneNumber="+1234567890"
                    whatsappNumber="+1234567890"
                    countryCode="+1"
                    contactEmail="alex@riveravintage.com"
                    theme="light"
                    compact={true}
                    openHref="/demo"
                  />
                </Suspense>
              </div>

              {/* Caption Beneath Phone */}
              <p className="text-xs text-slate-500 text-center mt-5 flex items-center justify-center gap-1.5 font-medium">
                <Sparkles size={13} className="text-blue-500" />
                <span>This is what buyers see when they visit your link.</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What it provides Section */}
      <section className="py-20 bg-gradient-to-b from-white to-slate-50">
        <style>{`
          .provide-pop-card {
            transition: box-shadow 0.3s ease-out, transform 0.3s ease-out;
            will-change: transform;
          }
          .provide-pop-card:hover {
            box-shadow: 0 12px 28px rgba(45,75,155,0.08), 0 2px 8px rgba(56,182,255,0.06);
            transform: translateY(-6px) scale(1.02);
          }
        `}</style>
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="text-center mb-16">
            <h2
              className="text-4xl md:text-5xl font-bold font-heading leading-tight tracking-tight bg-clip-text text-transparent mb-3"
              style={{
                backgroundImage:
                  "linear-gradient(135deg, #253c97 0%, #38b6ff 100%)",
              }}
            >
              What it provides
            </h2>
            <div className="w-12 h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent mx-auto" />
          </div>
          <div className="relative">
            <div className="relative z-10 grid md:grid-cols-3 gap-6 lg:gap-8 items-stretch">
              <ProvideCard
                title="Centralised Review Bank"
                description="Collect reviews in one place so buyers can verify you before paying."
                icon={Star}
              />
              <ProvideCard
                title="Shareable & Searchable Profile Link"
                description="One link for your bio, and a searchable username buyers can find instantly."
                icon={Link2}
              />
              <ProvideCard
                title="Escrow & Secure Payments"
                description="Phase 2 adds escrow protection so funds are only released when both sides confirm."
                icon={Shield}
                comingSoon
              />
            </div>
          </div>
        </div>
      </section>

      {/* Sellers vs Buyers Section */}
      <section className="py-20 bg-card border-t border-border">
        <div className="container mx-auto px-4 max-w-7xl">
          <h2 className="text-4xl font-bold tracking-tight text-text-primary mb-3 text-center">
            Built for Everyone
          </h2>
          <p className="mt-3 text-slate-600 max-w-xl mx-auto text-center mb-14">
            Designed for sellers and buyers in social commerce.
          </p>
          <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-8 items-stretch">
            <div className="group p-8 lg:p-10 rounded-2xl border border-slate-200/80 bg-white shadow-[0_4px_20px_-4px_rgba(15,23,42,0.06)] hover:-translate-y-1 hover:shadow-[0_12px_28px_-4px_rgba(15,23,42,0.09)] transition-all duration-300">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100/80 text-slate-700 text-xs font-semibold mb-4">
                <BadgeCheck size={14} className="text-blue-600 shrink-0" />
                <span>For Sellers</span>
              </div>
              <div className="h-[3px] w-10 bg-gradient-to-r from-blue-500 to-blue-300 rounded-full mb-7" />
              <div className="space-y-6">
                <SellerBuyerFeature
                  icon={BadgeCheck}
                  title="Build Credibility"
                  description="Showcase verified reviews and build reputation with buyers."
                />
                <SellerBuyerFeature
                  icon={UserRound}
                  title="Centralize Contact Info"
                  description="One place for all your contact details, links, and social profiles."
                />
                <SellerBuyerFeature
                  icon={ShieldCheck}
                  title="Manage Disputes"
                  description="Transparent dispute resolution system to protect your business."
                />
              </div>
            </div>
            <div className="group p-8 lg:p-10 rounded-2xl border border-slate-200/80 bg-white shadow-[0_4px_20px_-4px_rgba(15,23,42,0.06)] hover:-translate-y-1 hover:shadow-[0_12px_28px_-4px_rgba(15,23,42,0.09)] transition-all duration-300">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100/80 text-slate-700 text-xs font-semibold mb-4">
                <CheckCircle size={14} className="text-blue-600 shrink-0" />
                <span>For Buyers</span>
              </div>
              <div className="h-[3px] w-10 bg-gradient-to-r from-blue-500 to-blue-300 rounded-full mb-7" />
              <div className="space-y-6">
                <SellerBuyerFeature
                  icon={CheckCircle}
                  title="Verify Seller Identity"
                  description="Confirm seller authenticity through our verification system."
                />
                <SellerBuyerFeature
                  icon={Star}
                  title="Read Real Reviews"
                  description="Make informed decisions based on verified buyer feedback."
                />
                <SellerBuyerFeature
                  icon={Lock}
                  title="Escrow Protection"
                  description="Escrow-based payments will be added so funds are released only after both sides confirm."
                  comingSoon
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </Layout>
  );
}

function PillBadge({ icon, text }: { icon: string; text: string }) {
  return (
    <div
      className="px-3.5 py-2 rounded-full flex items-center gap-2 backdrop-blur-sm text-xs font-medium shadow-sm transition-all duration-300"
      style={{
        background: "rgba(255, 255, 255, 0.90)",
        border: "1px solid rgba(100, 116, 139, 0.15)",
        color: "#1e293b",
      }}
    >
      <span className="text-sm">{icon}</span>
      <span>{text}</span>
    </div>
  );
}

function MicroFeatureCard({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="group flex flex-col items-start gap-3 p-4 rounded-lg transition-all duration-200 hover:bg-slate-50">
      <div
        className="flex items-center justify-center w-11 h-11 rounded-lg transition-all duration-200"
        style={{
          background: "rgba(56, 182, 255, 0.12)",
          color: "#253c97",
        }}
      >
        <Icon size={20} />
      </div>
      <div className="flex-1">
        <h4 className="text-sm font-semibold text-slate-900 mb-0.5">{title}</h4>
        <p className="text-xs text-slate-500 leading-relaxed">{subtitle}</p>
      </div>
    </div>
  );
}

function SellerBuyerFeature({
  icon,
  title,
  description,
  comingSoon,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  description: string;
  comingSoon?: boolean;
}) {
  const Icon = icon;

  return (
    <div className={`flex gap-4 items-start p-2 rounded-md hover:bg-slate-50 transition-colors duration-200 ${comingSoon ? "opacity-90" : ""}`}>
      <div
        className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
          comingSoon
            ? "bg-slate-100 text-slate-400"
            : "bg-blue-50 text-blue-700"
        }`}
      >
        <Icon size={18} className={comingSoon ? "stroke-1" : "stroke-2"} />
      </div>
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h4
            className={`text-base font-semibold ${
              comingSoon ? "text-slate-600" : "text-slate-900"
            }`}
          >
            {title}
          </h4>
          {comingSoon && (
            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-200/60 text-slate-600 font-semibold text-[10px] uppercase tracking-wider whitespace-nowrap ml-1">
              <Clock size={12} className="stroke-2 text-slate-500" />
              Phase 2
            </span>
          )}
        </div>
        <p className={`text-sm leading-relaxed ${comingSoon ? "text-slate-500" : "text-slate-600"}`}>
          {description}
        </p>
      </div>
    </div>
  );
}

interface ProvideCardProps {
  title: string;
  description: string;
  icon?: React.ComponentType<{ size: number; className?: string }>;
  comingSoon?: boolean;
}

function ProvideCard({
  title,
  description,
  icon: Icon,
  comingSoon,
}: ProvideCardProps) {
  const baseStyles = comingSoon
    ? "border border-dashed border-slate-300 bg-slate-50 opacity-90"
    : "provide-pop-card bg-white border border-slate-100 shadow-sm cursor-default";

  return (
    <div
      className={`group flex flex-col justify-between h-full rounded-2xl ${baseStyles} p-6 lg:p-8 relative z-10`}
    >
      <div>
        <div className="flex items-start gap-3 mb-4">
          {Icon && (
            <Icon
              size={22}
              className={`shrink-0 mt-0.5 ${comingSoon ? "text-slate-400 stroke-1" : "text-primary stroke-2"}`}
            />
          )}
          <h3
            className={`text-xl font-bold leading-tight ${comingSoon ? "text-slate-600" : "text-slate-900"}`}
          >
            {title}
          </h3>
          {comingSoon && (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-200/60 text-slate-600 font-semibold ml-auto whitespace-nowrap self-start text-[10px] uppercase tracking-wider">
              <Clock size={12} className="stroke-2 text-slate-500" />
              Phase 2
            </span>
          )}
        </div>

        <p
          className={`text-sm leading-relaxed ${comingSoon ? "text-slate-500" : "text-slate-600"}`}
        >
          {description}
        </p>
      </div>
    </div>
  );
}
