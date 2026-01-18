import { motion } from "framer-motion";

interface TypingIndicatorProps {
  avatarUrl?: string | null;
  name: string;
}

export const TypingIndicator = ({ avatarUrl, name }: TypingIndicatorProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="flex items-center gap-2 px-4 py-2"
    >
      <img
        src={avatarUrl || "/placeholder.svg"}
        alt={name}
        className="w-6 h-6 rounded-full object-cover"
      />
      <div className="liquid-glass rounded-2xl rounded-bl-md px-4 py-2.5 flex items-center gap-1">
        <motion.span
          className="w-2 h-2 rounded-full bg-muted-foreground"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
        />
        <motion.span
          className="w-2 h-2 rounded-full bg-muted-foreground"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
        />
        <motion.span
          className="w-2 h-2 rounded-full bg-muted-foreground"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
        />
      </div>
    </motion.div>
  );
};
