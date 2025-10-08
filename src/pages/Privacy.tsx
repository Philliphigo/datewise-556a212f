import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/card";

const Privacy = () => {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold gradient-text">Privacy Policy</h1>
            <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
          </div>

          <Card className="glass-card p-8 space-y-6">
            <section className="space-y-3">
              <h2 className="text-2xl font-semibold">Introduction</h2>
              <p className="text-foreground/80 leading-relaxed">
                DateWise ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our dating platform.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold">Information We Collect</h2>
              <div className="space-y-2 text-foreground/80">
                <p><strong>Personal Information:</strong> Name, email address, phone number, date of birth, gender, photos, and profile information you provide.</p>
                <p><strong>Usage Data:</strong> Information about how you interact with our service, including matches, messages, and preferences.</p>
                <p><strong>Device Information:</strong> IP address, browser type, device identifiers, and operating system.</p>
                <p><strong>Location Data:</strong> Approximate location to help you find matches nearby.</p>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold">How We Use Your Information</h2>
              <ul className="list-disc list-inside space-y-2 text-foreground/80">
                <li>To provide and maintain our service</li>
                <li>To match you with compatible users</li>
                <li>To communicate with you about updates and features</li>
                <li>To improve our matching algorithm</li>
                <li>To detect and prevent fraud or abuse</li>
                <li>To comply with legal obligations</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold">Information Sharing</h2>
              <p className="text-foreground/80 leading-relaxed">
                We do not sell your personal information. We may share your information with:
              </p>
              <ul className="list-disc list-inside space-y-2 text-foreground/80">
                <li>Other users as part of the matching process</li>
                <li>Service providers who assist in operating our platform</li>
                <li>Law enforcement when required by law</li>
                <li>Business partners with your explicit consent</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold">Your Rights</h2>
              <ul className="list-disc list-inside space-y-2 text-foreground/80">
                <li>Access and review your personal information</li>
                <li>Update or correct your information</li>
                <li>Delete your account and associated data</li>
                <li>Opt-out of marketing communications</li>
                <li>Export your data</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold">Data Security</h2>
              <p className="text-foreground/80 leading-relaxed">
                We implement industry-standard security measures to protect your data, including encryption, secure servers, and regular security audits. However, no method of transmission over the internet is 100% secure.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold">Cookies and Tracking</h2>
              <p className="text-foreground/80 leading-relaxed">
                We use cookies and similar tracking technologies to enhance your experience, analyze usage patterns, and personalize content.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold">Contact Us</h2>
              <p className="text-foreground/80 leading-relaxed">
                If you have questions about this Privacy Policy, please contact us at privacy@datewise.com
              </p>
            </section>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Privacy;
