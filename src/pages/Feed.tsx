import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar } from "@/components/ui/avatar";
import { Heart, MessageCircle, Send, Loader2, Image } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PostComments } from "@/components/PostComments";
import { useNavigate } from "react-router-dom";
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

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchPosts();
  }, [user, navigate]);

  const fetchPosts = async () => {
    try {
      const { data: postsData, error } = await supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

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

    setPosting(true);
    try {
      const { error } = await supabase.from("posts").insert({
        content: newPost,
        user_id: user.id,
        image_url: uploadedImage,
      });

      if (error) throw error;

      setNewPost("");
      setUploadedImage(null);
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

  const handleLike = async (postId: string) => {
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
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold gradient-text">Connect</h1>
            <p className="text-muted-foreground">Share your moments</p>
          </div>

          {/* Create Post */}
          <Card className="glass-card p-4 space-y-3">
            <Textarea
              placeholder="What's on your mind?"
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              className="glass border-border/50 resize-none"
              rows={3}
            />
            {uploadedImage && (
              <div className="relative">
                <img src={uploadedImage} alt="Upload preview" className="rounded-lg max-h-64 w-full object-cover" />
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2 bg-background/80"
                  onClick={() => setUploadedImage(null)}
                >
                  Remove
                </Button>
              </div>
            )}
            <div className="flex justify-between items-center">
              <label className="cursor-pointer">
                <Button variant="ghost" size="sm" className="glass" asChild>
                  <div>
                    <Image className="w-4 h-4 mr-2" />
                    Photo
                  </div>
                </Button>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </label>
              <Button
                onClick={handleCreatePost}
                disabled={!newPost.trim() || posting}
                className="gradient-romantic text-white"
              >
                {posting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Post
              </Button>
            </div>
          </Card>

          {/* Posts Feed */}
          <div className="space-y-4">
            {posts.map((post, index) => (
              <Card
                key={post.id}
                className="glass-card overflow-hidden animate-fade-in"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="p-4 space-y-4">
                  {/* Post Header */}
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

                  {/* Post Content */}
                  <p className="text-foreground/90">{post.content}</p>

                  {post.image_url && (
                    <img
                      src={post.image_url}
                      alt="Post"
                      className="w-full rounded-lg max-h-96 object-cover"
                    />
                  )}

                  {/* Post Actions */}
                  <div className="flex items-center gap-6 pt-2 border-t border-border/50">
                    <button
                      onClick={() => handleLike(post.id)}
                      className={`flex items-center gap-2 transition-colors ${
                        post.userLiked ? "text-primary" : "text-muted-foreground hover:text-primary"
                      }`}
                    >
                      <Heart
                        className="w-5 h-5"
                        fill={post.userLiked ? "currentColor" : "none"}
                      />
                      <span className="text-sm">{post.likes_count}</span>
                    </button>

                    <button 
                      onClick={() => {
                        const newExpanded = new Set(expandedComments);
                        if (newExpanded.has(post.id)) {
                          newExpanded.delete(post.id);
                        } else {
                          newExpanded.add(post.id);
                        }
                        setExpandedComments(newExpanded);
                      }}
                      className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <MessageCircle className="w-5 h-5" />
                      <span className="text-sm">{post.comments_count}</span>
                    </button>
                  </div>

                  {expandedComments.has(post.id) && <PostComments postId={post.id} />}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Feed;
