import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogOut, Loader2, Image as ImageIcon, CheckCircle, MapPin, Settings, ChevronLeft, ChevronRight, Heart } from "lucide-react";
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
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [searchParams] = useSearchParams();
  const viewedId = searchParams.get("user");
  const isOwnProfile = !viewedId || viewedId === user?.id;

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchProfile();
  }, [user, navigate, viewedId]);

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
        description: "Profile picture updated",
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

  const photos = profile?.photo_urls?.length 
    ? profile.photo_urls 
    : [profile?.avatar_url || defaultAvatar];

  const nextPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev + 1) % photos.length);
  };

  const prevPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev - 1 + photos.length) % photos.length);
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
      <div className="container mx-auto px-4 py-6 pb-28 max-w-lg">
        <div className="space-y-6">
          {/* Profile Card */}
          <div className="liquid-glass rounded-3xl overflow-hidden animate-spring-in">
            {/* Photo Gallery */}
            <div className="relative aspect-[3/4]">
              <img
                src={photos[currentPhotoIndex] || defaultAvatar}
                alt={profile?.name}
                className="w-full h-full object-cover"
              />
              
              {/* Photo Navigation */}
              {photos.length > 1 && (
                <>
                  <button
                    onClick={prevPhoto}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center transition-all hover:bg-black/50 active:scale-95"
                  >
                    <ChevronLeft className="w-6 h-6 text-white" />
                  </button>
                  <button
                    onClick={nextPhoto}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center transition-all hover:bg-black/50 active:scale-95"
                  >
                    <ChevronRight className="w-6 h-6 text-white" />
                  </button>
                  
                  {/* Photo Indicators */}
                  <div className="absolute top-4 left-0 right-0 flex justify-center gap-1.5">
                    {photos.map((_, idx) => (
                      <div
                        key={idx}
                        className={`h-1 rounded-full transition-all ${
                          idx === currentPhotoIndex ? 'w-6 bg-white' : 'w-1.5 bg-white/50'
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}

              {/* Upload Button */}
              {isOwnProfile && (
                <label className="absolute bottom-4 right-4 cursor-pointer">
                  <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-lg transition-all hover:scale-105 active:scale-95">
                    <ImageIcon className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                  />
                </label>
              )}

              {/* Gradient Overlay */}
              <div className="absolute inset-0 gradient-overlay-bottom pointer-events-none" />

              {/* Name Overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-3xl font-bold text-white">
                    {profile?.name}
                  </h1>
                  <span className="text-2xl text-white/80">{profile?.age}</span>
                  {profile?.verified && (
                    <CheckCircle className="w-6 h-6 text-info fill-info" />
                  )}
                </div>
                {profile?.city && (
                  <div className="flex items-center gap-1.5 text-white/80">
                    <MapPin className="w-4 h-4" />
                    <span>{profile.city}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Profile Details */}
            <div className="p-6 space-y-6">
              {/* Subscription Badge */}
              {profile?.subscription_tier && profile.subscription_tier !== 'free' && (
                <div className="flex justify-center">
                  <Badge className="bg-primary/10 text-primary border-primary/20 px-4 py-1.5 text-sm font-medium">
                    <Heart className="w-4 h-4 mr-1.5 fill-primary" />
                    {profile.subscription_tier.toUpperCase()} Member
                  </Badge>
                </div>
              )}

              {/* Bio */}
              {profile?.bio && (
                <div>
                  <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">About</h3>
                  <p className="text-foreground/90 leading-relaxed">{profile.bio}</p>
                </div>
              )}

              {/* Interests */}
              {profile?.interests && profile.interests.length > 0 && (
                <div>
                  <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Interests</h3>
                  <div className="flex flex-wrap gap-2">
                    {profile.interests.map((interest: string, idx: number) => (
                      <Badge 
                        key={idx} 
                        className="bg-white/10 text-foreground border-white/20 px-3 py-1.5"
                      >
                        {interest}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Looking For */}
              {profile?.looking_for && (
                <div>
                  <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Looking For</h3>
                  <p className="text-foreground/90">{profile.looking_for}</p>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          {isOwnProfile && (
            <div className="space-y-3 animate-float-up" style={{ animationDelay: '0.1s' }}>
              <Button
                onClick={() => navigate('/settings')}
                className="w-full liquid-glass border-white/10 text-foreground hover:bg-white/10 rounded-2xl h-14"
                variant="outline"
              >
                <Settings className="w-5 h-5 mr-2" />
                Edit Profile
              </Button>
              
              <Button
                onClick={handleSignOut}
                variant="outline"
                className="w-full liquid-glass border-destructive/20 text-destructive hover:bg-destructive/10 rounded-2xl h-14"
              >
                <LogOut className="w-5 h-5 mr-2" />
                Sign Out
              </Button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Profile;
