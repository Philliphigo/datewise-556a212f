import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Heart, MessageCircle, User, Compass, Flame, Settings } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Footer } from "./Footer";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [clickCount, setClickCount] = useState(0);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [newMatches, setNewMatches] = useState(0);

  const navItems = [
    { icon: Flame, label: "Home", path: "/discover" },
    { icon: Compass, label: "Explore", path: "/feed" },
    { icon: Heart, label: "Likes", path: "/matches" },
    { icon: MessageCircle, label: "Chat", path: "/messages", badge: unreadMessages },
    { icon: User, label: "Profile", path: "/profile" },
  ];

  const isActive = (path: string) => location.pathname === path;

  useEffect(() => {
    if (!user) return;

    const fetchCounts = async () => {
      const { data: matches } = await supabase
        .from("matches")
        .select("id, created_at")
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

      if (matches) {
        const matchIds = matches.map(m => m.id);
        
        const { data: messages } = await supabase
          .from("messages")
          .select("id")
          .in("match_id", matchIds)
          .neq("sender_id", user.id)
          .eq("is_read", false);

        setUnreadMessages(messages?.length || 0);

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const recentMatches = matches.filter(m => new Date(m.created_at) > yesterday);
        setNewMatches(recentMatches.length);
      }
    };

    fetchCounts();

    const channel = supabase
      .channel('notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => fetchCounts())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, () => fetchCounts())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'matches' }, () => fetchCounts())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const handleAdminClick = () => {
    setClickCount(prev => prev + 1);
    setTimeout(() => setClickCount(0), 500);
    if (clickCount + 1 === 2) {
      setShowPasswordDialog(true);
      setClickCount(0);
    }
  };

  const handleAdminAccess = async () => {
    if (!user) return;
    setIsCheckingAuth(true);
    try {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (data) {
        setShowPasswordDialog(false);
        navigate('/admin');
      } else {
        toast({ title: "Access Denied", description: "You don't have admin privileges", variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsCheckingAuth(false);
    }
  };

  const isAdminRoute = location.pathname === '/admin';

  if (!user) return <>{children}</>;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* iOS Header - Hidden on most pages, shown contextually */}
      {!isAdminRoute && (
        <header className="fixed top-0 left-0 right-0 z-50 ios-header">
          <div className="flex items-center justify-between h-14 px-4">
            {/* Left - Filter/Settings */}
            <Link 
              to="/discovery-settings"
              className="w-10 h-10 flex items-center justify-center rounded-full haptic-light"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-foreground">
                <path d="M4 6H20M4 12H20M4 18H12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </Link>

            {/* Center - Title */}
            <div 
              className="absolute left-1/2 -translate-x-1/2 cursor-default"
              onClick={handleAdminClick}
            >
              <h1 className="text-lg font-semibold text-foreground">For You</h1>
            </div>

            {/* Right - Actions */}
            <div className="flex items-center gap-2">
              <Link 
                to="/settings"
                className="w-10 h-10 flex items-center justify-center rounded-full haptic-light"
              >
                <Settings className="w-5 h-5 text-foreground" />
              </Link>
            </div>
          </div>
        </header>
      )}

      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="liquid-glass rounded-3xl border-0">
          <DialogHeader>
            <DialogTitle>Admin Access</DialogTitle>
            <DialogDescription>Verifying admin permissions...</DialogDescription>
          </DialogHeader>
          <Button onClick={handleAdminAccess} disabled={isCheckingAuth} className="w-full rounded-2xl h-12">
            {isCheckingAuth ? "Verifying..." : "Access Dashboard"}
          </Button>
        </DialogContent>
      </Dialog>

      <main className={isAdminRoute ? "flex-1" : "flex-1 pt-14 pb-20"}>{children}</main>
      {!isAdminRoute && <Footer />}

      {/* iOS Tab Bar */}
      {!isAdminRoute && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 ios-nav pb-safe-bottom">
          <div className="flex items-center justify-around h-20 px-2 max-w-lg mx-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link 
                  key={item.path} 
                  to={item.path} 
                  className="relative flex flex-col items-center justify-center gap-1 min-w-[64px] py-2 haptic-light"
                >
                  <div className="relative">
                    {active && item.path === "/discover" ? (
                      <div className="w-7 h-7 rounded-full bg-foreground flex items-center justify-center">
                        <Icon className="w-4 h-4 text-background" fill="currentColor" />
                      </div>
                    ) : (
                      <Icon 
                        className={`w-6 h-6 transition-colors duration-200 ${
                          active ? "text-primary" : "text-muted-foreground"
                        }`} 
                        strokeWidth={active ? 2.5 : 2}
                      />
                    )}
                    {item.badge && item.badge > 0 && (
                      <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
                    )}
                  </div>
                  <span className={`text-[10px] font-medium transition-colors duration-200 ${
                    active ? "text-foreground" : "text-muted-foreground"
                  }`}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
};
