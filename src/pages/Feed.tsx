import { useState, useEffect, useCallback, useMemo, memo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar } from "@/components/ui/avatar";
import { Heart, MessageCircle, Send, Loader2, Image, MoreVertical, Trash2, Plus, X, Compass } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PostReactions } from "@/components/PostReactions";
import { FeedCategories } from "@/components/FeedCategories";
import { useNavigate } from "react-router-dom";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { PullToRefreshIndicator } from "@/components/PullToRefresh";
import { AdPlaceholder } from "@/components/AdPlaceholder";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import defaultAvatar from "@/assets/default-avatar.jpg";
import { formatDistanceToNow } from "date-fns";

interface Post {
  id: string;
  content: string;
  image_url: string | null;
  created_at: string;
  likes_count: number;
  comments_count: number;
  user_id: string;
  profile: {
    name: string;
    avatar_url: string | null;
  };
  userReaction: string | null;
  reactionCounts: { [key: string]: number };
}

// Memoized Post Card Component for better performance
const PostCard = memo(({ 
  post, 
  userId, 
  onLike, 
  onDelete, 
  onNavigate,
  index 
}: { 
  post: Post; 
  userId: string | undefined;
  onLike: (postId: string, reactionType: string) => void;
  onDelete: (postId: string) => void;
  onNavigate: (path: string) => void;
  index: number;
}) => {
  return (
    <div
      className="liquid-glass rounded-3xl overflow-hidden animate-spring-in"
      style={{ animationDelay: `${Math.min(index * 0.03, 0.3)}s` }}
    >
      <div className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div 
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => onNavigate(`/profile?user=${post.user_id}`)}
          >
            <Avatar className="w-11 h-11 border-2 border-primary/20">
              <img
                src={post.profile?.avatar_url || defaultAvatar}
                alt={post.profile?.name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </Avatar>
            <div>
              <p className="font-semibold">{post.profile?.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>
          {post.user_id === userId && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full h-9 w-9">
                  <MoreVertical className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="liquid-glass rounded-2xl border-white/10">
                <DropdownMenuItem onClick={() => onDelete(post.id)} className="text-destructive rounded-xl">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Content */}
        <p className="text-foreground/90 leading-relaxed whitespace-pre-wrap break-words">{post.content}</p>

        {/* Image with lazy loading */}
        {post.image_url && (
          <img 
            src={post.image_url} 
            alt="Post" 
            className="w-full rounded-2xl max-h-96 object-cover"
            loading="lazy"
          />
        )}

        {/* Actions */}
        <div className="flex items-center gap-6 pt-3 border-t border-white/10">
          <PostReactions
            onReact={(type) => onLike(post.id, type)}
            userReaction={post.userReaction || undefined}
            count={post.likes_count}
            reactionCounts={post.reactionCounts}
          />
          <button 
            onClick={() => onNavigate(`/post/${post.id}`)}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors touch-manipulation"
          >
            <MessageCircle className="w-5 h-5" />
            <span className="text-sm">{post.comments_count}</span>
          </button>
        </div>
      </div>
    </div>
  );
});

PostCard.displayName = 'PostCard';

const Feed = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState("");
  const [posting, setPosting] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [postCategory, setPostCategory] = useState("");
  const [showCreatePost, setShowCreatePost] = useState(false);

  const fetchPosts = useCallback(async () => {
    try {
      let query = supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);

      if (selectedCategory !== "all") {
        query = query.eq("category", selectedCategory);
      }

      const { data: postsData, error } = await query;

      if (error) throw error;

      // Batch fetch profiles for all posts
      const userIds = [...new Set((postsData || []).map(p => p.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, avatar_url")
        .in("id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Batch fetch reactions for current user
      const postIds = (postsData || []).map(p => p.id);
      const { data: userLikes } = await supabase
        .from("post_likes")
        .select("post_id, reaction_type")
        .in("post_id", postIds)
        .eq("user_id", user?.id || '');

      const userLikeMap = new Map(userLikes?.map(l => [l.post_id, l.reaction_type]) || []);

      // Batch fetch all reactions for counts
      const { data: allLikes } = await supabase
        .from("post_likes")
        .select("post_id, reaction_type")
        .in("post_id", postIds);

      const reactionCountsMap = new Map<string, { [key: string]: number }>();
      (allLikes || []).forEach((like) => {
        if (!reactionCountsMap.has(like.post_id)) {
          reactionCountsMap.set(like.post_id, {});
        }
        const counts = reactionCountsMap.get(like.post_id)!;
        counts[like.reaction_type] = (counts[like.reaction_type] || 0) + 1;
      });

      const postsWithData = (postsData || []).map((post) => ({
        ...post,
        profile: profileMap.get(post.user_id) || { name: 'Unknown', avatar_url: null },
        userReaction: userLikeMap.get(post.id) || null,
        reactionCounts: reactionCountsMap.get(post.id) || {},
      }));

      setPosts(postsWithData);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load posts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, user?.id, toast]);

  // Pull to refresh
  const handleRefresh = useCallback(async () => {
    await fetchPosts();
    toast({
      title: "Refreshed!",
      description: "Feed updated with latest posts",
    });
  }, [fetchPosts, toast]);

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
    fetchPosts();
  }, [user, navigate, fetchPosts]);

  const handleImageUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
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
      setUploadedImage(data.publicUrl);

      toast({
        title: "Success",
        description: "Image uploaded",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to upload image",
        variant: "destructive",
      });
    }
  }, [user, toast]);

  const handleCreatePost = useCallback(async () => {
    if (!user || !newPost.trim() || posting) return;

    if (newPost.length > 5000) {
      toast({
        title: "Error",
        description: "Post is too long (max 5000 characters)",
        variant: "destructive",
      });
      return;
    }

    setPosting(true);
    try {
      const { error } = await supabase.from("posts").insert({
        content: newPost.trim(),
        user_id: user.id,
        image_url: uploadedImage,
        category: postCategory || null,
      });

      if (error) throw error;

      setNewPost("");
      setUploadedImage(null);
      setPostCategory("");
      setShowCreatePost(false);
      toast({
        title: "Posted!",
        description: "Your post is now live",
      });
      fetchPosts();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to create post",
        variant: "destructive",
      });
    } finally {
      setPosting(false);
    }
  }, [user, newPost, posting, uploadedImage, postCategory, toast, fetchPosts]);

  const handleLike = useCallback(async (postId: string, reactionType: string = "like") => {
    if (!user) return;

    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    // Optimistic update
    setPosts(prevPosts => prevPosts.map(p => {
      if (p.id !== postId) return p;
      
      const newReactionCounts = { ...p.reactionCounts };
      
      if (p.userReaction === reactionType) {
        // Removing reaction
        newReactionCounts[reactionType] = Math.max(0, (newReactionCounts[reactionType] || 1) - 1);
        return { ...p, userReaction: null, reactionCounts: newReactionCounts, likes_count: Math.max(0, p.likes_count - 1) };
      } else {
        // Adding or changing reaction
        if (p.userReaction) {
          newReactionCounts[p.userReaction] = Math.max(0, (newReactionCounts[p.userReaction] || 1) - 1);
        } else {
          // New reaction
          return { 
            ...p, 
            userReaction: reactionType, 
            reactionCounts: { ...newReactionCounts, [reactionType]: (newReactionCounts[reactionType] || 0) + 1 },
            likes_count: p.likes_count + 1
          };
        }
        newReactionCounts[reactionType] = (newReactionCounts[reactionType] || 0) + 1;
        return { ...p, userReaction: reactionType, reactionCounts: newReactionCounts };
      }
    }));

    try {
      if (post.userReaction === reactionType) {
        await supabase
          .from("post_likes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", user.id);
      } else if (post.userReaction) {
        await supabase
          .from("post_likes")
          .update({ reaction_type: reactionType })
          .eq("post_id", postId)
          .eq("user_id", user.id);
      } else {
        await supabase.from("post_likes").insert({
          post_id: postId,
          user_id: user.id,
          reaction_type: reactionType,
        });
      }
    } catch (error: any) {
      // Revert on error
      fetchPosts();
      toast({
        title: "Error",
        description: "Failed to react",
        variant: "destructive",
      });
    }
  }, [user, posts, fetchPosts, toast]);

  const handleDeletePost = useCallback(async (postId: string) => {
    // Optimistic update
    setPosts(prevPosts => prevPosts.filter(p => p.id !== postId));
    
    try {
      const { error } = await supabase.from("posts").delete().eq("id", postId);
      if (error) throw error;

      toast({
        title: "Deleted",
        description: "Your post has been removed",
      });
    } catch (error: any) {
      fetchPosts();
      toast({
        title: "Error",
        description: "Failed to delete post",
        variant: "destructive",
      });
    }
  }, [fetchPosts, toast]);

  const handleNavigate = useCallback((path: string) => {
    navigate(path);
  }, [navigate]);

  // Memoize rendered posts
  const renderedPosts = useMemo(() => {
    if (posts.length === 0) {
      return (
        <div className="liquid-glass rounded-3xl p-12 text-center animate-spring-in">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Heart className="w-8 h-8 text-primary" />
          </div>
          <p className="text-muted-foreground">No posts yet. Be the first to share!</p>
        </div>
      );
    }

    return posts.map((post, index) => (
      <div key={post.id}>
        {index > 0 && index % 5 === 0 && (
          <AdPlaceholder variant="inline" className="mb-4" />
        )}
        <PostCard
          post={post}
          userId={user?.id}
          onLike={handleLike}
          onDelete={handleDeletePost}
          onNavigate={handleNavigate}
          index={index}
        />
      </div>
    ));
  }, [posts, user?.id, handleLike, handleDeletePost, handleNavigate]);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[calc(100vh-140px)]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-muted-foreground text-sm">Loading posts...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div 
        ref={containerRef}
        className="relative container mx-auto px-4 py-6 max-w-2xl space-y-4 pb-32 overflow-auto h-[calc(100vh-80px)]"
        {...handlers}
      >
        {/* Pull to Refresh Indicator */}
        <PullToRefreshIndicator 
          pullDistance={pullDistance}
          isRefreshing={isRefreshing}
          isTriggered={isTriggered}
          progress={progress}
        />
        
        {/* Content wrapper with pull effect */}
        <div 
          style={{
            transform: pullDistance > 0 ? `translateY(${pullDistance * 0.3}px)` : 'none',
            transition: isRefreshing ? 'transform 0.3s ease' : 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          {/* Header */}
          <div className="text-center space-y-2 animate-float-up mb-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full liquid-glass mb-2">
              <Compass className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium">Connect</span>
            </div>
            <h1 className="text-3xl font-bold">Feed</h1>
            <p className="text-muted-foreground text-sm">Share your moments</p>
          </div>

        {/* Create Post - Collapsible */}
        <Collapsible open={showCreatePost} onOpenChange={setShowCreatePost}>
          <div className="liquid-glass rounded-3xl overflow-hidden animate-spring-in">
            <CollapsibleTrigger className="w-full p-5 flex items-center justify-between transition-colors hover:bg-white/5 touch-manipulation">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Plus className="w-5 h-5 text-primary" />
                </div>
                <span className="font-medium">Create Post</span>
              </div>
              <X className={`w-5 h-5 text-muted-foreground transition-transform duration-300 ${showCreatePost ? 'rotate-0' : 'rotate-45'}`} />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-5 pb-5 space-y-4">
                <Textarea
                  placeholder="What's on your mind?"
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                  maxLength={5000}
                  className="bg-white/5 border-white/10 rounded-2xl resize-none focus:ring-2 focus:ring-primary/30 min-h-[100px]"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground text-right">{newPost.length}/5000</p>
                
                {uploadedImage && (
                  <div className="relative rounded-2xl overflow-hidden">
                    <img src={uploadedImage} alt="Upload" className="max-h-48 w-full object-cover" />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 h-8 w-8 rounded-full"
                      onClick={() => setUploadedImage(null)}
                    >
                      <X className="w-4 h-4 text-white" />
                    </Button>
                  </div>
                )}
                
                <div className="flex justify-between items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <select
                      value={postCategory}
                      onChange={(e) => setPostCategory(e.target.value)}
                      className="text-sm bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-primary/30"
                    >
                      <option value="">Category</option>
                      <option value="free-tonight">Free Tonight</option>
                      <option value="casual">Casual</option>
                      <option value="hookup">Hookup</option>
                      <option value="coffee-date">Coffee Date</option>
                      <option value="dinner-date">Dinner Date</option>
                      <option value="drinks">Drinks</option>
                      <option value="concert">Concert</option>
                      <option value="adventure">Adventure</option>
                      <option value="long-term">Long Term</option>
                    </select>
                    <label className="cursor-pointer touch-manipulation">
                      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                        <Image className="w-4 h-4 text-primary" />
                        <span className="text-sm">Photo</span>
                      </div>
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    </label>
                  </div>
                  <Button
                    onClick={handleCreatePost}
                    disabled={!newPost.trim() || posting}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl px-6"
                    size="sm"
                  >
                    {posting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                    Post
                  </Button>
                </div>
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>

        {/* Categories */}
        <FeedCategories 
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
        />

        {/* Posts Feed */}
        <div className="space-y-4">
          {/* Ad placeholder at top of feed */}
          <AdPlaceholder variant="banner" />
          
          {renderedPosts}
        </div>
        </div>
      </div>
    </Layout>
  );
};

export default Feed;