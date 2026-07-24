import { forwardRef } from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { motion } from "motion/react";
import { cn } from "../lib/utils";

const PremiumTabs = TabsPrimitive.Root;

const PremiumTabsList = forwardRef(function PremiumTabsList({ className, ...props }, ref) {
  return (
    <TabsPrimitive.List
      ref={ref}
      className={cn(
        "relative grid rounded-xl border border-[var(--ui-border)] bg-[var(--page-bg)]/45 p-1 text-[var(--ui-muted)]",
        className,
      )}
      {...props}
    />
  );
});

const PremiumTabsTrigger = forwardRef(function PremiumTabsTrigger(
  { activeClassName, activeValue, children, className, indicatorClassName, layoutId = "premium-tab-indicator", value, ...props },
  ref,
) {
  const isActive = activeValue === value;

  return (
    <TabsPrimitive.Trigger
      ref={ref}
      value={value}
      className={cn(
        "control-button relative isolate z-10 inline-flex min-w-0 items-center justify-center gap-2 rounded-lg px-2.5 py-2 text-[10px] font-semibold transition-colors duration-150 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[var(--ui-ink)]",
        isActive ? cn("text-[var(--ui-ink)]", activeClassName) : "text-[var(--ui-muted)] hover:text-[var(--ui-ink)]",
        className,
      )}
      {...props}
    >
      {isActive ? (
        <motion.span
          layoutId={layoutId}
          className={cn(
            "absolute inset-0 -z-10 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-panel)] shadow-sm",
            indicatorClassName,
          )}
          transition={{ duration: 0.18, ease: "easeOut" }}
        />
      ) : null}
      <span className="relative flex min-w-0 items-center gap-2">{children}</span>
    </TabsPrimitive.Trigger>
  );
});

const PremiumTabsContent = forwardRef(function PremiumTabsContent({ className, ...props }, ref) {
  return (
    <TabsPrimitive.Content
      ref={ref}
      className={cn("focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ui-ink)]", className)}
      {...props}
    />
  );
});

export { PremiumTabs, PremiumTabsContent, PremiumTabsList, PremiumTabsTrigger };
