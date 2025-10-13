import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Heart, X, MapPin, Loader2, Filter, CheckCircle, MessageCircle, MoreVertical, Flag, Ban } from "lucide-react";
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
        <div className="max-w-md mx-auto space-y-4">
          {/* Filter Button */}
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="glass"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <Card className="glass-card p-4 space-y-4 animate-scale-in">
              <div className="space-y-2">
                <label className="text-sm font-medium">Gender</label>
                <Select value={genderFilter} onValueChange={setGenderFilter}>
                  <SelectTrigger className="glass">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Age Range</label>
                <Select value={ageFilter} onValueChange={setAgeFilter}>
                  <SelectTrigger className="glass">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Ages</SelectItem>
                    <SelectItem value="18-25">18-25</SelectItem>
                    <SelectItem value="26-35">26-35</SelectItem>
                    <SelectItem value="36+">36+</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={() => {
                  fetchProfiles();
                  setShowFilters(false);
                }}
                className="w-full gradient-romantic text-white"
              >
                Apply Filters
              </Button>
            </Card>
          )}

          <Card
            ref={cardRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className={`overflow-hidden animate-scale-in transition-transform duration-300 rounded-3xl shadow-2xl ${
              swipeDirection === 'left' ? '-translate-x-full opacity-0' : 
              swipeDirection === 'right' ? 'translate-x-full opacity-0' : ''
            }`}
          >
            {/* Profile Image with Overlay */}
            <div className="relative h-[600px]">
              <img
                src={currentProfile.avatar_url || defaultAvatar}
                alt={currentProfile.name}
                className="w-full h-full object-cover"
              />
              
              {/* Top Menu Icon */}
              <div className="absolute top-4 left-4 z-10">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="w-10 h-10 rounded-full glass hover:bg-white/20 backdrop-blur-lg"
                    >
                      <MoreVertical className="w-5 h-5 text-white" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-48 p-2 glass-card" align="start">
                    <div className="space-y-1">
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

              {/* Gradient Overlay at Bottom */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
              
              {/* Profile Info at Bottom */}
              <div className="absolute bottom-0 left-0 right-0 p-6 text-white space-y-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-4xl font-bold drop-shadow-lg">
                    {currentProfile.name}, {currentProfile.age}
                  </h2>
                  {currentProfile.verified && (
                    <CheckCircle className="w-7 h-7 text-primary drop-shadow-lg" fill="currentColor" />
                  )}
                </div>
                
                {currentProfile.looking_for && (
                  <p className="text-white/90 text-base drop-shadow-md">
                    Looking for: {currentProfile.looking_for}
                  </p>
                )}

                <div className="flex items-center gap-4 text-sm">
                  {currentProfile.city && (
                    <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full">
                      <MapPin className="w-4 h-4" />
                      <span>{currentProfile.city}</span>
                    </div>
                  )}
                  {currentProfile.interests && currentProfile.interests.length > 0 && (
                    <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full">
                      <Heart className="w-4 h-4" />
                      <span>{currentProfile.interests[0]}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="p-6 flex gap-4 justify-center items-center bg-background/50 backdrop-blur-sm">
              <Button
                size="lg"
                variant="ghost"
                className="rounded-full w-16 h-16 p-0 bg-white hover:bg-gray-100 shadow-lg hover:shadow-xl transition-all"
                onClick={handlePass}
                disabled={actionLoading}
              >
                <X className="w-8 h-8 text-red-500" />
              </Button>

              <Button
                size="lg"
                variant="ghost"
                className="rounded-full w-14 h-14 p-0 bg-white hover:bg-gray-100 shadow-lg hover:shadow-xl transition-all"
                onClick={handleMessage}
              >
                <MessageCircle className="w-6 h-6 text-blue-500" />
              </Button>

              <Button
                size="lg"
                className="gradient-romantic rounded-full w-16 h-16 p-0 shadow-lg glow-primary hover:scale-110 transition-all"
                onClick={handleLike}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <Loader2 className="w-8 h-8 animate-spin text-white" />
                ) : (
                  <Heart className="w-8 h-8 text-white" fill="currentColor" />
                )}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Discover;
