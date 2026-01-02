import { useState, useEffect } from "react";
import { Bell, Heart, MessageSquare, Users, Megaphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { Separator } from "@/components/ui/separator";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  created_at: string;
  read: boolean;
}

export const NotificationBell = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      subscribeToNotifications();
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      // Fetch real notifications from database
      const { data: notificationsData, error } = await supabase
        .from("notifications")
        .select("id, type, title, message, created_at, read")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      // Also fetch unread system messages count
      const { count: systemCount } = await supabase
        .from("system_messages")
        .select("*", { count: "exact", head: true })
        .or(`recipient_id.eq.${user?.id},and(recipient_id.is.null,is_broadcast.eq.true)`)
        .eq("is_read", false);

      const formattedNotifications: Notification[] = (notificationsData || []).map(n => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        created_at: n.created_at,
        read: n.read || false,
      }));

      // Add system message indicator if there are unread ones
      if (systemCount && systemCount > 0) {
        formattedNotifications.unshift({
          id: "system-updates",
          type: "system",
          title: "System Updates",
          message: `You have ${systemCount} unread update${systemCount > 1 ? 's' : ''} from DateWise`,
          created_at: new Date().toISOString(),
          read: false,
        });
      }

      setNotifications(formattedNotifications);
      setUnreadCount(formattedNotifications.filter((n) => !n.read).length);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      setNotifications([]);
      setUnreadCount(0);
    }
  };

  const subscribeToNotifications = () => {
    // Subscribe to new matches
    const matchChannel = supabase
      .channel("matches-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "matches",
          filter: `user1_id=eq.${user?.id}`,
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(matchChannel);
    };
  };

  const markAsRead = async (id: string) => {
    if (id === "system-updates") {
      // Navigate to messages/inbox instead
      return;
    }
    
    try {
      await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", id);

      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter(n => !n.read && n.id !== "system-updates").map(n => n.id);
      if (unreadIds.length > 0) {
        await supabase
          .from("notifications")
          .update({ read: true })
          .in("id", unreadIds);
      }
      
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "match":
        return <Users className="w-4 h-4 text-primary" />;
      case "like":
        return <Heart className="w-4 h-4 text-rose-500" />;
      case "message":
        return <MessageSquare className="w-4 h-4 text-blue-500" />;
      case "system":
        return <Megaphone className="w-4 h-4 text-orange-500" />;
      default:
        return <Bell className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const groupedNotifications = {
    unread: notifications.filter((n) => !n.read),
    read: notifications.filter((n) => n.read),
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 glass border-border/50 p-0">
        <div className="flex items-center justify-between p-3 border-b border-border/50">
          <p className="font-semibold">Notifications</p>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-xs text-primary h-7"
            >
              Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-50" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
            </div>
          ) : (
            <div>
              {groupedNotifications.unread.length > 0 && (
                <div>
                  <div className="px-3 py-2 text-xs font-medium text-muted-foreground bg-muted/30">
                    New
                  </div>
                  {groupedNotifications.unread.map((notification) => (
                    <DropdownMenuItem
                      key={notification.id}
                      className="p-3 cursor-pointer bg-primary/5 hover:bg-primary/10 border-l-2 border-primary"
                      onClick={() => markAsRead(notification.id)}
                    >
                      <div className="flex gap-3 w-full">
                        <div className="mt-0.5">{getNotificationIcon(notification.type)}</div>
                        <div className="flex-1 space-y-1">
                          <p className="text-sm leading-tight">{notification.message}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(notification.created_at), {
                              addSuffix: true,
                            })}
                          </p>
                        </div>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </div>
              )}
              
              {groupedNotifications.read.length > 0 && (
                <div>
                  {groupedNotifications.unread.length > 0 && <DropdownMenuSeparator />}
                  <div className="px-3 py-2 text-xs font-medium text-muted-foreground bg-muted/10">
                    Earlier
                  </div>
                  {groupedNotifications.read.map((notification) => (
                    <DropdownMenuItem
                      key={notification.id}
                      className="p-3 cursor-pointer hover:bg-muted/5"
                      onClick={() => markAsRead(notification.id)}
                    >
                      <div className="flex gap-3 w-full opacity-70">
                        <div className="mt-0.5">{getNotificationIcon(notification.type)}</div>
                        <div className="flex-1 space-y-1">
                          <p className="text-sm leading-tight">{notification.message}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(notification.created_at), {
                              addSuffix: true,
                            })}
                          </p>
                        </div>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
