import { useState, useEffect } from "react";
import { Moon, Sun } from "lucide-react";

interface ThemeToggleProps {
  className?: string;
}

export const ThemeToggle = ({ className }: ThemeToggleProps) => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Check initial theme
    const isDarkMode = document.documentElement.classList.contains('dark');
    setIsDark(isDarkMode);
  }, []);

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

  return (
    <button
      onClick={toggleTheme}
      className={`relative w-14 h-8 rounded-full transition-all duration-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
        isDark 
          ? 'bg-gradient-to-r from-indigo-900 to-purple-900 shadow-inner' 
          : 'bg-gradient-to-r from-amber-100 to-orange-100 shadow-md'
      } ${className}`}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {/* Background decorations */}
      <span className={`absolute inset-0 rounded-full overflow-hidden transition-opacity duration-500 ${isDark ? 'opacity-100' : 'opacity-0'}`}>
        {/* Stars for dark mode */}
        <span className="absolute w-1 h-1 bg-white/60 rounded-full top-2 left-2" />
        <span className="absolute w-0.5 h-0.5 bg-white/40 rounded-full top-4 left-4" />
        <span className="absolute w-0.5 h-0.5 bg-white/50 rounded-full top-1.5 left-6" />
      </span>
      
      {/* Toggle knob */}
      <span
        className={`absolute top-1 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-500 transform ${
          isDark 
            ? 'left-7 bg-gradient-to-br from-slate-200 to-slate-300 shadow-lg' 
            : 'left-1 bg-gradient-to-br from-amber-300 to-orange-400 shadow-lg shadow-orange-200/50'
        }`}
      >
        {isDark ? (
          <Moon className="w-3.5 h-3.5 text-indigo-900" />
        ) : (
          <Sun className="w-3.5 h-3.5 text-orange-600" />
        )}
      </span>

      {/* Sun rays animation for light mode */}
      <span className={`absolute top-1 left-1 w-6 h-6 transition-opacity duration-300 ${isDark ? 'opacity-0' : 'opacity-100'}`}>
        <span className="absolute inset-0 animate-ping rounded-full bg-orange-300/30" style={{ animationDuration: '2s' }} />
      </span>
    </button>
  );
};
