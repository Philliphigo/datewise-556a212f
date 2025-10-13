import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Heart, Flame, MessageCircle, Users, User, Rss, Settings } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { NotificationBell } from "./NotificationBell";
import { Footer } from "./Footer";
interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const { user } = useAuth();

  const navItems = [
    { icon: Flame, label: "Discover", path: "/discover" },
    { icon: Users, label: "Matches", path: "/matches" },
    { icon: Rss, label: "Feed", path: "/feed" },
    { icon: MessageCircle, label: "Messages", path: "/messages" },
    { icon: User, label: "Profile", path: "/profile" },
  ];

  const isActive = (path: string) => location.pathname === path;

  if (!user) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/discover" className="flex items-center gap-2">
            <Heart className="w-8 h-8 text-primary animate-glow" fill="currentColor" />
            <span className="text-2xl font-display gradient-text">DateWise</span>
          </Link>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <Link to="/settings">
              <Settings className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" />
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 pt-16 pb-20">{children}</main>
      <Footer />

      <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-border" style={{ position: 'fixed' }}>
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-around h-20">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex flex-col items-center justify-center gap-1 transition-all ${
                    active
                      ? "text-primary scale-110"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                >
                  <Icon className={`w-6 h-6 ${active ? "animate-pulse-soft" : ""}`} />
                  <span className="text-xs font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
};
