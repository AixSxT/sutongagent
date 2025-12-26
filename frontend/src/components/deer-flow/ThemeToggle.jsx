import React, { useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "../../lib/utils";

const OPTIONS = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
];

export const ThemeToggle = ({ theme = "system", onChange }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        className="hover:bg-accent/60 relative inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors"
        onClick={() => setOpen((prev) => !prev)}
        title="Change theme"
      >
        <Sun className="h-4 w-4 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
        <Moon className="absolute h-4 w-4 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
      </button>
      {open && (
        <div className="bg-card absolute right-0 mt-2 w-36 rounded-lg border p-1 shadow-lg">
          {OPTIONS.map(({ value, label, Icon }) => (
            <button
              key={value}
              type="button"
              className={cn(
                "hover:bg-accent flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm",
                theme === value && "bg-accent/60 font-semibold",
              )}
              onClick={() => {
                onChange?.(value);
                setOpen(false);
              }}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
