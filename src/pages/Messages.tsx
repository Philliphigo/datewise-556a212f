import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Loader2, Circle, CheckCheck, ArrowLeft, MoreVertical, Paperclip, User, Settings, AlertTriangle, Ban, Palette } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ReportDialog } from "@/components/ReportDialog";
import defaultAvatar from "@/assets/default-avatar.jpg";
import { formatDistanceToNow } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

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
    verified: boolean;
  };
}

const CHAT_THEMES = [
  { name: "Romantic", gradient: "linear-gradient(135deg, hsl(330, 80%, 65%), hsl(280, 70%, 65%))" },
  { name: "Ocean", gradient: "linear-gradient(135deg, hsl(200, 80%, 65%), hsl(240, 70%, 65%))" },
  { name: "Sunset", gradient: "linear-gradient(135deg, hsl(30, 90%, 65%), hsl(350, 80%, 65%))" },
  { name: "Forest", gradient: "linear-gradient(135deg, hsl(140, 60%, 55%), hsl(100, 50%, 45%))" },
  { name: "Purple", gradient: "linear-gradient(135deg, hsl(270, 70%, 65%), hsl(290, 60%, 70%))" },
];

const Messages = () => {
  useEffect(() => {
    // Add Google AdSense script to head
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8299009369780520';
    script.crossOrigin = 'anonymous';
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const matchId = searchParams.get("match");

  const [matches, setMatches] = useState<MatchInfo[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [chatTheme, setChatTheme] = useState(CHAT_THEMES[0]);
  const [muteNotifications, setMuteNotifications] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Auto-select Team DateWise chat on mount if no match specified
  useEffect(() => {
    if (matches.length > 0 && !matchId && !selectedMatch) {
      const teamDateWise = matches.find(m => m.profile.id === '00000000-0000-0000-0000-000000000001');
      if (teamDateWise) {
        setSelectedMatch(teamDateWise.id);
      }
    }
  }, [matches, matchId, selectedMatch]);

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
            .select("id, name, avatar_url, is_online, last_seen, verified")
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

  const handleBlockUser = async () => {
    if (!currentMatch || !user) return;
    
    try {
      const { error } = await supabase.from("blocked_users").insert({
        blocker_id: user.id,
        blocked_id: currentMatch.profile.id,
      });

      if (error) throw error;

      toast({
        title: "User Blocked",
        description: "You will no longer receive messages from this user.",
      });
      
      setSelectedMatch(null);
      fetchMatches();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedMatch || !user) return;

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const filePath = `${user.id}/${selectedMatch}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('chat-attachments')
        .upload(filePath, file, { upsert: false });
      if (uploadError) throw uploadError;

      // Use signed URL for private bucket
      const { data: signedUrlData, error: urlError } = await supabase.storage
        .from('chat-attachments')
        .createSignedUrl(filePath, 3600); // 1 hour expiry
      
      if (urlError) throw urlError;
      const url = signedUrlData.signedUrl;

      const { error: insertError } = await supabase.from('messages').insert({
        match_id: selectedMatch,
        sender_id: user.id,
        content: url,
      });
      if (insertError) throw insertError;

      toast({ title: 'File sent', description: file.name });
    } catch (error: any) {
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
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
        <div className="h-full max-w-4xl mx-auto">
          {/* Mobile: Show either list OR chat */}
          <div className="h-full flex md:gap-4">
            {/* Matches List */}
            <Card className={`glass-card overflow-hidden flex flex-col ${selectedMatch ? 'hidden md:flex md:w-80' : 'w-full md:w-80'}`}>
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
            <Card className={`glass-card overflow-hidden flex flex-col ${selectedMatch ? 'flex w-full md:flex-1' : 'hidden md:flex md:flex-1'}`}>
              {!selectedMatch ? (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  Select a match to start chatting
                </div>
              ) : (
                <>
                  {/* Chat Header */}
                  <div className="p-4 border-b border-border flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="md:hidden"
                      onClick={() => setSelectedMatch(null)}
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </Button>
                    
                    <div className="relative">
                      <img
                        src={currentMatch?.profile.avatar_url || defaultAvatar}
                        alt={currentMatch?.profile.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      {currentMatch?.profile.verified && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center border-2 border-background">
                          <span className="text-white text-xs font-bold">✓</span>
                        </div>
                      )}
                      {!currentMatch?.profile.verified && currentMatch?.profile.is_online && (
                        <Circle className="absolute bottom-0 right-0 w-2.5 h-2.5 fill-green-500 text-green-500" />
                      )}
                    </div>
                    <div className="flex-1">
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

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="w-5 h-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="glass">
                        <DropdownMenuItem onClick={() => navigate(`/profile?user=${currentMatch?.profile.id}`)}>
                          <User className="w-4 h-4 mr-2" />
                          View Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setShowSettings(true)}>
                          <Settings className="w-4 h-4 mr-2" />
                          Chat Settings
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setShowReportDialog(true)}>
                          <AlertTriangle className="w-4 h-4 mr-2" />
                          Report User
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleBlockUser} className="text-destructive">
                          <Ban className="w-4 h-4 mr-2" />
                          Block User
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
                                ? "text-white"
                                : "glass"
                            }`}
                            style={isOwn ? { background: chatTheme.gradient } : {}}
                          >
                            {/^https?:\/\//.test(message.content) ? (
                              /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(message.content) ? (
                                <a href={message.content} target="_blank" rel="noopener noreferrer">
                                  <img src={message.content} alt="Attachment" className="rounded-lg max-h-60 object-cover" loading="lazy" />
                                </a>
                              ) : (
                                <a href={message.content} target="_blank" rel="noopener noreferrer" className="underline break-all">
                                  {message.content}
                                </a>
                              )
                            ) : (
                              <p className="text-sm">{message.content}</p>
                            )}
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
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      className="hidden"
                      accept="image/*,application/pdf,.doc,.docx"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={handleFileUpload}
                    >
                      <Paperclip className="w-5 h-5" />
                    </Button>
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                      className="glass flex-1"
                      disabled={sending}
                    />
                    <Button
                      type="submit"
                      className="text-white"
                      style={{ background: chatTheme.gradient }}
                      disabled={sending || uploading || !newMessage.trim()}
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
      </div>

      {/* Chat Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="glass-card">
          <DialogHeader>
            <DialogTitle>Chat Settings</DialogTitle>
            <DialogDescription>Customize your chat experience</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Mute Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Don't receive notifications from this chat
                </p>
              </div>
              <Switch
                checked={muteNotifications}
                onCheckedChange={setMuteNotifications}
              />
            </div>

            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Palette className="w-4 h-4" />
                Chat Theme
              </Label>
              <div className="grid grid-cols-3 gap-3">
                {CHAT_THEMES.map((theme) => (
                  <button
                    key={theme.name}
                    onClick={() => setChatTheme(theme)}
                    className={`h-12 rounded-lg border-2 transition-all ${
                      chatTheme.name === theme.name
                        ? "border-primary scale-105"
                        : "border-border hover:border-primary/50"
                    }`}
                    style={{ background: theme.gradient }}
                  >
                    <span className="text-xs text-white font-medium drop-shadow-md">
                      {theme.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Report Dialog */}
      {currentMatch && showReportDialog && (
        <ReportDialog
          reportedUserId={currentMatch.profile.id}
          reportedUserName={currentMatch.profile.name}
        />
      )}
    </Layout>
  );
};

export default Messages;
