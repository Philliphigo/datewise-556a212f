import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

const LiquidToggle = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      // iOS 16 style base
      "peer inline-flex h-[31px] w-[51px] shrink-0 cursor-pointer items-center rounded-full",
      "transition-all duration-200 ease-out",
      "disabled:cursor-not-allowed disabled:opacity-50",
      "relative overflow-hidden",
      // Background colors matching iOS 16
      "data-[state=checked]:bg-primary",
      "data-[state=unchecked]:bg-input/60",
      // iOS-style subtle inner shadow
      "shadow-[inset_0_1px_3px_rgba(0,0,0,0.15)]",
      className
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        // iOS 16 thumb dimensions and positioning
        "pointer-events-none block h-[27px] w-[27px] rounded-full",
        // Smooth spring animation matching iOS
        "transition-all duration-200 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]",
        "data-[state=checked]:translate-x-[22px] data-[state=unchecked]:translate-x-[2px]",
        "relative overflow-hidden",
        // Pure white bubble
        "bg-white",
        // iOS-style shadow - subtle and realistic
        "shadow-[0_2px_4px_rgba(0,0,0,0.18),0_1px_2px_rgba(0,0,0,0.12)]",
        // Glossy glass highlight effect
        "before:absolute before:inset-0 before:rounded-full",
        "before:bg-gradient-to-br before:from-white/40 before:via-transparent before:to-transparent",
        "before:opacity-70",
        // Top shine highlight
        "after:absolute after:top-[1px] after:left-[20%] after:right-[20%] after:h-[30%] after:rounded-full",
        "after:bg-gradient-to-b after:from-white/90 after:to-transparent",
        "after:blur-[1px]",
        // Micro scale on toggle for tactile feel
        "data-[state=checked]:scale-[0.98]",
        "active:scale-[0.94] active:shadow-[0_1px_2px_rgba(0,0,0,0.2)]"
      )}
    />
  </SwitchPrimitives.Root>
));
LiquidToggle.displayName = SwitchPrimitives.Root.displayName;

export { LiquidToggle };
