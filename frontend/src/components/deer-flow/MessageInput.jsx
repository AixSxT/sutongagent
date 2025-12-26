import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUp,
  Lightbulb,
  Search,
  Sparkles,
  FileText,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { BorderBeam } from "../magicui/BorderBeam";
import { useI18n } from "./I18nContext";

const escapeRegExp = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const escapeHtml = (value) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const RAG_RESOURCES = [
  { id: "rag://market-trends-2025", title: "Market Trends 2025" },
  { id: "rag://consumer-insights", title: "Consumer Insights" },
  { id: "rag://product-brief", title: "Product Brief" },
  { id: "rag://annual-report", title: "Annual Report" },
];

export const MessageInput = ({
  value,
  onChange,
  onSend,
  responding = false,
  className,
}) => {
  const { t, tArray } = useI18n();
  const reportStyles = tArray("chat.input.styles", [
    "Academic",
    "Popular Science",
    "News",
    "Social Media",
    "Strategic Investment",
  ]);
  const [deepThinking, setDeepThinking] = useState(false);
  const [investigation, setInvestigation] = useState(false);
  const [styleIndex, setStyleIndex] = useState(0);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionQuery, setSuggestionQuery] = useState("");
  const [selectedResources, setSelectedResources] = useState([]);
  const textareaRef = useRef(null);
  const canSend = useMemo(() => value.trim().length > 0, [value]);
  const mentionTokens = useMemo(() => {
    const tokens = selectedResources.map((resource) => `@${resource.title}`);
    return Array.from(new Set(tokens)).sort((a, b) => b.length - a.length);
  }, [selectedResources]);

  const filteredResources = useMemo(() => {
    const query = suggestionQuery.trim().toLowerCase();
    if (!query) return RAG_RESOURCES;
    return RAG_RESOURCES.filter((resource) =>
      resource.title.toLowerCase().includes(query),
    );
  }, [suggestionQuery]);

  const updateSuggestions = (nextValue, caretPosition) => {
    const uptoCaret = nextValue.slice(0, caretPosition);
    const match = /(?:^|\s)@([\w\s-]*)$/.exec(uptoCaret);
    if (match) {
      setShowSuggestions(true);
      setSuggestionQuery(match[1] ?? "");
    } else {
      setShowSuggestions(false);
      setSuggestionQuery("");
    }
  };

  const insertResource = (resource) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const caretPosition = textarea.selectionStart ?? value.length;
    const uptoCaret = value.slice(0, caretPosition);
    const match = /(?:^|\s)@([\w\s-]*)$/.exec(uptoCaret);
    if (!match) return;
    const replaceFrom = caretPosition - (match[1]?.length ?? 0) - 1;
    const before = value.slice(0, replaceFrom);
    const after = value.slice(caretPosition);
    const nextValue = `${before}@${resource.title} ${after}`;
    onChange(nextValue);
    setSelectedResources((prev) => {
      if (prev.find((item) => item.id === resource.id)) return prev;
      return [...prev, resource];
    });
    setShowSuggestions(false);
    setSuggestionQuery("");
    requestAnimationFrame(() => {
      textarea.focus();
      const nextCaret = before.length + resource.title.length + 2;
      textarea.setSelectionRange(nextCaret, nextCaret);
    });
  };

  const handleSubmit = () => {
    if (!canSend) return;
    onSend?.({
      text: value,
        options: {
          deepThinking,
          investigation,
          reportStyle: reportStyles[styleIndex],
          resources: selectedResources,
        },
      });
    setSelectedResources([]);
    setShowSuggestions(false);
    setSuggestionQuery("");
  };

  useEffect(() => {
    const matched = RAG_RESOURCES.filter((resource) =>
      value.includes(`@${resource.title}`),
    );
    setSelectedResources(matched);
  }, [value]);

  useEffect(() => {
    if (styleIndex >= reportStyles.length) {
      setStyleIndex(0);
    }
  }, [reportStyles.length, styleIndex]);

  const highlightedValue = useMemo(() => {
    if (!value) return "";
    if (!mentionTokens.length) return escapeHtml(value);
    const pattern = new RegExp(
      `(${mentionTokens.map(escapeRegExp).join("|")})`,
      "g",
    );
    const tokensSet = new Set(mentionTokens);
    return value
      .split(pattern)
      .map((part) => {
        const escaped = escapeHtml(part);
        if (tokensSet.has(part)) {
          return `<span class=\"df-input-mention\">${escaped}</span>`;
        }
        return escaped;
      })
      .join("");
  }, [mentionTokens, value]);

  const handleEnhance = () => {
    if (!value.trim() || isEnhancing) return;
    setIsEnhancing(true);
    setTimeout(() => {
      onChange(`Please provide a comprehensive analysis of: ${value.trim()}`);
      setIsEnhancing(false);
    }, 600);
  };

  return (
    <div className={cn("relative h-full w-full", className)}>
      <div className="df-input-shell bg-card relative flex h-full w-full flex-col rounded-[24px] border">
        <div className="relative flex-1">
          <div
            className="df-input-highlight pointer-events-none absolute inset-0 px-4 pt-5 text-base"
            aria-hidden="true"
            dangerouslySetInnerHTML={{ __html: highlightedValue }}
          />
          <textarea
            ref={textareaRef}
            className={cn(
              "df-input-transparent relative h-24 w-full resize-none border-none bg-transparent px-4 pt-5 text-base placeholder:text-muted-foreground",
              isEnhancing && "opacity-70",
            )}
            placeholder={t("chat.input.placeholder")}
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              updateSuggestions(e.target.value, e.target.selectionStart ?? 0);
            }}
            onKeyUp={(e) =>
              updateSuggestions(e.currentTarget.value, e.currentTarget.selectionStart ?? 0)
            }
            onClick={(e) =>
              updateSuggestions(e.currentTarget.value, e.currentTarget.selectionStart ?? 0)
            }
            rows={2}
            onKeyDown={(e) =>
              e.key === "Enter" &&
              !e.shiftKey &&
              (e.preventDefault(), handleSubmit())
            }
          />
        </div>

        {showSuggestions && (
          <div className="df-input-suggestions bg-card absolute left-4 top-20 z-20 w-64 rounded-lg border p-2 shadow-lg">
            <div className="df-input-suggestions-label text-muted-foreground mb-1 text-xs">
              {t("chat.input.searchResources")}
            </div>
            {filteredResources.length === 0 ? (
              <div className="df-input-suggestions-empty text-muted-foreground px-2 py-2 text-xs">
                {t("chat.input.noMatches")}
              </div>
            ) : (
              filteredResources.map((resource) => (
                <button
                  key={resource.id}
                  type="button"
                  className="df-input-suggestions-item hover:bg-accent flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-xs"
                  onClick={() => insertResource(resource)}
                >
                  <span className="text-muted-foreground">@</span>
                  <span className="text-foreground">{resource.title}</span>
                </button>
              ))
            )}
          </div>
        )}

        <div className="df-input-actions flex items-center px-4 py-2">
          <div className="flex grow gap-2">
            <button
              type="button"
              onClick={() => setDeepThinking((prev) => !prev)}
              className={cn(
                "df-input-toggle rounded-2xl border px-3 py-2 text-sm font-medium transition-colors",
                deepThinking
                  ? "border-brand text-brand"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              <Lightbulb size={16} className="mr-2 inline-block" />
              {t("chat.input.deepThinking")}
            </button>
            <button
              type="button"
              onClick={() => setInvestigation((prev) => !prev)}
              className={cn(
                "df-input-toggle rounded-2xl border px-3 py-2 text-sm font-medium transition-colors",
                investigation
                  ? "border-brand text-brand"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              <Search size={16} className="mr-2 inline-block" />
              {t("chat.input.investigation")}
            </button>
            <button
              type="button"
              onClick={() =>
                setStyleIndex((prev) => (prev + 1) % reportStyles.length)
              }
              className="df-input-toggle rounded-2xl border border-border px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <FileText size={16} className="mr-2 inline-block" />
              {reportStyles[styleIndex]}
            </button>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              className={cn(
                "h-10 w-10 rounded-full border border-transparent text-muted-foreground transition-colors hover:text-foreground",
                isEnhancing && "animate-pulse",
              )}
              title={t("chat.input.enhancePrompt")}
              onClick={handleEnhance}
              disabled={!canSend}
            >
              <Sparkles size={16} />
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSend}
              className={cn(
                "h-10 w-10 rounded-full border transition-colors",
                canSend
                  ? "border-border bg-foreground text-background"
                  : "border-border bg-muted text-muted-foreground",
              )}
              title={responding ? t("common.stop") : t("common.send")}
            >
              {responding ? (
                <div className="bg-background h-4 w-4 rounded-sm opacity-70" />
              ) : (
                <ArrowUp size={16} />
              )}
            </button>
          </div>
        </div>
      </div>

      {selectedResources.length > 0 && (
        <div className="df-input-resources text-muted-foreground mt-3 flex flex-wrap gap-2 text-xs">
          {selectedResources.map((resource) => (
            <span
              key={resource.id}
              className="df-input-resource bg-muted inline-flex items-center gap-2 rounded-full px-3 py-1"
            >
              @{resource.title}
              <button
                type="button"
                className="df-input-resource-remove text-muted-foreground hover:text-foreground"
                onClick={() => {
                  const token = `@${resource.title}`;
                  const regex = new RegExp(`\\s?${escapeRegExp(token)}\\s?`, "g");
                  const nextValue = value
                    .replace(regex, " ")
                    .replace(/\s{2,}/g, " ")
                    .trimStart();
                  onChange(nextValue);
                  setSelectedResources((prev) =>
                    prev.filter((item) => item.id !== resource.id),
                  );
                }}
              >
                x
              </button>
            </span>
          ))}
        </div>
      )}

      {isEnhancing && (
        <>
          <BorderBeam
            duration={5}
            size={250}
            className="from-transparent via-red-500 to-transparent"
          />
          <BorderBeam
            duration={5}
            delay={3}
            size={250}
            className="from-transparent via-blue-500 to-transparent"
          />
        </>
      )}
    </div>
  );
};
