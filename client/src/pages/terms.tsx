import { Layout } from "@/components/layout";

const gradientStyle = {
  backgroundImage: "linear-gradient(135deg, #253c97 0%, #38b6ff 100%)",
};

export default function TermsPage() {
  return (
    <Layout>
      <div className="container mx-auto max-w-4xl px-4 py-12 md:py-16">
        <section className="mb-12 text-center">
          <h1
            className="text-4xl md:text-5xl font-bold font-heading leading-tight tracking-tight bg-clip-text text-transparent mb-4"
            style={gradientStyle}
          >
            Terms and Conditions
          </h1>
          <p className="text-sm text-muted-foreground">Last updated: March 25, 2026</p>
        </section>

        <div className="space-y-10 text-muted-foreground leading-relaxed">
          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-3">1. Introduction</h2>
            <p>
              MiddelMen is a platform where users create trust profiles, collect and read
              reviews, and share profile links across social channels.
            </p>
            <p className="mt-3">
              By creating an account or using MiddelMen, you agree to these Terms and
              Conditions. If you do not agree, please do not use the platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-3">2. User Accounts</h2>
            <p>
              You are responsible for your account activity and for keeping your login
              credentials secure.
            </p>
            <p className="mt-3">
              You must provide accurate and current information when registering and using
              MiddelMen.
            </p>
            <p className="mt-3">
              You may not impersonate another person, business, or brand, or misrepresent
              your identity in any way.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-3">3. Username Policy</h2>
            <p>
              MiddelMen reserves the right to reclaim, reassign, or remove usernames when
              reasonably necessary to protect users and the platform.
            </p>
            <p className="mt-3">This may include situations involving inactivity, impersonation, trademark conflicts, abuse, or other policy violations.</p>
            <p className="mt-3">
              When appropriate, we may provide notice or an opportunity to resolve issues
              before action is taken.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-3">4. Acceptable Use</h2>
            <p>You agree not to use MiddelMen for illegal activity.</p>
            <p className="mt-3">
              You may not harass, scam, threaten, abuse, or exploit other users.
            </p>
            <p className="mt-3">
              You may not post fake reviews, manipulate ratings, or attempt to bypass platform
              safeguards.
            </p>
            <p className="mt-3">
              You may not misuse platform features in ways that harm users, data integrity, or
              service reliability.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-3">5. Reviews and Content</h2>
            <p>
              You are responsible for content you submit, including profile information,
              comments, and reviews.
            </p>
            <p className="mt-3">
              MiddelMen may moderate, hide, or remove content that violates these terms or
              platform policies.
            </p>
            <p className="mt-3">
              Reviews may be reviewed, hidden, or disputed when there are concerns about
              authenticity, abuse, or policy compliance.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-3">6. Moderation and Enforcement</h2>
            <p>
              MiddelMen may suspend, restrict, or disable accounts that violate these terms
              or create risk for the platform or community.
            </p>
            <p className="mt-3">
              Admins may investigate and take action on reports, disputes, and policy
              violations.
            </p>
            <p className="mt-3">
              In certain cases involving safety, fraud, or repeated abuse, moderation
              decisions may be final.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-3">7. Intellectual Property</h2>
            <p>
              You retain ownership of the content you create and post on MiddelMen.
            </p>
            <p className="mt-3">
              By posting content, you grant MiddelMen a non-exclusive right to host,
              display, and distribute that content on the platform for service operation,
              moderation, and improvement.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-3">8. Limitation of Liability</h2>
            <p>
              MiddelMen is not responsible for the actions, statements, transactions, or
              outcomes of interactions between users.
            </p>
            <p className="mt-3">
              We provide the platform on an as-available basis and do not guarantee specific
              business, reputation, or transaction outcomes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-3">9. Termination</h2>
            <p>
              We may terminate or restrict access to accounts that violate these terms or
              applicable policies.
            </p>
            <p className="mt-3">
              You may stop using MiddelMen at any time.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-3">10. Changes to Terms</h2>
            <p>
              MiddelMen may update these Terms and Conditions over time to reflect product
              updates, legal needs, or operational changes.
            </p>
            <p className="mt-3">
              Continued use of the platform after changes are published means you accept the
              updated terms.
            </p>
          </section>

          <section className="pb-4">
            <h2 className="text-2xl font-semibold text-foreground mb-3">11. Contact</h2>
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
