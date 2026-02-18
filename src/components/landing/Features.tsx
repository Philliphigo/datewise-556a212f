import { motion } from "framer-motion";
import { Brain, Shield, MessageCircle, Sparkles, Eye, Zap } from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "AI Smart Matching",
    description: "Deep learning algorithms analyze compatibility beyond surface-level preferences.",
  },
  {
    icon: Shield,
    title: "Verified Profiles",
    description: "Multi-step verification keeps the community authentic and trustworthy.",
  },
  {
    icon: MessageCircle,
    title: "Real-Time Chat",
    description: "Instant messaging with read receipts, reactions, and voice messages.",
  },
  {
    icon: Sparkles,
    title: "Profile Boosts",
    description: "Increase your visibility and get discovered by more potential matches.",
  },
  {
    icon: Eye,
    title: "Privacy Controls",
    description: "Choose who sees your photos and control your discovery preferences.",
  },
  {
    icon: Zap,
    title: "Instant Matching",
    description: "Get notified immediately when someone is interested in connecting.",
  },
];

const Features = () => {
  return (
    <section id="features" className="py-24 md:py-32 px-6 relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: "radial-gradient(circle, hsl(var(--foreground)) 1px, transparent 1px)",
          backgroundSize: "16px 16px",
        }}
      />

      <div className="max-w-5xl mx-auto relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-xs font-bold tracking-[0.3em] uppercase text-muted-foreground">
            · · · Capabilities · · ·
          </span>
          <h2 className="text-3xl md:text-5xl font-black tracking-tight mt-4 font-display">
            Built for Real Connections
          </h2>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="group relative"
              >
                <div className="p-6 rounded-2xl border border-border/30 bg-card/30 backdrop-blur-sm hover:bg-card/60 hover:border-accent/20 transition-all duration-300">
                  {/* Icon with dot grid background */}
                  <div className="w-12 h-12 rounded-xl bg-secondary/50 flex items-center justify-center mb-4 relative overflow-hidden">
                    <div
                      className="absolute inset-0 opacity-20"
                      style={{
                        backgroundImage: "radial-gradient(circle, hsl(var(--foreground)) 0.5px, transparent 0.5px)",
                        backgroundSize: "6px 6px",
                      }}
                    />
                    <Icon className="w-5 h-5 text-foreground relative z-10" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-base font-bold mb-1.5 font-display">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Features;
