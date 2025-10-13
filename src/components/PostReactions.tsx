import { useState } from "react";
import { Heart, Laugh, Frown, HeartCrack } from "lucide-react";
import { cn } from "@/lib/utils";

const REACTIONS = [
  { type: "like", icon: Heart, label: "Like", color: "text-primary" },
  { type: "laugh", icon: Laugh, label: "Laugh", color: "text-yellow-500" },
  { type: "sad", icon: Frown, label: "Sad", color: "text-blue-500" },
  { type: "angry", icon: HeartCrack, label: "Angry", color: "text-red-500" },
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
  const Icon = currentReaction?.icon || Heart;

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
          "flex items-center gap-2 transition-colors",
          userReaction ? currentReaction?.color : "text-muted-foreground hover:text-primary"
        )}
      >
        <Icon
          className="w-5 h-5"
          fill={userReaction ? "currentColor" : "none"}
        />
        <span className="text-sm">{count}</span>
      </button>

      {showReactions && (
        <div className="absolute bottom-full left-0 mb-2 flex gap-2 p-2 glass-card rounded-full shadow-lg animate-scale-in">
          {REACTIONS.map((reaction) => {
            const ReactionIcon = reaction.icon;
            return (
              <button
                key={reaction.type}
                onClick={() => handleReactionSelect(reaction.type)}
                className={cn(
                  "p-2 rounded-full hover:scale-125 transition-transform",
                  reaction.color
                )}
                title={reaction.label}
              >
                <ReactionIcon className="w-6 h-6" fill="currentColor" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
