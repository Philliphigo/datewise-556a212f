import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogOut, Loader2, Image as ImageIcon, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useSearchParams } from "react-router-dom";
import defaultAvatar from "@/assets/default-avatar.jpg";

const Profile = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const viewedId = searchParams.get("user");

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
        .eq("id", viewedId || user?.id)
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

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: data.publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      toast({
        title: "Success",
        description: "Profile picture updated successfully",
      });

      fetchProfile();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
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
          <Card className="neomorph-card overflow-hidden animate-spring-in">
            <div className="relative h-56 gradient-romantic" />
            
            <div className="relative px-8 pb-8">
              <div className="absolute -top-20 left-8 group">
                <img
                  src={profile?.avatar_url || defaultAvatar}
                  alt={profile?.name}
                  className="w-40 h-40 rounded-full border-[6px] border-background object-cover shadow-elegant-lg"
                />
                {(!viewedId || viewedId === user?.id) && (
                  <label className="absolute bottom-0 right-0 cursor-pointer">
                    <div className="w-12 h-12 rounded-full neomorph-card bg-primary flex items-center justify-center hover:bg-primary/90 transition-all glow-primary active:scale-95">
                      <ImageIcon className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarUpload}
                    />
                  </label>
                )}
              </div>

              <div className="pt-24 space-y-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="text-3xl font-bold">
                        {profile?.name}, {profile?.age}
                      </h1>
                      {profile?.verified && (
                        <CheckCircle className="w-6 h-6 text-primary fill-primary" />
                      )}
                    </div>
                    <p className="text-muted-foreground">{profile?.city}</p>
                  </div>
                  {profile?.subscription_tier && profile.subscription_tier !== 'free' && (
                    <Badge className="neomorph-card bg-primary text-primary-foreground glow-primary">
                      {profile.subscription_tier.toUpperCase()}
                    </Badge>
                  )}
                </div>

                {profile?.bio && <p className="text-foreground/80">{profile.bio}</p>}

                {profile?.interests && profile.interests.length > 0 && (
                  <div className="flex flex-wrap gap-3">
                    {profile.interests.map((interest: string, idx: number) => (
                      <Badge key={idx} className="neomorph-card bg-accent px-4 py-2">
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

                {(!viewedId || viewedId === user?.id) && (
                  <Button
                    onClick={handleSignOut}
                    variant="outline"
                    className="w-full neomorph-card border-0 text-destructive hover:bg-destructive/10 active:scale-[0.98] transition-all"
                  >
                    <LogOut className="w-5 h-5 mr-2" />
                    Sign Out
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Profile;
