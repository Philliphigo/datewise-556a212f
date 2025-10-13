import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

const LiquidToggle = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      // iOS 16 style base - exact dimensions
      "peer inline-flex h-[31px] w-[51px] shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent",
      // iOS 16 spring animation - 400ms with custom easing
      "transition-all duration-[400ms] ease-[cubic-bezier(0.4,0.0,0.2,1)]",
      "disabled:cursor-not-allowed disabled:opacity-50",
      "relative overflow-hidden",
      // iOS 16 exact colors - green (#34C759) when on, light gray when off
      "data-[state=checked]:bg-[#34C759]",
      "data-[state=unchecked]:bg-[#E5E5EA] dark:data-[state=unchecked]:bg-[#39393D]",
      className
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        // iOS 16 exact thumb size and positioning
        "pointer-events-none block h-[27px] w-[27px] rounded-full",
        // iOS 16 spring animation - smooth bounce effect
        "transition-transform duration-[250ms] ease-[cubic-bezier(0.175,0.885,0.32,1.1)]",
        "data-[state=checked]:translate-x-[20px]",
        "data-[state=unchecked]:translate-x-[2px]",
        "relative overflow-hidden",
        // Pure white thumb
        "bg-white",
        // iOS 16 shadow - soft with multiple layers
        "shadow-[0_3px_8px_rgba(0,0,0,0.15),0_3px_1px_rgba(0,0,0,0.06)]",
        // Glossy highlight - subtle iOS style
        "before:absolute before:inset-0 before:rounded-full",
        "before:bg-gradient-to-b before:from-white/40 before:via-white/10 before:to-transparent",
        // Top shine for depth
        "after:absolute after:top-[1px] after:left-[15%] after:right-[15%] after:h-[35%]",
        "after:rounded-full after:bg-gradient-to-b after:from-white/90 after:to-transparent after:blur-[0.5px]"
      )}
    />
  </SwitchPrimitives.Root>
));
LiquidToggle.displayName = SwitchPrimitives.Root.displayName;

export { LiquidToggle };
