import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../../lib/utils";
import { useI18n } from "./I18nContext";

const languages = [
  { code: "en", name: "English", flag: "\u{1F1FA}\u{1F1F8}" },
  { code: "zh", name: "\u4E2D\u6587", flag: "\u{1F1E8}\u{1F1F3}" },
];

export const LanguageSwitcher = () => {
  const { language, setLanguage } = useI18n();
  const [open, setOpen] = useState(false);

  const current =
    languages.find((lang) => lang.code === language) || languages[0];

  return (
    <div className="relative">
      <button
        type="button"
        className="hover:bg-accent/60 flex items-center gap-2 rounded-full px-3 py-1 text-sm transition-colors"
        onClick={() => setOpen((prev) => !prev)}
      >
        <span>{current.flag}</span>
        <span>{current.name}</span>
        <ChevronDown className="h-3.5 w-3.5 opacity-60" />
      </button>
      {open && (
        <div className="bg-card absolute right-0 mt-2 w-40 rounded-lg border p-1 shadow-lg">
          {languages.map((language) => (
            <button
              key={language.code}
              type="button"
              className={cn(
                "hover:bg-accent flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm",
                current.code === language.code && "bg-accent/60",
              )}
              onClick={() => {
                setLanguage(language.code);
                setOpen(false);
              }}
            >
              <span>{language.flag}</span>
              <span>{language.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
