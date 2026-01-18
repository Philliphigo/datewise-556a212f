import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Heart, ThumbsUp, Laugh, Frown } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Reaction {
  id: string;
  user_id: string;
  reaction_type: string;
}

interface MessageReactionsProps {
  messageId: string;
  isOwn: boolean;
}

const REACTIONS = [
  { type: "like", icon: ThumbsUp, emoji: "👍", color: "text-blue-500" },
  { type: "love", icon: Heart, emoji: "❤️", color: "text-red-500" },
  { type: "laugh", icon: Laugh, emoji: "😂", color: "text-yellow-500" },
  { type: "wow", icon: null, emoji: "😮", color: "text-purple-500" },
  { type: "sad", icon: Frown, emoji: "😢", color: "text-blue-400" },
];

export const MessageReactions = ({ messageId, isOwn }: MessageReactionsProps) => {
  const { user } = useAuth();
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchReactions();
    const channel = subscribeToReactions();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [messageId]);

  const fetchReactions = async () => {
    const { data } = await supabase
      .from("message_reactions")
      .select("*")
      .eq("message_id", messageId);
    
    if (data) setReactions(data);
  };

  const subscribeToReactions = () => {
    return supabase
      .channel(`reactions:${messageId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "message_reactions",
          filter: `message_id=eq.${messageId}`,
        },
        () => {
          fetchReactions();
        }
      )
      .subscribe();
  };

  const handleReaction = async (reactionType: string) => {
    if (!user || loading) return;
    setLoading(true);

    try {
      const existingReaction = reactions.find(r => r.user_id === user.id);

      if (existingReaction) {
        if (existingReaction.reaction_type === reactionType) {
          // Remove reaction
          await supabase
            .from("message_reactions")
            .delete()
            .eq("id", existingReaction.id);
        } else {
          // Update reaction
          await supabase
            .from("message_reactions")
            .update({ reaction_type: reactionType })
            .eq("id", existingReaction.id);
        }
      } else {
        // Add new reaction
        await supabase.from("message_reactions").insert({
          message_id: messageId,
          user_id: user.id,
          reaction_type: reactionType,
        });
      }
      setIsOpen(false);
    } catch (error) {
      console.error("Failed to react:", error);
    } finally {
      setLoading(false);
    }
  };

  const userReaction = reactions.find(r => r.user_id === user?.id);
  const reactionCounts = reactions.reduce((acc, r) => {
    acc[r.reaction_type] = (acc[r.reaction_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const hasReactions = reactions.length > 0;

  return (
    <div className={`flex items-center gap-1 ${isOwn ? "justify-end" : "justify-start"}`}>
      {/* Display existing reactions */}
      <AnimatePresence>
        {hasReactions && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-background/80 backdrop-blur-sm border border-white/10 text-xs"
          >
            {Object.entries(reactionCounts).map(([type, count]) => {
              const reaction = REACTIONS.find(r => r.type === type);
              return (
                <span key={type} className="flex items-center">
                  <span className="text-sm">{reaction?.emoji}</span>
                  {count > 1 && <span className="text-[10px] text-muted-foreground ml-0.5">{count}</span>}
                </span>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reaction picker trigger */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <button
            className={`opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-white/10 ${
              userReaction ? "opacity-100" : ""
            }`}
          >
            <span className="text-xs">
              {userReaction 
                ? REACTIONS.find(r => r.type === userReaction.reaction_type)?.emoji 
                : "😊"}
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent 
          side={isOwn ? "left" : "right"} 
          className="w-auto p-2 rounded-2xl border-white/10 liquid-glass"
          sideOffset={5}
        >
          <div className="flex items-center gap-1">
            {REACTIONS.map((reaction) => (
              <motion.button
                key={reaction.type}
                whileHover={{ scale: 1.3 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => handleReaction(reaction.type)}
                className={`p-1.5 rounded-lg hover:bg-white/10 transition-colors ${
                  userReaction?.reaction_type === reaction.type ? "bg-white/20" : ""
                }`}
                disabled={loading}
              >
                <span className="text-xl">{reaction.emoji}</span>
              </motion.button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
