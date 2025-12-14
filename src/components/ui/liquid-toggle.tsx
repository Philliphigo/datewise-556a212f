import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

const LiquidToggle = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      // iOS 16 Liquid Glass Toggle - exact dimensions
      "peer inline-flex h-[31px] w-[51px] shrink-0 cursor-pointer items-center rounded-full",
      // Liquid glass background with blur
      "relative overflow-hidden",
      // iOS spring animation - 400ms with custom bounce easing
      "transition-all duration-[400ms] ease-[cubic-bezier(0.175,0.885,0.32,1.275)]",
      "disabled:cursor-not-allowed disabled:opacity-50",
      // Checked state - iOS green with glow
      "data-[state=checked]:bg-[#34C759]",
      "data-[state=checked]:shadow-[0_0_12px_rgba(52,199,89,0.4),inset_0_1px_1px_rgba(255,255,255,0.2)]",
      // Unchecked state - glass effect
      "data-[state=unchecked]:bg-[rgba(120,120,128,0.32)]",
      "dark:data-[state=unchecked]:bg-[rgba(120,120,128,0.36)]",
      "data-[state=unchecked]:shadow-[inset_0_1px_3px_rgba(0,0,0,0.1)]",
      // Border for depth
      "border border-transparent",
      "data-[state=unchecked]:border-black/5",
      className
    )}
    {...props}
    ref={ref}
  >
    {/* Liquid shine overlay */}
    <span 
      className={cn(
        "absolute inset-0 rounded-full pointer-events-none",
        "bg-gradient-to-b from-white/25 via-transparent to-transparent",
        "opacity-100 transition-opacity duration-300"
      )}
    />
    
    {/* Thumb with liquid glass effect */}
    <SwitchPrimitives.Thumb
      className={cn(
        // iOS exact thumb size
        "pointer-events-none block h-[27px] w-[27px] rounded-full",
        // Spring animation with bounce
        "transition-all duration-[400ms] ease-[cubic-bezier(0.175,0.885,0.32,1.275)]",
        // Translate positions
        "data-[state=checked]:translate-x-[22px]",
        "data-[state=unchecked]:translate-x-[2px]",
        // Stretch effect during transition
        "data-[state=checked]:scale-x-[1.0] data-[state=unchecked]:scale-x-[1.0]",
        "active:scale-x-[1.15]",
        // Pure white with glass effect
        "bg-white",
        "relative overflow-hidden",
        // Multi-layer iOS shadow for depth
        "shadow-[0_3px_8px_rgba(0,0,0,0.15),0_1px_1px_rgba(0,0,0,0.06),0_0_0_0.5px_rgba(0,0,0,0.04)]"
      )}
    >
      {/* Inner glossy highlight - top shine */}
      <span 
        className={cn(
          "absolute inset-0 rounded-full",
          "bg-gradient-to-b from-white via-white/80 to-white/60"
        )}
      />
      
      {/* Specular highlight at top */}
      <span 
        className={cn(
          "absolute top-[2px] left-[20%] right-[20%] h-[40%]",
          "rounded-full",
          "bg-gradient-to-b from-white to-transparent",
          "opacity-90 blur-[0.5px]"
        )}
      />
      
      {/* Subtle edge shadow for 3D effect */}
      <span 
        className={cn(
          "absolute inset-0 rounded-full",
          "shadow-[inset_0_-1px_2px_rgba(0,0,0,0.05)]"
        )}
      />
    </SwitchPrimitives.Thumb>
  </SwitchPrimitives.Root>
));
LiquidToggle.displayName = "LiquidToggle";

export { LiquidToggle };
