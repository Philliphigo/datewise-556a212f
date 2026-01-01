import { ReactNode, forwardRef } from 'react';
import { Loader2, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PullToRefreshIndicatorProps {
  pullDistance: number;
  isRefreshing: boolean;
  isTriggered: boolean;
  progress: number;
}

export const PullToRefreshIndicator = ({
  pullDistance,
  isRefreshing,
  isTriggered,
  progress,
}: PullToRefreshIndicatorProps) => {
  if (pullDistance === 0 && !isRefreshing) return null;

  return (
    <div
      className="absolute left-0 right-0 flex justify-center z-50 pointer-events-none"
      style={{
        top: 0,
        height: `${Math.max(pullDistance, 0)}px`,
        transition: isRefreshing ? 'none' : 'height 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}
    >
      <div
        className={cn(
          "flex items-center justify-center w-12 h-12 rounded-full liquid-glass-heavy mt-3",
          "transition-all duration-300",
          isTriggered && "border-primary/30",
          isRefreshing && "animate-glow-pulse"
        )}
        style={{
          opacity: Math.min(progress * 1.5, 1),
          transform: `scale(${0.5 + progress * 0.5}) rotate(${progress * 180}deg)`,
        }}
      >
        {isRefreshing ? (
          <Loader2 className="w-5 h-5 text-primary animate-spin" />
        ) : (
          <ArrowDown 
            className={cn(
              "w-5 h-5 transition-all duration-200",
              isTriggered ? "text-primary" : "text-muted-foreground"
            )}
            style={{
              transform: isTriggered ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          />
        )}
      </div>
    </div>
  );
};

interface PullToRefreshContainerProps {
  children: ReactNode;
  pullDistance: number;
  isRefreshing: boolean;
  className?: string;
}

export const PullToRefreshContainer = forwardRef<HTMLDivElement, PullToRefreshContainerProps>(
  ({ children, pullDistance, isRefreshing, className }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("relative overflow-auto", className)}
        style={{
          transform: pullDistance > 0 ? `translateY(${pullDistance * 0.4}px)` : 'none',
          transition: isRefreshing ? 'transform 0.3s ease' : 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        {children}
      </div>
    );
  }
);

PullToRefreshContainer.displayName = 'PullToRefreshContainer';
