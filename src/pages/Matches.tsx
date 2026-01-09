import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Layout } from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Loader2, Circle, Heart, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import defaultAvatar from "@/assets/default-avatar.jpg";
import { formatDistanceToNow } from "date-fns";
import { VerifiedBadge } from "@/components/VerifiedBadge";

interface Match {
  id: string;
  created_at: string;
  profile: {
    id: string;
    name: string;
    age: number;
    avatar_url: string | null;
    city: string | null;
    is_online: boolean;
    verified?: boolean;
  };
}

const Matches = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchMatches();
  }, [user, navigate]);

  const fetchMatches = async () => {
    try {
      const { data: matchesData, error } = await supabase
        .from("matches")
        .select("*")
        .or(`user1_id.eq.${user?.id},user2_id.eq.${user?.id}`);

      if (error) throw error;

      const matchesWithProfiles = await Promise.all(
        (matchesData || []).map(async (match) => {
          const otherUserId = match.user1_id === user?.id ? match.user2_id : match.user1_id;
          
          const { data: profile } = await supabase
            .from("profiles")
            .select("id, name, age, avatar_url, city, is_online, verified")
            .eq("id", otherUserId)
            .single();

          return {
            id: match.id,
            created_at: match.created_at,
            profile: profile,
          };
        })
      );

      setMatches(matchesWithProfiles.filter(m => m.profile));
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChatClick = (matchId: string) => {
    navigate(`/messages?match=${matchId}`);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[calc(100vh-140px)]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 pb-28">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center space-y-2 animate-float-up">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full liquid-glass mb-2">
              <Heart className="w-5 h-5 text-primary fill-primary" />
              <span className="text-sm font-medium">{matches.length} {matches.length === 1 ? "Match" : "Matches"}</span>
            </div>
            <h1 className="text-3xl font-bold">Your Matches</h1>
            <p className="text-muted-foreground text-sm">Start a conversation with your matches</p>
          </div>

          {matches.length === 0 ? (
            <div className="liquid-glass rounded-3xl p-12 text-center animate-spring-in">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No matches yet</h3>
              <p className="text-muted-foreground text-sm">
                Keep swiping to find your perfect match!
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {matches.map((match, index) => (
                <div
                  key={match.id}
                  onClick={() => handleChatClick(match.id)}
                  className="liquid-glass rounded-3xl overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-xl active:scale-[0.98] animate-spring-in"
                  style={{ animationDelay: `${index * 0.08}s` }}
                >
                  {/* Profile Image */}
                  <div className="relative aspect-[4/5]">
                    <img
                      src={match.profile.avatar_url || defaultAvatar}
                      alt={match.profile.name}
                      className="w-full h-full object-cover"
                    />
                    
                    {/* Online Status */}
                    {match.profile.is_online && (
                      <div className="absolute top-3 right-3">
                        <Badge className="bg-success/90 text-white border-0 backdrop-blur-sm text-xs px-2 py-1">
                          <Circle className="w-2 h-2 fill-white mr-1" />
                          Online
                        </Badge>
                      </div>
                    )}

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 gradient-overlay-bottom pointer-events-none" />

                    {/* Profile Info Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-xl font-bold text-white">
                          {match.profile.name}
                        </h3>
                        <span className="text-white/80">{match.profile.age}</span>
                        {match.profile.verified && <VerifiedBadge size="md" />}
                      </div>
                      {match.profile.city && (
                        <p className="text-white/70 text-sm">{match.profile.city}</p>
                      )}
                      <p className="text-white/50 text-xs mt-1">
                        Matched {formatDistanceToNow(new Date(match.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="p-4">
                    <button
                      className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-2xl flex items-center justify-center gap-2 font-medium transition-all hover:bg-primary/90 active:scale-[0.98]"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleChatClick(match.id);
                      }}
                    >
                      <MessageCircle className="w-5 h-5" />
                      Message
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Matches;
