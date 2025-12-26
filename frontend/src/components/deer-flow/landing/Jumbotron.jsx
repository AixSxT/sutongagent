import React from "react";
import { ChevronRight } from "lucide-react";
import { AuroraText } from "../../magicui/AuroraText";
import { FlickeringGrid } from "../../magicui/FlickeringGrid";
import { useI18n } from "../I18nContext";

export const Jumbotron = ({ onGetStarted }) => {
  const { t } = useI18n();
  return (
    <section className="df-hero flex h-[95vh] w-full flex-col items-center justify-center pb-16">
      <FlickeringGrid
        id="deer-hero-bg"
        className="absolute inset-0 z-0 df-hero-radial-mask"
        squareSize={4}
        gridGap={4}
        color="#60A5FA"
        maxOpacity={0.18}
        flickerChance={0.12}
      />
      <FlickeringGrid
        id="deer-hero"
        className="absolute inset-0 z-0 translate-y-[2vh] df-hero-deer-mask"
        squareSize={3}
        gridGap={6}
        color="#60A5FA"
        maxOpacity={0.82}
        flickerChance={0.18}
      />
      <div className="df-hero-content relative z-10 flex flex-col items-center justify-center gap-12">
        <h1 className="df-hero-title text-center text-4xl font-bold md:text-6xl">
          <span className="bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
            {t("landing.hero.title")}{" "}
          </span>
          <AuroraText
            colors={["#60A5FA", "#38BDF8", "#22D3EE", "#93C5FD"]}
          >
            {t("landing.hero.subtitle")}
          </AuroraText>
        </h1>
        <p className="df-hero-description max-w-4xl p-2 text-center text-sm opacity-85 md:text-2xl">
          {t("landing.hero.description", undefined, { brand: t("brand") })}
        </p>
        <div className="df-hero-actions flex gap-6">
          <button
            className="df-hero-primary hidden items-center gap-2 rounded-full border border-transparent bg-white/90 px-6 py-3 text-lg font-semibold text-black shadow-sm md:flex md:w-44"
            type="button"
            onClick={onGetStarted}
          >
            {t("common.getStarted")} <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="df-hero-footnote absolute bottom-8 flex text-xs opacity-50">
        <p>{t("landing.hero.footnote")}</p>
      </div>
    </section>
  );
};
