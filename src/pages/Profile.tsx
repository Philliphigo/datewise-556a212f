import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogOut, Loader2, MapPin, ChevronLeft, ChevronRight, Heart, Edit3, Image as ImageIcon, Crown, Star, Calendar, Sparkles } from "lucide-react";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useSearchParams } from "react-router-dom";
import defaultAvatar from "@/assets/default-avatar.jpg";
import { PhotoManager } from "@/components/profile/PhotoManager";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";

const Profile = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showPhotoManager, setShowPhotoManager] = useState(false);
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
      const profileId = viewedId || user?.id;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", profileId)
        .single();

      if (error) throw error;
      setProfile(data);

      // Fetch subscription if viewing own profile
      if (isOwnProfile && user) {
        const { data: subData } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .single();
        
        setSubscription(subData);
      }
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

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case "vip": return Crown;
      case "premium": return Star;
      default: return Heart;
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "vip": return "from-yellow-500 to-amber-600";
      case "premium": return "from-primary to-primary-soft";
      default: return "from-pink-500 to-rose-600";
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
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-muted-foreground animate-pulse-soft">Loading profile...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 pb-32 max-w-lg">
        <div className="space-y-5">
          {/* Profile Card - iOS 26 Style */}
          <div className="liquid-glass rounded-3xl overflow-hidden animate-spring-in card-glow">
            {/* Photo Gallery */}
            <div className="relative aspect-[3/4]">
              <img
                src={photos[currentPhotoIndex] || defaultAvatar}
                alt={profile?.name}
                className="w-full h-full object-cover transition-all duration-500"
              />
              
              {/* Photo Navigation */}
              {photos.length > 1 && (
                <>
                  <button
                    onClick={prevPhoto}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full liquid-glass-light flex items-center justify-center transition-all hover:bg-white/40 active:scale-95"
                  >
                    <ChevronLeft className="w-6 h-6 text-white" />
                  </button>
                  <button
                    onClick={nextPhoto}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full liquid-glass-light flex items-center justify-center transition-all hover:bg-white/40 active:scale-95"
                  >
                    <ChevronRight className="w-6 h-6 text-white" />
                  </button>
                  
                  {/* Photo Indicators - iOS 26 Style */}
                  <div className="absolute top-4 left-0 right-0 flex justify-center gap-1.5">
                    {photos.map((_: any, idx: number) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentPhotoIndex(idx)}
                        className={`h-1 rounded-full transition-all duration-300 ${
                          idx === currentPhotoIndex ? 'w-6 bg-white' : 'w-1.5 bg-white/50'
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}

              {/* Manage Photos Button - iOS 26 Style */}
              {isOwnProfile && (
                <button 
                  onClick={() => setShowPhotoManager(true)}
                  className="absolute bottom-4 right-4 z-20 w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-lg transition-all hover:scale-105 active:scale-95 touch-manipulation"
                >
                  <ImageIcon className="w-6 h-6 text-primary-foreground" />
                </button>
              )}

              {/* Gradient Overlay */}
              <div className="absolute inset-0 gradient-overlay-bottom pointer-events-none" />

              {/* Name Overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <div className="flex items-center gap-2.5 mb-1.5">
                  <h1 className="text-3xl font-bold text-white drop-shadow-lg">
                    {profile?.name}
                  </h1>
                  <span className="text-2xl text-white/85 font-light">{profile?.age}</span>
                  {profile?.verified && <VerifiedBadge size="lg" />}
                  {/* Subscription Tier Badge */}
                  {subscription && (
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full bg-gradient-to-r ${getTierColor(subscription.tier)} text-white text-xs font-semibold shadow-lg`}>
                      {(() => {
                        const TierIcon = getTierIcon(subscription.tier);
                        return <TierIcon className="w-3 h-3" />;
                      })()}
                      <span className="capitalize">{subscription.tier}</span>
                    </div>
                  )}
                </div>
                {profile?.city && (
                  <div className="flex items-center gap-1.5 text-white/85">
                    <MapPin className="w-4 h-4" />
                    <span className="text-sm">{profile.city}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Profile Details */}
            <div className="p-6 space-y-6">
              {/* Subscription Status Card */}
              {isOwnProfile && subscription && (
                <div className={`rounded-2xl p-4 bg-gradient-to-r ${getTierColor(subscription.tier)} text-white shadow-lg`}>
                  <div className="flex items-center gap-3 mb-3">
                    {(() => {
                      const TierIcon = getTierIcon(subscription.tier);
                      return <TierIcon className="w-8 h-8" />;
                    })()}
                    <div>
                      <h3 className="text-lg font-bold capitalize">{subscription.tier} Member</h3>
                      <div className="flex items-center gap-1 text-white/90 text-sm">
                        <Sparkles className="w-3 h-3" />
                        <span>Ad-free experience</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-white/90 text-sm">
                    <Calendar className="w-4 h-4" />
                    <span>
                      Expires: {format(new Date(subscription.end_date), "MMMM d, yyyy")}
                    </span>
                  </div>
                </div>
              )}

              {/* Upgrade prompt for free users */}
              {isOwnProfile && (!profile?.subscription_tier || profile.subscription_tier === 'free') && (
                <button
                  onClick={() => navigate('/donate')}
                  className="w-full rounded-2xl p-4 bg-gradient-to-r from-primary/10 to-primary-soft/10 border border-primary/20 text-left hover:bg-primary/15 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Crown className="w-6 h-6 text-primary" />
                      <div>
                        <h3 className="font-semibold text-foreground">Upgrade to Premium</h3>
                        <p className="text-sm text-muted-foreground">Get ad-free experience & more</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </button>
              )}

              {/* Bio */}
              {profile?.bio && (
                <div className="liquid-glass-light rounded-2xl p-4">
                  <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2 font-medium">About</h3>
                  <p className="text-foreground/90 leading-relaxed">{profile.bio}</p>
                </div>
              )}

              {/* Interests */}
              {profile?.interests && profile.interests.length > 0 && (
                <div>
                  <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-3 font-medium">Interests</h3>
                  <div className="flex flex-wrap gap-2">
                    {profile.interests.map((interest: string, idx: number) => (
                      <Badge 
                        key={idx} 
                        className="bg-primary/10 text-primary border-primary/20 px-4 py-2 rounded-full text-sm font-medium hover:bg-primary/20 transition-colors cursor-default"
                      >
                        {interest}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Looking For */}
              {profile?.looking_for && (
                <div className="liquid-glass-light rounded-2xl p-4">
                  <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2 font-medium">Looking For</h3>
                  <p className="text-foreground/90">{profile.looking_for}</p>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons - iOS 26 Style */}
          {isOwnProfile && (
            <div className="space-y-3">
              <Button
                onClick={() => navigate('/edit-profile')}
                className="w-full liquid-glass border-white/20 text-foreground hover:bg-white/10 rounded-2xl h-14 text-base font-medium transition-all active:scale-[0.98]"
                variant="outline"
              >
                <Edit3 className="w-5 h-5 mr-3" />
                Edit Profile
              </Button>
              
              <Button
                onClick={handleSignOut}
                variant="outline"
                className="w-full liquid-glass border-destructive/30 text-destructive hover:bg-destructive/10 rounded-2xl h-14 text-base font-medium transition-all active:scale-[0.98]"
              >
                <LogOut className="w-5 h-5 mr-3" />
                Sign Out
              </Button>
            </div>
          )}

          {/* Photo Manager Dialog */}
          <Dialog open={showPhotoManager} onOpenChange={setShowPhotoManager}>
            <DialogContent className="liquid-glass max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Manage Photos</DialogTitle>
              </DialogHeader>
              <PhotoManager
                userId={user?.id || ""}
                currentPhotos={profile?.photo_urls || []}
                avatarUrl={profile?.avatar_url}
                onUpdate={() => {
                  fetchProfile();
                  setShowPhotoManager(false);
                }}
              />
            </DialogContent>
          </Dialog>

        </div>
      </div>
    </Layout>
  );
};

export default Profile;
