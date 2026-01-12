import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Sparkles, X } from "lucide-react";

interface DiscoverAdProps {
  className?: string;
}

export const DiscoverAd = ({ className = "" }: DiscoverAdProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSubscribed, setIsSubscribed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const checkSubscription = async () => {
      if (!user) {
        setIsSubscribed(false);
        setLoading(false);
        return;
      }

      try {
        const { data } = await supabase
          .from("subscriptions")
          .select("tier, is_active, end_date")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .gte("end_date", new Date().toISOString())
          .maybeSingle();

        setIsSubscribed(!!data);
      } catch {
        setIsSubscribed(false);
      } finally {
        setLoading(false);
      }
    };

    checkSubscription();
  }, [user]);

  // Don't show ads to subscribed users or while loading
  if (loading || isSubscribed || dismissed) return null;

  return (
    <div className={`absolute top-4 left-4 right-4 z-30 ${className}`}>
      <div className="relative bg-gradient-to-r from-amber-500/90 to-orange-500/90 backdrop-blur-sm rounded-2xl p-3 shadow-lg">
        {/* Dismiss button */}
        <button
          onClick={() => setDismissed(true)}
          className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-background/90 flex items-center justify-center shadow-md hover:bg-background transition-colors"
        >
          <X className="w-3 h-3 text-foreground" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-white text-sm font-medium">Upgrade to Premium</p>
            <p className="text-white/80 text-xs">Remove ads & get unlimited likes</p>
          </div>
          <button 
            onClick={() => navigate("/donate")}
            className="px-4 py-2 bg-white text-amber-600 text-sm font-semibold rounded-xl shadow hover:bg-white/90 transition-colors"
          >
            Upgrade
          </button>
        </div>
      </div>
    </div>
  );
};