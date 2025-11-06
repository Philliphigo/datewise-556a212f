import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";
import { Loader2, UserX } from "lucide-react";

interface BlockedUser {
  id: string;
  blocked_id: string;
  profiles: {
    name: string;
    avatar_url: string | null;
  };
}

export const BlockedUsers = () => {
  const { user } = useAuth();
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [unblocking, setUnblocking] = useState<string | null>(null);

  useEffect(() => {
    fetchBlockedUsers();
  }, [user]);

  const fetchBlockedUsers = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("blocked_users")
        .select("id, blocked_id")
        .eq("blocker_id", user.id);

      if (error) throw error;

      // Fetch profiles separately
      const blockedWithProfiles = await Promise.all(
        (data || []).map(async (blocked) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("name, avatar_url")
            .eq("id", blocked.blocked_id)
            .single();

          return {
            ...blocked,
            profiles: profile || { name: "Unknown User", avatar_url: null },
          };
        })
      );

      setBlockedUsers(blockedWithProfiles);
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

  const handleUnblock = async (blockId: string, userName: string) => {
    try {
      setUnblocking(blockId);
      const { error } = await supabase
        .from("blocked_users")
        .delete()
        .eq("id", blockId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Unblocked ${userName}`,
      });

      fetchBlockedUsers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUnblocking(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserX className="w-5 h-5" />
          Blocked Users
        </CardTitle>
      </CardHeader>
      <CardContent>
        {blockedUsers.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">
            No blocked users
          </p>
        ) : (
          <div className="space-y-4">
            {blockedUsers.map((blocked) => (
              <div
                key={blocked.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={blocked.profiles.avatar_url || undefined} />
                    <AvatarFallback>
                      {blocked.profiles.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{blocked.profiles.name}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleUnblock(blocked.id, blocked.profiles.name)}
                  disabled={unblocking === blocked.id}
                >
                  {unblocking === blocked.id ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Unblocking...
                    </>
                  ) : (
                    "Unblock"
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
