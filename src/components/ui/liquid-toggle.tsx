import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

const LiquidToggle = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer inline-flex h-8 w-14 shrink-0 cursor-pointer items-center rounded-full transition-all duration-300 ease-in-out",
      "disabled:cursor-not-allowed disabled:opacity-50",
      "relative overflow-visible",
      "data-[state=checked]:bg-primary",
      "data-[state=unchecked]:bg-input",
      "shadow-inner",
      className
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none block h-7 w-7 rounded-full transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
        "data-[state=checked]:translate-x-[26px] data-[state=unchecked]:translate-x-[2px]",
        "relative overflow-visible",
        // White bubble base
        "bg-white shadow-lg",
        // Liquid glass effect with multiple gradients
        "before:absolute before:inset-0 before:rounded-full",
        "before:bg-gradient-to-br before:from-white/90 before:via-white/50 before:to-transparent",
        "before:transition-all before:duration-300",
        // Glossy shine on top
        "after:absolute after:top-[2px] after:left-[2px] after:right-[2px] after:h-[45%] after:rounded-full",
        "after:bg-gradient-to-b after:from-white/80 after:to-transparent",
        "after:transition-all after:duration-300",
        // Scale effect on toggle
        "data-[state=checked]:scale-[1.05] data-[state=unchecked]:scale-100",
        // Subtle shadow that changes with state
        "data-[state=checked]:shadow-[0_2px_8px_rgba(0,0,0,0.15),inset_0_1px_2px_rgba(255,255,255,0.8)]",
        "data-[state=unchecked]:shadow-[0_2px_6px_rgba(0,0,0,0.12),inset_0_1px_2px_rgba(255,255,255,0.8)]"
      )}
    />
  </SwitchPrimitives.Root>
));
LiquidToggle.displayName = SwitchPrimitives.Root.displayName;

export { LiquidToggle };
