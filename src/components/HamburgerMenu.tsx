import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu,
  X,
  Compass,
  Settings,
  Sliders,
  Heart,
  Sparkles,
  Shield,
  HelpCircle,
  Info,
  FileText,
  Mail,
  CreditCard,
  UserCheck,
  Bot,
  Wallet,
  Gift,
  Crown
} from "lucide-react";

interface MenuItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  path: string;
  badge?: string;
}

const menuSections = [
  {
    title: "Discover",
    items: [
      { icon: Sliders, label: "Discovery Settings", path: "/discovery-settings" },
      { icon: Compass, label: "Explore Feed", path: "/feed" },
      { icon: Heart, label: "My Matches", path: "/matches" },
    ],
  },
  {
    title: "Account",
    items: [
      { icon: Wallet, label: "Wallet", path: "/wallet" },
      { icon: Crown, label: "Upgrade Plan", path: "/donate", badge: "PRO" },
      { icon: UserCheck, label: "Get Verified", path: "/settings" },
      { icon: Settings, label: "Settings", path: "/settings" },
    ],
  },
  {
    title: "Support",
    items: [
      { icon: HelpCircle, label: "Help Center", path: "/help" },
      { icon: Mail, label: "Contact Us", path: "/contact" },
      { icon: Bot, label: "Ask PhilAI", path: "/help" },
    ],
  },
  {
    title: "Legal",
    items: [
      { icon: Shield, label: "Privacy Policy", path: "/privacy" },
      { icon: FileText, label: "Terms of Service", path: "/terms" },
      { icon: Info, label: "About DateWise", path: "/about" },
    ],
  },
];

export const HamburgerMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {/* Menu Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 hover:bg-secondary active:scale-95"
        aria-label="Open menu"
      >
        <Menu className="w-6 h-6 text-foreground" strokeWidth={2} />
      </button>

      {/* Overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/60 z-[100] backdrop-blur-sm"
            />

            {/* Drawer */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed left-0 top-0 bottom-0 w-[85%] max-w-[320px] bg-card z-[101] overflow-hidden flex flex-col cartoon-shadow-xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-accent flex items-center justify-center cartoon-shadow">
                    <Heart className="w-5 h-5 text-accent-foreground fill-current" />
                  </div>
                  <span className="text-xl font-black tracking-tight">DateWise</span>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-secondary active:scale-95 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Menu Items */}
              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {menuSections.map((section) => (
                  <div key={section.title}>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3 px-2">
                      {section.title}
                    </p>
                    <div className="space-y-1">
                      {section.items.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item.path);
                        return (
                          <Link
                            key={item.path + item.label}
                            to={item.path}
                            onClick={() => setIsOpen(false)}
                            className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all active:scale-[0.98] ${
                              active
                                ? "bg-accent text-accent-foreground cartoon-shadow"
                                : "hover:bg-secondary"
                            }`}
                          >
                            <Icon className={`w-5 h-5 ${active ? "text-accent-foreground" : "text-muted-foreground"}`} />
                            <span className={`flex-1 font-medium ${active ? "" : "text-foreground"}`}>
                              {item.label}
                            </span>
                            {item.badge && (
                              <span className="px-2 py-0.5 text-[10px] font-bold bg-accent text-accent-foreground rounded-full">
                                {item.badge}
                              </span>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer Illustration */}
              <div className="p-5 border-t border-border">
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <Sparkles className="w-4 h-4" />
                  <span className="text-xs font-medium">Find your perfect match</span>
                  <Sparkles className="w-4 h-4" />
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
