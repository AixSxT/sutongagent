import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactFlow, { Background, Handle, Position } from "reactflow";
import {
  Brain,
  ChevronLeft,
  ChevronRight,
  Fullscreen,
  Minimize,
  Pause,
  Play,
  SquareTerminal,
  FilePen,
  MessageSquareQuote,
  Microscope,
  UserCheck,
  Users,
} from "lucide-react";
import "reactflow/dist/style.css";
import { cn } from "../../../lib/utils";
import { ShineBorder } from "../../magicui/ShineBorder";

const playbook = [
  {
    description:
      "The Coordinator is responsible for engaging with the user to understand their problem and requirements.",
    activeNodes: ["Start", "Coordinator"],
    activeEdges: ["Start->Coordinator"],
    tooltipPosition: "right",
  },
  {
    description:
      "If the user's problem is clearly defined, the Coordinator will hand it over to the Planner.",
    activeNodes: ["Coordinator", "Planner"],
    activeEdges: ["Coordinator->Planner"],
    tooltipPosition: "left",
  },
  {
    description: "Awaiting human feedback to refine the plan.",
    activeNodes: ["Planner", "HumanFeedback"],
    activeEdges: ["Planner->HumanFeedback"],
    tooltipPosition: "left",
  },
  {
    description: "Updating the plan based on human feedback.",
    activeNodes: ["HumanFeedback", "Planner"],
    activeEdges: ["HumanFeedback->Planner"],
    tooltipPosition: "left",
  },
  {
    description:
      "The Research Team is responsible for conducting the core research tasks.",
    activeNodes: ["Planner", "HumanFeedback", "ResearchTeam"],
    activeEdges: [
      "Planner->HumanFeedback",
      "HumanFeedback->ResearchTeam",
      "ResearchTeam->HumanFeedback",
    ],
    tooltipPosition: "left",
  },
  {
    description:
      "The Researcher is responsible for gathering information using search and crawling tools.",
    activeNodes: ["ResearchTeam", "Researcher"],
    activeEdges: ["ResearchTeam->Researcher", "Researcher->ResearchTeam"],
    tooltipPosition: "left",
  },
  {
    description:
      "The Coder is responsible for writing Python code to solve math problems, data analysis, and more.",
    tooltipPosition: "right",
    activeNodes: ["ResearchTeam", "Coder"],
    activeEdges: ["ResearchTeam->Coder", "Coder->ResearchTeam"],
  },
  {
    description:
      "Once the research tasks are completed, the Researcher will hand over to the Planner.",
    activeNodes: ["ResearchTeam", "Planner"],
    activeEdges: ["ResearchTeam->Planner"],
    tooltipPosition: "left",
  },
  {
    description:
      "If no additional information is required, the Planner will handoff to the Reporter.",
    activeNodes: ["Reporter", "Planner"],
    activeEdges: ["Planner->Reporter"],
    tooltipPosition: "right",
  },
  {
    description: "The Reporter will prepare a report summarizing the results.",
    activeNodes: ["End", "Reporter"],
    activeEdges: ["Reporter->End"],
    tooltipPosition: "bottom",
  },
];

const ROW_HEIGHT = 85;
const baseGraph = {
  nodes: [
    {
      id: "Start",
      type: "circle",
      data: { label: "Start" },
      position: { x: -75, y: 0 },
    },
    {
      id: "Coordinator",
      data: { icon: MessageSquareQuote, label: "Coordinator" },
      position: { x: 150, y: 0 },
    },
    {
      id: "Planner",
      data: { icon: Brain, label: "Planner" },
      position: { x: 150, y: ROW_HEIGHT },
    },
    {
      id: "Reporter",
      data: { icon: FilePen, label: "Reporter" },
      position: { x: 275, y: ROW_HEIGHT * 2 },
    },
    {
      id: "HumanFeedback",
      data: { icon: UserCheck, label: "Human Feedback" },
      position: { x: 25, y: ROW_HEIGHT * 2 },
    },
    {
      id: "ResearchTeam",
      data: { icon: Users, label: "Research Team" },
      position: { x: 25, y: ROW_HEIGHT * 3 },
    },
    {
      id: "Researcher",
      data: { icon: Microscope, label: "Researcher" },
      position: { x: -75, y: ROW_HEIGHT * 4 },
    },
    {
      id: "Coder",
      data: { icon: SquareTerminal, label: "Coder" },
      position: { x: 125, y: ROW_HEIGHT * 4 },
    },
    {
      id: "End",
      type: "circle",
      data: { label: "End" },
      position: { x: 330, y: ROW_HEIGHT * 4 },
    },
  ],
  edges: [
    {
      id: "Start->Coordinator",
      source: "Start",
      target: "Coordinator",
      sourceHandle: "right",
      targetHandle: "left",
      animated: true,
    },
    {
      id: "Coordinator->Planner",
      source: "Coordinator",
      target: "Planner",
      sourceHandle: "bottom",
      targetHandle: "top",
      animated: true,
    },
    {
      id: "Planner->Reporter",
      source: "Planner",
      target: "Reporter",
      sourceHandle: "right",
      targetHandle: "top",
      animated: true,
    },
    {
      id: "Planner->HumanFeedback",
      source: "Planner",
      target: "HumanFeedback",
      sourceHandle: "left",
      targetHandle: "top",
      animated: true,
    },
    {
      id: "HumanFeedback->Planner",
      source: "HumanFeedback",
      target: "Planner",
      sourceHandle: "right",
      targetHandle: "bottom",
      animated: true,
    },
    {
      id: "HumanFeedback->ResearchTeam",
      source: "HumanFeedback",
      target: "ResearchTeam",
      sourceHandle: "bottom",
      targetHandle: "top",
      animated: true,
    },
    {
      id: "Reporter->End",
      source: "Reporter",
      target: "End",
      sourceHandle: "bottom",
      targetHandle: "top",
      animated: true,
    },
    {
      id: "ResearchTeam->Researcher",
      source: "ResearchTeam",
      target: "Researcher",
      sourceHandle: "left",
      targetHandle: "top",
      animated: true,
    },
    {
      id: "ResearchTeam->Coder",
      source: "ResearchTeam",
      target: "Coder",
      sourceHandle: "bottom",
      targetHandle: "left",
      animated: true,
    },
    {
      id: "ResearchTeam->Planner",
      source: "ResearchTeam",
      target: "Planner",
      sourceHandle: "right",
      targetHandle: "bottom",
      animated: true,
    },
    {
      id: "Researcher->ResearchTeam",
      source: "Researcher",
      target: "ResearchTeam",
      sourceHandle: "right",
      targetHandle: "bottom",
      animated: true,
    },
    {
      id: "Coder->ResearchTeam",
      source: "Coder",
      target: "ResearchTeam",
      sourceHandle: "top",
      targetHandle: "right",
      animated: true,
    },
  ],
};

const nodeTypes = {
  circle: CircleNode,
  agent: AgentNode,
  default: AgentNode,
};

export const MultiAgentVisualization = ({ className }) => {
  const [activeStepIndex, setActiveStepIndex] = useState(-1);
  const [graph, setGraph] = useState(baseGraph);
  const [playing, setPlaying] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const flowRef = useRef(null);
  const containerRef = useRef(null);
  const timerRef = useRef(null);

  const totalSteps = playbook.length;

  const activateStep = useCallback((stepIndex) => {
    const nextStep = playbook[stepIndex];
    if (!nextStep) return;
    const nextGraph = {
      nodes: graph.nodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          active: nextStep.activeNodes.includes(node.id),
          stepDescription:
            nextStep.activeNodes.indexOf(node.id) ===
            nextStep.activeNodes.length - 1
              ? nextStep.description
              : undefined,
          stepTooltipPosition:
            nextStep.activeNodes.indexOf(node.id) ===
            nextStep.activeNodes.length - 1
              ? nextStep.tooltipPosition
              : undefined,
        },
      })),
      edges: graph.edges.map((edge) => ({
        ...edge,
        animated: nextStep.activeEdges.includes(edge.id),
      })),
    };
    setGraph(nextGraph);
  }, [graph.edges, graph.nodes]);

  const nextStep = useCallback(() => {
    setHasPlayed(true);
    setActiveStepIndex((prev) => {
      const nextIndex = prev >= totalSteps - 1 ? 0 : prev + 1;
      activateStep(nextIndex);
      return nextIndex;
    });
  }, [activateStep, totalSteps]);

  const prevStep = useCallback(() => {
    setHasPlayed(true);
    setActiveStepIndex((prev) => {
      const nextIndex = prev <= 0 ? totalSteps - 1 : prev - 1;
      activateStep(nextIndex);
      return nextIndex;
    });
  }, [activateStep, totalSteps]);

  const play = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setPlaying(true);
    timerRef.current = setInterval(() => {
      setActiveStepIndex((prev) => {
        const nextIndex = prev >= totalSteps - 1 ? 0 : prev + 1;
        activateStep(nextIndex);
        return nextIndex;
      });
    }, 3000);
  }, [activateStep, totalSteps]);

  const pause = useCallback(() => {
    setPlaying(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  }, []);

  const togglePlay = useCallback(() => {
    setHasPlayed(true);
    if (playing) {
      pause();
    } else {
      play();
    }
  }, [pause, play, playing]);

  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      setFullscreen(true);
      await containerRef.current.requestFullscreen();
      setTimeout(() => {
        if (flowRef.current?.fitView) {
          flowRef.current.fitView({ maxZoom: 2.5 });
        }
      }, 100);
    } else {
      setFullscreen(false);
      await document.exitFullscreen();
      setTimeout(() => {
        if (flowRef.current?.fitView) {
          flowRef.current.fitView();
        }
      }, 100);
    }
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry && entry.isIntersecting && !playing && !hasPlayed) {
          setHasPlayed(true);
          play();
        }
      },
      { threshold: 0 },
    );
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    return () => {
      observer.disconnect();
    };
  }, [hasPlayed, play, playing]);

  useEffect(() => () => pause(), [pause]);

  return (
    <div
      ref={containerRef}
      className={cn("flex h-full w-full flex-col pb-4", className)}
    >
      <ReactFlow
        className="flex min-h-0 flex-grow"
        style={{
          ["--xy-background-color-default"]: "transparent",
        }}
        nodes={graph.nodes}
        edges={graph.edges}
        nodeTypes={nodeTypes}
        fitView
        proOptions={{ hideAttribution: true }}
        colorMode="dark"
        panOnScroll={false}
        zoomOnScroll={false}
        preventScrolling={false}
        panOnDrag={false}
        onInit={(instance) => {
          flowRef.current = instance;
        }}
      >
        <Background className="df-mav-bg-mask" bgColor="var(--background)" />
      </ReactFlow>
      <div className="h-4 shrink-0" />
      <div className="flex h-6 w-full shrink-0 items-center justify-center">
        <div className="bg-muted/50 z-[200] flex rounded-3xl px-4 py-2">
          <button
            type="button"
            className="hover:text-foreground text-muted-foreground flex items-center px-2"
            onClick={prevStep}
            title="Move to the previous step"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            className="hover:text-foreground text-muted-foreground flex items-center px-2"
            onClick={togglePlay}
            title="Play / Pause"
          >
            {playing ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5" />
            )}
          </button>
          <button
            type="button"
            className="hover:text-foreground text-muted-foreground flex items-center px-2"
            onClick={nextStep}
            title="Move to the next step"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="text-muted-foreground ml-2 flex items-center justify-center">
            <input
              className="df-range w-40 sm:w-72 md:w-96 lg:w-[28rem]"
              type="range"
              min="0"
              max={totalSteps - 1}
              step="1"
              value={Math.max(activeStepIndex, 0)}
              onChange={(event) => {
                setHasPlayed(true);
                activateStep(Number(event.target.value));
              }}
            />
          </div>
          <button
            type="button"
            className="hover:text-foreground text-muted-foreground flex items-center px-2"
            onClick={toggleFullscreen}
            title="Toggle fullscreen"
          >
            {fullscreen ? (
              <Minimize className="h-5 w-5" />
            ) : (
              <Fullscreen className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

function CircleNode({ data }) {
  return (
    <>
      {data.active && (
        <ShineBorder
          className="rounded-full"
          shineColor={["#A07CFE", "#FE8FB5", "#FFBE7B"]}
        />
      )}
      <div className="flex h-10 w-10 items-center justify-center rounded-full border bg-[var(--xy-node-background-color-default)]">
        <p className="text-xs">{data.label}</p>
      </div>
      {data.label === "Start" && (
        <Handle className="invisible" type="source" position={Position.Right} />
      )}
      {data.label === "End" && (
        <Handle className="invisible" type="target" position={Position.Top} />
      )}
    </>
  );
}

function AgentNode({ data, id }) {
  return (
    <>
      {data.active && (
        <ShineBorder
          shineColor={["#A07CFE", "#FE8FB5", "#FFBE7B"]}
          className="rounded-[2px]"
        />
      )}
      {data.active && data.stepDescription && (
        <div
          className={cn(
            "df-mav-tooltip",
            data.stepTooltipPosition && `df-mav-tooltip-${data.stepTooltipPosition}`,
          )}
        >
          {data.stepDescription}
        </div>
      )}
      <div
        id={id}
        className="relative flex w-full items-center justify-center text-xs"
      >
        <div className="flex items-center gap-2">
          {data.icon && <data.icon className="h-4 w-4" />}
          <span>{data.label}</span>
        </div>
      </div>
      <Handle className="invisible" type="source" position={Position.Left} />
      <Handle className="invisible" type="source" position={Position.Right} />
      <Handle className="invisible" type="source" position={Position.Top} />
      <Handle className="invisible" type="source" position={Position.Bottom} />
      <Handle className="invisible" type="target" position={Position.Left} />
      <Handle className="invisible" type="target" position={Position.Right} />
      <Handle className="invisible" type="target" position={Position.Top} />
      <Handle className="invisible" type="target" position={Position.Bottom} />
    </>
  );
}
