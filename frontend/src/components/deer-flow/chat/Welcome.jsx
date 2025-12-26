import React from "react";
import { motion } from "framer-motion";
import { cn } from "../../../lib/utils";
import { useI18n } from "../I18nContext";

export const Welcome = ({ className }) => {
  const { t } = useI18n();
  return (
    <motion.div
      className={cn("df-welcome flex flex-col", className)}
      style={{ transition: "all 0.2s ease-out" }}
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <h3 className="df-welcome-title mb-2 text-center text-3xl font-medium">
        {`\u{1F44B} ${t("chat.welcome.greeting")}`}
      </h3>
      <div className="df-welcome-description text-muted-foreground px-4 text-center text-lg">
        {t("chat.welcome.description", undefined, { brand: t("brand") })}
      </div>
    </motion.div>
  );
};
