import { Link } from "wouter";
import logoImg from "@/assets/middelman-bg.png";
import { ShieldCheck, Star, Lock } from "lucide-react";
import {
  SiFacebook,
  SiInstagram,
  SiTiktok,
  SiX,
  SiThreads,
} from "react-icons/si";
import { FaLinkedin } from "react-icons/fa";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border/60 bg-slate-50 dark:bg-zinc-950 transition-colors">
      <div className="container mx-auto px-4 max-w-7xl py-12 md:py-16">
        {/* Top Header & Trust Badges */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 pb-10 border-b border-border/40 dark:border-white/10 text-center md:text-left">
          <div>
            <Link
              href="/"
              className="inline-flex items-center justify-center md:justify-start gap-2.5 hover:opacity-90 transition-opacity"
            >
              <img
                src={logoImg}
                alt="MiddelMen logo"
                width={36}
                height={36}
                className="h-9 w-9 rounded-lg object-contain shadow-xs"
              />
              <span className="text-2xl font-heading font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
                MiddelMen
              </span>
            </Link>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-200 font-medium">
              Trusted profiles. Real reviews. Zero scams.
            </p>
          </div>

          {/* Visual Trust Reinforcement Badges */}
          <div className="flex flex-wrap items-center justify-center md:justify-end gap-2 sm:gap-2.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-700 dark:text-sky-300 border border-blue-500/20 shadow-2xs">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400" aria-hidden="true" />
              Verified Sellers
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-700 dark:text-sky-300 border border-blue-500/20 shadow-2xs">
              <Star className="w-3.5 h-3.5 text-blue-600 fill-blue-600 dark:text-sky-400 dark:fill-sky-400" aria-hidden="true" />
              Real Reviews
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-700 dark:text-sky-300 border border-blue-500/20 shadow-2xs">
              <Lock className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400" aria-hidden="true" />
              Zero Scams
            </span>
          </div>
        </div>

        {/* Navigation Columns */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 py-10 border-b border-border/40 dark:border-white/10 text-left">
          {/* Column 1: Product */}
          <div>
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider mb-4">
              Product
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link
                  href="/"
                  className="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white font-medium transition-colors"
                >
                  Explore Platform
                </Link>
              </li>
              <li>
                <Link
                  href="/search"
                  className="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white font-medium transition-colors"
                >
                  Search Sellers
                </Link>
              </li>
              <li>
                <Link
                  href="/dashboard"
                  className="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white font-medium transition-colors"
                >
                  Seller Dashboard
                </Link>
              </li>
              <li>
                <Link
                  href="/demo"
                  className="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white font-medium transition-colors"
                >
                  Interactive Demo
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2: Company */}
          <div>
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider mb-4">
              Company
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link
                  href="/about#about"
                  className="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white font-medium transition-colors"
                >
                  About MiddelMen
                </Link>
              </li>
              <li>
                <Link
                  href="/about#faq"
                  className="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white font-medium transition-colors"
                >
                  Help & FAQs
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white font-medium transition-colors"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <a
                  href="/about#privacy"
                  className="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white font-medium transition-colors"
                >
                  Privacy Policy
                </a>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white font-medium transition-colors"
                >
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Sellers */}
          <div>
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider mb-4">
              Sellers
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link
                  href="/auth"
                  className="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white font-medium transition-colors"
                >
                  Create Trust Profile
                </Link>
              </li>
              <li>
                <Link
                  href="/dashboard"
                  className="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white font-medium transition-colors"
                >
                  Manage Social Links
                </Link>
              </li>
              <li>
                <Link
                  href="/verified"
                  className="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white font-medium transition-colors"
                >
                  Get Verified Badge
                </Link>
              </li>
              <li>
                <Link
                  href="/dashboard"
                  className="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white font-medium transition-colors"
                >
                  Dispute Protection
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Community & Socials */}
          <div>
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider mb-4">
              Connect
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <a
                  href="https://www.linkedin.com/company/middelmen/about/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white font-medium transition-colors"
                >
                  <FaLinkedin className="h-3.5 w-3.5 shrink-0 text-[#0A66C2] dark:text-[#38bdf8]" aria-hidden="true" />
                  LinkedIn
                </a>
              </li>
              <li>
                <a
                  href="https://www.facebook.com/profile.php?id=61593947706156"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white font-medium transition-colors"
                >
                  <SiFacebook className="h-3.5 w-3.5 shrink-0 text-[#0866FF] dark:text-[#60a5fa]" aria-hidden="true" />
                  Facebook
                </a>
              </li>
              <li>
                <a
                  href="https://www.instagram.com/middel.men/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white font-medium transition-colors"
                >
                  <SiInstagram className="h-3.5 w-3.5 shrink-0 text-[#E1306C] dark:text-[#f472b6]" aria-hidden="true" />
                  Instagram
                </a>
              </li>
              <li>
                <a
                  href="https://www.tiktok.com/@middelmen"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white font-medium transition-colors"
                >
                  <SiTiktok className="h-3.5 w-3.5 shrink-0 text-slate-900 dark:text-white" aria-hidden="true" />
                  TikTok
                </a>
              </li>
              <li>
                <a
                  href="https://x.com/realMiddelMen"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white font-medium transition-colors"
                >
                  <SiX className="h-3.5 w-3.5 shrink-0 text-slate-900 dark:text-white" aria-hidden="true" />
                  X / Twitter
                </a>
              </li>
              <li>
                <a
                  href="https://www.threads.com/@middel.men"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white font-medium transition-colors"
                >
                  <SiThreads className="h-3.5 w-3.5 shrink-0 text-slate-900 dark:text-white" aria-hidden="true" />
                  Threads
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Minimal Bottom Bar: Non-redundant, clean copyright and live status */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-300 font-medium">
          <p>© {currentYear} MiddelMen. All rights reserved.</p>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 shadow-2xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] font-semibold">All systems operational</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
