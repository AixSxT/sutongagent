import React from "react";
import { AuroraText } from "../../magicui/AuroraText";
import { SectionHeader } from "./SectionHeader";
import { useI18n } from "../I18nContext";

export const JoinCommunitySection = () => {
  const { t } = useI18n();
  return (
    <section className="flex w-full flex-col items-center justify-center pb-12">
      <SectionHeader
        anchor="join-community"
        title={
          <AuroraText colors={["#60A5FA", "#A5FA60", "#A560FA"]}>
            {t("landing.joinCommunity.title", undefined, { brand: t("brand") })}
          </AuroraText>
        }
        description={t("landing.joinCommunity.description", undefined, {
          brand: t("brand"),
        })}
      />
      <a
        className="rounded-full bg-white px-8 py-3 text-xl font-semibold text-black shadow-sm"
        href="https://github.com/bytedance/deer-flow"
        target="_blank"
        rel="noreferrer"
      >
        {t("landing.joinCommunity.cta")}
      </a>
    </section>
  );
};
