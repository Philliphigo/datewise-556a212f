import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import defaultAvatar from "@/assets/default-avatar.jpg";

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
      // Get matches where current user is either user1 or user2
      const { data: matchesData, error } = await supabase
        .from("matches")
        .select("*")
        .or(`user1_id.eq.${user?.id},user2_id.eq.${user?.id}`);

      if (error) throw error;

      // Fetch profiles for matched users
      const matchesWithProfiles = await Promise.all(
        (matchesData || []).map(async (match) => {
          const otherUserId = match.user1_id === user?.id ? match.user2_id : match.user1_id;
          
          const { data: profile } = await supabase
            .from("profiles")
            .select("id, name, age, avatar_url, city, is_online")
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
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold gradient-text">Your Matches</h1>
            <p className="text-muted-foreground">
              {matches.length} {matches.length === 1 ? "match" : "matches"}
            </p>
          </div>

          {matches.length === 0 ? (
            <Card className="glass-card p-8 text-center">
              <p className="text-muted-foreground">
                No matches yet. Keep swiping to find your perfect match!
              </p>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {matches.map((match, index) => (
                <Card
                  key={match.id}
                  className="glass-card overflow-hidden hover:scale-105 transition-transform cursor-pointer animate-scale-in"
                  style={{ animationDelay: `${index * 0.1}s` }}
                  onClick={() => handleChatClick(match.id)}
                >
                  <div className="relative">
                    <img
                      src={match.profile.avatar_url || defaultAvatar}
                      alt={match.profile.name}
                      className="w-full h-64 object-cover"
                    />
                    {match.profile.is_online && (
                      <div className="absolute top-4 right-4">
                        <Badge className="gradient-romantic text-white border-0">
                          Online
                        </Badge>
                      </div>
                    )}
                  </div>

                  <div className="p-4 space-y-3">
                    <div>
                      <h3 className="text-xl font-semibold">
                        {match.profile.name}, {match.profile.age}
                      </h3>
                      {match.profile.city && (
                        <p className="text-sm text-muted-foreground">{match.profile.city}</p>
                      )}
                    </div>

                    <button
                      className="w-full py-2 px-4 gradient-romantic text-white rounded-full flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                      onClick={() => handleChatClick(match.id)}
                    >
                      <MessageCircle className="w-4 h-4" />
                      Message
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Matches;
