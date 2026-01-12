import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Layout } from "@/components/Layout";
import { Heart, X, Loader2, Star, RotateCcw, MessageCircle, ChevronUp, ChevronDown, MapPin } from "lucide-react";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { PullToRefreshIndicator, PullToRefreshContainer } from "@/components/PullToRefresh";
import { DiscoverAd } from "@/components/DiscoverAd";
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
  const [velocity, setVelocity] = useState(0);
  const lastTouchTime = useRef(Date.now());
  const lastTouchX = useRef(0);

  const fetchProfiles = useCallback(async () => {
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
  }, [user?.id, toast]);

  // Pull to refresh
  const handleRefresh = useCallback(async () => {
    await fetchProfiles();
    toast({
      title: "Refreshed!",
      description: "New profiles loaded",
    });
  }, [fetchProfiles, toast]);

  const {
    containerRef,
    pullDistance,
    isRefreshing,
    isTriggered,
    progress,
    handlers,
  } = usePullToRefresh({
    onRefresh: handleRefresh,
    threshold: 80,
  });

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchProfiles();
  }, [user, navigate, fetchProfiles]);

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

  const handleMessage = () => {
    navigate("/messages");
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
    if (isExpanded) return;
    const touch = e.touches[0];
    setTouchStart({ x: touch.clientX, y: touch.clientY });
    setIsDragging(true);
    lastTouchTime.current = Date.now();
    lastTouchX.current = touch.clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || isExpanded) return;
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStart.x;
    const deltaY = touch.clientY - touchStart.y;
    
    // Calculate velocity for flick detection
    const now = Date.now();
    const dt = now - lastTouchTime.current;
    if (dt > 0) {
      const dx = touch.clientX - lastTouchX.current;
      setVelocity(dx / dt);
    }
    lastTouchTime.current = now;
    lastTouchX.current = touch.clientX;
    
    setTouchDelta({ x: deltaX, y: deltaY });
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    
    // Check for swipe with velocity or distance
    const swipeThreshold = 80;
    const velocityThreshold = 0.5;
    
    if (Math.abs(touchDelta.x) > swipeThreshold || Math.abs(velocity) > velocityThreshold) {
      if (touchDelta.x > 0 || velocity > velocityThreshold) {
        handleLike();
      } else {
        handlePass();
      }
    }
    
    setTouchDelta({ x: 0, y: 0 });
    setIsDragging(false);
    setVelocity(0);
  };

  // Mouse drag support for desktop
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isExpanded) return;
    setTouchStart({ x: e.clientX, y: e.clientY });
    setIsDragging(true);
    lastTouchTime.current = Date.now();
    lastTouchX.current = e.clientX;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || isExpanded) return;
    const deltaX = e.clientX - touchStart.x;
    const deltaY = e.clientY - touchStart.y;
    
    const now = Date.now();
    const dt = now - lastTouchTime.current;
    if (dt > 0) {
      const dx = e.clientX - lastTouchX.current;
      setVelocity(dx / dt);
    }
    lastTouchTime.current = now;
    lastTouchX.current = e.clientX;
    
    setTouchDelta({ x: deltaX, y: deltaY });
  };

  const handleMouseUp = () => {
    handleTouchEnd();
  };

  const handleMouseLeave = () => {
    if (isDragging) {
      setTouchDelta({ x: 0, y: 0 });
      setIsDragging(false);
      setVelocity(0);
    }
  };

  const handlePhotoTap = (e: React.MouseEvent) => {
    if (isExpanded || isDragging) return;
    if (Math.abs(touchDelta.x) > 5) return; // Ignore if swiping
    
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
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-muted-foreground animate-pulse-soft">Finding matches...</p>
          </div>
        </div>
      </Layout>
    );
  }

  const currentProfile = profiles[currentIndex];

  if (!currentProfile) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] px-6 text-center">
          <div className="w-28 h-28 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-6 animate-bounce-in shadow-lg">
            <Heart className="w-14 h-14 text-primary animate-pulse-soft" />
          </div>
          <h2 className="text-2xl font-bold mb-3 animate-float-up">No More Profiles</h2>
          <p className="text-muted-foreground animate-float-up" style={{ animationDelay: '0.1s' }}>
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

  // Calculate card transform based on drag with easing
  const dragProgress = Math.min(Math.abs(touchDelta.x) / 150, 1);
  const rotation = touchDelta.x * 0.08 * (1 - dragProgress * 0.3); // Reduce rotation at edges
  const scale = 1 - dragProgress * 0.05;
  
  const cardStyle = isDragging && Math.abs(touchDelta.x) > 5 ? {
    transform: `translateX(${touchDelta.x}px) rotate(${rotation}deg) scale(${scale})`,
    transition: 'none',
    cursor: 'grabbing'
  } : {
    transition: 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    cursor: 'grab'
  };

  // Overlay opacity based on swipe distance
  const likeOpacity = Math.min(touchDelta.x / 100, 1);
  const passOpacity = Math.min(-touchDelta.x / 100, 1);

  return (
    <Layout>
      <div 
        ref={containerRef}
        className="relative flex flex-col h-[calc(100vh-136px)] px-3 overflow-hidden"
        {...handlers}
      >
        {/* Pull to Refresh Indicator */}
        <PullToRefreshIndicator 
          pullDistance={pullDistance}
          isRefreshing={isRefreshing}
          isTriggered={isTriggered}
          progress={progress}
        />
        
        {/* Profile Card with smooth drag */}
        <div 
          ref={cardRef}
          className={`relative flex-1 rounded-3xl overflow-hidden shadow-2xl select-none ${
            swipeDirection === 'left' ? 'animate-swipe-left' : 
            swipeDirection === 'right' ? 'animate-swipe-right' : 
            'animate-spring-in'
          } ${isExpanded ? 'expanded' : ''}`}
          style={{
            ...cardStyle,
            transform: pullDistance > 0 
              ? `translateY(${pullDistance * 0.3}px) ${cardStyle.transform || ''}` 
              : cardStyle.transform,
          }}
          onTouchStart={(e) => {
            if (pullDistance === 0) handleTouchStart(e);
          }}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onClick={handlePhotoTap}
        >
          {/* Ad Banner for Free Users */}
          <DiscoverAd />

          {/* Photo Progress Indicators */}
          {photos.length > 1 && (
            <div className="absolute top-16 left-4 right-4 z-20 flex gap-1.5">
              {photos.map((_, idx) => (
                <div 
                  key={idx} 
                  className={`flex-1 h-1 rounded-full transition-all duration-300 ${
                    idx === currentPhotoIndex 
                      ? 'bg-white shadow-sm' 
                      : 'bg-white/40'
                  }`}
                />
              ))}
            </div>
          )}

          {/* Profile Photo */}
          <img
            src={currentPhoto}
            alt={currentProfile.name}
            className={`absolute inset-0 w-full h-full object-cover transition-transform duration-500 ${isExpanded ? 'scale-105 blur-[2px]' : ''}`}
            draggable={false}
          />

          {/* Like Overlay - Smooth gradient reveal */}
          <div 
            className="absolute inset-0 bg-gradient-to-l from-success/0 via-success/0 to-success/40 flex items-center justify-start pl-8 z-30 pointer-events-none"
            style={{ opacity: Math.max(0, likeOpacity) }}
          >
            <div 
              className="w-20 h-20 rounded-full bg-success/90 flex items-center justify-center shadow-2xl"
              style={{ 
                transform: `scale(${0.5 + likeOpacity * 0.5})`,
                opacity: likeOpacity
              }}
            >
              <Heart className="w-10 h-10 text-white fill-white" />
            </div>
          </div>

          {/* Pass Overlay - Smooth gradient reveal */}
          <div 
            className="absolute inset-0 bg-gradient-to-r from-destructive/0 via-destructive/0 to-destructive/40 flex items-center justify-end pr-8 z-30 pointer-events-none"
            style={{ opacity: Math.max(0, passOpacity) }}
          >
            <div 
              className="w-20 h-20 rounded-full bg-destructive/90 flex items-center justify-center shadow-2xl"
              style={{ 
                transform: `scale(${0.5 + passOpacity * 0.5})`,
                opacity: passOpacity
              }}
            >
              <X className="w-10 h-10 text-white" strokeWidth={3} />
            </div>
          </div>

          {/* Gradient Overlay */}
          <div className={`absolute inset-0 pointer-events-none transition-all duration-400 ${
            isExpanded 
              ? 'bg-black/70' 
              : 'bg-gradient-to-t from-black/80 via-black/20 to-transparent'
          }`} />

          {/* Profile Info */}
          <div className={`absolute bottom-0 left-0 right-0 z-10 transition-all duration-500 ease-out ${isExpanded ? 'h-[75%] overflow-y-auto' : ''}`}>
            <div className="p-5">
              {/* Name, Age, Verified */}
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-3xl font-bold text-white tracking-tight drop-shadow-lg">
                  {currentProfile.name}
                </h2>
                <span className="text-2xl font-light text-white/90">{currentProfile.age}</span>
                {currentProfile.verified && <VerifiedBadge size="lg" />}
              </div>

              {/* Location */}
              {currentProfile.city && (
                <div className="flex items-center gap-1.5 text-white/85 text-sm mb-3">
                  <MapPin className="w-4 h-4" strokeWidth={1.5} />
                  <span>{currentProfile.city}</span>
                </div>
              )}

              {/* Bio Preview */}
              {!isExpanded && currentProfile.bio && (
                <p className="text-white/90 text-sm leading-relaxed line-clamp-2 drop-shadow">
                  "{currentProfile.bio}"
                </p>
              )}

              {/* Expanded Content */}
              {isExpanded && (
                <div className="space-y-5 animate-float-up">
                  {/* Full Bio */}
                  {currentProfile.bio && (
                    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
                      <h3 className="text-white/60 text-xs uppercase tracking-wider mb-2 font-medium">About</h3>
                      <p className="text-white text-sm leading-relaxed">
                        {currentProfile.bio}
                      </p>
                    </div>
                  )}

                  {/* Interests */}
                  {currentProfile.interests && currentProfile.interests.length > 0 && (
                    <div>
                      <h3 className="text-white/60 text-xs uppercase tracking-wider mb-3 font-medium">Interests</h3>
                      <div className="flex flex-wrap gap-2">
                        {currentProfile.interests.map((interest, idx) => (
                          <Badge 
                            key={idx} 
                            className="bg-white/15 text-white border-white/25 backdrop-blur-sm px-3.5 py-1.5 rounded-full text-sm"
                          >
                            {interest}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Looking For */}
                  {currentProfile.looking_for && (
                    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
                      <h3 className="text-white/60 text-xs uppercase tracking-wider mb-2 font-medium">Looking For</h3>
                      <p className="text-white text-sm">{currentProfile.looking_for}</p>
                    </div>
                  )}

                  {/* Gender */}
                  <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
                    <h3 className="text-white/60 text-xs uppercase tracking-wider mb-2 font-medium">Gender</h3>
                    <p className="text-white text-sm capitalize">{currentProfile.gender}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Expand Button */}
            <button 
              onClick={toggleExpand}
              className="absolute right-5 bottom-5 w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center transition-all duration-300 active:scale-90 hover:bg-white/30 z-20"
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
        <div className="flex items-center justify-center gap-4 py-5">
          {/* Rewind */}
          <button 
            onClick={handleRewind}
            className="w-12 h-12 rounded-full bg-card shadow-lg flex items-center justify-center transition-all hover:scale-110 active:scale-95 border border-border/50"
          >
            <RotateCcw className="w-5 h-5 text-warning" strokeWidth={1.5} />
          </button>

          {/* Pass */}
          <button 
            className="w-16 h-16 rounded-full bg-card shadow-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 border-2 border-destructive/20"
            onClick={handlePass}
          >
            <X className="w-8 h-8 text-destructive" strokeWidth={2} />
          </button>

          {/* Super Like */}
          <button 
            onClick={handleSuperLike}
            disabled={actionLoading}
            className="w-12 h-12 rounded-full bg-card shadow-lg flex items-center justify-center transition-all hover:scale-110 active:scale-95 border border-border/50"
          >
            <Star className="w-5 h-5 text-star fill-star" strokeWidth={1.5} />
          </button>

          {/* Like */}
          <button 
            className="w-16 h-16 rounded-full bg-gradient-to-br from-success to-emerald-500 shadow-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95"
            onClick={handleLike}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <Loader2 className="w-8 h-8 animate-spin text-white" />
            ) : (
              <Heart className="w-8 h-8 text-white fill-white" />
            )}
          </button>

          {/* Message */}
          <button 
            onClick={handleMessage}
            className="w-12 h-12 rounded-full bg-card shadow-lg flex items-center justify-center transition-all hover:scale-110 active:scale-95 border border-border/50"
          >
            <MessageCircle className="w-5 h-5 text-boost" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </Layout>
  );
};

export default Discover;