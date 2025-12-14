import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

const LiquidToggle = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      // iOS 26 Liquid Glass Toggle - Capsule shape
      "peer inline-flex h-[31px] w-[51px] shrink-0 cursor-pointer items-center",
      "rounded-full", // Capsule shape per iOS 26 guidelines
      // Liquid glass background with blur
      "relative overflow-hidden",
      // iOS 26 spring animation - bouncy and responsive
      "transition-all duration-[350ms] ease-[cubic-bezier(0.2,0.9,0.3,1.2)]",
      "disabled:cursor-not-allowed disabled:opacity-50",
      // Checked state - iOS system green with inner glow
      "data-[state=checked]:bg-[#30D158]",
      "data-[state=checked]:shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04),0_0_12px_rgba(48,209,88,0.3)]",
      // Unchecked state - iOS 26 liquid glass material
      "data-[state=unchecked]:bg-[rgba(120,120,128,0.28)]",
      "dark:data-[state=unchecked]:bg-[rgba(120,120,128,0.36)]",
      "data-[state=unchecked]:shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]",
      className
    )}
    {...props}
    ref={ref}
  >
    {/* Specular highlight overlay - iOS 26 style */}
    <span 
      className={cn(
        "absolute inset-0 rounded-full pointer-events-none",
        "bg-gradient-to-b from-white/20 via-transparent to-transparent"
      )}
    />
    
    {/* Thumb with iOS 26 liquid glass depth */}
    <SwitchPrimitives.Thumb
      className={cn(
        // iOS exact thumb size - capsule proportions
        "pointer-events-none block h-[27px] w-[27px] rounded-full",
        // iOS 26 spring animation with squish effect
        "transition-all duration-[350ms] ease-[cubic-bezier(0.2,0.9,0.3,1.2)]",
        // Translate positions
        "data-[state=checked]:translate-x-[22px]",
        "data-[state=unchecked]:translate-x-[2px]",
        // Pure white with glass material
        "bg-white",
        "relative overflow-hidden",
        // iOS 26 multi-layer shadow for realistic depth
        "shadow-[0_3px_8px_rgba(0,0,0,0.12),0_1px_1px_rgba(0,0,0,0.06),0_0_0_0.5px_rgba(0,0,0,0.04)]"
      )}
    >
      {/* Inner gradient for 3D effect */}
      <span 
        className={cn(
          "absolute inset-0 rounded-full",
          "bg-gradient-to-b from-white via-white to-[#f5f5f5]"
        )}
      />
      
      {/* Top specular highlight */}
      <span 
        className={cn(
          "absolute top-[2px] left-[18%] right-[18%] h-[42%]",
          "rounded-full",
          "bg-gradient-to-b from-white to-transparent",
          "opacity-80"
        )}
      />
    </SwitchPrimitives.Thumb>
  </SwitchPrimitives.Root>
));
LiquidToggle.displayName = "LiquidToggle";

export { LiquidToggle };
