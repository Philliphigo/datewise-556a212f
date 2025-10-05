import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogOut, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import defaultAvatar from "@/assets/default-avatar.jpg";

const Profile = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchProfile();
  }, [user, navigate]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user?.id)
        .single();

      if (error) throw error;
      setProfile(data);
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

  const handleSignOut = async () => {
    await signOut();
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
        <div className="max-w-2xl mx-auto space-y-6">
          <Card className="glass-card overflow-hidden animate-scale-in">
            <div className="relative h-48 gradient-romantic" />
            
            <div className="relative px-6 pb-6">
              <div className="absolute -top-16 left-6">
                <img
                  src={profile?.avatar_url || defaultAvatar}
                  alt={profile?.name}
                  className="w-32 h-32 rounded-full border-4 border-background object-cover"
                />
              </div>

              <div className="pt-20 space-y-4">
                <div>
                  <h1 className="text-3xl font-bold">
                    {profile?.name}, {profile?.age}
                  </h1>
                  <p className="text-muted-foreground">{profile?.city}</p>
                </div>

                {profile?.bio && <p className="text-foreground/80">{profile.bio}</p>}

                {profile?.interests && profile.interests.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {profile.interests.map((interest: string, idx: number) => (
                      <Badge key={idx} variant="secondary" className="glass">
                        {interest}
                      </Badge>
                    ))}
                  </div>
                )}

                {profile?.looking_for && (
                  <div className="text-sm text-muted-foreground">
                    Looking for: <span className="text-foreground">{profile.looking_for}</span>
                  </div>
                )}

                <Button
                  onClick={handleSignOut}
                  variant="outline"
                  className="w-full glass border-destructive/20 hover:border-destructive/40"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Profile;
