import { useState } from "react";
import { cn } from "@/lib/utils";

const REACTIONS = [
  { type: "like", emoji: "❤️", label: "Like" },
  { type: "laugh", emoji: "😂", label: "Laugh" },
  { type: "sad", emoji: "😢", label: "Sad" },
  { type: "angry", emoji: "😡", label: "Angry" },
];

interface PostReactionsProps {
  onReact: (type: string) => void;
  userReaction?: string;
  count: number;
}

export const PostReactions = ({ onReact, userReaction, count }: PostReactionsProps) => {
  const [showReactions, setShowReactions] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);

  const handleMouseDown = () => {
    const timer = setTimeout(() => {
      setShowReactions(true);
    }, 500);
    setLongPressTimer(timer);
  };

  const handleMouseUp = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    if (!showReactions) {
      onReact("like");
    }
  };

  const handleReactionSelect = (type: string) => {
    onReact(type);
    setShowReactions(false);
  };

  const currentReaction = REACTIONS.find(r => r.type === userReaction);
  const displayEmoji = currentReaction?.emoji || "🤍";

  return (
    <div className="relative">
      <button
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          if (longPressTimer) clearTimeout(longPressTimer);
          setShowReactions(false);
        }}
        onTouchStart={handleMouseDown}
        onTouchEnd={handleMouseUp}
        className={cn(
          "flex items-center gap-2 transition-all duration-200",
          userReaction ? "scale-110" : "hover:scale-105"
        )}
      >
        <span className="text-xl">{displayEmoji}</span>
        <span className="text-sm text-muted-foreground">{count}</span>
      </button>

      {showReactions && (
        <div className="absolute bottom-full left-0 mb-2 flex gap-1 p-2 liquid-glass rounded-full shadow-lg animate-bounce-in z-50">
          {REACTIONS.map((reaction) => (
            <button
              key={reaction.type}
              onClick={() => handleReactionSelect(reaction.type)}
              className={cn(
                "p-2 rounded-full hover:scale-125 transition-transform duration-200 hover:bg-white/10",
                userReaction === reaction.type && "bg-white/20 scale-110"
              )}
              title={reaction.label}
            >
              <span className="text-2xl">{reaction.emoji}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
