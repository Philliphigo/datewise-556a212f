import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Ban, Eye, Loader2, Clock, ShieldOff } from "lucide-react";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import defaultAvatar from "@/assets/default-avatar.jpg";
import { format } from "date-fns";

interface UserManagementProps {
  users: any[];
  onRefresh: () => void;
}

export const UserManagement = ({ users, onRefresh }: UserManagementProps) => {
  const { toast } = useToast();
  const { user: adminUser } = useAuth();

  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showUserDialog, setShowUserDialog] = useState(false);

  const [latestSuspension, setLatestSuspension] = useState<any>(null);
  const [loadingSuspension, setLoadingSuspension] = useState(false);
  const [suspending, setSuspending] = useState(false);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      u.name?.toLowerCase().includes(q) || u.city?.toLowerCase().includes(q)
    );
  }, [users, search]);

  const isSuspended = useMemo(() => {
    if (!latestSuspension) return false;
    return (
      latestSuspension.suspended_until === null ||
      new Date(latestSuspension.suspended_until) > new Date()
    );
  }, [latestSuspension]);

  const fetchLatestSuspension = async (userId: string) => {
    setLoadingSuspension(true);
    try {
      const { data, error } = await supabase
        .from("user_suspensions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setLatestSuspension(data || null);
    } catch {
      setLatestSuspension(null);
    } finally {
      setLoadingSuspension(false);
    }
  };

  const suspendUser = async (userId: string, suspendedUntil: string | null) => {
    setSuspending(true);
    try {
      const { error: insertError } = await supabase.from("user_suspensions").insert({
        user_id: userId,
        suspended_until: suspendedUntil,
        created_by: adminUser?.id ?? null,
      });

      if (insertError) throw insertError;

      // Force offline (best-effort)
      await supabase.from("profiles").update({ is_online: false }).eq("id", userId);

      toast({
        title: "User suspended",
        description: suspendedUntil ? "Suspension applied." : "Permanent suspension applied.",
      });

      await fetchLatestSuspension(userId);
      onRefresh();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSuspending(false);
    }
  };

  const liftSuspension = async (userId: string) => {
    setSuspending(true);
    try {
      const { error } = await supabase.from("user_suspensions").delete().eq("user_id", userId);
      if (error) throw error;

      toast({
        title: "Suspension lifted",
        description: "User can access the app again.",
      });

      setLatestSuspension(null);
      onRefresh();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSuspending(false);
    }
  };

  return (
    <Card className="liquid-glass">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>User Management</CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 liquid-glass"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No users found</div>
          ) : (
            filteredUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 rounded-xl border border-border hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={user.avatar_url || defaultAvatar} />
                    <AvatarFallback>{user.name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{user.name}</p>
                      {user.verified && <VerifiedBadge size="sm" />}
                      {user.is_online && (
                        <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {user.age ? `${user.age}y` : ''} {user.city && `• ${user.city}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Joined {format(new Date(user.created_at), "MMM d, yyyy")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={user.subscription_tier === "free" ? "outline" : "default"}>
                    {user.subscription_tier}
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      setSelectedUser(user);
                      setShowUserDialog(true);
                      await fetchLatestSuspension(user.id);
                    }}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>

      {/* User Details Dialog */}
      <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
        <DialogContent className="liquid-glass max-w-md">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>View and manage user account</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16">
                  <AvatarImage src={selectedUser.avatar_url || defaultAvatar} />
                  <AvatarFallback>{selectedUser.name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-lg">{selectedUser.name}</h3>
                    {selectedUser.verified && <VerifiedBadge size="md" />}
                  </div>
                  <p className="text-muted-foreground">
                    {selectedUser.age} years old • {selectedUser.city || "Location not set"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-muted-foreground">Subscription</p>
                  <p className="font-medium capitalize">{selectedUser.subscription_tier}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-muted-foreground">Status</p>
                  <p className="font-medium">{selectedUser.is_online ? "Online" : "Offline"}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-muted-foreground">Verified</p>
                  <p className="font-medium">{selectedUser.verified ? "Yes" : "No"}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-muted-foreground">Joined</p>
                  <p className="font-medium">{format(new Date(selectedUser.created_at), "MMM d, yyyy")}</p>
                </div>

                <div className="col-span-2 p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center justify-between">
                    <p className="text-muted-foreground">Suspension</p>
                    {loadingSuspension ? (
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    ) : isSuspended ? (
                      <Badge className="bg-destructive">Suspended</Badge>
                    ) : (
                      <Badge variant="outline">Active</Badge>
                    )}
                  </div>
                  {isSuspended && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {latestSuspension?.suspended_until
                        ? `Until ${new Date(latestSuspension.suspended_until).toLocaleString()}`
                        : "Permanent"}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-4 border-t border-border">
                <div className="flex items-center gap-2">
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => {
                      const until = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
                      suspendUser(selectedUser.id, until);
                    }}
                    disabled={suspending}
                  >
                    {suspending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4 mr-2" />}
                    24h
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => {
                      const until = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
                      suspendUser(selectedUser.id, until);
                    }}
                    disabled={suspending}
                  >
                    {suspending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4 mr-2" />}
                    7d
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => suspendUser(selectedUser.id, null)}
                    disabled={suspending}
                  >
                    {suspending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldOff className="w-4 h-4 mr-2" />}
                    Permanent
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => liftSuspension(selectedUser.id)}
                    disabled={suspending}
                  >
                    Lift
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};
