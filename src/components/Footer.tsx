import { Link } from "react-router-dom";
import { Heart } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="glass-card mt-auto border-t border-border relative">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center gap-4">
          {/* Brand */}
          <div className="flex items-center gap-2">
            <Heart className="w-6 h-6 text-primary fill-primary" />
            <span className="text-xl font-bold gradient-text">DateWise</span>
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Find your perfect match with intelligent dating
          </p>

          <div className="mt-4 text-sm text-muted-foreground">
            <p>&copy; 2025 DateWise. All rights reserved.</p>
          </div>
        </div>
      </div>
      {/* Hidden developer credit under nav */}
      <div className="absolute bottom-[72px] left-0 right-0 flex justify-center">
        <p className="text-[10px] text-muted-foreground/50">by phil</p>
      </div>
    </footer>
  );
};
