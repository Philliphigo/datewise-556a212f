import { Badge } from "@/components/ui/badge";
import { 
  Moon, 
  Coffee, 
  Heart, 
  Flame, 
  Sparkles,
  Wine,
  Music,
  Camera,
  Utensils
} from "lucide-react";

interface Category {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const categories: Category[] = [
  { id: "all", name: "All", icon: Sparkles, color: "from-primary/20 to-primary/10" },
  { id: "free-tonight", name: "Free Tonight", icon: Moon, color: "from-purple-500/20 to-purple-400/10" },
  { id: "casual", name: "Casual", icon: Coffee, color: "from-amber-500/20 to-amber-400/10" },
  { id: "hookup", name: "Hookup", icon: Flame, color: "from-rose-500/20 to-rose-400/10" },
  { id: "coffee-date", name: "Coffee Date", icon: Coffee, color: "from-yellow-500/20 to-yellow-400/10" },
  { id: "dinner-date", name: "Dinner Date", icon: Utensils, color: "from-orange-500/20 to-orange-400/10" },
  { id: "drinks", name: "Drinks", icon: Wine, color: "from-red-500/20 to-red-400/10" },
  { id: "concert", name: "Concert", icon: Music, color: "from-indigo-500/20 to-indigo-400/10" },
  { id: "adventure", name: "Adventure", icon: Camera, color: "from-green-500/20 to-green-400/10" },
  { id: "long-term", name: "Long Term", icon: Heart, color: "from-pink-500/20 to-pink-400/10" },
];

interface FeedCategoriesProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

export const FeedCategories = ({ selectedCategory, onCategoryChange }: FeedCategoriesProps) => {
  return (
    <div className="w-full pb-2 overflow-x-auto hide-scrollbar">
      <div className="flex gap-2 px-1 min-w-max">
        {categories.map((category) => {
          const Icon = category.icon;
          const isActive = selectedCategory === category.id;
          
          return (
            <button
              key={category.id}
              onClick={() => onCategoryChange(category.id)}
              className={`flex flex-col items-center justify-center min-w-[70px] p-3 rounded-2xl transition-all ${
                isActive 
                  ? `bg-gradient-to-br ${category.color} border-2 border-primary/30 scale-105 shadow-lg` 
                  : "bg-muted/30 hover:bg-muted/50 border border-border/30"
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-1 ${
                isActive ? "animate-pulse" : ""
              }`}>
                <Icon className={`w-6 h-6 ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`} />
              </div>
              <span className={`text-xs font-medium text-center ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}>
                {category.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
