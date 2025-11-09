import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Heart, X, MapPin, Loader2, Filter, CheckCircle, MessageCircle, Info, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { ReportDialog } from "@/components/ReportDialog";
import { BlockButton } from "@/components/BlockButton";
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
  verified: boolean | null;
  gender: string;
}

const Discover = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [ageFilter, setAgeFilter] = useState("all");
  const [genderFilter, setGenderFilter] = useState("all");
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchProfiles();
  }, [user, navigate]);

  const fetchProfiles = async () => {
    try {
      let query = supabase
        .from("profiles")
        .select("*")
        .neq("id", user?.id)
        .eq("onboarding_complete", true);

      // Apply filters
      if (genderFilter !== "all") {
        query = query.eq("gender", genderFilter);
      }

      if (ageFilter === "18-25") {
        query = query.gte("age", 18).lte("age", 25);
      } else if (ageFilter === "26-35") {
        query = query.gte("age", 26).lte("age", 35);
      } else if (ageFilter === "36+") {
        query = query.gte("age", 36);
      }

      const { data, error } = await query.limit(20);

      if (error) throw error;
      setProfiles(data || []);
      setCurrentIndex(0);
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
    setSwipeDirection('right');

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

      setTimeout(() => {
        setSwipeDirection(null);
        nextProfile();
      }, 300);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setSwipeDirection(null);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePass = () => {
    setSwipeDirection('left');
    setTimeout(() => {
      setSwipeDirection(null);
      nextProfile();
    }, 300);
  };

  const handleMessage = async () => {
    if (!user) return;
    const currentProfile = profiles[currentIndex];
    if (!currentProfile) return;

    // Check if already matched
    const { data: existingMatch } = await supabase
      .from("matches")
      .select("*")
      .or(`and(user1_id.eq.${user.id},user2_id.eq.${currentProfile.id}),and(user1_id.eq.${currentProfile.id},user2_id.eq.${user.id})`)
      .single();

    if (existingMatch) {
      navigate(`/messages?match=${existingMatch.id}`);
    } else {
      toast({
        title: "Not matched yet",
        description: "You need to match with this person first to send a message",
      });
    }
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

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;
    
    if (isLeftSwipe) {
      handlePass();
    }
    if (isRightSwipe) {
      handleLike();
    }
    
    setTouchStart(0);
    setTouchEnd(0);
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
        <div className="max-w-sm mx-auto space-y-4 px-2">

          <Card
            ref={cardRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className={`overflow-hidden neomorph-card p-0 ${
              swipeDirection === 'left' ? 'animate-swipe-left' : 
              swipeDirection === 'right' ? 'animate-swipe-right' : 
              'animate-spring-in'
            }`}
          >
            {/* Profile Image with Overlay */}
            <div className="relative h-[520px]">
              <img
                src={currentProfile.avatar_url || defaultAvatar}
                alt={currentProfile.name}
                className="w-full h-full object-cover"
              />
              

              {/* Gradient Overlay at Bottom */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
              
              {/* Info Icon - Top Left */}
              <div className="absolute top-6 left-6 z-10">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="w-14 h-14 rounded-full neomorph-card bg-card/80 hover:bg-card backdrop-blur-md"
                    >
                      <Info className="w-5 h-5 text-primary" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-52 p-3 neomorph-card" align="start">
                    <div className="space-y-1">
                      <Button
                        variant="ghost"
                        className="w-full justify-start rounded-xl"
                        onClick={() => navigate(`/profile?user=${currentProfile.id}`)}
                      >
                        <User className="w-4 h-4 mr-2" />
                        View Profile
                      </Button>
                      <ReportDialog
                        reportedUserId={currentProfile.id}
                        reportedUserName={currentProfile.name}
                      />
                      <BlockButton
                        blockedUserId={currentProfile.id}
                        blockedUserName={currentProfile.name}
                        onBlock={nextProfile}
                      />
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              
              {/* Profile Info - All Inside Card */}
              <div className="absolute bottom-0 left-0 right-0 p-6">
                {/* Name and Verified Badge */}
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="text-3xl font-bold text-white">
                    {currentProfile.name}, {currentProfile.age}
                  </h2>
                  {currentProfile.verified && (
                    <CheckCircle className="w-6 h-6 text-blue-500 fill-blue-500" />
                  )}
                </div>
                
                {/* Bio */}
                {currentProfile.bio && (
                  <p className="text-white/90 text-sm leading-relaxed mb-12">
                    {currentProfile.bio}
                  </p>
                )}
                
                {/* Action Buttons */}
                <div className="flex items-center justify-center gap-8 pt-6">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-20 h-20 rounded-full neomorph-card bg-card/90 hover:bg-card active:scale-95 transition-all"
                    onClick={handlePass}
                  >
                    <X className="w-7 h-7 text-destructive" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-20 h-20 rounded-full neomorph-card bg-card/90 hover:bg-card active:scale-95 transition-all"
                    onClick={handleMessage}
                  >
                    <MessageCircle className="w-7 h-7 text-muted-foreground" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-20 h-20 rounded-full neomorph-card bg-primary/10 hover:bg-primary/20 glow-primary active:scale-95 transition-all"
                    onClick={handleLike}
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <Loader2 className="w-7 h-7 animate-spin text-primary" />
                    ) : (
                      <Heart className="w-7 h-7 text-primary fill-primary" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Discover;
