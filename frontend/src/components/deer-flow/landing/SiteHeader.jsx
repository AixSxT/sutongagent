import React from "react";
import { LanguageSwitcher } from "../LanguageSwitcher";

export const SiteHeader = () => {
  return (
    <header className="df-site-header bg-background/70 sticky top-0 left-0 z-40 flex h-14 w-full flex-col items-center backdrop-blur-lg">
      <div className="df-site-header-inner container flex h-14 items-center justify-end px-3">
        <div className="relative flex items-center gap-2">
          <LanguageSwitcher />
          <div
            className="pointer-events-none absolute inset-0 z-0 h-full w-full rounded-full opacity-60 blur-2xl"
            style={{
              background: "linear-gradient(90deg, #ff80b5 0%, #9089fc 100%)",
              filter: "blur(32px)",
            }}
          />
        </div>
      </div>
      <hr className="from-border/0 via-border/70 to-border/0 m-0 h-px w-full border-none bg-gradient-to-r" />
    </header>
  );
};
