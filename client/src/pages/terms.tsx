import { Layout } from "@/components/layout";
import { SEO } from "@/components/seo";

const gradientStyle = {
  backgroundImage: "linear-gradient(135deg, #253c97 0%, #38b6ff 100%)",
};

export default function TermsPage() {
  return (
    <Layout>
      <SEO
        title="Terms and Conditions | MiddelMen"
        description="Read the Terms and Conditions for using MiddelMen trust profiles and verified review system."
      />
      <div className="container mx-auto max-w-4xl px-4 py-12 md:py-16">
        <section className="mb-12 text-center">
          <h1
            className="text-4xl md:text-5xl font-bold font-heading leading-tight tracking-tight bg-clip-text text-transparent mb-4"
            style={gradientStyle}
          >
            Terms and Conditions
          </h1>
          <p className="text-sm text-muted-foreground">
            Last updated: March 25, 2026
          </p>
        </section>

        <div className="space-y-10 text-muted-foreground leading-relaxed">
          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-3">
              1. Introduction
            </h2>
            <p>
              MiddelMen is a platform where users create trust profiles, collect
              and read reviews, and share profile links across social channels.
            </p>
            <p className="mt-3">
              By creating an account or using MiddelMen, you agree to these
              Terms and Conditions. If you do not agree, please do not use the
              platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-3">
              2. User Accounts
            </h2>
            <p>
              You are responsible for your account activity and for keeping your
              login credentials secure.
            </p>
            <p className="mt-3">
              You must provide accurate and current information when registering
              and using MiddelMen.
            </p>
            <p className="mt-3">
              You may not impersonate another person, business, or brand, or
              misrepresent your identity in any way.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-3">
              3. Username Ownership & Reclamation Rights
            </h2>
            <p>
              All usernames registered on MiddelMen remain the sole and exclusive intellectual property of the platform. We reserve the absolute, unrestricted right to reclaim, reassign, change, suspend, transfer, rename, or terminate any username or URL slug (e.g., middelmen.com/username) at any time, for any reason, without notice, liability, or compensation to you.
            </p>
            <p className="mt-3">
              Usernames do not constitute personal property, and you do not own the username you register. We actively enforce username reclamation and modification in cases including, but not limited to:
            </p>
            <ul className="list-disc pl-5 mt-3 space-y-1.5">
              <li>Impersonation of another person, seller, business, public figure, trademark, or copyrighted brand.</li>
              <li>Username squatting, hoarding, or inactivity (accounts with no active logins or review updates for 6 consecutive months).</li>
              <li>Attempts to buy, sell, transfer, barter, or auction usernames for financial gain or proprietary value.</li>
              <li>Administrative reorganization, security maintenance, or platform optimization.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-3">
              4. Strict Zero Tolerance for Slurs and Offensive Names
            </h2>
            <p>
              MiddelMen maintains an absolute zero-tolerance policy for offensive, hateful, or abusive usernames and content. Usernames, display names, profile descriptions, avatars, and reviews must NOT contain:
            </p>
            <ul className="list-disc pl-5 mt-3 space-y-1.5">
              <li>Profanity, vulgarity, obscenity, or sexually explicit content.</li>
              <li>Slurs, hate speech, racism, sexism, bigotry, xenophobia, or discriminatory references.</li>
              <li>Defamatory, harassing, threatening, or libelous remarks targeted at any individual, group, or brand.</li>
              <li>Names specifically chosen to deceive, confuse, or defraud the public (e.g., imitating official support accounts or verified public entities).</li>
            </ul>
            <p className="mt-3">
              Any account utilizing a prohibited username or display name, or presenting malicious content will be permanently banned immediately, and the username will be returned to the public pool or locked, at our sole discretion.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-3">
              5. Acceptable Use & Profile Reputation Integrity
            </h2>
            <p>
              MiddelMen is designed to facilitate real trust in social commerce. You agree not to manipulate or exploit the trust validation architecture. Under no circumstances may users:
            </p>
            <ul className="list-disc pl-5 mt-3 space-y-1.5">
              <li>Harass, scam, threaten, abuse, or exploit other users.</li>
              <li>Generate, purchase, or publish fake, insincere, or retaliatory reviews or ratings.</li>
              <li>Offer financial incentives, discounts, or coercion to buyers in exchange for artificially positive reviews.</li>
              <li>Use automated bots, scripts, or multiple accounts to inflate rating metrics or mock disputes.</li>
              <li>Use the platform to execute scams, unauthorized MLM schemes, illegal commercial acts, or fraudulent seller profiles.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-3">
              6. Transactional Disclaimer & Limitation of Liability
            </h2>
            <p>
              MiddelMen acts exclusively as a public trust profile and review aggregator. We do not process direct buyer-seller payments, host escrow accounts, hold inventory, handle physical shipping, or verify the quality of transactions.
            </p>
            <p className="mt-3">
              All transactions negotiated or initiated through social platforms linked via a MiddelMen profile are strictly between the buyer and the seller. MiddelMen is not a party to these transactions, does not guarantee any merchantable value or performance, and shall not be held liable for financial losses, scams, disputes, or undelivered products/services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-3">
              7. Account Moderation, Suspension & Termination
            </h2>
            <p>
              We reserve the right to audit, moderate, restrict, suspend, or completely delete any profile or user account for violations of these Terms or if we determine, at our sole discretion, that your behavior creates risk, liability, or harm to the MiddelMen community or the platform's reputation. Decisions made by platform administrators during disputes or compliance investigations are final.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-3">
              8. Intellectual Property
            </h2>
            <p>
              You retain ownership of the content you create and post on MiddelMen.
            </p>
            <p className="mt-3">
              By posting content, you grant MiddelMen a non-exclusive right to host, display, and distribute that content on the platform for service operation, moderation, and improvement.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-3">
              9. Termination
            </h2>
            <p>
              We may terminate or restrict access to accounts that violate these terms or applicable policies. You may stop using MiddelMen at any time.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-3">
              10. Changes to Terms
            </h2>
            <p>
              MiddelMen may update these Terms and Conditions over time to reflect product updates, legal needs, or operational changes. Continued use of the platform after changes are published means you accept the updated terms.
            </p>
          </section>

          <section className="pb-4">
            <h2 className="text-2xl font-semibold text-foreground mb-3">
              11. Contact
            </h2>
            <p>
              For questions about these Terms and Conditions, contact us at{" "}
              <a
                href="mailto:support@middelmen.com"
                className="text-primary hover:underline"
              >
                support@middelmen.com
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </Layout>
  );
}
