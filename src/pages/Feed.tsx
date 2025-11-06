import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar } from "@/components/ui/avatar";
import { Heart, MessageCircle, Send, Loader2, Image, MoreVertical, Trash2, Plus, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PostComments } from "@/components/PostComments";
import { PostReactions } from "@/components/PostReactions";
import { FeedCategories } from "@/components/FeedCategories";
import { useNavigate } from "react-router-dom";
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
  userLiked: boolean;
}

const Feed = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState("");
  const [posting, setPosting] = useState(false);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [postCategory, setPostCategory] = useState("");
  const [showCreatePost, setShowCreatePost] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchPosts();
  }, [user, navigate, selectedCategory]);

  const fetchPosts = async () => {
    try {
      let query = supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (selectedCategory !== "all") {
        query = query.eq("category", selectedCategory);
      }

      const { data: postsData, error } = await query;

      if (error) throw error;

      const postsWithProfiles = await Promise.all(
        (postsData || []).map(async (post) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("name, avatar_url")
            .eq("id", post.user_id)
            .single();

          const { data: userLike } = await supabase
            .from("post_likes")
            .select("id")
            .eq("post_id", post.id)
            .eq("user_id", user?.id)
            .maybeSingle();

          return {
            ...post,
            profile,
            userLiked: !!userLike,
          };
        })
      );

      setPosts(postsWithProfiles);
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

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
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
        description: "Image uploaded successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCreatePost = async () => {
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
        content: newPost,
        user_id: user.id,
        image_url: uploadedImage,
        category: postCategory || null,
      });

      if (error) throw error;

      setNewPost("");
      setUploadedImage(null);
      setPostCategory("");
      toast({
        title: "Success",
        description: "Post created successfully!",
      });
      fetchPosts();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setPosting(false);
    }
  };

  const handleLike = async (postId: string, reaction: string = "like") => {
    if (!user) return;

    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    try {
      if (post.userLiked) {
        await supabase
          .from("post_likes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", user.id);
      } else {
        await supabase.from("post_likes").insert({
          post_id: postId,
          user_id: user.id,
        });
      }

      fetchPosts();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeletePost = async (postId: string) => {
    try {
      const { error } = await supabase.from("posts").delete().eq("id", postId);

      if (error) throw error;

      toast({
        title: "Post Deleted",
        description: "Your post has been removed",
      });
      fetchPosts();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
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

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-2xl space-y-4 pb-32">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold gradient-text">Connect</h1>
          <p className="text-muted-foreground">Share your moments</p>
        </div>

        {/* Create Post - Collapsible */}
        <Collapsible open={showCreatePost} onOpenChange={setShowCreatePost}>
          <Card className="glass-card overflow-hidden">
            <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-muted/5 transition-colors">
              <div className="flex items-center gap-3">
                <Plus className="w-5 h-5 text-primary" />
                <span className="font-semibold">Create Post</span>
              </div>
              <X className={`w-5 h-5 text-muted-foreground transition-transform ${showCreatePost ? 'rotate-0' : 'rotate-45'}`} />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="p-4 pt-0 space-y-3">
                <Textarea
                  placeholder="What's on your mind?"
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                  maxLength={5000}
                  className="glass border-border/50 resize-none"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground text-right">{newPost.length}/5000</p>
                {uploadedImage && (
                  <div className="relative">
                    <img src={uploadedImage} alt="Upload" className="rounded-lg max-h-32 w-full object-cover" />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 bg-background/90 h-8 w-8"
                      onClick={() => setUploadedImage(null)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
                <div className="flex justify-between items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <select
                      value={postCategory}
                      onChange={(e) => setPostCategory(e.target.value)}
                      className="text-xs bg-muted/50 border border-border/50 rounded-md px-3 py-2"
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
                    <label className="cursor-pointer">
                      <Button variant="ghost" size="sm" className="glass" asChild>
                        <div>
                          <Image className="w-4 h-4 mr-2" />
                          Photo
                        </div>
                      </Button>
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    </label>
                  </div>
                  <Button
                    onClick={handleCreatePost}
                    disabled={!newPost.trim() || posting}
                    className="gradient-romantic text-white"
                    size="sm"
                  >
                    {posting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                    Post
                  </Button>
                </div>
              </div>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Categories */}
        <FeedCategories 
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
        />

        {/* Posts Feed */}
        <div className="space-y-4">
          {posts.length === 0 ? (
            <Card className="glass-card p-8 text-center">
              <p className="text-muted-foreground">No posts yet. Be the first to share!</p>
            </Card>
          ) : (
            posts.map((post, index) => (
              <Card
                key={post.id}
                className="glass-card overflow-hidden animate-fade-in"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10 border-2 border-primary/20">
                        <img
                          src={post.profile?.avatar_url || defaultAvatar}
                          alt={post.profile?.name}
                          className="w-full h-full object-cover"
                        />
                      </Avatar>
                      <div>
                        <p className="font-semibold">{post.profile?.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    {post.user_id === user?.id && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-5 h-5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="glass">
                          <DropdownMenuItem onClick={() => handleDeletePost(post.id)} className="text-destructive">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>

                  <p className="text-foreground/90">{post.content}</p>

                  {post.image_url && (
                    <img src={post.image_url} alt="Post" className="w-full rounded-lg max-h-96 object-cover" />
                  )}

                  <div className="flex items-center gap-6 pt-2 border-t border-border/50">
                    <PostReactions
                      onReact={(type) => handleLike(post.id, type)}
                      userReaction={post.userLiked ? "like" : undefined}
                      count={post.likes_count}
                    />
                    <button 
                      onClick={() => navigate(`/post/${post.id}`)}
                      className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <MessageCircle className="w-5 h-5" />
                      <span className="text-sm">{post.comments_count}</span>
                    </button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Feed;
