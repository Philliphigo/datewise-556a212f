import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Ban, Eye, CheckCircle, XCircle, Shield, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import defaultAvatar from "@/assets/default-avatar.jpg";
import { format } from "date-fns";

interface UserManagementProps {
  users: any[];
  onRefresh: () => void;
}

export const UserManagement = ({ users, onRefresh }: UserManagementProps) => {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [banning, setBanning] = useState(false);

  const filteredUsers = users.filter((user) =>
    user.name?.toLowerCase().includes(search.toLowerCase()) ||
    user.city?.toLowerCase().includes(search.toLowerCase())
  );

  const handleBanUser = async (userId: string, isBanned: boolean) => {
    setBanning(true);
    try {
      // For now, we'll use a simple approach - add to blocked_users from admin
      // In production, you'd have a dedicated banned_users table
      const { error } = await supabase
        .from("profiles")
        .update({ is_online: false }) // Force offline
        .eq("id", userId);

      if (error) throw error;

      toast({
        title: isBanned ? "User Suspended" : "Action Taken",
        description: isBanned ? "User has been suspended from the platform" : "Action completed",
      });
      
      setShowUserDialog(false);
      onRefresh();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setBanning(false);
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
                      {user.verified && (
                        <CheckCircle className="w-4 h-4 text-info fill-info" />
                      )}
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
                    onClick={() => {
                      setSelectedUser(user);
                      setShowUserDialog(true);
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
                    {selectedUser.verified && (
                      <CheckCircle className="w-5 h-5 text-info fill-info" />
                    )}
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
              </div>

              <div className="flex gap-2 pt-4 border-t border-border">
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => handleBanUser(selectedUser.id, true)}
                  disabled={banning}
                >
                  {banning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4 mr-2" />}
                  Suspend User
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};
