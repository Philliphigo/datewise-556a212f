import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Heart, Users, Shield, Sparkles } from "lucide-react";

const About = () => {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold gradient-text">About DateWise</h1>
            <p className="text-xl text-muted-foreground">
              Connecting hearts through intelligent matching
            </p>
          </div>

          <Card className="glass-card p-8 space-y-6">
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold flex items-center gap-2">
                <Heart className="w-6 h-6 text-primary" />
                Our Story
              </h2>
              <p className="text-foreground/80 leading-relaxed">
                DateWise was founded with a simple mission: to help people find meaningful connections 
                in an increasingly digital world. We believe that everyone deserves to find love, and 
                our platform uses intelligent matching algorithms to help you find your perfect match.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 py-6">
              <div className="text-center space-y-2">
                <div className="mx-auto w-12 h-12 rounded-full gradient-romantic flex items-center justify-center">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold">100K+ Users</h3>
                <p className="text-sm text-muted-foreground">Active community</p>
              </div>

              <div className="text-center space-y-2">
                <div className="mx-auto w-12 h-12 rounded-full gradient-romantic flex items-center justify-center">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold">Safe & Secure</h3>
                <p className="text-sm text-muted-foreground">Your privacy matters</p>
              </div>

              <div className="text-center space-y-2">
                <div className="mx-auto w-12 h-12 rounded-full gradient-romantic flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold">Smart Matching</h3>
                <p className="text-sm text-muted-foreground">AI-powered connections</p>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-semibold">Our Values</h2>
              <ul className="space-y-3">
                <li className="flex gap-3">
                  <Heart className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <strong>Authenticity:</strong> We encourage genuine connections and authentic profiles.
                  </div>
                </li>
                <li className="flex gap-3">
                  <Shield className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <strong>Safety:</strong> Your security and privacy are our top priorities.
                  </div>
                </li>
                <li className="flex gap-3">
                  <Users className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <strong>Inclusivity:</strong> Everyone is welcome in our community.
                  </div>
                </li>
                <li className="flex gap-3">
                  <Sparkles className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <strong>Innovation:</strong> We continuously improve our matching technology.
                  </div>
                </li>
              </ul>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default About;
