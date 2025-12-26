import React from "react";
import { cn } from "../../lib/utils";

export const RainbowText = ({ animated, className, children }) => {
  return (
    <span className={cn(animated && "df-rainbow-text animated", className)}>
      {children}
    </span>
  );
};
