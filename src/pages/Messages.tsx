import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Layout } from "@/components/Layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Loader2, Circle, CheckCheck, ArrowLeft, MoreVertical, Paperclip, User, Settings, AlertTriangle, Ban, Palette, MessageSquare, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ReportDialog } from "@/components/ReportDialog";
import { LiquidToggle } from "@/components/ui/liquid-toggle";
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
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

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
  { name: "Pink", gradient: "linear-gradient(135deg, hsl(338, 100%, 48%), hsl(338, 100%, 60%))" },
  { name: "Ocean", gradient: "linear-gradient(135deg, hsl(200, 80%, 50%), hsl(220, 70%, 60%))" },
  { name: "Sunset", gradient: "linear-gradient(135deg, hsl(30, 90%, 55%), hsl(350, 80%, 55%))" },
  { name: "Forest", gradient: "linear-gradient(135deg, hsl(140, 60%, 45%), hsl(100, 50%, 40%))" },
  { name: "Purple", gradient: "linear-gradient(135deg, hsl(270, 70%, 55%), hsl(290, 60%, 65%))" },
];

const Messages = () => {
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
  const [searchQuery, setSearchQuery] = useState("");
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

  useEffect(() => {
    if (matches.length > 0 && matchId && !selectedMatch) {
      setSelectedMatch(matchId);
    }
  }, [matches, matchId, selectedMatch]);

  useEffect(() => {
    if (selectedMatch) {
      fetchMessages();
      markMessagesAsRead();
      const unsubscribe = subscribeToMessages();
      return unsubscribe;
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
    if (!selectedMatch) return () => {};

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

      const { data: signedUrlData, error: urlError } = await supabase.storage
        .from('chat-attachments')
        .createSignedUrl(filePath, 3600);
      
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

  const filteredMatches = matches.filter(match => 
    match.profile.name.toLowerCase().includes(searchQuery.toLowerCase())
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

  const currentMatch = matches.find(m => m.id === selectedMatch);

  return (
    <Layout>
      <div className="h-[calc(100vh-136px)] flex">
        {/* Matches List */}
        <div className={`flex flex-col ${selectedMatch ? 'hidden md:flex md:w-80' : 'w-full md:w-80'} border-r border-white/10`}>
          {/* Search Header */}
          <div className="p-4 border-b border-white/10">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white/5 border-white/10 rounded-xl"
              />
            </div>
          </div>
          
          {/* Matches */}
          <div className="flex-1 overflow-y-auto">
            {filteredMatches.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 rounded-full liquid-glass flex items-center justify-center mx-auto mb-3">
                  <MessageSquare className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground text-sm">No matches yet</p>
              </div>
            ) : (
              filteredMatches.map((match, index) => (
                <button
                  key={match.id}
                  onClick={() => setSelectedMatch(match.id)}
                  className={`w-full p-4 flex items-center gap-3 transition-all hover:bg-white/5 animate-float-up ${
                    selectedMatch === match.id ? "bg-white/10" : ""
                  }`}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="relative">
                    <img
                      src={match.profile.avatar_url || defaultAvatar}
                      alt={match.profile.name}
                      className="w-14 h-14 rounded-full object-cover"
                    />
                    {match.profile.is_online && (
                      <span className="absolute bottom-0 right-0 w-4 h-4 bg-success rounded-full border-2 border-background" />
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{match.profile.name}</span>
                      {match.profile.verified && (
                        <span className="w-4 h-4 rounded-full bg-info flex items-center justify-center">
                          <span className="text-white text-[10px]">✓</span>
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {match.profile.is_online ? "Online now" : 
                        match.profile.last_seen ? `Active ${formatDistanceToNow(new Date(match.profile.last_seen), { addSuffix: true })}` : "Offline"}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className={`flex-1 flex flex-col ${selectedMatch ? 'flex' : 'hidden md:flex'}`}>
          {!selectedMatch ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="w-20 h-20 rounded-full liquid-glass flex items-center justify-center mb-4 animate-spring-in">
                <MessageSquare className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Your Messages</h3>
              <p className="text-muted-foreground text-sm">Select a match to start chatting</p>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-white/10 liquid-glass flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden rounded-full"
                  onClick={() => setSelectedMatch(null)}
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                
                <div className="relative">
                  <img
                    src={currentMatch?.profile.avatar_url || defaultAvatar}
                    alt={currentMatch?.profile.name}
                    className="w-11 h-11 rounded-full object-cover"
                  />
                  {currentMatch?.profile.verified && (
                    <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-info rounded-full flex items-center justify-center border-2 border-background">
                      <span className="text-white text-xs">✓</span>
                    </span>
                  )}
                </div>
                
                <div className="flex-1">
                  <div className="font-semibold">{currentMatch?.profile.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {currentMatch?.profile.is_online ? "Online now" : 
                      currentMatch?.profile.last_seen ? `Active ${formatDistanceToNow(new Date(currentMatch.profile.last_seen), { addSuffix: true })}` : "Offline"}
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full">
                      <MoreVertical className="w-5 h-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="liquid-glass rounded-2xl border-white/10 w-56">
                    <DropdownMenuItem onClick={() => navigate(`/profile?user=${currentMatch?.profile.id}`)} className="rounded-xl">
                      <User className="w-4 h-4 mr-2" />
                      View Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowSettings(true)} className="rounded-xl">
                      <Settings className="w-4 h-4 mr-2" />
                      Chat Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-white/10" />
                    <DropdownMenuItem onClick={() => setShowReportDialog(true)} className="rounded-xl">
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      Report User
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleBlockUser} className="text-destructive rounded-xl">
                      <Ban className="w-4 h-4 mr-2" />
                      Block User
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((message, index) => {
                  const isOwn = message.sender_id === user?.id;
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isOwn ? "justify-end" : "justify-start"} animate-float-up`}
                      style={{ animationDelay: `${index * 0.02}s` }}
                    >
                      <div
                        className={`max-w-[75%] px-4 py-2.5 rounded-2xl ${
                          isOwn ? "text-white rounded-br-md" : "liquid-glass rounded-bl-md"
                        }`}
                        style={isOwn ? { background: chatTheme.gradient } : {}}
                      >
                        {/^https?:\/\//.test(message.content) ? (
                          /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(message.content) ? (
                            <img src={message.content} alt="attachment" className="max-w-full rounded-xl max-h-60 object-cover" />
                          ) : (
                            <a href={message.content} target="_blank" rel="noopener noreferrer" className="underline text-sm">
                              {message.content}
                            </a>
                          )
                        ) : (
                          <p className="text-sm leading-relaxed">{message.content}</p>
                        )}
                        <div className={`flex items-center gap-1 mt-1 ${isOwn ? "justify-end" : ""}`}>
                          <span className={`text-[10px] ${isOwn ? "text-white/60" : "text-muted-foreground"}`}>
                            {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {isOwn && (
                            <CheckCheck className={`w-3 h-3 ${message.is_read ? "text-white" : "text-white/40"}`} />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-white/10">
                <form onSubmit={handleSend} className="flex items-center gap-3">
                  <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleFileUpload}
                    disabled={uploading}
                    className="rounded-full shrink-0"
                  >
                    {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5" />}
                  </Button>
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 bg-white/5 border-white/10 rounded-2xl py-6"
                  />
                  <Button
                    type="submit"
                    disabled={!newMessage.trim() || sending}
                    className="rounded-full w-11 h-11 p-0 shrink-0"
                    style={{ background: chatTheme.gradient }}
                  >
                    {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  </Button>
                </form>
              </div>
            </>
          )}
        </div>

        {/* Chat Settings Dialog */}
        <Dialog open={showSettings} onOpenChange={setShowSettings}>
          <DialogContent className="liquid-glass border-white/10 rounded-3xl max-w-sm">
            <DialogHeader>
              <DialogTitle>Chat Settings</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              {/* Theme Selection */}
              <div>
                <Label className="flex items-center gap-2 mb-3">
                  <Palette className="w-4 h-4" />
                  Chat Theme
                </Label>
                <div className="flex flex-wrap gap-2">
                  {CHAT_THEMES.map((theme) => (
                    <button
                      key={theme.name}
                      onClick={() => setChatTheme(theme)}
                      className={`w-10 h-10 rounded-full transition-all ${
                        chatTheme.name === theme.name ? "ring-2 ring-white ring-offset-2 ring-offset-background scale-110" : ""
                      }`}
                      style={{ background: theme.gradient }}
                      title={theme.name}
                    />
                  ))}
                </div>
              </div>

              {/* Mute Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Mute Notifications</p>
                  <p className="text-sm text-muted-foreground">Silence this conversation</p>
                </div>
                <LiquidToggle checked={muteNotifications} onCheckedChange={setMuteNotifications} />
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Report Dialog */}
        {currentMatch && (
          <ReportDialog
            open={showReportDialog}
            onOpenChange={setShowReportDialog}
            reportedId={currentMatch.profile.id}
          />
        )}
      </div>
    </Layout>
  );
};

export default Messages;
