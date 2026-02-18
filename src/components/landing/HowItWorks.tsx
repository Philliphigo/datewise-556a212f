import { motion } from "framer-motion";

const steps = [
  {
    number: "01",
    title: "Create Profile",
    description: "Build your unique dot-identity with photos, interests, and what you're looking for.",
  },
  {
    number: "02",
    title: "Get Matched",
    description: "Our AI analyzes compatibility signals to connect you with genuinely aligned people.",
  },
  {
    number: "03",
    title: "Start Talking",
    description: "When you both match, unlock real-time messaging and start building your story.",
  },
];

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="py-24 md:py-32 px-6 relative">
      {/* Dot grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: "radial-gradient(circle, hsl(var(--foreground)) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
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
            · · · Process · · ·
          </span>
          <h2 className="text-3xl md:text-5xl font-black tracking-tight mt-4 font-display">
            How It Works
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="relative group"
            >
              <div className="p-8 rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm hover:border-accent/30 transition-colors duration-300">
                {/* Dot pattern corner */}
                <div className="absolute top-3 right-3 grid grid-cols-3 gap-1 opacity-20 group-hover:opacity-40 transition-opacity">
                  {Array.from({ length: 9 }).map((_, j) => (
                    <div key={j} className="w-1 h-1 rounded-full bg-foreground" />
                  ))}
                </div>

                <span className="text-4xl font-black text-accent/20 font-display">
                  {step.number}
                </span>
                <h3 className="text-xl font-bold mt-3 mb-2 font-display">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
