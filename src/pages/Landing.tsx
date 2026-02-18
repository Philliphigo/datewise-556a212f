import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Play } from "lucide-react";
import DotParticleCanvas from "@/components/landing/DotParticleCanvas";
import LandingNav from "@/components/landing/LandingNav";
import HowItWorks from "@/components/landing/HowItWorks";
import Features from "@/components/landing/Features";
import Pricing from "@/components/landing/Pricing";
import Testimonials from "@/components/landing/Testimonials";
import LandingFooter from "@/components/landing/LandingFooter";

const Landing = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingNav />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        {/* Canvas background */}
        <DotParticleCanvas />

        {/* Content overlay */}
        <div className="relative z-10 w-full max-w-6xl mx-auto px-6 pt-16">
          <div className="grid md:grid-cols-2 gap-12 items-center min-h-[80vh]">
            {/* Left: Text content */}
            <div className="space-y-8 md:order-1 order-2">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.2 }}
              >
                <span className="text-xs font-bold tracking-[0.3em] uppercase text-muted-foreground">
                  · · · Next-Gen Dating · · ·
                </span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.3 }}
                className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tighter leading-[0.9] font-display"
              >
                DATE
                <br />
                <span className="relative inline-block">
                  WISE
                  <span className="absolute -bottom-2 left-0 w-full h-1 bg-accent/60 rounded-full" />
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="text-lg text-muted-foreground max-w-md leading-relaxed"
              >
                Smart Matching. Real Connections. A futuristic space where
                meaningful relationships begin through intelligent compatibility.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.65 }}
                className="flex flex-wrap gap-4"
              >
                <Link to="/auth?mode=signup">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="px-8 py-4 bg-foreground text-background rounded-xl text-sm font-bold flex items-center gap-2.5 transition-all hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                  >
                    Start Matching
                    <ArrowRight className="w-4 h-4" />
                  </motion.button>
                </Link>
                <a href="#how-it-works">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="px-8 py-4 rounded-xl text-sm font-bold border border-border/50 text-foreground flex items-center gap-2.5 hover:bg-card/50 transition-all"
                  >
                    <Play className="w-3.5 h-3.5" />
                    How It Works
                  </motion.button>
                </a>
              </motion.div>

              {/* Stats */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9 }}
                className="flex gap-8 pt-4"
              >
                {[
                  { value: "50K+", label: "Active Users" },
                  { value: "12K+", label: "Matches Made" },
                  { value: "4.8★", label: "User Rating" },
                ].map((stat) => (
                  <div key={stat.label}>
                    <p className="text-xl font-black font-display">{stat.value}</p>
                    <p className="text-[10px] text-muted-foreground tracking-wider uppercase">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </motion.div>
            </div>

            {/* Right: Animation area - canvas fills this on desktop */}
            <div className="md:order-2 order-1 h-[300px] md:h-auto" />
          </div>
        </div>
      </section>

      <HowItWorks />
      <Features />
      <Pricing />
      <Testimonials />

      {/* Final CTA */}
      <section className="py-24 md:py-32 px-6 relative">
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: "radial-gradient(circle, hsl(var(--foreground)) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />
        <div className="max-w-lg mx-auto text-center space-y-8 relative">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-5xl font-black tracking-tight font-display"
          >
            Ready to Connect?
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-muted-foreground"
          >
            Join thousands finding meaningful connections every day.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <Link to="/auth?mode=signup">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-10 py-4 bg-foreground text-background rounded-xl text-sm font-bold inline-flex items-center gap-2.5 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all"
              >
                Get Started Free
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </Link>
          </motion.div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
};

export default Landing;
