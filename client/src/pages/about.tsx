import { Link } from "wouter";
import { useEffect } from "react";
import { Layout } from "@/components/layout";
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
