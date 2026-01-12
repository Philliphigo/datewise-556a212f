import { Button } from "@/components/ui/button";
import { Heart, Sparkles, Shield, Zap, Star, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const Landing = () => {
  const features = [
    {
      icon: Heart,
      title: "Meaningful Connections",
      description: "Find people who share your values and interests",
    },
    {
      icon: Sparkles,
      title: "Smart Matching",
      description: "AI-powered algorithm finds your perfect match",
    },
    {
      icon: Shield,
      title: "Safe & Secure",
      description: "Your privacy and safety are our top priority",
    },
    {
      icon: Zap,
      title: "Instant Messaging",
      description: "Real-time chat when you both match",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Subtle gradient overlay */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 80% 60% at 50% 40%, hsl(var(--primary) / 0.08), transparent)'
          }}
        />

        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            {/* Logo Icon */}
            <div className="flex items-center justify-center mb-6 animate-fade-in">
              <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Heart className="w-10 h-10 text-primary" strokeWidth={1.5} />
              </div>
            </div>
            
            {/* Title */}
            <h1 
              className="text-5xl md:text-7xl font-display font-bold tracking-tight animate-fade-in text-foreground"
              style={{ animationDelay: '0.1s' }}
            >
              DateWise
            </h1>
            
            {/* Tagline */}
            <p 
              className="text-xl md:text-2xl text-muted-foreground max-w-xl mx-auto animate-slide-up"
              style={{ animationDelay: '0.2s' }}
            >
              Find meaningful connections. Your perfect match is waiting.
            </p>

            {/* CTA Buttons */}
            <div 
              className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-6 animate-slide-up"
              style={{ animationDelay: '0.3s' }}
            >
              <Link to="/auth?mode=signup">
                <Button
                  size="lg"
                  className="px-8 h-14 text-base group"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link to="/auth?mode=signin">
                <Button
                  size="lg"
                  variant="secondary"
                  className="px-8 h-14 text-base"
                >
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 relative">
        <div className="container mx-auto px-6 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-display font-bold text-foreground mb-4">
              Why DateWise?
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Discover what makes us different
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="bento-card p-6 text-center space-y-4 group hover-lift animate-slide-up"
                  style={{ animationDelay: `${0.1 * index}s` }}
                >
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-secondary flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                    <Icon className="w-7 h-7 text-primary" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-lg font-display font-semibold text-foreground">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-24 relative overflow-hidden">
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 60% 50% at 50% 50%, hsl(var(--primary) / 0.06), transparent)'
          }}
        />
        
        <div className="container mx-auto px-6 relative z-10 text-center space-y-8">
          <h2 className="text-3xl md:text-5xl font-display font-bold text-foreground">
            Ready to Find Your Match?
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Join thousands of people finding meaningful connections every day
          </p>
          <Link to="/auth?mode=signup">
            <Button
              size="lg"
              className="px-10 h-14 text-base"
            >
              <Star className="w-5 h-5 mr-2" />
              Get Started Free
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Landing;
