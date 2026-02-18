import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Check } from "lucide-react";

const plans = [
  {
    name: "Free",
    price: "0",
    description: "Get started and explore",
    features: ["10 daily likes", "Basic matching", "Profile creation", "Limited messaging"],
    highlighted: false,
  },
  {
    name: "Premium",
    price: "9.99",
    description: "Unlock the full experience",
    features: [
      "Unlimited likes",
      "AI smart matching",
      "Priority visibility",
      "Unlimited messaging",
      "Profile boosts",
      "See who likes you",
    ],
    highlighted: true,
  },
  {
    name: "Elite",
    price: "19.99",
    description: "Maximum visibility & perks",
    features: [
      "Everything in Premium",
      "Weekly super boosts",
      "Verified badge",
      "Advanced filters",
      "Read receipts",
      "Priority support",
    ],
    highlighted: false,
  },
];

const Pricing = () => {
  return (
    <section id="pricing" className="py-24 md:py-32 px-6 relative">
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: "radial-gradient(circle, hsl(var(--foreground)) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
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
            · · · Plans · · ·
          </span>
          <h2 className="text-3xl md:text-5xl font-black tracking-tight mt-4 font-display">
            Choose Your Path
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12 }}
              className={`relative rounded-2xl p-8 border transition-all duration-300 ${
                plan.highlighted
                  ? "border-accent/50 bg-card/60 backdrop-blur-sm shadow-[0_0_30px_rgba(255,100,120,0.08)]"
                  : "border-border/30 bg-card/30 backdrop-blur-sm hover:border-border/60"
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase bg-accent text-accent-foreground">
                  Popular
                </div>
              )}

              {/* Dot grid corner */}
              {plan.highlighted && (
                <div
                  className="absolute top-0 right-0 w-20 h-20 opacity-10 rounded-tr-2xl overflow-hidden"
                  style={{
                    backgroundImage: "radial-gradient(circle, hsl(var(--accent)) 1px, transparent 1px)",
                    backgroundSize: "8px 8px",
                  }}
                />
              )}

              <h3 className="text-lg font-bold font-display">{plan.name}</h3>
              <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>

              <div className="mt-6 mb-6">
                <span className="text-4xl font-black font-display">${plan.price}</span>
                <span className="text-sm text-muted-foreground">/month</span>
              </div>

              <div className="space-y-3 mb-8">
                {plan.features.map((f) => (
                  <div key={f} className="flex items-center gap-2.5 text-sm">
                    <div className="w-4 h-4 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                      <Check className="w-2.5 h-2.5 text-foreground" />
                    </div>
                    <span className="text-muted-foreground">{f}</span>
                  </div>
                ))}
              </div>

              <Link
                to="/auth?mode=signup"
                className={`block text-center py-3 rounded-xl text-sm font-bold transition-all ${
                  plan.highlighted
                    ? "bg-foreground text-background hover:opacity-90"
                    : "border border-border text-foreground hover:bg-secondary"
                }`}
              >
                Get Started
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Pricing;
