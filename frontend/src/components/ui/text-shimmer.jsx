import { useMemo } from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * Renders text with a continuously moving highlight while an operation is
 * active. The component keeps the animation in Motion rather than React
 * state, so parent streaming updates do not restart the shimmer unnecessarily.
 *
 * The base and highlight colors are CSS variables so callers can reuse the
 * effect with the application's semantic color tokens. Reduced-motion users
 * receive a stable, readable text color instead of the moving highlight.
 */
export default function TextShimmer({
  children,
  as: Component = "span",
  className,
  duration = 2,
  spread = 2,
  style,
  ...props
}) {
  const reducedMotion = useReducedMotion();
  const MotionComponent = motion.create(Component);
  const dynamicSpread = useMemo(
    () => String(children || "").length * spread,
    [children, spread]
  );

  return (
    <MotionComponent
      {...props}
      className={cn(
        "relative inline-block bg-[length:250%_100%,auto] bg-clip-text text-transparent [background-repeat:no-repeat,padding-box]",
        className
      )}
      initial={{ backgroundPosition: reducedMotion ? "50% center" : "100% center" }}
      animate={{ backgroundPosition: reducedMotion ? "50% center" : "0% center" }}
      transition={
        reducedMotion
          ? { duration: 0 }
          : { repeat: Infinity, duration, ease: "linear" }
      }
      style={{
        "--spread": `${dynamicSpread}px`,
        "--base-color": "hsl(var(--muted-foreground))",
        "--base-gradient-color": "hsl(var(--foreground))",
        "--bg":
          "linear-gradient(90deg, #0000 calc(50% - var(--spread)), var(--base-gradient-color), #0000 calc(50% + var(--spread)))",
        backgroundImage:
          "var(--bg), linear-gradient(var(--base-color), var(--base-color))",
        ...style,
      }}
    >
      {children}
    </MotionComponent>
  );
}
