import React from "react";
import { Bird, Microscope, Podcast, Usb, User } from "lucide-react";
import { BentoCard, BentoGrid } from "../../magicui/BentoGrid";
import { SectionHeader } from "./SectionHeader";
import { useI18n } from "../I18nContext";

const featureIcons = [
  {
    Icon: Microscope,
    href: "https://github.com/bytedance/deer-flow/blob/main/src/tools",
    className: "lg:col-start-1 lg:col-end-2 lg:row-start-1 lg:row-end-3",
  },
  {
    Icon: User,
    href: "https://github.com/bytedance/deer-flow/blob/main/src/graph/nodes.py",
    className: "lg:col-start-1 lg:col-end-2 lg:row-start-3 lg:row-end-4",
  },
  {
    Icon: Bird,
    href: "https://www.langchain.com/",
    className: "lg:col-start-2 lg:col-end-3 lg:row-start-1 lg:row-end-2",
  },
  {
    Icon: Usb,
    href: "https://github.com/bytedance/deer-flow/blob/main/src/graph/nodes.py",
    className: "lg:col-start-2 lg:col-end-3 lg:row-start-2 lg:row-end-3",
  },
  {
    Icon: Podcast,
    href: "https://github.com/bytedance/deer-flow/blob/main/src/podcast",
    className: "lg:col-start-2 lg:col-end-3 lg:row-start-3 lg:row-end-4",
  },
];

const defaultFeatures = [
  {
    name: "Dive Deeper and Reach Wider",
    description:
      "Unlock deeper insights with advanced tools. Our powerful search + crawling and Python tools gathers comprehensive data, delivering in-depth reports to enhance your study.",
  },
  {
    name: "Human-in-the-loop",
    description:
      "Refine your research plan, or adjust focus areas all through simple natural language.",
  },
  {
    name: "Lang Stack",
    description:
      "Build with confidence using the LangChain and LangGraph frameworks.",
  },
  {
    name: "MCP Integrations",
    description:
      "Supercharge your research workflow and expand your toolkit with seamless MCP integrations.",
  },
  {
    name: "Podcast Generation",
    description:
      "Instantly generate podcasts from reports. Perfect for on-the-go learning or sharing findings effortlessly.",
  },
];

export const CoreFeatureSection = () => {
  const { t, tArray } = useI18n();
  const features = tArray("landing.coreFeatures.features", [
    ...defaultFeatures,
  ]).map((feature, index) => ({
    ...defaultFeatures[index],
    ...feature,
  }));
  return (
    <section className="relative flex w-full flex-col content-around items-center justify-center">
      <SectionHeader
        anchor="core-features"
        title={t("landing.coreFeatures.title")}
        description={t("landing.coreFeatures.description", undefined, {
          brand: t("brand"),
        })}
      />
      <BentoGrid className="w-3/4 lg:grid-cols-2 lg:grid-rows-3">
        {features.map((feature, index) => {
          const iconData = featureIcons[index];
          return iconData ? (
            <BentoCard
              key={feature.name}
              {...iconData}
              {...feature}
              background={
                <img
                  alt=""
                  className="absolute -top-20 -right-20 opacity-60"
                />
              }
              cta={t("landing.coreFeatures.learnMore")}
            />
          ) : null;
        })}
      </BentoGrid>
    </section>
  );
};
