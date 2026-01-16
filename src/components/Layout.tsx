import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Heart, MessageCircle, User, Compass, Flame, Settings, Moon, Sun, Ban, Crown, Star } from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const { user, signOut, suspension } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [clickCount, setClickCount] = useState(0);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [newMatches, setNewMatches] = useState(0);
  const [subscription, setSubscription] = useState<{ tier: string } | null>(null);
  const [isDark, setIsDark] = useState(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case "vip": return Crown;
      case "premium": return Star;
      default: return Heart;
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "vip": return "from-yellow-500 to-amber-600";
      case "premium": return "from-primary to-primary-soft";
      default: return "from-pink-500 to-rose-600";
    }
  };

  const toggleTheme = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    if (newIsDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const navItems = [
    { icon: Flame, label: "Discover", path: "/discover" },
    { icon: Heart, label: "Matches", path: "/matches", badge: newMatches > 0 ? newMatches : undefined },
    { icon: Compass, label: "Feed", path: "/feed" },
    { icon: MessageCircle, label: "Messages", path: "/messages", badge: unreadMessages > 0 ? unreadMessages : undefined },
    { icon: User, label: "Profile", path: "/profile" },
  ];

  const isActive = (path: string) => location.pathname === path;

  const getPageTitle = () => {
    switch (location.pathname) {
      case "/discover": return "Discover";
      case "/matches": return "Matches";
      case "/feed": return "Feed";
      case "/messages": return "Messages";
      case "/profile": return "Profile";
      case "/settings": return "Settings";
      default: return "DateWise";
    }
  };

  useEffect(() => {
    if (!user) return;

    const fetchCounts = async () => {
      const { data: matches } = await supabase
        .from("matches")
        .select("id, created_at")
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

      if (matches) {
        const matchIds = matches.map(m => m.id);
        
        if (matchIds.length > 0) {
          const { data: messages } = await supabase
            .from("messages")
            .select("id")
            .in("match_id", matchIds)
            .neq("sender_id", user.id)
            .eq("is_read", false);

          setUnreadMessages(messages?.length || 0);
        }

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const recentMatches = matches.filter(m => new Date(m.created_at || '') > yesterday);
        setNewMatches(recentMatches.length);
      }
    };

    const fetchSubscription = async () => {
      const { data } = await supabase
        .from("subscriptions")
        .select("tier")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .single();
      
      setSubscription(data);
    };

    fetchCounts();
    fetchSubscription();

    const channel = supabase
      .channel('notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => fetchCounts())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, () => fetchCounts())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'matches' }, () => fetchCounts())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subscriptions' }, () => fetchSubscription())
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

  if (suspension?.active) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ban className="w-5 h-5 text-destructive" />
              Account Suspended
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Your account is currently suspended{`
              `}{suspension.until ? `until ${new Date(suspension.until).toLocaleString()}.` : "indefinitely."}
            </p>
            {suspension.reason && (
              <p className="text-sm">
                <span className="text-muted-foreground">Reason:</span> {suspension.reason}
              </p>
            )}
            <div className="pt-2">
              <Button variant="outline" className="w-full" onClick={signOut}>
                Sign out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      {!isAdminRoute && (
        <header className="fixed top-0 left-0 right-0 z-50 header-bar">
          <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
            {/* Left - Filter/Settings */}
            <Link 
              to="/discovery-settings"
              className="w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 hover:bg-secondary active:scale-95"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-foreground">
                <path d="M3 6H21M3 12H21M3 18H15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </Link>

            {/* Center - Dynamic Title with Subscription Badge */}
            <div 
              className="absolute left-1/2 -translate-x-1/2 cursor-default flex items-center gap-2"
              onClick={handleAdminClick}
            >
              <h1 className="text-lg font-semibold text-foreground tracking-tight font-display">{getPageTitle()}</h1>
              {subscription && (
                <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r ${getTierColor(subscription.tier)} text-white text-[10px] font-semibold shadow-sm`}>
                  {(() => {
                    const TierIcon = getTierIcon(subscription.tier);
                    return <TierIcon className="w-3 h-3" />;
                  })()}
                  <span className="capitalize">{subscription.tier}</span>
                </div>
              )}
            </div>

            {/* Right - Theme Toggle & Settings */}
            <div className="flex items-center gap-1">
              <button 
                onClick={toggleTheme}
                className="w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 hover:bg-secondary active:scale-95"
                aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDark ? (
                  <Sun className="w-5 h-5 text-primary" strokeWidth={1.5} />
                ) : (
                  <Moon className="w-5 h-5 text-foreground" strokeWidth={1.5} />
                )}
              </button>
              <Link 
                to="/settings"
                className="w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 hover:bg-secondary active:scale-95"
              >
                <Settings className="w-5 h-5 text-foreground" strokeWidth={1.5} />
              </Link>
            </div>
          </div>
        </header>
      )}

      {/* Admin Access Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="rounded-2xl border-0 max-w-sm mx-4 shadow-soft-2xl">
          <DialogHeader className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
              <Settings className="w-8 h-8 text-primary" strokeWidth={1.5} />
            </div>
            <DialogTitle className="text-xl font-display">Admin Access</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Verifying your admin permissions...
            </DialogDescription>
          </DialogHeader>
          <Button 
            onClick={handleAdminAccess} 
            disabled={isCheckingAuth} 
            className="w-full h-12 text-base font-medium mt-2"
          >
            {isCheckingAuth ? "Verifying..." : "Access Dashboard"}
          </Button>
        </DialogContent>
      </Dialog>

      <main className={isAdminRoute ? "flex-1" : "flex-1 pt-14 pb-24"}>{children}</main>
      {!isAdminRoute && <Footer />}

      {/* Tab Bar */}
      {!isAdminRoute && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 tab-bar">
          <div className="flex items-center justify-around h-[80px] px-2 max-w-lg mx-auto pb-safe-bottom">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link 
                  key={item.path} 
                  to={item.path} 
                  className="relative flex flex-col items-center justify-center gap-1 min-w-[64px] py-2 rounded-xl transition-all duration-200 hover:bg-secondary active:scale-95"
                >
                  <div className="relative">
                    <Icon 
                      className={`w-6 h-6 transition-colors duration-200 ${
                        active ? "text-primary" : "text-muted-foreground"
                      }`} 
                      strokeWidth={active ? 2 : 1.5}
                    />
                    
                    {/* Notification Badge */}
                    {item.badge && item.badge > 0 && (
                      <span className="notification-badge animate-bounce-in">
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
                    )}
                  </div>
                  
                  {/* Label */}
                  <span className={`text-[10px] font-medium transition-colors duration-200 ${
                    active ? "text-primary" : "text-muted-foreground"
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
