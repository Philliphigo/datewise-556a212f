import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Loader2, Circle, CheckCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useSearchParams } from "react-router-dom";
import defaultAvatar from "@/assets/default-avatar.jpg";
import { formatDistanceToNow } from "date-fns";

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
}

interface MatchInfo {
  id: string;
  profile: {
    id: string;
    name: string;
    avatar_url: string | null;
    is_online: boolean;
    last_seen: string;
  };
}

const Messages = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const matchId = searchParams.get("match");

  const [matches, setMatches] = useState<MatchInfo[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<string | null>(matchId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchMatches();
    updateOnlineStatus(true);

    return () => {
      updateOnlineStatus(false);
    };
  }, [user, navigate]);

  useEffect(() => {
    if (selectedMatch) {
      fetchMessages();
      markMessagesAsRead();
      subscribeToMessages();
    }
  }, [selectedMatch]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const updateOnlineStatus = async (isOnline: boolean) => {
    if (!user) return;
    await supabase
      .from("profiles")
      .update({
        is_online: isOnline,
        last_seen: new Date().toISOString(),
      })
      .eq("id", user.id);
  };

  const markMessagesAsRead = async () => {
    if (!selectedMatch || !user) return;

    await supabase
      .from("messages")
      .update({ is_read: true })
      .eq("match_id", selectedMatch)
      .neq("sender_id", user.id)
      .eq("is_read", false);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchMatches = async () => {
    try {
      const { data: matchesData, error } = await supabase
        .from("matches")
        .select("*")
        .or(`user1_id.eq.${user?.id},user2_id.eq.${user?.id}`);

      if (error) throw error;

      const matchesWithProfiles = await Promise.all(
        (matchesData || []).map(async (match) => {
          const otherUserId = match.user1_id === user?.id ? match.user2_id : match.user1_id;
          
          const { data: profile } = await supabase
            .from("profiles")
            .select("id, name, avatar_url, is_online, last_seen")
            .eq("id", otherUserId)
            .single();

          return {
            id: match.id,
            profile: profile,
          };
        })
      );

      setMatches(matchesWithProfiles.filter(m => m.profile));
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

  const fetchMessages = async () => {
    if (!selectedMatch) return;

    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("match_id", selectedMatch)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const subscribeToMessages = () => {
    if (!selectedMatch) return;

    const channel = supabase
      .channel(`messages:${selectedMatch}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `match_id=eq.${selectedMatch}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `match_id=eq.${selectedMatch}`,
        },
        (payload) => {
          setMessages((prev) =>
            prev.map((msg) => (msg.id === payload.new.id ? payload.new as Message : msg))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedMatch || !user) return;

    setSending(true);

    try {
      const { error } = await supabase.from("messages").insert({
        match_id: selectedMatch,
        sender_id: user.id,
        content: newMessage.trim(),
      });

      if (error) throw error;
      setNewMessage("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSending(false);
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

  const currentMatch = matches.find(m => m.id === selectedMatch);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-4 h-[calc(100vh-140px)]">
        <div className="h-full max-w-4xl mx-auto flex gap-4">
          {/* Matches List */}
          <Card className="glass-card w-80 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-border">
              <h2 className="font-semibold">Messages</h2>
            </div>
            <div className="flex-1 overflow-y-auto">
              {matches.length === 0 ? (
                <p className="p-4 text-center text-muted-foreground text-sm">
                  No matches yet
                </p>
              ) : (
                matches.map((match) => (
                  <button
                    key={match.id}
                    onClick={() => setSelectedMatch(match.id)}
                    className={`w-full p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors ${
                      selectedMatch === match.id ? "bg-muted/50" : ""
                    }`}
                  >
                    <div className="relative">
                      <img
                        src={match.profile.avatar_url || defaultAvatar}
                        alt={match.profile.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      {match.profile.is_online && (
                        <Circle className="absolute bottom-0 right-0 w-3 h-3 fill-green-500 text-green-500" />
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-medium">{match.profile.name}</div>
                      {!match.profile.is_online && match.profile.last_seen && (
                        <div className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(match.profile.last_seen), { addSuffix: true })}
                        </div>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </Card>

          {/* Chat Area */}
          <Card className="glass-card flex-1 overflow-hidden flex flex-col">
            {!selectedMatch ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                Select a match to start chatting
              </div>
            ) : (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-border flex items-center gap-3">
                  <div className="relative">
                    <img
                      src={currentMatch?.profile.avatar_url || defaultAvatar}
                      alt={currentMatch?.profile.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    {currentMatch?.profile.is_online && (
                      <Circle className="absolute bottom-0 right-0 w-2.5 h-2.5 fill-green-500 text-green-500" />
                    )}
                  </div>
                  <div>
                    <div className="font-semibold">{currentMatch?.profile.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {currentMatch?.profile.is_online ? (
                        "Online now"
                      ) : currentMatch?.profile.last_seen ? (
                        `Active ${formatDistanceToNow(new Date(currentMatch.profile.last_seen), { addSuffix: true })}`
                      ) : (
                        "Offline"
                      )}
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map((message) => {
                    const isOwn = message.sender_id === user?.id;
                    return (
                      <div
                        key={message.id}
                        className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[70%] px-4 py-2 rounded-2xl ${
                            isOwn
                              ? "gradient-romantic text-white"
                              : "glass"
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                          <div className={`flex items-center gap-1 mt-1 text-xs ${isOwn ? "text-white/70" : "text-muted-foreground"}`}>
                            <span>
                              {new Date(message.created_at).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            {isOwn && message.is_read && (
                              <CheckCheck className="w-3 h-3" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <form onSubmit={handleSend} className="p-4 border-t border-border flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="glass flex-1"
                    disabled={sending}
                  />
                  <Button
                    type="submit"
                    className="gradient-romantic text-white"
                    disabled={sending || !newMessage.trim()}
                  >
                    {sending ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </Button>
                </form>
              </>
            )}
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Messages;
