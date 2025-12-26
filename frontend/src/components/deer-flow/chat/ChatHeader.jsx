import React from "react";
import { ThemeToggle } from "../ThemeToggle";
import { SettingsDialog } from "../SettingsDialog";
import { useI18n } from "../I18nContext";

export const ChatHeader = ({ onThemeChange, theme }) => {
  const { t } = useI18n();
  return (
    <header className="df-chat-header fixed top-0 left-0 flex h-12 w-full items-center justify-between px-4">
      <div className="df-chat-brand flex items-center gap-2 text-lg font-medium">
        <span className="df-chat-brand-text">{t("brand")}</span>
      </div>
      <div className="df-chat-actions flex items-center gap-2">
        <ThemeToggle theme={theme} onChange={onThemeChange} />
        <SettingsDialog />
      </div>
    </header>
  );
};
