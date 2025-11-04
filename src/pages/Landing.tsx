import { Button } from "@/components/ui/button";
import { Heart, Sparkles, Shield, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import heroBg from "@/assets/hero-bg.jpg";

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
    <div className="min-h-screen overflow-hidden relative bg-background">
      {/* Animated Blur Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-96 h-96 bg-pink-500/30 rounded-full animate-float" style={{ filter: 'blur(80px)', animationDelay: '0s', animationDuration: '8s' }} />
        <div className="absolute top-40 right-32 w-80 h-80 bg-purple-500/20 rounded-full animate-float" style={{ filter: 'blur(70px)', animationDelay: '2s', animationDuration: '10s' }} />
        <div className="absolute bottom-32 left-40 w-72 h-72 bg-pink-400/25 rounded-full animate-float" style={{ filter: 'blur(90px)', animationDelay: '4s', animationDuration: '12s' }} />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-rose-500/20 rounded-full animate-float" style={{ filter: 'blur(85px)', animationDelay: '1s', animationDuration: '9s' }} />
      </div>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-background/40" />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center space-y-8 animate-fade-in">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Heart className="w-16 h-16 text-pink-500 animate-glow" fill="currentColor" />
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold text-foreground animate-float">
              DateWise
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
              Connect With Meaning. Find Your Perfect Match.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
              <Link to="/auth?mode=signup">
                <Button
                  size="lg"
                  className="bg-pink-500 hover:bg-pink-600 text-white border-0 transition-all transform hover:scale-105 px-8 py-6 text-lg rounded-full shadow-lg shadow-pink-500/30"
                >
                  Join Now
                </Button>
              </Link>
              <Link to="/auth?mode=signin">
                <Button
                  size="lg"
                  variant="outline"
                  className="floating-card border-2 border-border hover:border-pink-500/40 px-8 py-6 text-lg rounded-full"
                >
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Floating Hearts */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <Heart
              key={i}
              className="absolute text-pink-500/20 animate-float"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${i * 0.5}s`,
                fontSize: `${Math.random() * 20 + 10}px`,
              }}
              fill="currentColor"
            />
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 relative">
        <div className="container mx-auto px-4 relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-16 text-foreground">
            Why DateWise?
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="floating-card p-8 text-center space-y-4 hover:scale-105 transition-transform animate-scale-in"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="w-16 h-16 mx-auto bg-pink-500/10 rounded-full flex items-center justify-center">
                    <Icon className="w-8 h-8 text-pink-500" />
                  </div>
                  <h3 className="text-xl font-semibold">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="container mx-auto px-4 relative z-10 text-center space-y-8">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground">
            Ready to Find Your Match?
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Join thousands of people finding meaningful connections every day
          </p>
          <Link to="/auth?mode=signup">
            <Button
              size="lg"
              className="bg-pink-500 hover:bg-pink-600 text-white border-0 transition-all transform hover:scale-105 px-12 py-8 text-xl rounded-full shadow-lg shadow-pink-500/30"
            >
              Get Started Free
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Landing;
