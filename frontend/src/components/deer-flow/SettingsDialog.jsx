import React, { useMemo, useState } from "react";
import {
  BookOpen,
  Info,
  ServerCog,
  Settings as SettingsIcon,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useI18n } from "./I18nContext";

export const SettingsDialog = () => {
  const { t, tArray } = useI18n();
  const [open, setOpen] = useState(false);
  const tabs = useMemo(
    () => [
      { id: "general", label: t("settings.general"), Icon: SettingsIcon },
      { id: "rag", label: t("settings.resources"), Icon: BookOpen },
      {
        id: "mcp",
        label: t("settings.mcp"),
        Icon: ServerCog,
        badge: t("settings.newBadge"),
      },
      { id: "about", label: t("settings.about"), Icon: Info },
    ],
    [t],
  );
  const [activeTab, setActiveTab] = useState(tabs[0].id);
  const year = useMemo(() => new Date().getFullYear(), []);

  return (
    <>
      <button
        type="button"
        className="hover:bg-accent/60 inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors"
        title={t("common.settings")}
        onClick={() => setOpen(true)}
      >
        <SettingsIcon className="h-4 w-4" />
      </button>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4">
          <div className="bg-card w-full max-w-[850px] rounded-xl border shadow-xl">
            <div className="border-b px-6 py-4">
              <h3 className="text-lg font-semibold">
                {t("settings.title", undefined, { brand: t("brand") })}
              </h3>
              <p className="text-muted-foreground text-sm">
                {t("settings.description", undefined, { brand: t("brand") })}
              </p>
            </div>
            <div className="flex h-[480px] w-full overflow-hidden border-b">
              <div className="w-52 shrink-0 border-r p-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    className={cn(
                      "hover:bg-accent mb-1 flex h-9 w-full items-center gap-2 rounded px-2 text-sm",
                      activeTab === tab.id &&
                        "bg-foreground text-background hover:bg-foreground",
                    )}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    <tab.Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                    {tab.badge && (
                      <span
                        className={cn(
                          "border-muted-foreground text-muted-foreground ml-auto rounded-full border px-2 py-0.5 text-[10px]",
                          activeTab === tab.id &&
                            "border-background text-background",
                        )}
                      >
                        {tab.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                {activeTab === "general" && (
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-sm font-semibold">
                        {t("settings.autoAcceptTitle")}
                      </h4>
                      <p className="text-muted-foreground text-xs">
                        {t("settings.autoAcceptDesc")}
                      </p>
                      <label className="mt-3 flex items-center gap-2 text-sm">
                        <input type="checkbox" defaultChecked />
                        {t("settings.enabled")}
                      </label>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold">
                        {t("settings.webSearchTitle")}
                      </h4>
                      <p className="text-muted-foreground text-xs">
                        {t("settings.webSearchDesc")}
                      </p>
                      <label className="mt-3 flex items-center gap-2 text-sm">
                        <input type="checkbox" defaultChecked />
                        {t("settings.enabled")}
                      </label>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold">
                        {t("settings.writingStyle")}
                      </h4>
                      <p className="text-muted-foreground text-xs">
                        {t("settings.writingStyleDesc")}
                      </p>
                      <div className="mt-3 grid grid-cols-2 gap-3">
                        {tArray("chat.input.styles", []).map((style) => (
                          <button
                            key={style}
                            type="button"
                            className="hover:bg-accent rounded-lg border px-3 py-2 text-left text-xs"
                          >
                            {style}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                {activeTab === "rag" && (
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold">
                      {t("settings.resources")}
                    </h4>
                    <p className="text-muted-foreground text-xs">
                      {t("settings.resourcesDesc")}
                    </p>
                    <button
                      type="button"
                      className="rounded-full border px-4 py-2 text-sm"
                    >
                      {t("settings.upload")}
                    </button>
                    <div className="text-muted-foreground text-xs">
                      {t("settings.noResources")}
                    </div>
                  </div>
                )}
                {activeTab === "mcp" && (
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold">
                      {t("settings.mcp")}
                    </h4>
                    <p className="text-muted-foreground text-xs">
                      {t("settings.mcpDesc")}
                    </p>
                    <button
                      type="button"
                      className="rounded-full border px-4 py-2 text-sm"
                    >
                      {t("settings.addServers")}
                    </button>
                    <div className="text-muted-foreground text-xs">
                      {t("settings.noServers")}
                    </div>
                  </div>
                )}
                {activeTab === "about" && (
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold">
                      {t("settings.aboutTitle", undefined, {
                        brand: t("brand"),
                      })}
                    </h4>
                    <p className="text-muted-foreground text-sm">
                      {t("settings.aboutBody", undefined, {
                        brand: t("brand"),
                      })}
                    </p>
                    <div className="text-muted-foreground text-xs">
                      {t("landing.footer.license")}
                    </div>
                    <div className="text-muted-foreground text-xs">
                      &copy; {year} {t("brand")}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4">
              <button
                type="button"
                className="rounded-full border px-4 py-2 text-sm"
                onClick={() => setOpen(false)}
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                className="rounded-full bg-foreground px-4 py-2 text-sm text-background"
                onClick={() => setOpen(false)}
              >
                {t("common.save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
