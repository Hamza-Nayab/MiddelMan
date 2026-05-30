import { Link } from "wouter";
import { useEffect } from "react";
import { Layout } from "@/components/layout";
import { SEO } from "@/components/seo";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Shield, Star, Link2, CheckCircle, Lock, Users } from "lucide-react";

const gradientStyle = {
  backgroundImage: "linear-gradient(135deg, #253c97 0%, #38b6ff 100%)",
};

export default function About() {
  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (!hash) return;

    requestAnimationFrame(() => {
      const target = document.getElementById(hash);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  }, []);

  return (
    <Layout>
      <SEO
        title="About MiddelMen | Trust Infrastructure for Social Commerce"
        description="Learn how MiddelMen helps independent sellers build credibility, collect verified reviews, and secure transactions in social commerce."
        schema={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "mainEntity": [
            {
              "@type": "Question",
              "name": "What is a trust profile?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "A trust profile is a public page that shows your username, bio, links, verified reviews, and ratings. Buyers visit this page before paying to confirm you’re legitimate. You share one link (e.g. middelmen.com/yourname) in your social bio."
              }
            },
            {
              "@type": "Question",
              "name": "Who can create a profile?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Anyone selling through Instagram, Facebook, WhatsApp, or similar platforms can sign up as a seller. Buyers can create accounts to leave reviews. Account creation requires email verification."
              }
            },
            {
              "@type": "Question",
              "name": "How do reviews work?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Buyers leave a star rating (1–5) and optional text review after a purchase. Reviews are linked to verified accounts to reduce fake feedback. Sellers can dispute unfair reviews through our dispute system."
              }
            },
            {
              "@type": "Question",
              "name": "Does MiddelMen handle payments?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Not yet. Today MiddelMen focuses on profiles and reviews. Escrow and integrated payment features are planned for a future phase."
              }
            },
            {
              "@type": "Question",
              "name": "How can I contact support?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Use the contact information provided in your account settings or through the platform. For disputes, follow the dispute resolution flow in your dashboard."
              }
            }
          ]
        }}
      />
      <div className="container mx-auto max-w-4xl px-4 py-12 md:py-16">
        {/* Hero */}
        <section className="text-center mb-16">
          <h1
            className="text-4xl md:text-5xl font-bold font-heading leading-tight tracking-tight bg-clip-text text-transparent mb-4"
            style={gradientStyle}
          >
            About MiddelMen
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Trust infrastructure for social commerce. We help sellers build
            credibility and buyers make confident decisions—before they pay.
          </p>
        </section>

        {/* About the Project */}
        <section id="about" className="mb-16 scroll-mt-24">
          <h2
            className="text-2xl md:text-3xl font-bold font-heading mb-6 bg-clip-text text-transparent"
            style={gradientStyle}
          >
            What is MiddelMen?
          </h2>
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <p>
              MiddelMen is a trust layer for sellers who operate through
              Instagram, Facebook, WhatsApp, and other social platforms. We give
              independent sellers a public trust profile where buyers can verify
              identity, see ratings and reviews, and feel safe paying.
            </p>
            <p>
              Our goal is to become the default “Trusted by MiddelMen” badge for
              social commerce—one shareable link that proves you’re legitimate.
            </p>
            <p>
              Whether you sell food, handmade goods, clothing, or services,
              MiddelMen centralizes your reputation in one place: a searchable
              profile, verified reviews, and dispute support when things go
              wrong.
            </p>
          </div>
        </section>

        {/* Why Choose MiddelMen */}
        <section id="why-choose" className="mb-16 scroll-mt-24">
          <h2
            className="text-2xl md:text-3xl font-bold font-heading mb-8 bg-clip-text text-transparent"
            style={gradientStyle}
          >
            Why Choose MiddelMen?
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <ReasonCard
              icon={Star}
              title="Verified Reviews"
              description="Reviews come from verified buyers, reducing fake ratings and building genuine trust."
            />
            <ReasonCard
              icon={Link2}
              title="One Shareable Link"
              description="One link for your bio. Buyers can search your username and find your profile instantly."
            />
            <ReasonCard
              icon={Shield}
              title="Dispute Support"
              description="Transparent dispute resolution to protect both sellers and buyers when issues arise."
            />
            <ReasonCard
              icon={Lock}
              title="Secure & Private"
              description="We protect your data with industry-standard security practices. No spam, no selling your info."
            />
            <ReasonCard
              icon={Users}
              title="Built for Social Commerce"
              description="Designed specifically for Instagram, WhatsApp, and Facebook sellers—not generic marketplaces."
            />
            <ReasonCard
              icon={CheckCircle}
              title="Free to Start"
              description="Get a trust profile and collect reviews without upfront costs. Scale at your own pace."
            />
          </div>
        </section>

        {/* Privacy Policy */}
        <section id="privacy" className="mb-16 scroll-mt-24">
          <h2
            className="text-2xl md:text-3xl font-bold font-heading mb-6 bg-clip-text text-transparent"
            style={gradientStyle}
          >
            Privacy Policy
          </h2>
          <div className="space-y-6 text-muted-foreground leading-relaxed text-sm">
            <div>
              <h3 className="font-semibold text-foreground mb-2">
                Information We Collect
              </h3>
              <p>
                We collect information you provide when signing up (email,
                display name, username, phone number, and profile details). We
                also collect usage data (profile views, link clicks) to provide
                analytics and improve the service.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-2">
                How We Use Your Data
              </h3>
              <p>
                Your data is used to create and display your public trust
                profile, process reviews, handle disputes, and communicate with
                you. We do not sell your personal information to third parties.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-2">
                Data Security
              </h3>
              <p>
                We use industry-standard measures to protect your data,
                including encryption in transit (HTTPS) and secure
                authentication. Sensitive information is stored and processed
                with care.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-2">
                Your Rights
              </h3>
              <p>
                You can access, update, or delete your account and data through
                your dashboard. For questions or requests regarding your
                privacy, contact us through the support channels listed on the
                platform.
              </p>
            </div>
          </div>
        </section>

        {/* Terms and Conditions */}
        <section id="terms" className="mb-16 scroll-mt-24">
          <h2
            className="text-2xl md:text-3xl font-bold font-heading mb-6 bg-clip-text text-transparent"
            style={gradientStyle}
          >
            Terms and Conditions
          </h2>
          <div className="space-y-6 text-muted-foreground leading-relaxed text-sm">
            <div>
              <h3 className="font-semibold text-foreground mb-2">
                1. Username Ownership, Modification & Reclamation Rights
              </h3>
              <p>
                All usernames registered on MiddelMen remain the sole and exclusive intellectual property of the platform. We reserve the absolute, unrestricted right to reclaim, reassign, change, suspend, transfer, rename, or terminate any username or URL slug (e.g., middelmen.com/username) at any time, for any reason, without notice, liability, or compensation to you. 
              </p>
              <p className="mt-2">
                Usernames do not constitute personal property, and you do not own the username you register. We actively enforce username reclamation and modification in cases including, but not limited to:
              </p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Impersonation of another person, seller, business, public figure, trademark, or copyrighted brand.</li>
                <li>Username squatting, hoarding, or inactivity (accounts with no active logins or review updates for 6 consecutive months).</li>
                <li>Attempts to buy, sell, transfer, barter, or auction usernames for financial gain or proprietary value.</li>
                <li>Administrative reorganization, security maintenance, or platform optimization.</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-2">
                2. Strict Zero Tolerance for Slurs and Offensive Names
              </h3>
              <p>
                MiddelMen maintains an absolute zero-tolerance policy for offensive, hateful, or abusive usernames and content. Usernames, display names, profile descriptions, avatars, and reviews must NOT contain:
              </p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Profanity, vulgarity, obscenity, or sexually explicit content.</li>
                <li>Slurs, hate speech, racism, sexism, bigotry, xenophobia, or discriminatory references.</li>
                <li>Defamatory, harassing, threatening, or libelous remarks targeted at any individual, group, or brand.</li>
                <li>Names specifically chosen to deceive, confuse, or defraud the public (e.g., imitating official support accounts or verified public entities).</li>
              </ul>
              <p className="mt-2">
                Any account utilizing a prohibited username or display name, or presenting malicious content will be permanently banned immediately, and the username will be returned to the public pool or locked, at our sole discretion.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-2">
                3. Acceptable Use & Profile Reputation Integrity
              </h3>
              <p>
                MiddelMen is designed to facilitate real trust in social commerce. You agree not to manipulate or exploit the trust validation architecture. Under no circumstances may users:
              </p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Generate, purchase, or publish fake, insincere, or retaliatory reviews or ratings.</li>
                <li>Offer financial incentives, discounts, or coercion to buyers in exchange for artificially positive reviews.</li>
                <li>Use automated bots, scripts, or multiple accounts to inflate rating metrics or mock disputes.</li>
                <li>Use the platform to execute scams, unauthorized MLM schemes, illegal commercial acts, or fraudulent seller profiles.</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-2">
                4. Transactional Disclaimer & Limitation of Liability
              </h3>
              <p>
                MiddelMen acts exclusively as a public trust profile and review aggregator. We do not process direct buyer-seller payments, host escrow accounts, hold inventory, handle physical shipping, or verify the quality of transactions.
              </p>
              <p className="mt-2">
                All transactions negotiated or initiated through social platforms linked via a MiddelMen profile are strictly between the buyer and the seller. MiddelMen is not a party to these transactions, does not guarantee any merchantable value or performance, and shall not be held liable for financial losses, scams, disputes, or undelivered products/services.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-2">
                5. Account Moderation, Suspension & Termination
              </h3>
              <p>
                We reserve the right to audit, moderate, restrict, suspend, or completely delete any profile or user account for violations of these Terms or if we determine, at our sole discretion, that your behavior creates risk, liability, or harm to the MiddelMen community or the platform's reputation. Decisions made by platform administrators during disputes or compliance investigations are final.
              </p>
            </div>
          </div>
        </section>


        {/* FAQ */}
        <section id="faq" className="mb-16 scroll-mt-24">
          <h2
            className="text-2xl md:text-3xl font-bold font-heading mb-8 bg-clip-text text-transparent"
            style={gradientStyle}
          >
            Frequently Asked Questions
          </h2>
          <Accordion
            type="single"
            collapsible
            className="border rounded-xl overflow-hidden"
          >
            <AccordionItem value="what-is-profile">
              <AccordionTrigger className="px-6">
                What is a trust profile?
              </AccordionTrigger>
              <AccordionContent className="px-6 text-muted-foreground">
                A trust profile is a public page that shows your username, bio,
                links, verified reviews, and ratings. Buyers visit this page
                before paying to confirm you’re legitimate. You share one link
                (e.g. middelmen.com/yourname) in your social bio.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="who-can-signup">
              <AccordionTrigger className="px-6">
                Who can create a profile?
              </AccordionTrigger>
              <AccordionContent className="px-6 text-muted-foreground">
                Anyone selling through Instagram, Facebook, WhatsApp, or similar
                platforms can sign up as a seller. Buyers can create accounts to
                leave reviews. Account creation requires email verification.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="how-reviews-work">
              <AccordionTrigger className="px-6">
                How do reviews work?
              </AccordionTrigger>
              <AccordionContent className="px-6 text-muted-foreground">
                Buyers leave a star rating (1–5) and optional text review after
                a purchase. Reviews are linked to verified accounts to reduce
                fake feedback. Sellers can dispute unfair reviews through our
                dispute system.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="payment-escrow">
              <AccordionTrigger className="px-6">
                Does MiddelMen handle payments?
              </AccordionTrigger>
              <AccordionContent className="px-6 text-muted-foreground">
                Not yet. Today MiddelMen focuses on profiles and reviews. Escrow
                and integrated payment features are planned for a future phase.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="contact">
              <AccordionTrigger className="px-6">
                How can I contact support?
              </AccordionTrigger>
              <AccordionContent className="px-6 text-muted-foreground">
                Use the contact information provided in your account settings or
                through the platform. For disputes, follow the dispute
                resolution flow in your dashboard.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>

        {/* CTA */}
        <section className="text-center py-8 border-t border-border">
          <p className="text-muted-foreground mb-4">
            Ready to build your trust profile?
          </p>
          <Link href="/auth">
            <button
              className="px-8 py-3 rounded-xl font-semibold text-white transition-all duration-200 hover:shadow-lg active:scale-95"
              style={{
                backgroundColor: "#253c97",
                boxShadow: "0 4px 16px rgba(37,60,151,0.2)",
              }}
            >
              Get Started for Free
            </button>
          </Link>
        </section>
      </div>
    </Layout>
  );
}

function ReasonCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4 p-6 rounded-xl border border-border bg-card hover:border-primary/20 transition-colors">
      <div
        className="flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center"
        style={{ background: "rgba(56, 182, 255, 0.12)", color: "#253c97" }}
      >
        <Icon size={24} />
      </div>
      <div>
        <h3 className="font-semibold text-foreground mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
}
