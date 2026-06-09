import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion, useMotionValue, useSpring, useMotionValueEvent } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/layout";
import { SEO } from "@/components/seo";
import {
  User,
  Shield,
  Star,
  Link2,
  Lock,
  Check,
  Instagram,
  Twitter,
  ArrowRight,
  Sparkles,
  Search,
  CheckCircle,
  ShieldAlert,
  ThumbsUp,
  ExternalLink,
  Plus,
  UserRound,
  ShieldCheck,
  BadgeCheck
} from "lucide-react";

export default function LandingV2() {
  const [searchQuery, setSearchQuery] = useState("");
  const [, navigate] = useLocation();

  // Parallax effects for the Hero section
  const [parallax, setParallax] = useState({ x: 0, y: 0 });
  const heroRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (prefersReducedMotion || !heroRef.current) return;

    const rect = heroRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) * 0.02;
    const y = (e.clientY - rect.top - rect.height / 2) * 0.02;

    setParallax({ x, y });
  };

  // Refs for tracking points for the SVG Bezier curve
  const containerRef = useRef<HTMLDivElement>(null);
  const heroDotRef = useRef<HTMLDivElement>(null);
  const step1DotRef = useRef<HTMLDivElement>(null);
  const step2DotRef = useRef<HTMLDivElement>(null);
  const step3DotRef = useRef<HTMLDivElement>(null);

  const [pathD, setPathD] = useState("");
  const [glowCoords, setGlowCoords] = useState({ x: 0, y: 0 });
  const activePathRef = useRef<SVGPathElement>(null);

  // Framer Motion motion values for path length tracking
  const pathLengthValue = useMotionValue(0);
  // Smooth out drawing using a spring configuration
  const smoothPathLength = useSpring(pathLengthValue, { damping: 20, stiffness: 80 });

  // Recalculate coordinates for SVG path and update scroll drawing progress
  const updatePathAndScroll = () => {
    const container = containerRef.current;
    const heroDot = heroDotRef.current;
    const step1Dot = step1DotRef.current;
    const step2Dot = step2DotRef.current;
    const step3Dot = step3DotRef.current;

    if (!container || !heroDot || !step1Dot || !step2Dot || !step3Dot) return;

    const containerRect = container.getBoundingClientRect();
    const containerTop = containerRect.top + window.scrollY;

    const getCoords = (el: HTMLElement) => {
      const rect = el.getBoundingClientRect();
      return {
        x: rect.left - containerRect.left + rect.width / 2,
        y: rect.top - containerRect.top + rect.height / 2,
      };
    };

    const p0 = getCoords(heroDot);
    const p1 = getCoords(step1Dot);
    const p2 = getCoords(step2Dot);
    const p3 = getCoords(step3Dot);

    // Calculate vertical differences for smooth Bezier curves
    const dy1 = (p1.y - p0.y) * 0.45;
    const dy2 = (p2.y - p1.y) * 0.45;
    const dy3 = (p3.y - p2.y) * 0.45;

    // Generate snaking cubic Bezier curve
    const d = `M ${p0.x} ${p0.y} ` +
              `C ${p0.x} ${p0.y + dy1}, ${p1.x} ${p1.y - dy1}, ${p1.x} ${p1.y} ` +
              `C ${p1.x} ${p1.y + dy2}, ${p2.x} ${p2.y - dy2}, ${p2.x} ${p2.y} ` +
              `C ${p2.x} ${p2.y + dy3}, ${p3.x} ${p3.y - dy3}, ${p3.x} ${p3.y}`;

    setPathD(d);

    // Calculate scroll progress:
    // Scroll progress is relative to the viewport's center position compared to the path dots
    const viewportCenterY = window.scrollY + window.innerHeight * 0.55 - containerTop;
    
    // We calculate progress between the start (Hero dot) and the end (Step 3 dot)
    const startY = p0.y;
    const endY = p3.y;

    let progress = (viewportCenterY - startY) / (endY - startY);
    progress = Math.max(0, Math.min(1, progress));

    pathLengthValue.set(progress);
  };

  // Listen to the smoothed spring value changes to update glowing tip coordinate
  useMotionValueEvent(smoothPathLength, "change", (latest) => {
    if (activePathRef.current) {
      try {
        const length = activePathRef.current.getTotalLength();
        const point = activePathRef.current.getPointAtLength(latest * length);
        setGlowCoords({ x: point.x, y: point.y });
      } catch (e) {
        // Path might not be fully measured/initialized in DOM yet
      }
    }
  });

  // Recalculate on mounts, window resizes, scroll, and dynamic content adjustments
  useEffect(() => {
    updatePathAndScroll();
    
    const rafId = requestAnimationFrame(updatePathAndScroll);
    const timeoutId = setTimeout(updatePathAndScroll, 200);

    let resizeObserver: ResizeObserver | null = null;
    if (containerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        updatePathAndScroll();
      });
      resizeObserver.observe(containerRef.current);
    }

    window.addEventListener("resize", updatePathAndScroll);
    window.addEventListener("scroll", updatePathAndScroll);
    
    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timeoutId);
      window.removeEventListener("resize", updatePathAndScroll);
      window.removeEventListener("scroll", updatePathAndScroll);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, []);

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

  return (
    <div className="dark bg-[#080B11] text-slate-100 min-h-screen relative overflow-hidden font-sans select-none">
      <SEO
        title="MiddelMen | The Trust Layer for Social Commerce"
        description="Verify sellers, protect buyers, and turn risky social media deals into secure transactions. Share one link buyers can trust."
      />

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

      {/* Grid and Radial Glow Backgrounds */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.03) 1px, transparent 0)",
        backgroundSize: "32px 32px",
      }} />

      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-[40%] right-1/4 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute bottom-10 left-1/3 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-[130px] pointer-events-none" />

      <Layout>
        {/* Single parent container for scroll tracking and SVG path */}
        <div ref={containerRef} className="relative w-full">
          
          {/* SVG Canvas absolute positioned spanning the entire height of the container */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-visible"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="neon-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#0080FF" />
                <stop offset="50%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#10B981" />
              </linearGradient>
            </defs>

            {/* Inactive Track Background Line */}
            {pathD && (
              <path
                d={pathD}
                fill="none"
                stroke="rgba(255, 255, 255, 0.05)"
                strokeWidth="4"
                strokeLinecap="round"
              />
            )}

            {/* Active Drawing Line */}
            {pathD && (
              <motion.path
                ref={activePathRef}
                d={pathD}
                fill="none"
                stroke="url(#neon-gradient)"
                strokeWidth="4"
                strokeLinecap="round"
                style={{ pathLength: smoothPathLength }}
              />
            )}

            {/* Glowing Flow Dot */}
            {glowCoords.x !== 0 && (
              <>
                <circle
                  cx={glowCoords.x}
                  cy={glowCoords.y}
                  r="16"
                  fill="#10B981"
                  fillOpacity="0.15"
                  className="animate-ping"
                  style={{ transformOrigin: `${glowCoords.x}px ${glowCoords.y}px` }}
                />
                <circle
                  cx={glowCoords.x}
                  cy={glowCoords.y}
                  r="6"
                  fill="#10B981"
                  className="filter drop-shadow-[0_0_8px_#10B981]"
                />
              </>
            )}
          </svg>

          {/* Original Parallax Hero Section (Styled for Dark Mode v2) */}
          <section
            className="relative overflow-hidden pt-12 lg:pt-16 pb-20 lg:pb-28"
            onMouseMove={handleMouseMove}
            ref={heroRef}
          >
            <div className="container mx-auto px-4 max-w-7xl relative z-10">
              <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center min-h-[500px] lg:min-h-[600px]">
                {/* Left: Content */}
                <div className="space-y-6 lg:space-y-7">
                  <div className="space-y-4 hero-slide-up hero-slide-up-1">
                    <h1
                      className="text-5xl md:text-7xl font-extrabold font-heading leading-tight tracking-tight bg-clip-text text-transparent"
                      style={{
                        backgroundImage:
                          "linear-gradient(135deg, #38b6ff 0%, #10B981 100%)",
                      }}
                    >
                      Build Trust
                      <br />
                      Then Pay.
                    </h1>
                    <p className="text-lg md:text-xl text-slate-300 max-w-lg leading-relaxed">
                      Create a public{" "}
                      <span className="font-semibold text-[#38b6ff]">
                        trust profile
                      </span>
                      , collect{" "}
                      <span className="font-semibold text-emerald-400">
                        verified reviews
                      </span>
                      , and share{" "}
                      <span className="font-semibold text-[#38b6ff]">
                        one link
                      </span>{" "}
                      buyers can trust.
                    </p>
                  </div>

                  {/* Trust Signals */}
                  <div className="hero-slide-up hero-slide-up-2 flex flex-wrap gap-4 text-sm text-slate-400">
                    <span className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#38b6ff]" />
                      Free to start
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      Dispute protection
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#38b6ff]" />
                      No spam
                    </span>
                  </div>

                  {/* Premium Dark Search Bar */}
                  <div className="max-w-md hero-slide-up hero-slide-up-3">
                    <div className="relative group">
                      <input
                        type="text"
                        placeholder="Search a seller username…"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyPress={handleKeyPress}
                        className="w-full px-5 py-4 pl-12 text-slate-100 placeholder-slate-500 border border-slate-800 rounded-2xl bg-slate-900/50 backdrop-blur-md shadow-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                      />
                      <button
                        onClick={handleSearch}
                        className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#38b6ff] transition-all duration-200"
                        aria-label="Search"
                      >
                        <Search size={18} />
                      </button>
                    </div>
                    <p className="text-xs text-slate-500 mt-2 pl-4">Try: seller4</p>
                  </div>

                  {/* CTAs */}
                  <div className="flex flex-col sm:flex-row gap-4 pt-2 hero-slide-up hero-slide-up-4">
                    <Link href="/auth">
                      <Button
                        size="lg"
                        className="w-full sm:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-blue-600/20 hover:-translate-y-0.5 active:scale-95"
                      >
                        Create Seller Profile
                      </Button>
                    </Link>
                  </div>

                  {/* Micro Feature Cards */}
                  <div className="hero-slide-up hero-slide-up-5 pt-4 lg:pt-5 border-t border-slate-800/80">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

                {/* Right: Visual Parallax Elements (Adapted for Dark Mode v2) */}
                <div
                  className="relative h-[480px] lg:h-[650px] hidden lg:flex items-center justify-center perspective"
                  style={{ perspective: "1000px" }}
                >
                  {/* Soft Radial Glow */}
                  <div
                    className="absolute inset-0 badge-parallax"
                    style={{
                      transform: `translate(${!prefersReducedMotion ? parallax.x * 0.3 : 0}px, ${!prefersReducedMotion ? parallax.y * 0.3 : 0}px)`,
                      transition: !prefersReducedMotion ? "transform 0.15s ease-out" : "none",
                      pointerEvents: "none",
                    }}
                  >
                    <div
                      className="absolute inset-0 rounded-full"
                      style={{
                        background:
                          "radial-gradient(ellipse 600px 400px at 50% 40%, rgba(56,182,255,0.08) 0%, rgba(37,60,151,0.04) 60%, transparent 90%)",
                        filter: "blur(50px)",
                      }}
                    />
                  </div>

                  {/* Dual SVGs */}
                  <div
                    className="relative z-10 w-full h-full flex items-center justify-center gap-6"
                    style={{
                      transform: `translate(${!prefersReducedMotion ? parallax.x * 0.5 : 0}px, ${!prefersReducedMotion ? parallax.y * 0.5 : 0}px)`,
                      transition: !prefersReducedMotion ? "transform 0.1s ease-out" : "none",
                    }}
                  >
                    <img
                      src="/illustrations/Hero.svg"
                      alt="Build Trust Then Pay"
                      className="w-1/2 h-full object-contain hero-svg-animation filter drop-shadow-[0_4px_20px_rgba(56,182,255,0.08)] scale-[1.3]"
                    />
                    <img
                      src="/illustrations/talk.svg"
                      alt="Trust Communication"
                      className="w-1/2 h-full object-contain hero-svg-animation filter drop-shadow-[0_4px_20px_rgba(56,182,255,0.08)] scale-[1.3]"
                    />
                  </div>

                  {/* Floating Badges */}
                  <div
                    className="absolute top-12 right-6 float-animation z-20 badge-parallax"
                    style={{
                      transform: `translate(${!prefersReducedMotion ? parallax.x * 0.2 : 0}px, ${!prefersReducedMotion ? parallax.y * 0.2 : 0}px)`,
                    }}
                  >
                    <PillBadge icon="✓" text="Verified Reviews" />
                  </div>

                  <div
                    className="absolute bottom-20 left-6 float-animation-2 z-20 badge-parallax"
                    style={{
                      transform: `translate(${!prefersReducedMotion ? parallax.x * 0.15 : 0}px, ${!prefersReducedMotion ? parallax.y * 0.15 : 0}px)`,
                    }}
                  >
                    <PillBadge icon="🛡️" text="Dispute Support" />
                  </div>

                  <div
                    className="absolute bottom-12 right-12 float-animation-3 z-20 badge-parallax"
                    style={{
                      transform: `translate(${!prefersReducedMotion ? parallax.x * 0.2 : 0}px, ${!prefersReducedMotion ? parallax.y * 0.2 : 0}px)`,
                    }}
                  >
                    <PillBadge icon="✨" text="Shareable Link" />
                  </div>
                </div>
              </div>
            </div>

            {/* Path Drawing Starts exactly at this bottom-center hero marker */}
            <div className="mt-16 flex justify-center">
              <div ref={heroDotRef} className="w-2.5 h-2.5 rounded-full bg-blue-400 opacity-60 animate-pulse" />
            </div>
          </section>

          {/* User Journey Steps */}
          <section className="relative max-w-6xl mx-auto px-4 pb-32">
            {/* Heading */}
            <div className="text-center mb-28 relative z-10">
              <h2 className="text-4xl md:text-5xl font-bold font-heading">
                How it Works
              </h2>
              <p className="text-slate-400 mt-4 max-w-xl mx-auto">
                Follow the journey of secure social commerce, powered by trust.
              </p>
            </div>

            <div className="space-y-36 relative z-10">
              {/* Step 1: Sellers */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
                {/* Text content */}
                <motion.div
                  initial={{ opacity: 0, x: -40 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.6 }}
                  className="space-y-6 lg:pr-6"
                >
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs text-blue-400 font-semibold">
                    Step 1: Sellers
                  </div>
                  <h3 className="text-3xl md:text-4xl font-bold leading-tight">
                    Create Your Verified Profile.
                  </h3>
                  <p className="text-slate-400 leading-relaxed">
                    Consolidate your credibility in seconds. Link your social handles (Instagram, WhatsApp, TikTok), verify your identity, and display your aggregate trust rating.
                  </p>
                  <ul className="space-y-3">
                    <li className="flex items-center gap-3 text-sm text-slate-300">
                      <div className="w-5 h-5 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center">
                        <Check size={12} className="text-blue-400" />
                      </div>
                      Unified dashboard link for bio
                    </li>
                    <li className="flex items-center gap-3 text-sm text-slate-300">
                      <div className="w-5 h-5 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center">
                        <Check size={12} className="text-blue-400" />
                      </div>
                      Anti-impersonation badge
                    </li>
                  </ul>
                </motion.div>

                {/* Mock UI Card */}
                <motion.div
                  initial={{ opacity: 0, x: 40 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.6 }}
                  className="relative bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 p-8 rounded-2xl shadow-2xl hover:border-blue-500/30 transition-all duration-300 group"
                >
                  {/* SVG path anchor point - left edge on desktop */}
                  <div ref={step1DotRef} className="absolute -left-3 lg:-left-[10px] top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-blue-500 shadow-[0_0_12px_#3b82f6] border-4 border-[#080B11] z-20" />

                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-5 mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-sm">
                        S
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm flex items-center gap-1.5 text-slate-100">
                          Sarah's Store
                          <span className="w-3.5 h-3.5 bg-blue-500 text-white rounded-full flex items-center justify-center text-[8px] font-bold">✓</span>
                        </h4>
                        <p className="text-xs text-slate-500">@sarah_deals</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 font-medium">
                      Verified Seller
                    </span>
                  </div>

                  <div className="space-y-5">
                    <div>
                      <label className="text-xs text-slate-500 block mb-2 font-medium">Linked Accounts</label>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/40 flex items-center gap-2 text-xs">
                          <Instagram size={14} className="text-pink-500" />
                          <span className="text-slate-300">Instagram</span>
                          <Check size={10} className="ml-auto text-emerald-500" />
                        </div>
                        <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/40 flex items-center gap-2 text-xs">
                          <Twitter size={14} className="text-blue-400" />
                          <span className="text-slate-300">Twitter/X</span>
                          <Check size={10} className="ml-auto text-emerald-500" />
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-gradient-to-r from-blue-950/40 to-slate-950/40 rounded-xl border border-slate-800/80 flex items-center justify-between">
                      <div>
                        <span className="text-xs text-slate-400 block mb-0.5">Middelmen Trust Score</span>
                        <span className="text-xl font-bold text-[#38b6ff]">98.4% Rating</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-slate-500 block">Transactions</span>
                        <span className="text-sm font-semibold text-slate-200">142 Successful</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Step 2: Buyers */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
                {/* Mock UI Card (Left on Desktop) */}
                <motion.div
                  initial={{ opacity: 0, x: -40 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.6 }}
                  className="relative bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 p-8 rounded-2xl shadow-2xl hover:border-cyan-500/30 transition-all duration-300 order-2 lg:order-1"
                >
                  {/* SVG path anchor point - right edge on desktop, left edge on mobile */}
                  <div ref={step2DotRef} className="absolute -left-3 lg:left-auto lg:-right-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-cyan-500 shadow-[0_0_12px_#06b6d4] border-4 border-[#080B11] z-20" />

                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-5 mb-5">
                    <h4 className="font-semibold text-sm text-slate-200">Public Trust Record</h4>
                    <div className="flex items-center gap-1 text-[#38b6ff] text-sm font-bold">
                      <Star size={14} fill="#38b6ff" />
                      <span>4.9 / 5.0</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800/40 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-300">Alex M.</span>
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium">
                          <CheckCircle size={8} /> Verified Buyer
                        </span>
                      </div>
                      <div className="flex gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} size={10} fill="#38b6ff" className="text-[#38b6ff]" />
                        ))}
                      </div>
                      <p className="text-xs text-slate-400">
                        "Fast delivery on WhatsApp. Very trustable seller, transaction went perfect."
                      </p>
                    </div>

                    <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800/40 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-300">Jordan K.</span>
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium">
                          <CheckCircle size={8} /> Verified Buyer
                        </span>
                      </div>
                      <div className="flex gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} size={10} fill="#38b6ff" className="text-[#38b6ff]" />
                        ))}
                      </div>
                      <p className="text-xs text-slate-400">
                        "Products match description perfectly. The Middelmen verification is a life saver."
                      </p>
                    </div>
                  </div>
                </motion.div>

                {/* Text content */}
                <motion.div
                  initial={{ opacity: 0, x: 40 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.6 }}
                  className="space-y-6 lg:pl-6 order-1 lg:order-2"
                >
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-400 font-semibold">
                    Step 2: Buyers
                  </div>
                  <h3 className="text-3xl md:text-4xl font-bold leading-tight">
                    Transparency at a Glance.
                  </h3>
                  <p className="text-slate-400 leading-relaxed">
                    No more sending payments into a black box. Buyers review authenticated star reviews, confirm identity details, and check the immutable badge indicators.
                  </p>
                  <ul className="space-y-3">
                    <li className="flex items-center gap-3 text-sm text-slate-300">
                      <div className="w-5 h-5 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
                        <Check size={12} className="text-cyan-400" />
                      </div>
                      Real ratings by real confirmed clients
                    </li>
                    <li className="flex items-center gap-3 text-sm text-slate-300">
                      <div className="w-5 h-5 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
                        <Check size={12} className="text-cyan-400" />
                      </div>
                      Visual trust ratings and statistics
                    </li>
                  </ul>
                </motion.div>
              </div>

              {/* Step 3: Trust Loop */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
                {/* Text content */}
                <motion.div
                  initial={{ opacity: 0, x: -40 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.6 }}
                  className="space-y-6 lg:pr-6"
                >
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 font-semibold">
                    Step 3: Trust Loop
                  </div>
                  <h3 className="text-3xl md:text-4xl font-bold leading-tight">
                    Verified Feedback Only.
                  </h3>
                  <p className="text-slate-400 leading-relaxed">
                    Shut down competitor spam and fake reviews. Only buyers who complete verified transactions through Middelmen are eligible to leave feedback, keeping the ratings authentic.
                  </p>
                  <ul className="space-y-3">
                    <li className="flex items-center gap-3 text-sm text-slate-300">
                      <div className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                        <Check size={12} className="text-emerald-400" />
                      </div>
                      Transaction-bound review invites
                    </li>
                    <li className="flex items-center gap-3 text-sm text-slate-300">
                      <div className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                        <Check size={12} className="text-emerald-400" />
                      </div>
                      Zero anonymous or bot entries
                    </li>
                  </ul>
                </motion.div>

                {/* Mock UI Card */}
                <motion.div
                  initial={{ opacity: 0, x: 40 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.6 }}
                  className="relative bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 p-8 rounded-2xl shadow-2xl hover:border-emerald-500/30 transition-all duration-300 group"
                >
                  {/* SVG path anchor point - left edge on desktop */}
                  <div ref={step3DotRef} className="absolute -left-3 lg:-left-[10px] top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-emerald-500 shadow-[0_0_12px_#10b981] border-4 border-[#080B11] z-20" />

                  <h4 className="font-semibold text-sm text-slate-200 mb-4 flex items-center gap-2">
                    <Lock size={15} className="text-emerald-400" /> Review Authorization Check
                  </h4>

                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-emerald-950/20 border border-emerald-500/20 rounded-xl">
                      <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                        <Check size={12} />
                      </div>
                      <div className="text-xs">
                        <span className="font-semibold text-slate-200 block">Transaction Confirmed</span>
                        <span className="text-slate-400">ID: TX-83271-SECURE</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-emerald-950/20 border border-emerald-500/20 rounded-xl">
                      <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                        <Check size={12} />
                      </div>
                      <div className="text-xs">
                        <span className="font-semibold text-slate-200 block">Unique Review Token Active</span>
                        <span className="text-slate-400">Expires in 48 hours</span>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800/60 text-center space-y-3">
                      <span className="text-xs text-slate-400">Drag to rate this transaction</span>
                      <div className="flex justify-center gap-2 text-emerald-400">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} size={18} fill="#10B981" className="cursor-pointer transition-transform hover:scale-125" />
                        ))}
                      </div>
                      <Button size="sm" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs mt-2">
                        Submit Verified Review
                      </Button>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </section>
        </div>

        {/* Feature Cards Matrix */}
        <section className="relative z-10 py-24 border-t border-slate-900 bg-slate-950/40">
          <div className="max-w-6xl mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold font-heading">
                Engineered for Integrity
              </h2>
              <p className="text-slate-400 mt-3 max-w-xl mx-auto">
                Advanced features built directly into our trust ledger system to keep transactions fast and secure.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Card 1 */}
              <div className="p-8 bg-slate-900/30 border border-slate-900 rounded-2xl hover:border-blue-500/20 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-6">
                  <Shield size={22} />
                </div>
                <h3 className="text-xl font-bold mb-3">Escrow Guard</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Holds buyer payments in secure lockboxes, only releasing them once both parties verify transaction details.
                </p>
              </div>

              {/* Card 2 */}
              <div className="p-8 bg-slate-900/30 border border-slate-900 rounded-2xl hover:border-cyan-500/20 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-6">
                  <Link2 size={22} />
                </div>
                <h3 className="text-xl font-bold mb-3">Link-in-Bio Integrations</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Drop your single trust profile link into your Instagram, TikTok, or WhatsApp bios to instantly verify your status.
                </p>
              </div>

              {/* Card 3 */}
              <div className="p-8 bg-slate-900/30 border border-slate-900 rounded-2xl hover:border-emerald-500/20 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-6">
                  <Lock size={22} />
                </div>
                <h3 className="text-xl font-bold mb-3">Secured Feedback loop</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Protects reputation against malicious negative reviews through advanced cryptographical review tokens.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Bottom Section */}
        <section className="relative z-10 py-28 text-center max-w-4xl mx-auto px-4">
          <h2 className="text-4xl md:text-5xl font-extrabold font-heading mb-6">
            Ready to secure your business?
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto mb-10 leading-relaxed">
            Create your account today. Build credibility, eliminate risk, and capture verified social commerce.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth">
              <Button size="lg" className="px-8 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-emerald-600/10 hover:scale-105 active:scale-95">
                Get Started for Free <ArrowRight size={16} className="ml-2" />
              </Button>
            </Link>
          </div>
        </section>
      </Layout>
    </div>
  );
}

// Reusable Components styled for Premium Dark Mode
function PillBadge({ icon, text }: { icon: string; text: string }) {
  return (
    <div
      className="px-3.5 py-2.5 rounded-full flex items-center gap-2.5 backdrop-blur-md text-xs font-semibold shadow-2xl border transition-all duration-300 hover:scale-105"
      style={{
        background: "rgba(15, 23, 42, 0.65)",
        borderColor: "rgba(255, 255, 255, 0.08)",
        color: "#e2e8f0",
      }}
    >
      <span className="text-sm">{icon}</span>
      <span>{text}</span>
      <span className="ml-1 text-[#38b6ff] font-bold">✓</span>
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
    <div className="group flex flex-col items-start gap-3 p-4 rounded-xl transition-all duration-200 hover:bg-slate-900/50">
      <div
        className="flex items-center justify-center w-11 h-11 rounded-xl transition-all duration-200"
        style={{
          background: "rgba(56, 182, 255, 0.08)",
          color: "#38b6ff",
        }}
      >
        <Icon size={20} />
      </div>
      <div className="flex-1">
        <h4 className="text-sm font-semibold text-slate-100 mb-0.5">{title}</h4>
        <p className="text-xs text-slate-400 leading-relaxed">{subtitle}</p>
      </div>
    </div>
  );
}
