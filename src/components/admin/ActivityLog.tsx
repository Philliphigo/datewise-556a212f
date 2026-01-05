import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { 
  Activity, 
  UserPlus, 
  Heart, 
  MessageSquare, 
  Shield, 
  FileCheck, 
  RefreshCw,
  Loader2 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import defaultAvatar from "@/assets/default-avatar.jpg";

interface ActivityItem {
  id: string;
  type: "signup" | "match" | "message" | "verification" | "post";
  description: string;
  timestamp: string;
  user?: {
    name: string;
    avatar_url?: string;
  };
}

export const ActivityLog = () => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    setRefreshing(true);
    try {
      // Fetch recent signups
      const { data: signups } = await supabase
        .from("profiles")
        .select("id, name, avatar_url, created_at")
        .order("created_at", { ascending: false })
        .limit(10);

      // Fetch recent matches
      const { data: matches } = await supabase
        .from("matches")
        .select("id, created_at, user1_id, user2_id")
        .order("created_at", { ascending: false })
        .limit(10);

      // Fetch recent messages count (last hour)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { count: messageCount } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .gte("created_at", oneHourAgo);

      // Fetch recent verification requests
      const { data: verifications } = await supabase
        .from("verification_requests")
        .select("id, created_at, user_id, status")
        .order("created_at", { ascending: false })
        .limit(10);

      // Fetch recent posts
      const { data: posts } = await supabase
        .from("posts")
        .select("id, created_at, user_id")
        .order("created_at", { ascending: false })
        .limit(10);

      // Build activity list
      const activityList: ActivityItem[] = [];

      // Add signups
      signups?.forEach((signup) => {
        activityList.push({
          id: `signup-${signup.id}`,
          type: "signup",
          description: `${signup.name} joined DateWise`,
          timestamp: signup.created_at || "",
          user: { name: signup.name, avatar_url: signup.avatar_url || undefined },
        });
      });

      // Add matches
      matches?.forEach((match) => {
        activityList.push({
          id: `match-${match.id}`,
          type: "match",
          description: "New match created",
          timestamp: match.created_at || "",
        });
      });

      // Add verification requests
      verifications?.forEach((verif) => {
        activityList.push({
          id: `verif-${verif.id}`,
          type: "verification",
          description: `Verification request ${verif.status}`,
          timestamp: verif.created_at || "",
        });
      });

      // Add posts
      posts?.forEach((post) => {
        activityList.push({
          id: `post-${post.id}`,
          type: "post",
          description: "New post created",
          timestamp: post.created_at || "",
        });
      });

      // Sort by timestamp
      activityList.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setActivities(activityList.slice(0, 50));
    } catch (error) {
      console.error("Error fetching activities:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "signup": return <UserPlus className="w-4 h-4 text-success" />;
      case "match": return <Heart className="w-4 h-4 text-destructive" />;
      case "message": return <MessageSquare className="w-4 h-4 text-primary" />;
      case "verification": return <FileCheck className="w-4 h-4 text-info" />;
      case "post": return <Activity className="w-4 h-4 text-accent" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case "signup": return "bg-success/10 text-success";
      case "match": return "bg-destructive/10 text-destructive";
      case "message": return "bg-primary/10 text-primary";
      case "verification": return "bg-info/10 text-info";
      case "post": return "bg-accent/10 text-accent-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  if (loading) {
    return (
      <Card className="liquid-glass">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="liquid-glass">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          Activity Log
        </CardTitle>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={fetchActivities}
          disabled={refreshing}
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
        </Button>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No recent activity</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className={`p-2 rounded-full ${getActivityColor(activity.type)}`}>
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {activity.user && (
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={activity.user.avatar_url || defaultAvatar} />
                        <AvatarFallback>{activity.user.name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                    )}
                    <p className="text-sm font-medium truncate">{activity.description}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(activity.timestamp), "MMM d, yyyy 'at' h:mm a")}
                  </p>
                </div>
                <Badge variant="outline" className="text-xs capitalize">
                  {activity.type}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
