import React, { useMemo } from "react";
import { useI18n } from "../I18nContext";

export const Footer = () => {
  const { t } = useI18n();
  const year = useMemo(() => new Date().getFullYear(), []);
  return (
    <footer className="container mt-32 flex flex-col items-center justify-center">
      <hr className="from-border/0 via-border/70 to-border/0 m-0 h-px w-full border-none bg-gradient-to-r" />
      <div className="text-muted-foreground container flex h-20 flex-col items-center justify-center text-sm">
        <p className="text-center font-serif text-lg md:text-xl">
          &quot;{t("landing.footer.quote")}&quot;
        </p>
      </div>
      <div className="text-muted-foreground container mb-8 flex flex-col items-center justify-center text-xs">
        <p>{t("landing.footer.license")}</p>
        <p>&copy; {year} {t("brand")}</p>
      </div>
    </footer>
  );
};
