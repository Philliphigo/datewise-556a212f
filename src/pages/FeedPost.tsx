import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Loader2, MoreVertical, Trash2, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import defaultAvatar from "@/assets/default-avatar.jpg";
import { PostReactions } from "@/components/PostReactions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  parent_id: string | null;
  profile: {
    name: string;
    avatar_url: string | null;
  };
  replies?: Comment[];
}

const FeedPost = () => {
  const { postId } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [post, setPost] = useState<any>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchPostAndComments();
  }, [postId, user]);

  const fetchPostAndComments = async () => {
    try {
      // Fetch post
      const { data: postData, error: postError } = await supabase
        .from("posts")
        .select("*")
        .eq("id", postId)
        .single();

      if (postError) throw postError;

      const { data: profile } = await supabase
        .from("profiles")
        .select("name, avatar_url")
        .eq("id", postData.user_id)
        .single();

      setPost({ ...postData, profile });

      // Fetch comments with profiles
      const { data: commentsData, error: commentsError } = await supabase
        .from("post_comments")
        .select("*")
        .eq("post_id", postId)
        .order("created_at", { ascending: true });

      if (commentsError) throw commentsError;

      const commentsWithProfiles = await Promise.all(
        (commentsData || []).map(async (comment) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("name, avatar_url")
            .eq("id", comment.user_id)
            .single();

          return { ...comment, profile };
        })
      );

      // Build threaded structure
      const threaded = buildThreadedComments(commentsWithProfiles);
      setComments(threaded);
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

  const buildThreadedComments = (comments: any[]): Comment[] => {
    const map = new Map();
    const roots: Comment[] = [];

    comments.forEach(comment => {
      map.set(comment.id, { ...comment, replies: [] });
    });

    comments.forEach(comment => {
      if (comment.parent_id) {
        const parent = map.get(comment.parent_id);
        if (parent) {
          parent.replies.push(map.get(comment.id));
        }
      } else {
        roots.push(map.get(comment.id));
      }
    });

    return roots;
  };

  const handlePostComment = async () => {
    if (!newComment.trim() || !user) return;

    setPosting(true);
    try {
      const { error } = await supabase.from("post_comments").insert({
        post_id: postId,
        user_id: user.id,
        content: newComment,
        parent_id: replyTo,
      });

      if (error) throw error;

      setNewComment("");
      setReplyTo(null);
      fetchPostAndComments();
      toast({
        title: "Comment Posted",
        description: "Your comment has been added",
      });
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

  const handleDeleteComment = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from("post_comments")
        .delete()
        .eq("id", commentId);

      if (error) throw error;

      fetchPostAndComments();
      toast({
        title: "Comment Deleted",
        description: "Comment has been removed",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeletePost = async () => {
    try {
      const { error } = await supabase.from("posts").delete().eq("id", postId);

      if (error) throw error;

      toast({
        title: "Post Deleted",
        description: "Your post has been removed",
      });
      navigate("/feed");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleReact = async (type: string) => {
    if (!user) return;
    // Implementation for reactions
    toast({ title: "Reaction added!", description: `You reacted with ${type}` });
  };

  const renderComment = (comment: Comment, depth: number = 0) => (
    <div key={comment.id} className={`${depth > 0 ? 'ml-12 border-l-2 border-primary/20 pl-4' : ''}`}>
      <div className="flex gap-3 py-3">
        <Avatar className="w-8 h-8 border border-border">
          <img
            src={comment.profile?.avatar_url || defaultAvatar}
            alt={comment.profile?.name}
            className="w-full h-full object-cover"
          />
        </Avatar>
        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-semibold text-sm">{comment.profile?.name}</span>
              <span className="text-xs text-muted-foreground ml-2">
                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
              </span>
            </div>
            {comment.user_id === user?.id && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="glass">
                  <DropdownMenuItem
                    onClick={() => handleDeleteComment(comment.id)}
                    className="text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          <p className="text-sm">{comment.content}</p>
          <Button
            variant="ghost"
            size="sm"
            className="h-auto p-0 text-xs text-muted-foreground hover:text-primary"
            onClick={() => setReplyTo(comment.id)}
          >
            Reply
          </Button>
        </div>
      </div>
      {comment.replies && comment.replies.length > 0 && (
        <div className="space-y-2">
          {comment.replies.map(reply => renderComment(reply, depth + 1))}
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[calc(100vh-140px)]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!post) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 text-center">
          <p className="text-muted-foreground">Post not found</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Button
          variant="ghost"
          onClick={() => navigate("/feed")}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Feed
        </Button>

        <Card className="glass-card overflow-hidden">
          <div className="p-4 space-y-4">
            {/* Post Header */}
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
                    <DropdownMenuItem onClick={handleDeletePost} className="text-destructive">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Post
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
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
              <PostReactions
                onReact={handleReact}
                count={post.likes_count}
              />
            </div>
          </div>

          {/* Comments Section */}
          <div className="border-t border-border p-4 space-y-4">
            <h3 className="font-semibold">Comments ({post.comments_count})</h3>

            {/* Comment Input */}
            <div className="flex gap-2">
              <Textarea
                placeholder={replyTo ? "Write a reply..." : "Write a comment..."}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="glass resize-none"
                rows={2}
              />
              <Button
                onClick={handlePostComment}
                disabled={!newComment.trim() || posting}
                className="gradient-romantic text-white self-end"
              >
                {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>

            {replyTo && (
              <div className="text-sm text-muted-foreground">
                Replying to comment...{" "}
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0"
                  onClick={() => setReplyTo(null)}
                >
                  Cancel
                </Button>
              </div>
            )}

            {/* Comments List */}
            <div className="space-y-2 divide-y divide-border">
              {comments.map(comment => renderComment(comment))}
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
};

export default FeedPost;
