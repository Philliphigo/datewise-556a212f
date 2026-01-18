import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface UseTypingIndicatorProps {
  matchId: string | null;
  otherUserId: string | null;
}

export const useTypingIndicator = ({ matchId, otherUserId }: UseTypingIndicatorProps) => {
  const { user } = useAuth();
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingSentRef = useRef<number>(0);

  // Subscribe to typing presence
  useEffect(() => {
    if (!matchId || !user) return;

    const channel = supabase.channel(`typing:${matchId}`)
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const otherUserTyping = Object.values(state).some((presences: any) => 
          presences.some((p: any) => p.user_id === otherUserId && p.is_typing)
        );
        setIsOtherTyping(otherUserTyping);
      })
      .on("presence", { event: "join" }, ({ newPresences }) => {
        const typing = newPresences.some((p: any) => p.user_id === otherUserId && p.is_typing);
        if (typing) setIsOtherTyping(true);
      })
      .on("presence", { event: "leave" }, ({ leftPresences }) => {
        const wasTyping = leftPresences.some((p: any) => p.user_id === otherUserId);
        if (wasTyping) setIsOtherTyping(false);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, otherUserId, user]);

  // Send typing indicator
  const sendTypingIndicator = useCallback(async () => {
    if (!matchId || !user) return;

    const now = Date.now();
    // Throttle to once every 2 seconds
    if (now - lastTypingSentRef.current < 2000) return;
    lastTypingSentRef.current = now;

    const channel = supabase.channel(`typing:${matchId}`);
    await channel.track({
      user_id: user.id,
      is_typing: true,
      online_at: new Date().toISOString(),
    });

    // Clear typing indicator after 3 seconds of no typing
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(async () => {
      await channel.track({
        user_id: user.id,
        is_typing: false,
        online_at: new Date().toISOString(),
      });
    }, 3000);
  }, [matchId, user]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return { isOtherTyping, sendTypingIndicator };
};
