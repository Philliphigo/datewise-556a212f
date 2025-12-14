import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Layout } from "@/components/Layout";
import { Heart, X, Loader2, CheckCircle, Star, RotateCcw, Zap, ChevronUp, ChevronDown, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import defaultAvatar from "@/assets/default-avatar.jpg";

interface Profile {
  id: string;
  name: string;
  age: number;
  bio: string | null;
  city: string | null;
  avatar_url: string | null;
  photo_urls: string[] | null;
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
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [touchStart, setTouchStart] = useState({ x: 0, y: 0 });
  const [touchDelta, setTouchDelta] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [history, setHistory] = useState<number[]>([]);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchProfiles();
  }, [user, navigate]);

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .neq("id", user?.id)
        .eq("onboarding_complete", true)
        .limit(20);

      if (error) throw error;
      setProfiles(data || []);
      setCurrentIndex(0);
      setCurrentPhotoIndex(0);
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
      }, 350);
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
    }, 350);
  };

  const handleSuperLike = async () => {
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
        title: "⭐ Super Liked!",
        description: `${currentProfile.name} will see you first!`,
      });

      setSwipeDirection('right');
      setTimeout(() => {
        setSwipeDirection(null);
        nextProfile();
      }, 350);
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

  const handleBoost = () => {
    toast({
      title: "⚡ Boost Activated",
      description: "Your profile is now boosted for 30 minutes!",
    });
  };

  const handleRewind = () => {
    if (history.length === 0) {
      toast({
        title: "No history",
        description: "No previous profiles to go back to",
      });
      return;
    }
    
    const prevIndex = history[history.length - 1];
    setHistory(prev => prev.slice(0, -1));
    setCurrentIndex(prevIndex);
    setCurrentPhotoIndex(0);
    setIsExpanded(false);
    
    toast({
      title: "Rewound!",
      description: "Gone back to previous profile",
    });
  };

  const nextProfile = () => {
    setHistory(prev => [...prev, currentIndex]);
    setCurrentPhotoIndex(0);
    setIsExpanded(false);
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
    setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const deltaX = e.touches[0].clientX - touchStart.x;
    const deltaY = e.touches[0].clientY - touchStart.y;
    setTouchDelta({ x: deltaX, y: deltaY });
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    
    if (Math.abs(touchDelta.x) > 80) {
      if (touchDelta.x > 0) {
        handleLike();
      } else {
        handlePass();
      }
    }
    
    setTouchDelta({ x: 0, y: 0 });
    setIsDragging(false);
  };

  const handlePhotoTap = (e: React.MouseEvent) => {
    if (isExpanded) return;
    
    const card = cardRef.current;
    if (!card) return;
    
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const photos = currentProfile?.photo_urls?.length 
      ? currentProfile.photo_urls 
      : [currentProfile?.avatar_url];
    const totalPhotos = photos.filter(Boolean).length;
    
    if (totalPhotos <= 1) return;
    
    if (x < rect.width / 2) {
      setCurrentPhotoIndex(prev => Math.max(0, prev - 1));
    } else {
      setCurrentPhotoIndex(prev => Math.min(totalPhotos - 1, prev + 1));
    }
  };

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
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
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] px-6 text-center">
          <div className="w-24 h-24 rounded-full liquid-glass flex items-center justify-center mb-6 animate-spring-in">
            <Heart className="w-12 h-12 text-primary" />
          </div>
          <h2 className="text-2xl font-bold mb-3">No More Profiles</h2>
          <p className="text-muted-foreground">
            Check back later for more potential matches!
          </p>
        </div>
      </Layout>
    );
  }

  const photos = currentProfile.photo_urls?.length 
    ? currentProfile.photo_urls 
    : [currentProfile.avatar_url || defaultAvatar];
  const currentPhoto = photos[currentPhotoIndex] || defaultAvatar;

  // Calculate card transform based on drag
  const cardStyle = isDragging && Math.abs(touchDelta.x) > 10 ? {
    transform: `translateX(${touchDelta.x * 0.5}px) rotate(${touchDelta.x * 0.03}deg)`,
    transition: 'none'
  } : {};

  return (
    <Layout>
      <div className="flex flex-col h-[calc(100vh-136px)] px-3">
        {/* Profile Card */}
        <div 
          ref={cardRef}
          className={`relative flex-1 profile-card overflow-hidden ${
            swipeDirection === 'left' ? 'animate-swipe-left' : 
            swipeDirection === 'right' ? 'animate-swipe-right' : 
            'animate-spring-in'
          } ${isExpanded ? 'expanded' : ''}`}
          style={cardStyle}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={handlePhotoTap}
        >
          {/* Photo Progress Indicators */}
          {photos.length > 1 && (
            <div className="absolute top-3 left-0 right-0 z-20 photo-progress">
              {photos.map((_, idx) => (
                <div 
                  key={idx} 
                  className={`photo-progress-segment ${idx === currentPhotoIndex ? 'active' : 'inactive'}`}
                />
              ))}
            </div>
          )}

          {/* Profile Photo */}
          <img
            src={currentPhoto}
            alt={currentProfile.name}
            className={`absolute inset-0 w-full h-full object-cover transition-transform duration-500 ${isExpanded ? 'scale-110' : ''}`}
          />

          {/* Like/Pass Overlays */}
          {isDragging && touchDelta.x > 50 && (
            <div className="absolute inset-0 bg-success/20 flex items-center justify-center z-30 animate-fade-in">
              <div className="w-20 h-20 rounded-full bg-success/80 flex items-center justify-center">
                <Heart className="w-10 h-10 text-white fill-white" />
              </div>
            </div>
          )}
          {isDragging && touchDelta.x < -50 && (
            <div className="absolute inset-0 bg-destructive/20 flex items-center justify-center z-30 animate-fade-in">
              <div className="w-20 h-20 rounded-full bg-destructive/80 flex items-center justify-center">
                <X className="w-10 h-10 text-white" strokeWidth={3} />
              </div>
            </div>
          )}

          {/* Gradient Overlay */}
          <div className={`absolute inset-0 pointer-events-none transition-opacity duration-300 ${isExpanded ? 'bg-black/60' : 'gradient-overlay-bottom'}`} />

          {/* Profile Info */}
          <div className={`absolute bottom-0 left-0 right-0 z-10 transition-all duration-500 ease-out ${isExpanded ? 'h-[70%] overflow-y-auto' : ''}`}>
            <div className="p-5">
              {/* Name, Age, Verified */}
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-3xl font-bold text-white tracking-tight">
                  {currentProfile.name}
                </h2>
                <span className="text-2xl font-light text-white/90">{currentProfile.age}</span>
                {currentProfile.verified && (
                  <CheckCircle className="w-6 h-6 text-info fill-info" />
                )}
              </div>

              {/* Location */}
              {currentProfile.city && (
                <div className="flex items-center gap-1.5 text-white/80 text-sm mb-3">
                  <MapPin className="w-4 h-4" />
                  <span>{currentProfile.city}</span>
                </div>
              )}

              {/* Bio Preview */}
              {!isExpanded && currentProfile.bio && (
                <p className="text-white/90 text-sm leading-relaxed line-clamp-2">
                  "{currentProfile.bio}"
                </p>
              )}

              {/* Expanded Content */}
              {isExpanded && (
                <div className="space-y-4 animate-float-up">
                  {/* Full Bio */}
                  {currentProfile.bio && (
                    <div>
                      <h3 className="text-white/60 text-xs uppercase tracking-wider mb-2">About</h3>
                      <p className="text-white text-sm leading-relaxed">
                        {currentProfile.bio}
                      </p>
                    </div>
                  )}

                  {/* Interests */}
                  {currentProfile.interests && currentProfile.interests.length > 0 && (
                    <div>
                      <h3 className="text-white/60 text-xs uppercase tracking-wider mb-2">Interests</h3>
                      <div className="flex flex-wrap gap-2">
                        {currentProfile.interests.map((interest, idx) => (
                          <Badge 
                            key={idx} 
                            className="bg-white/20 text-white border-white/30 backdrop-blur-sm px-3 py-1"
                          >
                            {interest}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Looking For */}
                  {currentProfile.looking_for && (
                    <div>
                      <h3 className="text-white/60 text-xs uppercase tracking-wider mb-2">Looking For</h3>
                      <p className="text-white text-sm">{currentProfile.looking_for}</p>
                    </div>
                  )}

                  {/* Gender */}
                  <div>
                    <h3 className="text-white/60 text-xs uppercase tracking-wider mb-2">Gender</h3>
                    <p className="text-white text-sm capitalize">{currentProfile.gender}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Expand Button */}
            <button 
              onClick={toggleExpand}
              className="absolute right-5 bottom-5 w-11 h-11 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 transition-all duration-300 hover:bg-white/30 active:scale-95 z-20"
            >
              {isExpanded ? (
                <ChevronDown className="w-5 h-5 text-white" />
              ) : (
                <ChevronUp className="w-5 h-5 text-white" />
              )}
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-4 py-4">
          {/* Rewind */}
          <button 
            onClick={handleRewind}
            className="action-btn action-btn-rewind w-12 h-12 haptic-light"
          >
            <RotateCcw className="w-5 h-5 text-warning" />
          </button>

          {/* Pass */}
          <button 
            className="action-btn action-btn-pass w-14 h-14 haptic-medium"
            onClick={handlePass}
          >
            <X className="w-7 h-7 text-destructive" strokeWidth={3} />
          </button>

          {/* Super Like */}
          <button 
            onClick={handleSuperLike}
            disabled={actionLoading}
            className="action-btn action-btn-star w-12 h-12 haptic-light"
          >
            <Star className="w-5 h-5 text-star fill-star" />
          </button>

          {/* Like */}
          <button 
            className="action-btn action-btn-like w-14 h-14 haptic-medium"
            onClick={handleLike}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <Loader2 className="w-7 h-7 animate-spin text-success" />
            ) : (
              <Heart className="w-7 h-7 text-success fill-success" />
            )}
          </button>

          {/* Boost */}
          <button 
            onClick={handleBoost}
            className="action-btn action-btn-boost w-12 h-12 haptic-light"
          >
            <Zap className="w-5 h-5 text-boost fill-boost" />
          </button>
        </div>
      </div>
    </Layout>
  );
};

export default Discover;
