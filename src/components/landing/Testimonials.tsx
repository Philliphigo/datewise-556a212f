import { motion } from "framer-motion";

const testimonials = [
  {
    name: "Sarah M.",
    age: 28,
    text: "I found someone who truly understands me. DateWise's matching is on another level.",
    avatar: "SM",
  },
  {
    name: "James K.",
    age: 32,
    text: "The verification system gave me confidence that everyone here is genuine.",
    avatar: "JK",
  },
  {
    name: "Amara T.",
    age: 25,
    text: "Clean, intuitive, and actually works. Best dating app experience I've had.",
    avatar: "AT",
  },
];

const Testimonials = () => {
  return (
    <section className="py-24 md:py-32 px-6 relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.015]"
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
            · · · Stories · · ·
          </span>
          <h2 className="text-3xl md:text-5xl font-black tracking-tight mt-4 font-display">
            Real People. Real Love.
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="p-6 rounded-2xl border border-border/30 bg-card/30 backdrop-blur-sm"
            >
              <div className="flex items-center gap-3 mb-4">
                {/* Pixel mask avatar */}
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center relative overflow-hidden">
                  <div
                    className="absolute inset-0 opacity-20"
                    style={{
                      backgroundImage: "radial-gradient(circle, hsl(var(--foreground)) 1px, transparent 1px)",
                      backgroundSize: "4px 4px",
                    }}
                  />
                  <span className="text-xs font-bold relative z-10">{t.avatar}</span>
                </div>
                <div>
                  <p className="text-sm font-bold">{t.name}</p>
                  <p className="text-xs text-muted-foreground">Age {t.age}</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed italic">
                "{t.text}"
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
