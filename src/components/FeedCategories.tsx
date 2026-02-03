import { 
  Moon, 
  Coffee, 
  Heart, 
  Flame, 
  Sparkles,
  Wine,
  Music,
  Camera,
  Utensils,
  LucideIcon
} from "lucide-react";

interface Category {
  id: string;
  name: string;
  icon: LucideIcon;
}

const categories: Category[] = [
  { id: "all", name: "All", icon: Sparkles },
  { id: "free-tonight", name: "Free Tonight", icon: Moon },
  { id: "casual", name: "Casual", icon: Coffee },
  { id: "hookup", name: "Hookup", icon: Flame },
  { id: "coffee-date", name: "Coffee Date", icon: Coffee },
  { id: "dinner-date", name: "Dinner Date", icon: Utensils },
  { id: "drinks", name: "Drinks", icon: Wine },
  { id: "concert", name: "Concert", icon: Music },
  { id: "adventure", name: "Adventure", icon: Camera },
  { id: "long-term", name: "Long Term", icon: Heart },
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
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border-2 transition-all duration-200 active:scale-95 ${
                isActive 
                  ? "bg-accent text-accent-foreground border-accent cartoon-shadow font-bold" 
                  : "bg-card text-muted-foreground border-foreground/10 hover:border-foreground/20"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-sm whitespace-nowrap">
                {category.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
