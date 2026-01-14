import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Palette, Check, Image, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

interface ChatWallpaperPickerProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: { name: string; gradient: string };
  currentWallpaper: string | null;
  onSave: (theme: { name: string; gradient: string }, wallpaper: string | null) => void;
}

const CHAT_THEMES = [
  { name: "Pink", gradient: "linear-gradient(135deg, hsl(338, 100%, 48%), hsl(338, 100%, 60%))" },
  { name: "Ocean", gradient: "linear-gradient(135deg, hsl(200, 80%, 50%), hsl(220, 70%, 60%))" },
  { name: "Sunset", gradient: "linear-gradient(135deg, hsl(30, 90%, 55%), hsl(350, 80%, 55%))" },
  { name: "Forest", gradient: "linear-gradient(135deg, hsl(140, 60%, 45%), hsl(100, 50%, 40%))" },
  { name: "Purple", gradient: "linear-gradient(135deg, hsl(270, 70%, 55%), hsl(290, 60%, 65%))" },
  { name: "Gold", gradient: "linear-gradient(135deg, hsl(45, 100%, 50%), hsl(30, 90%, 45%))" },
  { name: "Teal", gradient: "linear-gradient(135deg, hsl(175, 70%, 45%), hsl(190, 60%, 50%))" },
  { name: "Rose", gradient: "linear-gradient(135deg, hsl(350, 70%, 60%), hsl(330, 80%, 65%))" },
];

const WALLPAPERS = [
  { 
    id: "hearts",
    name: "Hearts",
    css: "radial-gradient(circle at 20% 80%, hsl(338 100% 48% / 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 20%, hsl(338 100% 48% / 0.1) 0%, transparent 50%), radial-gradient(circle at 50% 50%, hsl(338 100% 48% / 0.05) 0%, transparent 70%)"
  },
  {
    id: "gradient-soft",
    name: "Soft Gradient",
    css: "linear-gradient(135deg, hsl(var(--muted)) 0%, hsl(var(--background)) 50%, hsl(var(--muted)) 100%)"
  },
  {
    id: "stars",
    name: "Starry",
    css: "radial-gradient(2px 2px at 20% 30%, hsl(var(--primary) / 0.3), transparent), radial-gradient(2px 2px at 40% 70%, hsl(var(--primary) / 0.2), transparent), radial-gradient(2px 2px at 50% 50%, hsl(var(--primary) / 0.3), transparent), radial-gradient(2px 2px at 70% 20%, hsl(var(--primary) / 0.2), transparent), radial-gradient(2px 2px at 90% 40%, hsl(var(--primary) / 0.3), transparent), hsl(var(--background))"
  },
  {
    id: "bubbles",
    name: "Bubbles",
    css: "radial-gradient(circle at 10% 90%, hsl(var(--primary) / 0.15) 0%, transparent 20%), radial-gradient(circle at 90% 10%, hsl(var(--primary) / 0.1) 0%, transparent 25%), radial-gradient(circle at 50% 50%, hsl(var(--primary) / 0.08) 0%, transparent 30%), hsl(var(--background))"
  },
  {
    id: "waves",
    name: "Waves",
    css: "repeating-linear-gradient(45deg, transparent, transparent 20px, hsl(var(--primary) / 0.03) 20px, hsl(var(--primary) / 0.03) 40px), hsl(var(--background))"
  },
  {
    id: "diamonds",
    name: "Diamonds",
    css: "repeating-linear-gradient(45deg, hsl(var(--primary) / 0.02) 0px, hsl(var(--primary) / 0.02) 2px, transparent 2px, transparent 10px), repeating-linear-gradient(-45deg, hsl(var(--primary) / 0.02) 0px, hsl(var(--primary) / 0.02) 2px, transparent 2px, transparent 10px), hsl(var(--background))"
  }
];

export const ChatWallpaperPicker = ({ 
  isOpen, 
  onClose, 
  currentTheme, 
  currentWallpaper,
  onSave 
}: ChatWallpaperPickerProps) => {
  const [selectedTheme, setSelectedTheme] = useState(currentTheme);
  const [selectedWallpaper, setSelectedWallpaper] = useState<string | null>(currentWallpaper);

  useEffect(() => {
    setSelectedTheme(currentTheme);
    setSelectedWallpaper(currentWallpaper);
  }, [currentTheme, currentWallpaper, isOpen]);

  const handleSave = () => {
    onSave(selectedTheme, selectedWallpaper);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md rounded-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-primary" strokeWidth={1.5} />
            Chat Appearance
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Preview */}
          <div 
            className="relative h-40 rounded-2xl overflow-hidden border border-border/50"
            style={{ background: selectedWallpaper ? WALLPAPERS.find(w => w.id === selectedWallpaper)?.css : 'hsl(var(--background))' }}
          >
            <div className="absolute inset-0 flex flex-col justify-end p-4 gap-2">
              <div className="self-start max-w-[70%] p-3 rounded-2xl rounded-bl-md bg-muted/80 backdrop-blur-sm">
                <p className="text-sm">Hey! How are you? 👋</p>
              </div>
              <div 
                className="self-end max-w-[70%] p-3 rounded-2xl rounded-br-md text-white"
                style={{ background: selectedTheme.gradient }}
              >
                <p className="text-sm">I'm doing great, thanks! 💖</p>
              </div>
            </div>
          </div>

          {/* Bubble Color */}
          <div>
            <Label className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-primary" strokeWidth={1.5} />
              Message Bubble Color
            </Label>
            <div className="grid grid-cols-4 gap-3">
              {CHAT_THEMES.map((theme) => (
                <motion.button
                  key={theme.name}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedTheme(theme)}
                  className={`relative w-12 h-12 rounded-full transition-all ${
                    selectedTheme.name === theme.name ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""
                  }`}
                  style={{ background: theme.gradient }}
                  title={theme.name}
                >
                  {selectedTheme.name === theme.name && (
                    <Check className="w-5 h-5 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  )}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Wallpaper */}
          <div>
            <Label className="flex items-center gap-2 mb-3">
              <Image className="w-4 h-4 text-primary" strokeWidth={1.5} />
              Chat Background
            </Label>
            <div className="grid grid-cols-3 gap-3">
              {/* No wallpaper option */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedWallpaper(null)}
                className={`relative h-20 rounded-2xl border-2 transition-all bg-background ${
                  selectedWallpaper === null ? "border-primary" : "border-border/50"
                }`}
              >
                <span className="text-xs text-muted-foreground">Default</span>
                {selectedWallpaper === null && (
                  <Check className="w-4 h-4 text-primary absolute top-2 right-2" />
                )}
              </motion.button>
              
              {WALLPAPERS.map((wallpaper) => (
                <motion.button
                  key={wallpaper.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedWallpaper(wallpaper.id)}
                  className={`relative h-20 rounded-2xl border-2 transition-all ${
                    selectedWallpaper === wallpaper.id ? "border-primary" : "border-border/50"
                  }`}
                  style={{ background: wallpaper.css }}
                >
                  <span className="text-xs text-muted-foreground absolute bottom-2 left-2">{wallpaper.name}</span>
                  {selectedWallpaper === wallpaper.id && (
                    <Check className="w-4 h-4 text-primary absolute top-2 right-2" />
                  )}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Save Button */}
          <Button
            onClick={handleSave}
            className="w-full h-12 rounded-2xl"
          >
            <Check className="w-4 h-4 mr-2" />
            Save Appearance
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const getWallpaperCSS = (wallpaperId: string | null): string => {
  if (!wallpaperId) return 'transparent';
  return WALLPAPERS.find(w => w.id === wallpaperId)?.css || 'transparent';
};
