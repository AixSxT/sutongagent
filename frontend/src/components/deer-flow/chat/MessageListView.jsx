import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Download,
  FileText,
  Headphones,
  Lightbulb,
  Search,
  Wrench,
} from "lucide-react";
import { cn } from "../../../lib/utils";
import { ConversationStarter } from "./ConversationStarter";
import { RollingText } from "../RollingText";
import { RainbowText } from "../RainbowText";
import { LoadingAnimation } from "../LoadingAnimation";
import { MarkdownRenderer } from "../MarkdownRenderer";
import { useI18n } from "../I18nContext";

export const MessageListView = ({
  className,
  messages,
  research,
  openResearch,
  listRef,
  onToggleResearch,
  onSend,
}) => {
  const { t } = useI18n();
  const hasMessages = messages.length > 0;

  if (!hasMessages) {
    return <ConversationStarter onSend={onSend} className={className} />;
  }

  return (
    <div
      className={cn(
        "custom-scrollbar flex h-full w-full flex-col overflow-y-auto",
        className,
      )}
      ref={listRef}
    >
      <ul className="flex flex-col">
        {messages.map((message) => (
          <motion.li
            key={message.id}
            className="mt-10 px-4"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ transition: "all 0.2s ease-out" }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            {message.type === "plan" ? (
              <PlanCard message={message} onSend={onSend} />
            ) : message.type === "tool" ? (
              <ToolCallCard message={message} />
            ) : message.type === "podcast" ? (
              <PodcastCard message={message} />
            ) : (
              <div
                className={cn(
                  "flex",
                  message.role === "user" && "justify-end",
                )}
              >
                <div
                  className={cn(
                    "df-message-bubble bg-card max-w-[90vw] rounded-2xl px-4 py-3 text-sm break-words",
                    message.role === "user" &&
                      "df-message-bubble-user bg-brand text-white rounded-ee-none",
                  )}
                >
                  {message.role === "assistant" ? (
                    <MarkdownRenderer content={message.content} />
                  ) : (
                    message.content
                  )}
                </div>
              </div>
            )}
          </motion.li>
        ))}
        {research && (
          <motion.li
            className="mt-10 px-4"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ transition: "all 0.2s ease-out" }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <ResearchCard
              research={research}
              openResearch={openResearch}
              onToggleResearch={onToggleResearch}
              t={t}
            />
          </motion.li>
        )}
        <div className="flex h-8 w-full shrink-0" />
      </ul>
    </div>
  );
};

const ResearchCard = ({ research, openResearch, onToggleResearch, t }) => {
  const state = research.isComplete
    ? t("chat.research.reportGenerated")
    : t("chat.research.researching");

  return (
    <div className="df-research-summary-card bg-card w-full rounded-xl border px-4 py-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <RainbowText
            animated={!research.isComplete}
            className="text-lg font-medium"
          >
            {t("chat.research.deepResearch")}
          </RainbowText>
          <RollingText className="text-muted-foreground text-sm">
            {state}
          </RollingText>
        </div>
        <button
          type="button"
          className={cn(
            "rounded-lg border px-3 py-1 text-sm font-medium transition-colors",
            openResearch
              ? "border-border text-foreground"
              : "border-border bg-foreground text-background",
          )}
          onClick={onToggleResearch}
        >
          {openResearch ? t("common.close") : t("common.open")}
        </button>
      </div>
    </div>
  );
};

const PlanCard = ({ message, onSend }) => {
  const { t } = useI18n();
  const [open, setOpen] = useState(true);
  const options = useMemo(
    () => [
      { text: t("chat.plan.accept"), value: "accepted" },
      { text: t("chat.plan.adjust"), value: "adjust" },
      { text: t("chat.plan.regenerate"), value: "regenerate" },
    ],
    [t],
  );

  return (
    <div className="df-plan-card bg-card w-full rounded-xl border p-6 shadow-sm">
      {message.reasoning && (
        <div className="mb-4">
          <button
            type="button"
            className="flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm"
            onClick={() => setOpen((prev) => !prev)}
          >
            <span className="flex items-center gap-2 font-semibold">
              <Lightbulb className="h-4 w-4" />
              {t("chat.research.thinking")}
            </span>
            {open ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
          {open && (
            <div className="mt-3 rounded-xl border px-4 py-3 text-sm text-muted-foreground">
              {message.reasoning}
            </div>
          )}
        </div>
      )}

      <div className="mb-4">
        <h3 className="text-lg font-semibold">{message.title}</h3>
        {message.reportStyle && (
          <div className="text-muted-foreground text-xs">
            {t("chat.plan.writingStyle")}: {message.reportStyle}
          </div>
        )}
      </div>
      <div className="df-plan-steps space-y-4">
        {(message.steps || []).map((step, index) => (
          <div key={`${step.title}-${index}`} className="df-plan-step flex gap-3">
            <div className="df-plan-step-dot mt-1 h-2.5 w-2.5 rounded-full bg-brand" />
            <div className="flex-1">
              <div className="text-sm font-semibold">{step.title}</div>
              <div className="text-muted-foreground text-sm">
                {step.description}
              </div>
              {step.tools && step.tools.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {step.tools.map((tool) => (
                    <span
                      key={tool}
                      className="df-plan-tool bg-muted inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px]"
                    >
                      <Wrench className="h-3 w-3" />
                      {tool}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="df-plan-actions mt-6 flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className="df-plan-action rounded-full border px-3 py-1 text-xs font-semibold"
            onClick={() => {
              if (option.value === "accepted") {
                onSend?.(t("chat.plan.responses.accept"));
              } else if (option.value === "adjust") {
                onSend?.(t("chat.plan.responses.adjust"));
              } else {
                onSend?.(t("chat.plan.responses.regenerate"));
              }
            }}
          >
            {option.text}
          </button>
        ))}
      </div>
    </div>
  );
};

const ToolCallCard = ({ message }) => {
  const { t } = useI18n();
  if (message.tool === "web_search") {
    return (
      <div className="df-tool-card bg-card w-full rounded-xl border p-6 shadow-sm">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <Search className="h-4 w-4" />
          <RainbowText animated>{t("chat.research.searchingFor")}</RainbowText>
          <span className="text-muted-foreground">{message.query}</span>
        </div>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {(message.results || []).map((result) => (
            <li
              key={result.url}
              className="bg-muted/50 rounded-lg px-3 py-2 text-xs text-muted-foreground"
            >
              <div className="font-semibold text-foreground">
                {result.title}
              </div>
              <div className="truncate">{result.url}</div>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (message.tool === "crawl") {
    return (
      <div className="df-tool-card bg-card w-full rounded-xl border p-6 shadow-sm">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <FileText className="h-4 w-4" />
          <RainbowText animated>{t("chat.research.reading")}</RainbowText>
        </div>
        <div className="text-muted-foreground text-xs">{message.url}</div>
      </div>
    );
  }

  if (message.tool === "python") {
    return (
      <div className="df-tool-card bg-card w-full rounded-xl border p-6 shadow-sm">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <RainbowText animated>{t("chat.research.runningPython")}</RainbowText>
        </div>
        <pre className="bg-muted/60 mt-3 overflow-auto rounded-lg p-3 text-xs">
          {message.code}
        </pre>
        <div className="mt-3 text-xs font-semibold text-muted-foreground">
          {t("chat.research.executionOutput")}
        </div>
        <pre className="bg-muted/60 mt-2 overflow-auto rounded-lg p-3 text-xs">
          {message.output}
        </pre>
      </div>
    );
  }

  if (message.tool === "retriever") {
    return (
      <div className="df-tool-card bg-card w-full rounded-xl border p-6 shadow-sm">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <Search className="h-4 w-4" />
          <RainbowText animated>{t("chat.research.retrieving")}</RainbowText>
        </div>
        <div className="text-muted-foreground text-xs">
          {message.keywords}
        </div>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {(message.documents || []).map((doc) => (
            <li
              key={doc.title}
              className="bg-muted/50 rounded-lg px-3 py-2 text-xs text-muted-foreground"
            >
              <div className="font-semibold text-foreground">{doc.title}</div>
              <div>
                {t("chat.research.chunkSize")} {doc.size}
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return null;
};

const PodcastCard = ({ message }) => {
  const { t } = useI18n();
  return (
    <div className="df-podcast-card bg-card w-full rounded-xl border p-6 shadow-sm">
      <div className="text-muted-foreground mb-3 flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <Headphones className="h-4 w-4" />
          <RainbowText animated={message.isGenerating}>
            {message.isGenerating
              ? t("chat.research.generatingPodcast")
              : t("chat.research.podcast")}
          </RainbowText>
        </div>
        {message.audioUrl && (
          <a
            className="hover:text-foreground text-muted-foreground inline-flex items-center gap-1 text-xs"
            href={message.audioUrl}
            download={`${message.title || "podcast"}.wav`}
          >
            <Download className="h-3 w-3" />
            {t("common.download")}
          </a>
        )}
      </div>
      <div className="text-lg font-semibold">{message.title}</div>
      {message.isGenerating ? (
        <LoadingAnimation className="mt-4" />
      ) : (
        <audio className="mt-4 w-full" controls src={message.audioUrl} />
      )}
    </div>
  );
};
