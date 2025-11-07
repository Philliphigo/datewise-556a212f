import { ReactNode, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Heart, Flame, MessageCircle, Users, User, Rss, Settings, Sliders } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Footer } from "./Footer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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
  const [adminPassword, setAdminPassword] = useState("");
  const [isCheckingAuth, setIsCheckingAuth] = useState(false);

  const navItems = [
    { icon: Flame, label: "Discover", path: "/discover" },
    { icon: Users, label: "Matches", path: "/matches" },
    { icon: Rss, label: "Feed", path: "/feed" },
    { icon: MessageCircle, label: "Messages", path: "/messages" },
    { icon: User, label: "Profile", path: "/profile" },
  ];

  const isActive = (path: string) => location.pathname === path;

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
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setShowPasswordDialog(false);
        setAdminPassword("");
        navigate('/admin');
      } else {
        toast({
          title: "Access Denied",
          description: "You don't have admin privileges",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsCheckingAuth(false);
    }
  };

  const isAdminRoute = location.pathname === '/admin';

  if (!user) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      {!isAdminRoute && (
        <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50 shadow-elegant-sm">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <Link to="/discover" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Heart className="w-6 h-6 text-primary" fill="currentColor" />
              </div>
              <span className="text-xl font-semibold text-foreground">DateWise</span>
            </Link>
            
            {/* Invisible admin button in center */}
            <div 
              className="absolute left-1/2 transform -translate-x-1/2 w-20 h-12 cursor-default"
              onClick={handleAdminClick}
            />
            
            <div className="flex items-center gap-4">
              <Link to="/discovery-settings">
                <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors">
                  <Sliders className="w-5 h-5 text-foreground" />
                </div>
              </Link>
              <Link to="/settings">
                <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors">
                  <Settings className="w-5 h-5 text-foreground" />
                </div>
              </Link>
            </div>
          </div>
        </header>
      )}

      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="rounded-3xl border-2 border-border/50">
          <DialogHeader>
            <DialogTitle>Admin Access</DialogTitle>
            <DialogDescription>
              Verifying admin permissions...
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Button
              onClick={handleAdminAccess}
              disabled={isCheckingAuth}
              className="w-full rounded-2xl h-12"
            >
              {isCheckingAuth ? "Verifying..." : "Access Dashboard"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <main className={isAdminRoute ? "flex-1" : "flex-1 pt-16 pb-20"}>{children}</main>
      {!isAdminRoute && <Footer />}

      {!isAdminRoute && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border/30">
          <div className="flex items-center justify-around h-16 px-4 max-w-md mx-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className="flex flex-col items-center justify-center gap-1 transition-all group min-w-[60px]"
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                >
                  <Icon className={`w-6 h-6 transition-colors ${
                    active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                  }`} />
                  <span className={`text-xs font-medium transition-colors ${
                    active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
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
