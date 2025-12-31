import { Button } from "@/components/ui/button";
import { Heart, Sparkles, Shield, Zap, Star, Orbit } from "lucide-react";
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
    <div className="min-h-screen overflow-hidden relative bg-background">
      {/* Starfield Background */}
      <div className="starfield" />
      
      {/* Nebula Gradients */}
      <div className="absolute inset-0 nebula-gradient pointer-events-none" />
      
      {/* Animated Cosmic Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute w-[600px] h-[600px] rounded-full animate-cosmic-float opacity-30"
          style={{ 
            background: 'radial-gradient(circle, hsla(42, 92%, 56%, 0.15), transparent 70%)',
            top: '-10%',
            right: '-10%',
            animationDelay: '0s'
          }} 
        />
        <div 
          className="absolute w-[500px] h-[500px] rounded-full animate-cosmic-float opacity-25"
          style={{ 
            background: 'radial-gradient(circle, hsla(260, 60%, 50%, 0.15), transparent 70%)',
            bottom: '-5%',
            left: '-15%',
            animationDelay: '2s'
          }} 
        />
        <div 
          className="absolute w-[400px] h-[400px] rounded-full animate-cosmic-float opacity-20"
          style={{ 
            background: 'radial-gradient(circle, hsla(200, 100%, 50%, 0.12), transparent 70%)',
            top: '40%',
            left: '60%',
            animationDelay: '4s'
          }} 
        />
      </div>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            {/* Logo with Glow */}
            <div className="flex items-center justify-center gap-3 mb-6 animate-spring-in">
              <div className="relative">
                <div className="absolute inset-0 blur-2xl bg-primary/50 animate-pulse-soft" />
                <Orbit className="w-16 h-16 text-primary relative animate-cosmic-float" strokeWidth={1.5} />
              </div>
            </div>
            
            {/* Title with Golden Gradient */}
            <h1 
              className="text-6xl md:text-8xl font-display font-bold tracking-tight animate-spring-in text-gradient-gold"
              style={{ animationDelay: '0.1s' }}
            >
              DateWise
            </h1>
            
            {/* Tagline */}
            <p 
              className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto animate-float-up font-light"
              style={{ animationDelay: '0.2s' }}
            >
              Explore the universe of connection. Find your cosmic match.
            </p>

            {/* CTA Buttons */}
            <div 
              className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8 animate-float-up"
              style={{ animationDelay: '0.3s' }}
            >
              <Link to="/auth?mode=signup">
                <Button
                  size="lg"
                  className="pill-button px-10 py-7 text-lg group"
                >
                  <span>Begin Your Journey</span>
                  <Star className="w-5 h-5 ml-2 group-hover:animate-spring-bounce" />
                </Button>
              </Link>
              <Link to="/auth?mode=signin">
                <Button
                  size="lg"
                  variant="ghost"
                  className="floating-card border border-primary/20 hover:border-primary/50 px-10 py-7 text-lg text-foreground"
                >
                  Sign In
                </Button>
              </Link>
            </div>

            {/* Floating Celestial Elements */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {[...Array(8)].map((_, i) => (
                <Star
                  key={i}
                  className="absolute text-primary/30 animate-cosmic-float"
                  style={{
                    left: `${10 + Math.random() * 80}%`,
                    top: `${10 + Math.random() * 80}%`,
                    animationDelay: `${i * 0.7}s`,
                    width: `${12 + Math.random() * 16}px`,
                    height: `${12 + Math.random() * 16}px`,
                  }}
                  fill="currentColor"
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-32 relative">
        <div className="container mx-auto px-4 relative z-10">
          <h2 
            className="text-4xl md:text-6xl font-display font-bold text-center mb-4 text-gradient-gold"
          >
            Why DateWise?
          </h2>
          <p className="text-center text-muted-foreground mb-16 text-lg">
            Discover what makes us different
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="floating-card p-8 text-center space-y-4 group animate-float-up"
                  style={{ animationDelay: `${0.1 * index}s` }}
                >
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 group-hover:bg-primary/20">
                    <Icon className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-display font-semibold text-foreground">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-32 relative overflow-hidden">
        {/* Cosmic Glow Background */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 60% 50% at 50% 50%, hsla(42, 92%, 56%, 0.1), transparent)'
          }}
        />
        
        <div className="container mx-auto px-4 relative z-10 text-center space-y-8">
          <h2 className="text-4xl md:text-6xl font-display font-bold text-gradient-gold">
            Ready to Find Your Match?
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Join thousands exploring meaningful connections in the cosmic realm
          </p>
          <Link to="/auth?mode=signup">
            <Button
              size="lg"
              className="pill-button px-14 py-8 text-xl animate-glow-pulse"
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
