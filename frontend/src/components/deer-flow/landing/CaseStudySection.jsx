import React from "react";
import { Bike, Bot, Building, Film, Github, Ham, Home, Pizza } from "lucide-react";
import { BentoCard } from "../../magicui/BentoGrid";
import { SectionHeader } from "./SectionHeader";
import { useI18n } from "../I18nContext";

const caseStudies = [
  {
    title: "How tall is Eiffel Tower compared to tallest building?",
    description:
      "The research compares the heights and global significance of the Eiffel Tower and Burj Khalifa, and uses Python code to calculate the multiples.",
    icon: Building,
    id: "eiffel-tower-vs-tallest-building",
  },
  {
    title: "What are the top trending repositories on GitHub?",
    description:
      "The research utilized MCP services to identify the most popular GitHub repositories and documented them in detail using search engines.",
    icon: Github,
    id: "github-top-trending-repo",
  },
  {
    title: "Write an article about Nanjing's traditional dishes",
    description:
      "The study vividly showcases Nanjing's famous dishes through rich content and imagery, uncovering their hidden histories and cultural significance.",
    icon: Ham,
    id: "nanjing-traditional-dishes",
  },
  {
    title: "How to decorate a small rental apartment?",
    description:
      "The study provides readers with practical and straightforward methods for decorating apartments, accompanied by inspiring images.",
    icon: Home,
    id: "rental-apartment-decoration",
  },
  {
    title: "Introduce the movie 'Leon: The Professional'",
    description:
      "The research provides a comprehensive introduction to the movie 'Leon: The Professional', including its plot, characters, and themes.",
    icon: Film,
    id: "review-of-the-professional",
  },
  {
    title: "How do you view the takeaway war in China? (in Chinese)",
    description:
      "The research analyzes the intensifying competition between JD and Meituan, highlighting their strategies, technological innovations, and challenges.",
    icon: Bike,
    id: "china-food-delivery",
  },
  {
    title: "Are ultra-processed foods linked to health?",
    description:
      "The research examines the health risks of rising ultra-processed food consumption, urging more research on long-term effects and individual differences.",
    icon: Pizza,
    id: "ultra-processed-foods",
  },
  {
    title: 'Write an article on "Would you insure your AI twin?"',
    description:
      "The research explores the concept of insuring AI twins, highlighting their benefits, risks, ethical considerations, and the evolving regulatory.",
    icon: Bot,
    id: "ai-twin-insurance",
  },
];

export const CaseStudySection = () => {
  const { t, tArray } = useI18n();
  const cases = tArray("landing.caseStudies.cases", caseStudies).map(
    (caseStudy, index) => ({
      ...caseStudies[index],
      ...caseStudy,
    }),
  );
  return (
    <section className="relative container hidden flex-col items-center justify-center md:flex">
      <SectionHeader
        anchor="case-studies"
        title={t("landing.caseStudies.title")}
        description={t("landing.caseStudies.description", undefined, {
          brand: t("brand"),
        })}
      />
      <div className="grid w-3/4 grid-cols-1 gap-2 sm:w-full sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {cases.map((caseStudy) => (
          <div key={caseStudy.title} className="w-full p-2">
            <BentoCard
              Icon={caseStudy.icon}
              name={caseStudy.title}
              description={caseStudy.description}
              href={`https://github.com/bytedance/deer-flow?replay=${caseStudy.id}`}
              cta={t("landing.caseStudies.cta")}
              className="h-full w-full"
            />
          </div>
        ))}
      </div>
    </section>
  );
};
