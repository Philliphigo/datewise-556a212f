import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { Bell, CheckCheck, Megaphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SystemMessage {
  id: string;
  content: string;
  created_at: string;
  is_read: boolean;
  is_broadcast: boolean;
}

interface SystemInboxProps {
  onClose?: () => void;
  onUnreadCountChange?: (count: number) => void;
}

export const SystemInbox = ({ onClose, onUnreadCountChange }: SystemInboxProps) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<SystemMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchMessages();
      subscribeToMessages();
    }
  }, [user]);

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from("system_messages")
        .select("*")
        .or(`recipient_id.eq.${user?.id},and(recipient_id.is.null,is_broadcast.eq.true)`)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setMessages(data || []);
      
      const unreadCount = (data || []).filter(m => !m.is_read).length;
      onUnreadCountChange?.(unreadCount);
    } catch (error) {
      console.error("Error fetching system messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel("system-messages-inbox")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "system_messages",
        },
        () => fetchMessages()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const markAsRead = async (id: string) => {
    try {
      await supabase
        .from("system_messages")
        .update({ is_read: true })
        .eq("id", id);

      setMessages(prev => 
        prev.map(m => m.id === id ? { ...m, is_read: true } : m)
      );
      
      const unreadCount = messages.filter(m => !m.is_read && m.id !== id).length;
      onUnreadCountChange?.(unreadCount);
    } catch (error) {
      console.error("Error marking message as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadIds = messages.filter(m => !m.is_read).map(m => m.id);
      if (unreadIds.length === 0) return;

      await supabase
        .from("system_messages")
        .update({ is_read: true })
        .in("id", unreadIds);

      setMessages(prev => prev.map(m => ({ ...m, is_read: true })));
      onUnreadCountChange?.(0);
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const unreadCount = messages.filter(m => !m.is_read).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-primary" />
          <h2 className="font-semibold">System Updates</h2>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              {unreadCount} new
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead}>
              <CheckCheck className="w-4 h-4 mr-1" />
              Mark all read
            </Button>
          )}
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <Bell className="w-12 h-12 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">No system messages yet</p>
            <p className="text-sm text-muted-foreground/70">
              Updates from the DateWise team will appear here
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`p-4 transition-colors cursor-pointer hover:bg-muted/50 ${
                  !message.is_read ? "bg-primary/5 border-l-2 border-l-primary" : ""
                }`}
                onClick={() => !message.is_read && markAsRead(message.id)}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-full ${
                    message.is_broadcast 
                      ? "bg-primary/10 text-primary" 
                      : "bg-muted text-muted-foreground"
                  }`}>
                    <Megaphone className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">DateWise Team</span>
                      {message.is_broadcast && (
                        <Badge variant="outline" className="text-xs">
                          Broadcast
                        </Badge>
                      )}
                      {!message.is_read && (
                        <span className="w-2 h-2 rounded-full bg-primary" />
                      )}
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};
