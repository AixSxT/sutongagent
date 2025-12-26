import React from "react";
import { MultiAgentVisualization } from "./MultiAgentVisualization";
import { SectionHeader } from "./SectionHeader";

export const MultiAgentSection = () => {
  return (
    <section className="relative flex w-full flex-col items-center justify-center">
      <SectionHeader
        anchor="multi-agent-architecture"
        title="Multi-Agent Architecture"
        description="Experience the agent teamwork with our Supervisor + Handoffs design pattern."
      />
      <div className="flex h-[70vh] w-full flex-col items-center justify-center">
        <div className="h-full w-full">
          <MultiAgentVisualization />
        </div>
      </div>
    </section>
  );
};
