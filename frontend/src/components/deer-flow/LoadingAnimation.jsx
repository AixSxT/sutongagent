import React from "react";
import { cn } from "../../lib/utils";

export const LoadingAnimation = ({ className, size = "normal" }) => {
  return (
    <div
      className={cn(
        "df-loading-animation",
        size === "sm" && "df-loading-sm",
        className,
      )}
    >
      <div />
      <div />
      <div />
    </div>
  );
};
