import { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const REACTIONS = [
  { type: "like", emoji: "❤️", label: "Like" },
  { type: "laugh", emoji: "😂", label: "Laugh" },
  { type: "sad", emoji: "😢", label: "Sad" },
  { type: "angry", emoji: "😡", label: "Angry" },
];

interface ReactionCounts {
  [key: string]: number;
}

interface PostReactionsProps {
  onReact: (type: string) => void;
  userReaction?: string;
  count: number;
  reactionCounts?: ReactionCounts;
}

export const PostReactions = ({ onReact, userReaction, count, reactionCounts = {} }: PostReactionsProps) => {
  const [showReactions, setShowReactions] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const isMobile = useIsMobile();
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleCountClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (count > 0) {
      setShowBreakdown(true);
    }
  };

  const handleMouseDown = () => {
    if (isMobile) {
      const timer = setTimeout(() => {
        setShowReactions(true);
      }, 500);
      setLongPressTimer(timer);
    }
  };

  const handleMouseUp = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    if (!showReactions && isMobile) {
      onReact("like");
    }
  };

  const handleMouseEnter = () => {
    if (!isMobile) {
      hoverTimeoutRef.current = setTimeout(() => {
        setShowReactions(true);
      }, 200);
    }
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    if (longPressTimer) {
      clearTimeout(longPressTimer);
    }
    setShowReactions(false);
  };

  const handleReactionSelect = (type: string) => {
    onReact(type);
    setShowReactions(false);
  };

  const handleClick = () => {
    if (!isMobile && !showReactions) {
      onReact("like");
    }
  };

  const currentReaction = REACTIONS.find(r => r.type === userReaction);
  const displayEmoji = currentReaction?.emoji || "🤍";

  return (
    <>
      <div 
        className="relative"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="flex items-center gap-2">
          <button
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onTouchStart={handleMouseDown}
            onTouchEnd={handleMouseUp}
            onClick={handleClick}
            className={cn(
              "transition-all duration-200",
              userReaction ? "scale-110" : "hover:scale-105"
            )}
          >
            <span className="text-xl">{displayEmoji}</span>
          </button>
          <button 
            onClick={handleCountClick}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {count}
          </button>
        </div>

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

      {/* Reaction Breakdown Dialog */}
      <Dialog open={showBreakdown} onOpenChange={setShowBreakdown}>
        <DialogContent className="liquid-glass rounded-3xl border-0 max-w-xs mx-4">
          <DialogHeader className="text-center">
            <DialogTitle className="text-lg">Reactions</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {REACTIONS.map((reaction) => {
              const reactionCount = reactionCounts[reaction.type] || 0;
              if (reactionCount === 0 && !Object.keys(reactionCounts).length) {
                // If no breakdown data, show the current reaction with total count
                if (reaction.type === "like") {
                  return (
                    <div key={reaction.type} className="flex items-center justify-between px-4 py-2 rounded-xl bg-white/5">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{reaction.emoji}</span>
                        <span className="text-foreground">{reaction.label}</span>
                      </div>
                      <span className="text-muted-foreground font-medium">{count}</span>
                    </div>
                  );
                }
                return null;
              }
              if (reactionCount === 0) return null;
              return (
                <div key={reaction.type} className="flex items-center justify-between px-4 py-2 rounded-xl bg-white/5">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{reaction.emoji}</span>
                    <span className="text-foreground">{reaction.label}</span>
                  </div>
                  <span className="text-muted-foreground font-medium">{reactionCount}</span>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
