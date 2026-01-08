import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

interface AdPlaceholderProps {
  variant?: "banner" | "inline" | "sidebar";
  className?: string;
}

export const AdPlaceholder = ({ variant = "inline", className = "" }: AdPlaceholderProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSubscribed, setIsSubscribed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

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

  // Don't show ads to subscribed users
  if (loading || isSubscribed) return null;

  const baseStyles = "bg-gradient-to-br from-muted/30 to-muted/10 border border-border/50 rounded-2xl flex items-center justify-center overflow-hidden";

  const variantStyles = {
    banner: "w-full h-20 my-4",
    inline: "w-full h-32 my-4",
    sidebar: "w-full h-48",
  };

  return (
    <div className={`${baseStyles} ${variantStyles[variant]} ${className}`}>
      <div className="text-center p-4">
        <p className="text-xs text-muted-foreground mb-2">Advertisement</p>
        <button 
          onClick={() => navigate("/donate")}
          className="text-xs text-primary hover:underline font-medium"
        >
          Upgrade to remove ads →
        </button>
      </div>
    </div>
  );
};
