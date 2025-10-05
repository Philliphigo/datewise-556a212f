import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, X, MapPin, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import defaultAvatar from "@/assets/default-avatar.jpg";

interface Profile {
  id: string;
  name: string;
  age: number;
  bio: string | null;
  city: string | null;
  avatar_url: string | null;
  interests: string[] | null;
  looking_for: string | null;
}

const Discover = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchProfiles();
  }, [user, navigate]);

  const fetchProfiles = async () => {
    try {
      // Get profiles except current user
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .neq("id", user?.id)
        .eq("onboarding_complete", true)
        .limit(20);

      if (error) throw error;
      setProfiles(data || []);
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

  const handleLike = async () => {
    if (!user || actionLoading) return;
    const currentProfile = profiles[currentIndex];
    if (!currentProfile) return;

    setActionLoading(true);

    try {
      const { error } = await supabase.from("likes").insert({
        liker_id: user.id,
        liked_id: currentProfile.id,
      });

      if (error) throw error;

      toast({
        title: "Liked!",
        description: `You liked ${currentProfile.name}`,
      });

      nextProfile();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handlePass = () => {
    nextProfile();
  };

  const nextProfile = () => {
    if (currentIndex < profiles.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      toast({
        title: "No more profiles",
        description: "Check back later for more matches!",
      });
    }
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

  const currentProfile = profiles[currentIndex];

  if (!currentProfile) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto text-center space-y-4">
            <Heart className="w-16 h-16 mx-auto text-muted-foreground" />
            <h2 className="text-2xl font-semibold">No More Profiles</h2>
            <p className="text-muted-foreground">
              Check back later for more potential matches!
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <Card className="glass-card overflow-hidden animate-scale-in">
            {/* Profile Image */}
            <div className="relative h-96 bg-gradient-to-b from-muted to-background">
              <img
                src={currentProfile.avatar_url || defaultAvatar}
                alt={currentProfile.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
              
              {/* Profile Info Overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                <h2 className="text-3xl font-bold mb-2">
                  {currentProfile.name}, {currentProfile.age}
                </h2>
                {currentProfile.city && (
                  <div className="flex items-center gap-2 text-sm opacity-90">
                    <MapPin className="w-4 h-4" />
                    {currentProfile.city}
                  </div>
                )}
              </div>
            </div>

            {/* Profile Details */}
            <div className="p-6 space-y-4">
              {currentProfile.bio && (
                <p className="text-foreground/80">{currentProfile.bio}</p>
              )}

              {currentProfile.interests && currentProfile.interests.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {currentProfile.interests.map((interest, idx) => (
                    <Badge key={idx} variant="secondary" className="glass">
                      {interest}
                    </Badge>
                  ))}
                </div>
              )}

              {currentProfile.looking_for && (
                <div className="text-sm text-muted-foreground">
                  Looking for: <span className="text-foreground">{currentProfile.looking_for}</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="p-6 pt-0 flex gap-4 justify-center">
              <Button
                size="lg"
                variant="outline"
                className="glass border-2 border-destructive/20 hover:border-destructive/40 rounded-full w-16 h-16 p-0"
                onClick={handlePass}
                disabled={actionLoading}
              >
                <X className="w-8 h-8 text-destructive" />
              </Button>

              <Button
                size="lg"
                className="gradient-romantic text-white rounded-full w-16 h-16 p-0 glow-primary"
                onClick={handleLike}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <Loader2 className="w-8 h-8 animate-spin" />
                ) : (
                  <Heart className="w-8 h-8" fill="currentColor" />
                )}
              </Button>
            </div>
          </Card>

          <div className="text-center mt-4 text-sm text-muted-foreground">
            {currentIndex + 1} of {profiles.length}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Discover;
