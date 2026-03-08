import { useState, useRef } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/layout";
import {
  UserRound,
  BadgeCheck,
  ShieldCheck,
  Star,
  Link2,
  Shield,
  CheckCircle,
  Lock,
} from "lucide-react";

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
                <h1
                  className="text-5xl md:text-7xl font-bold font-heading leading-tight tracking-tight bg-clip-text text-transparent"
                  style={{
                    backgroundImage:
                      "linear-gradient(135deg, #253c97 0%, #38b6ff 100%)",
                  }}
                >
                  Build Trust Before They Pay.
                </h1>
                <p className="text-lg md:text-xl text-gray-700 max-w-lg leading-relaxed">
                  Create a public{" "}
                  <span className="font-semibold" style={{ color: "#253c97" }}>
                    trust profile
                  </span>
                  , collect{" "}
                  <span className="font-semibold" style={{ color: "#38b6ff" }}>
                    verified reviews
                  </span>
                  , and share{" "}
                  <span className="font-semibold" style={{ color: "#253c97" }}>
                    one link
                  </span>{" "}
                  buyers can trust.
                </p>
              </div>

              {/* Trust Signals */}
              <div className="hero-slide-up hero-slide-up-2 flex flex-wrap gap-3 text-sm text-gray-600">
                <span className="flex items-center gap-2">
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: "#38b6ff" }}
                  ></span>
                  Free to start
                </span>
                <span className="flex items-center gap-2">
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: "#253c97" }}
                  ></span>
                  Dispute protection
                </span>
                <span className="flex items-center gap-2">
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: "#38b6ff" }}
                  ></span>
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
                    className="w-full px-5 py-4 pl-13 text-foreground placeholder-gray-500 border border-gray-300 rounded-2xl bg-white shadow-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-400/50 transition-all duration-200 group-hover:border-gray-400"
                    style={
                      {
                        boxShadow: "rgba(56,182,255,0.1) 0 4px 12px",
                      } as React.CSSProperties
                    }
                  />
                  <button
                    onClick={handleSearch}
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 transition-all duration-200"
                    style={{ color: "#253c97" }}
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
                    className="w-full sm:w-auto px-8 py-3 text-white font-semibold rounded-xl transition-all duration-200 hover:shadow-lg active:scale-95"
                    style={{
                      backgroundColor: "#253c97",
                      boxShadow: "0 4px 16px rgba(37,60,151,0.2)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow =
                        "0 8px 24px rgba(37,60,151,0.35)";
                      e.currentTarget.style.transform = "translateY(-2px)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow =
                        "0 4px 16px rgba(37,60,151,0.2)";
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
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
                  alt="Build Trust Before They Pay"
                  className="w-1/2 h-full object-contain hero-svg-animation"
                  style={{
                    filter: "drop-shadow(0 4px 12px rgba(37,60,151,0.08))",
                    transform: "scale(1.5)",
                    transformOrigin: "center",
                  }}
                />
                <img
                  src="/illustrations/talk.svg"
                  alt="Trust Communication"
                  className="w-1/2 h-full object-contain hero-svg-animation"
                  style={{
                    filter: "drop-shadow(0 4px 12px rgba(37,60,151,0.08))",
                    transform: "scale(1.5)",
                    transformOrigin: "center",
                  }}
                />
              </div>

              {/* Floating Badge 1 */}
              <div
                className="absolute top-16 right-12 float-animation z-20 badge-parallax"
                style={{
                  transform: `translate(${!prefersReducedMotion ? parallax.x * 0.2 : 0}px, ${!prefersReducedMotion ? parallax.y * 0.2 : 0}px)`,
                }}
              >
                <PillBadge icon="✓" text="Verified Reviews" />
              </div>

              {/* Floating Badge 2 */}
              <div
                className="absolute bottom-24 left-12 float-animation-2 z-20 badge-parallax"
                style={{
                  transform: `translate(${!prefersReducedMotion ? parallax.x * 0.15 : 0}px, ${!prefersReducedMotion ? parallax.y * 0.15 : 0}px)`,
                }}
              >
                <PillBadge icon="🛡️" text="Dispute Support" />
              </div>

              {/* Floating Badge 3 */}
              <div
                className="absolute bottom-16 right-16 float-animation-3 z-20 badge-parallax"
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
            left: 0; right: 0; top: 50%;
            height: 2px;
            background: linear-gradient(90deg, transparent 0%, rgba(56,182,255,0.35) 50%, transparent 100%);
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
          <div
            className="relative grid gap-6 md:grid-cols-3 md:gap-8"
            style={{ perspective: "1200px" }}
          >
            {/* Animated connector line (desktop) */}
            <div className="process-connector hidden md:block" aria-hidden />
            {/* Step 1 */}
            <div className="process-step-wrapper relative z-10">
              <div className="process-step-card group h-full bg-white rounded-2xl p-8 border border-slate-100 shadow-sm flex flex-col">
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100">
                  <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                    Step 1
                  </span>
                  <span
                    className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-slate-200 text-slate-700 bg-slate-50"
                    style={{
                      fontWeight: "600",
                      fontSize: "0.875rem",
                    }}
                  >
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
                <div className="mt-6 pt-4 border-t border-slate-100">
                  <div className="h-0.5 w-8 bg-gradient-to-r from-blue-500 to-blue-300 rounded-full" />
                </div>
              </div>
            </div>
            {/* Step 2 */}
            <div className="process-step-wrapper relative z-10">
              <div className="process-step-card group h-full bg-white rounded-2xl p-8 border border-slate-100 shadow-sm flex flex-col">
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100">
                  <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                    Step 2
                  </span>
                  <span
                    className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-slate-200 text-slate-700 bg-slate-50"
                    style={{
                      fontWeight: "600",
                      fontSize: "0.875rem",
                    }}
                  >
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
                <div className="mt-6 pt-4 border-t border-slate-100">
                  <div className="h-0.5 w-8 bg-gradient-to-r from-blue-500 to-blue-300 rounded-full" />
                </div>
              </div>
            </div>
            {/* Step 3 */}
            <div className="process-step-wrapper relative z-10">
              <div className="process-step-card group h-full bg-white rounded-2xl p-8 border border-slate-100 shadow-sm flex flex-col">
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100">
                  <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                    Step 3
                  </span>
                  <span
                    className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-slate-200 text-slate-700 bg-slate-50"
                    style={{
                      fontWeight: "600",
                      fontSize: "0.875rem",
                    }}
                  >
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
                <div className="mt-6 pt-4 border-t border-slate-100">
                  <div className="h-0.5 w-8 bg-gradient-to-r from-blue-500 to-blue-300 rounded-full" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What it provides Section */}
      <section className="py-20 bg-gradient-to-b from-white to-slate-50">
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
            <div
              className="hidden md:block absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 z-0"
              style={{
                background:
                  "linear-gradient(90deg, transparent 0%, rgba(56,182,255,0.35) 50%, transparent 100%)",
              }}
              aria-hidden
            />
            <div className="relative z-10 grid md:grid-cols-3 gap-8 items-stretch">
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
          <div className="relative">
            <div
              className="hidden md:block absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 z-0"
              style={{
                background:
                  "linear-gradient(90deg, transparent 0%, rgba(56,182,255,0.35) 50%, transparent 100%)",
              }}
              aria-hidden
            />
            <div className="relative z-10 grid lg:grid-cols-2 gap-8">
              <div className="group p-8 lg:p-10 rounded-xl border border-slate-100 bg-white shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-200">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-50 text-slate-700 text-xs font-medium mb-4">
                  <BadgeCheck size={14} className="text-blue-700" />
                  For Sellers
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
              <div className="group p-8 lg:p-10 rounded-xl border border-slate-100 bg-white shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-200">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-50 text-slate-700 text-xs font-medium mb-4">
                  <CheckCircle size={14} className="text-blue-700" />
                  For Buyers
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
        </div>
      </section>

      {/* Trust Indicators Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4 max-w-7xl">
          <h2 className="text-4xl font-bold text-text-primary mb-16 text-center">
            Why Trust MiddelMen
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <TrustStatCard
              icon="🔐"
              title="Secure Sessions"
              stat="100%"
              description="All transactions use end-to-end encrypted sessions."
            />
            <TrustStatCard
              icon="👮"
              title="Admin Moderation"
              stat="24/7"
              description="Dedicated team reviews disputes and suspicious activity."
            />
            <TrustStatCard
              icon="🚫"
              title="Anti-Spam System"
              stat="99.9%"
              description="AI-powered detection blocks fake reviews and spam."
            />
          </div>
        </div>
      </section>
    </Layout>
  );
}

function PillBadge({ icon, text }: { icon: string; text: string }) {
  return (
    <div
      className="px-3 py-2 rounded-full flex items-center gap-2 backdrop-blur-sm text-xs font-medium shadow-sm transition-all duration-300"
      style={{
        background: "rgba(255, 255, 255, 0.90)",
        border: "1px solid rgba(100, 116, 139, 0.15)",
        color: "#1e293b",
      }}
    >
      <span className="text-sm">{icon}</span>
      <span>{text}</span>
      <span className="ml-1 text-slate-400">✓</span>
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
    <div className="flex gap-4 items-start p-2 rounded-md hover:bg-slate-50 transition-colors duration-200">
      <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center flex-shrink-0">
        <Icon size={18} />
      </div>
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h4 className="text-base font-semibold text-slate-900">{title}</h4>
          {comingSoon && (
            <span className="text-xs px-3 py-1 rounded-full bg-slate-100 text-slate-600 font-medium whitespace-nowrap">
              Coming Soon
            </span>
          )}
        </div>
        <p className="text-sm text-slate-600 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function TrustStatCard({
  icon,
  title,
  stat,
  description,
}: {
  icon: string;
  title: string;
  stat: string;
  description: string;
}) {
  return (
    <div className="p-8 rounded-xl border border-border bg-card text-center">
      <div className="text-5xl mb-4">{icon}</div>
      <p className="text-4xl font-bold text-primary mb-2">{stat}</p>
      <h3 className="text-lg font-semibold text-text-primary mb-2">{title}</h3>
      <p className="text-sm text-text-secondary">{description}</p>
    </div>
  );
}

interface ProvideCardProps {
  title: string;
  description: string;
  icon?: React.ComponentType<{ size: number; className: string }>;
  comingSoon?: boolean;
}

function ProvideCard({
  title,
  description,
  icon: Icon,
  comingSoon,
}: ProvideCardProps) {
  return (
    <div className="group flex flex-col p-10 rounded-lg border border-slate-100 bg-white shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-default justify-between">
      {Icon && (
        <div className="flex justify-start mb-4">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-700">
            <Icon size={24} className="stroke-2" />
          </div>
        </div>
      )}
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-lg font-semibold text-slate-900 flex-1">{title}</h3>
        {comingSoon && (
          <span className="text-xs px-3 py-1 rounded-full bg-slate-100 text-slate-600 font-medium ml-3 whitespace-nowrap">
            Coming Soon
          </span>
        )}
      </div>
      <p className="text-sm text-slate-600 leading-relaxed flex-1">
        {description}
      </p>
      <div className="mt-6 h-[3px] w-12 bg-gradient-to-r from-blue-500 to-blue-300 rounded-full" />
    </div>
  );
}
