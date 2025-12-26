import React from "react";
import { cn } from "../../lib/utils";

export function ShineBorder({
  borderWidth = 2,
  duration = 8,
  shineColor = ["#A07CFE", "#FE8FB5", "#FFBE7B"],
  className,
  style,
  children,
  ...props
}) {
  return (
    <div
      className={cn(
        "relative min-h-[50px] w-full overflow-hidden rounded-[inherit]",
        className
      )}
      {...props}
    >
      <div
        style={{
          "--border-width": `${borderWidth}px`,
          "--duration": `${duration}s`,
          "--mask-linear-gradient":
            "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          "--background-radial-gradient": `radial-gradient(transparent,transparent, ${
            Array.isArray(shineColor) ? shineColor.join(",") : shineColor
          },transparent,transparent)`,
          backgroundImage: "var(--background-radial-gradient)",
          backgroundSize: "300% 300%",
          mask: "var(--mask-linear-gradient)",
          WebkitMask: "var(--mask-linear-gradient)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
          padding: "var(--border-width)",
          ...style,
        }}
        className="pointer-events-none absolute inset-0 size-full rounded-[inherit] will-change-[background-position] animate-shine"
      />
      {children}
    </div>
  );
}
