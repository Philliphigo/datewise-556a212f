import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/card";

const Terms = () => {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold gradient-text">Terms of Service</h1>
            <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
          </div>

          <Card className="glass-card p-8 space-y-6">
            <section className="space-y-3">
              <h2 className="text-2xl font-semibold">Agreement to Terms</h2>
              <p className="text-foreground/80 leading-relaxed">
                By accessing or using DateWise, you agree to be bound by these Terms of Service. If you disagree with any part of these terms, you may not access the service.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold">Eligibility</h2>
              <ul className="list-disc list-inside space-y-2 text-foreground/80">
                <li>You must be at least 18 years old to use this service</li>
                <li>You must provide accurate and complete registration information</li>
                <li>You must not be prohibited from using the service under applicable law</li>
                <li>You may only have one account</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold">User Conduct</h2>
              <p className="text-foreground/80">You agree NOT to:</p>
              <ul className="list-disc list-inside space-y-2 text-foreground/80">
                <li>Harass, abuse, or harm other users</li>
                <li>Post false, misleading, or deceptive information</li>
                <li>Upload inappropriate or offensive content</li>
                <li>Use the service for commercial purposes without permission</li>
                <li>Attempt to access other users' accounts</li>
                <li>Scrape or collect data from the platform</li>
                <li>Impersonate another person</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold">Content</h2>
              <p className="text-foreground/80 leading-relaxed">
                You retain ownership of content you post, but grant us a license to use, display, and distribute it on our platform. You are responsible for ensuring you have the rights to any content you upload.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold">Subscriptions and Payments</h2>
              <ul className="list-disc list-inside space-y-2 text-foreground/80">
                <li>Subscription fees are charged in advance</li>
                <li>Subscriptions auto-renew unless cancelled</li>
                <li>All purchases are final. We do not offer refunds.</li>
                <li>We reserve the right to change pricing with notice</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold">Account Termination</h2>
              <p className="text-foreground/80 leading-relaxed">
                We reserve the right to suspend or terminate your account if you violate these terms. You may also delete your account at any time from your settings.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold">Disclaimer</h2>
              <p className="text-foreground/80 leading-relaxed">
                The service is provided "as is" without warranties of any kind. We do not guarantee matches or relationships. You are solely responsible for your interactions with other users.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold">Limitation of Liability</h2>
              <p className="text-foreground/80 leading-relaxed">
                DateWise shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the service.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold">Changes to Terms</h2>
              <p className="text-foreground/80 leading-relaxed">
                We may modify these terms at any time. Continued use of the service after changes constitutes acceptance of the new terms.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold">Contact</h2>
              <p className="text-foreground/80 leading-relaxed">
                Questions about these Terms? Contact us at legal@datewise.com
              </p>
            </section>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Terms;
