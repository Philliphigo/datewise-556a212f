import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

const LiquidToggle = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer inline-flex h-12 w-24 shrink-0 cursor-pointer items-center rounded-full transition-all duration-500 ease-out",
      "disabled:cursor-not-allowed disabled:opacity-50",
      "relative overflow-hidden",
      "data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-pink-400 data-[state=checked]:via-pink-500 data-[state=checked]:to-pink-600",
      "data-[state=unchecked]:bg-gradient-to-r data-[state=unchecked]:from-gray-300 data-[state=unchecked]:via-gray-200 data-[state=unchecked]:to-gray-300",
      "shadow-lg",
      className
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none block h-10 w-10 rounded-full transition-all duration-500 ease-out",
        "data-[state=checked]:translate-x-12 data-[state=unchecked]:translate-x-1",
        "relative overflow-hidden",
        // Glass bubble effect
        "bg-white shadow-xl",
        // Glossy overlay
        "before:absolute before:inset-0 before:rounded-full",
        "before:bg-gradient-to-br before:from-white/80 before:via-white/40 before:to-transparent",
        // Shine effect
        "after:absolute after:inset-0 after:rounded-full",
        "after:bg-gradient-to-tr after:from-transparent after:via-white/60 after:to-transparent",
        "after:blur-sm",
        // Liquid animation
        "animate-liquid-bubble"
      )}
    />
  </SwitchPrimitives.Root>
));
LiquidToggle.displayName = SwitchPrimitives.Root.displayName;

export { LiquidToggle };
