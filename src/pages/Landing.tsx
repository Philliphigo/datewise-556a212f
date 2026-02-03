import { Button } from "@/components/ui/button";
import { Heart, Sparkles, Shield, Zap, ArrowRight, ShieldCheck, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

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
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden px-6">
        <div className="max-w-md mx-auto text-center space-y-8">
          {/* Logo Icon with cartoon shadow */}
          <motion.div 
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="flex items-center justify-center"
          >
            <div className="w-24 h-24 bg-primary rounded-[32px] flex items-center justify-center cartoon-shadow-lg">
              <Heart className="w-12 h-12 text-primary-foreground fill-current" />
            </div>
          </motion.div>
          
          {/* Title */}
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-6xl md:text-7xl font-black tracking-tighter leading-[0.9] uppercase"
          >
            Connect<br />
            <span className="text-accent">with Intent.</span>
          </motion.h1>
          
          {/* Tagline */}
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-xl font-medium text-muted-foreground"
          >
            A minimalist space for meaningful connections. No noise. Just stories.
          </motion.p>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <Link to="/auth?mode=signup">
              <motion.button
                whileHover={{ scale: 1.02, x: -2, y: -2 }}
                whileTap={{ scale: 0.98, x: 2, y: 2 }}
                className="w-full bg-primary text-primary-foreground py-5 rounded-3xl text-xl font-black flex items-center justify-center gap-3 transition-all"
                style={{ 
                  boxShadow: '8px 8px 0px 0px hsl(var(--accent))'
                }}
              >
                Find My Person <ArrowRight className="w-5 h-5" />
              </motion.button>
            </Link>
          </motion.div>

          {/* Trust Badges */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex justify-center gap-8 pt-4"
          >
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <Lock className="w-3 h-3" /> Private
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <ShieldCheck className="w-3 h-3" /> Safe
            </span>
          </motion.div>

          {/* Sign In Link */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-muted-foreground"
          >
            Already have an account?{" "}
            <Link to="/auth?mode=signin" className="font-bold text-foreground underline underline-offset-4 hover:text-accent transition-colors">
              Sign In
            </Link>
          </motion.p>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 relative px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter uppercase mb-4">
              Why <span className="text-accent">DateWise</span>?
            </h2>
            <p className="text-muted-foreground text-lg">
              Discover what makes us different
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ y: -4, x: -2 }}
                  className="cartoon-card p-6 space-y-4 group"
                >
                  <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center group-hover:bg-accent group-hover:text-accent-foreground transition-colors cartoon-shadow">
                    <Icon className="w-7 h-7" strokeWidth={2} />
                  </div>
                  <h3 className="text-xl font-bold tracking-tight">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-24 relative overflow-hidden px-6">
        <div className="max-w-md mx-auto text-center space-y-8">
          <h2 className="text-4xl md:text-5xl font-black tracking-tighter uppercase">
            Ready to Find<br />
            <span className="text-accent">Your Match?</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Join thousands of people finding meaningful connections every day
          </p>
          <Link to="/auth?mode=signup">
            <motion.button
              whileHover={{ scale: 1.02, x: -2, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="bg-accent text-accent-foreground px-10 py-4 rounded-2xl text-lg font-bold inline-flex items-center gap-2"
              style={{ 
                boxShadow: '6px 6px 0px 0px hsl(var(--foreground) / 0.2)'
              }}
            >
              <Sparkles className="w-5 h-5" />
              Get Started Free
            </motion.button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t-2 border-foreground/5 py-8 px-6">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center">
              <Heart className="w-4 h-4 text-primary-foreground fill-current" />
            </div>
            <span className="font-black tracking-tight">DateWise</span>
          </div>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <Link to="/contact" className="hover:text-foreground transition-colors">Contact</Link>
          </div>
          <p className="text-xs text-muted-foreground">© 2025 DateWise</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
