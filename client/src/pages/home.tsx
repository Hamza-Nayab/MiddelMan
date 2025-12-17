import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/layout";
import { motion } from "framer-motion";
import { ArrowRight, Star, Share2, Layers, ShieldCheck } from "lucide-react";

export default function Home() {
  return (
    <Layout>
      <section className="relative overflow-hidden pt-20 pb-32">
        {/* Abstract Background */}
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-background to-background" />
        <div className="absolute inset-0 -z-10 opacity-30 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] brightness-100 contrast-150" />

        <div className="container mx-auto px-4 text-center max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-flex items-center gap-2 py-1 px-3 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <ShieldCheck className="w-3 h-3" />
              TrustThread v1.0
            </span>
            <h1 className="text-5xl md:text-7xl font-bold font-heading mb-6 tracking-tight leading-[1.1]">
              Build your trusted <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-400">
                digital identity.
              </span>
            </h1>
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              TrustThread is more than just a link-in-bio. It's your verified hub for links, social proof, and reputation. Collect reviews, showcase your work, and build trust.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth">
                <Button size="lg" className="h-12 px-8 text-base rounded-full shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all">
                  Claim your Thread
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
              <Link href="/demo">
                <Button size="lg" variant="outline" className="h-12 px-8 text-base rounded-full bg-background/50 backdrop-blur-sm">
                  View Demo Profile
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-24 bg-accent/30">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Share2 className="w-6 h-6 text-primary" />}
              title="Centralize Your Presence"
              description="One link to rule them all. Use it on Instagram, TikTok, Twitter, and everywhere else."
            />
            <FeatureCard 
              icon={<Star className="w-6 h-6 text-primary" />}
              title="Verified Reputation"
              description="Let your audience leave public reviews. Build trust and showcase your reputation."
            />
            <FeatureCard 
              icon={<Layers className="w-6 h-6 text-primary" />}
              title="Identity Analytics"
              description="Track who visits, what they click, and how your reputation grows over time."
            />
          </div>
        </div>
      </section>
    </Layout>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="p-8 rounded-2xl bg-background border border-border/50 shadow-sm hover:shadow-md transition-shadow">
      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-3">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">
        {description}
      </p>
    </div>
  );
}
