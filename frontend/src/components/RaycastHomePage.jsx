import React, { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../lib/utils";
import { ChatHeader } from "./deer-flow/chat/ChatHeader";
import { MessageListView } from "./deer-flow/chat/MessageListView";
import { MessageInput } from "./deer-flow/MessageInput";
import { ResearchBlock } from "./deer-flow/ResearchBlock";
import { SiteHeader } from "./deer-flow/landing/SiteHeader";
import { Jumbotron } from "./deer-flow/landing/Jumbotron";
import { Sidebar } from "./deer-flow/Sidebar";
import { I18nProvider, useI18n } from "./deer-flow/I18nContext";
import "./RaycastHomePage.css";

const STORAGE_KEY = "df-sessions-v1";

const createSessionId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

const buildMarkdownTable = (headers, rows) => {
  if (!headers.length) return "";
  const headerRow = `| ${headers.join(" | ")} |`;
  const dividerRow = `| ${headers.map(() => ":---").join(" | ")} |`;
  const body = rows.map((row) =>
    Array.isArray(row) ? `| ${row.join(" | ")} |` : `| ${row} |`,
  );
  return [headerRow, dividerRow, ...body].join("\n");
};

const createSilentAudioUrl = () => {
  const sampleRate = 8000;
  const duration = 1;
  const numSamples = sampleRate * duration;
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);
  const writeString = (offset, string) => {
    for (let i = 0; i < string.length; i += 1) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };
  writeString(0, "RIFF");
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, numSamples * 2, true);
  return URL.createObjectURL(new Blob([buffer], { type: "audio/wav" }));
};

const RaycastHomePageInner = () => {
  const { t, tArray } = useI18n();
  const [viewMode, setViewMode] = useState("landing");
  const [sessions, setSessions] = useState(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      if (!Array.isArray(stored)) return [];
      return stored.map((session) => {
        const createdAt = session.createdAt || new Date().toISOString();
        return {
          id: session.id || createSessionId(),
          title: session.title || t("sidebar.untitled"),
          createdAt,
          updatedAt: session.updatedAt || createdAt,
          messages: Array.isArray(session.messages) ? session.messages : [],
          research: session.research || null,
        };
      });
    } catch (error) {
      return [];
    }
  });
  const [activeSessionId, setActiveSessionId] = useState(
    () => sessions[0]?.id || null,
  );
  const [inputText, setInputText] = useState("");
  const [openResearch, setOpenResearch] = useState(false);
  const [isResearching, setIsResearching] = useState(false);
  const [timer, setTimer] = useState(0);
  const [theme, setTheme] = useState("system");
  const [systemTheme, setSystemTheme] = useState("light");
  const listRef = useRef(null);
  const timerRef = useRef(null);
  const researchIdRef = useRef(null);

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) || null,
    [sessions, activeSessionId],
  );
  const messages = activeSession?.messages ?? [];
  const research = activeSession?.research ?? null;

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setSystemTheme(media.matches ? "dark" : "light");
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const appliedTheme = useMemo(() => {
    if (viewMode === "landing") return "dark";
    if (theme === "system") return systemTheme;
    return theme;
  }, [theme, systemTheme, viewMode]);

  useEffect(() => {
    if (viewMode === "landing") {
      setTheme("dark");
      return;
    }
    setTheme("light");
  }, [viewMode]);

  useEffect(() => {
    if (isResearching) {
      timerRef.current = setInterval(
        () => setTimer((value) => value + 1),
        1000,
      );
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isResearching]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTo({
        top: listRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, research, openResearch]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sanitized = sessions.map((session) => ({
      ...session,
      messages: session.messages.map((message) => {
        if (message.type !== "podcast") return message;
        return { ...message, audioUrl: "" };
      }),
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
  }, [sessions]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const remain = (seconds % 60).toString().padStart(2, "0");
    return `${minutes}:${remain}`;
  };

  const updateSession = (id, updater) => {
    setSessions((prev) => {
      const index = prev.findIndex((session) => session.id === id);
      if (index === -1) return prev;
      const updated = updater(prev[index]);
      if (!updated) return prev;
      const next = [...prev];
      next.splice(index, 1);
      return [updated, ...next];
    });
  };

  const updateActiveSession = (updater) => {
    if (!activeSessionId) return;
    updateSession(activeSessionId, updater);
  };

  const addMessageToSession = (sessionId, message) => {
    updateSession(sessionId, (session) => ({
      ...session,
      updatedAt: new Date().toISOString(),
      messages: [...session.messages, message],
    }));
  };

  const updateMessageInSession = (sessionId, messageId, updater) => {
    updateSession(sessionId, (session) => ({
      ...session,
      updatedAt: new Date().toISOString(),
      messages: session.messages.map((message) =>
        message.id === messageId ? updater(message) : message,
      ),
    }));
  };

  const setResearchForSession = (sessionId, updater) => {
    updateSession(sessionId, (session) => ({
      ...session,
      updatedAt: new Date().toISOString(),
      research: typeof updater === "function" ? updater(session.research) : updater,
    }));
  };

  const ensureSession = () => {
    if (activeSessionId) return activeSessionId;
    const newSession = {
      id: createSessionId(),
      title: t("sidebar.untitled"),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [],
      research: null,
    };
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    return newSession.id;
  };

  const setSessionTitle = (sessionId, query) => {
    updateSession(sessionId, (session) => {
      if (session.title && session.title !== t("sidebar.untitled")) {
        return session;
      }
      return {
        ...session,
        title: query,
        updatedAt: new Date().toISOString(),
      };
    });
  };

  const buildReportContent = (query, options) => {
    const headers = tArray("report.tableHeaders", []);
    const rows = tArray("report.tableRows", []);
    const table = buildMarkdownTable(headers, rows);
    return [
      `# ${t("report.resultsTitle", undefined, { query })}`,
      "",
      options?.deepThinking ? t("report.deepIntro") : t("report.intro"),
      "",
      `## 1. ${t("report.executiveSummary")}`,
      t("report.summaryBody"),
      "",
      `## 2. ${t("report.keyMetrics")}`,
      table,
      "",
      `## 3. ${t("report.marketSignals")}`,
      `- ${t("report.bullet1")}`,
      `- ${t("report.bullet2")}`,
      "",
      "```python",
      t("report.codeComment"),
      "def check_impact(score):",
      "    return \"Significant\" if score > 0.8 else \"Minor\"",
      "```",
    ]
      .filter(Boolean)
      .join("\n");
  };

  const runResearch = async (query, sessionId, researchId, options) => {
    const steps = [
      t("chat.research.steps.searching"),
      t("chat.research.steps.reading"),
      t("chat.research.steps.synthesizing"),
    ];
    if (options?.investigation) {
      steps.unshift(t("chat.research.steps.investigation"));
    }

    const toolMessages = [
      {
        tool: "web_search",
        title: t("chat.research.searchingFor"),
        query,
        results: [
          {
            title: "Industry report 2025 overview",
            url: "https://example.com/overview",
          },
          {
            title: "Market analytics dashboard",
            url: "https://example.com/analytics",
          },
          {
            title: "Competitive landscape analysis",
            url: "https://example.com/competition",
          },
        ],
      },
      {
        tool: "crawl",
        title: t("chat.research.reading"),
        url: "https://example.com/overview",
      },
      {
        tool: "python",
        title: t("chat.research.runningPython"),
        code:
          "def growth_rate(current, previous):\n    return (current - previous) / previous\n\nprint(growth_rate(140, 100))",
        output: "0.4",
      },
      {
        tool: "retriever",
        title: t("chat.research.retrieving"),
        keywords:
          options?.resources?.map((resource) => resource.title).join(", ") ||
          t("chat.research.internalKnowledgeBase", "internal knowledge base"),
        documents: [
          { title: "Internal memo: Market pulse", size: 3240 },
          { title: "Customer insights summary", size: 2890 },
        ],
      },
    ];

    const isActive = () => {
      const current = researchIdRef.current;
      return current?.id === researchId && current?.sessionId === sessionId;
    };

    for (let i = 0; i < steps.length; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      if (!isActive()) return;
      setResearchForSession(sessionId, (prev) => {
        if (!prev) return prev;
        const previous = prev.steps[prev.steps.length - 1];
        const updatedSteps = [
          ...prev.steps.slice(0, -1),
          { ...previous, status: "done" },
          { status: "processing", text: steps[i] },
        ];
        return { ...prev, steps: updatedSteps };
      });

      if (toolMessages[i]) {
        addMessageToSession(sessionId, {
          id: researchId + 10 + i,
          role: "assistant",
          type: "tool",
          ...toolMessages[i],
        });
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 800));
    if (!isActive()) return;
    setIsResearching(false);
    setResearchForSession(sessionId, (prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        isComplete: true,
        content: buildReportContent(query, options),
      };
    });

    await new Promise((resolve) => setTimeout(resolve, 1200));
    if (!isActive()) return;
    const podcastId = researchId + 99;
    addMessageToSession(sessionId, {
      id: podcastId,
      role: "assistant",
      type: "podcast",
      title: `${t("chat.research.podcast")}: ${query}`,
      isGenerating: true,
      audioUrl: "",
    });
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const audioUrl = createSilentAudioUrl();
    updateMessageInSession(sessionId, podcastId, (prev) => ({
      ...prev,
      isGenerating: false,
      audioUrl,
    }));
  };

  const handleSend = (payload) => {
    const parsed =
      typeof payload === "string" ? { text: payload, options: {} } : payload;
    const query = (parsed?.text ?? inputText).trim();
    if (!query) return;

    const sessionId = ensureSession();
    setSessionTitle(sessionId, query);

    const messageId = Date.now();
    const planId = messageId + 1;
    const researchId = messageId + 2;
    researchIdRef.current = { id: researchId, sessionId };

    addMessageToSession(sessionId, {
      id: messageId,
      role: "user",
      type: "message",
      content: query,
      resources: parsed?.options?.resources ?? [],
    });

    addMessageToSession(sessionId, {
      id: planId,
      role: "assistant",
      type: "plan",
      title: t("chat.plan.title"),
      thought: t("chat.plan.thought"),
      steps: [
        {
          title: t("chat.plan.stepOne.title"),
          description: t("chat.plan.stepOne.description"),
          tools: ["planning"],
        },
        {
          title: parsed?.options?.investigation
            ? t("chat.plan.stepTwoInvestigation.title")
            : t("chat.plan.stepTwo.title"),
          description: parsed?.options?.investigation
            ? t("chat.plan.stepTwoInvestigation.description")
            : t("chat.plan.stepTwo.description"),
          tools: ["web_search", "crawl"],
        },
        {
          title: t("chat.plan.stepThree.title"),
          description: t("chat.plan.stepThree.description"),
          tools: ["python", "reporter"],
        },
      ],
      reasoning: parsed?.options?.deepThinking
        ? t("chat.plan.thought")
        : "",
      reportStyle: parsed?.options?.reportStyle,
    });

    setInputText("");
    setIsResearching(true);
    setTimer(0);
    setResearchForSession(sessionId, {
      id: researchId,
      isComplete: false,
      steps: [{ status: "processing", text: t("chat.research.steps.analyzing") }],
      content: "",
    });
    setOpenResearch(true);
    setViewMode("chat");

    runResearch(query, sessionId, researchId, parsed?.options);
  };

  const handleGetStarted = () => {
    setViewMode("chat");
    if (!activeSessionId) {
      const newSession = {
        id: createSessionId(),
        title: t("sidebar.untitled"),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: [],
        research: null,
      };
      setSessions((prev) => [newSession, ...prev]);
      setActiveSessionId(newSession.id);
    }
  };

  const handleNewSession = () => {
    const newSession = {
      id: createSessionId(),
      title: t("sidebar.untitled"),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [],
      research: null,
    };
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    setInputText("");
    setIsResearching(false);
    setTimer(0);
    setOpenResearch(false);
    setViewMode("chat");
    researchIdRef.current = null;
  };

  const handleSelectSession = (id) => {
    if (id === activeSessionId) return;
    const session = sessions.find((item) => item.id === id);
    if (!session) return;
    setActiveSessionId(id);
    setViewMode("chat");
    setInputText("");
    setIsResearching(false);
    setTimer(0);
    setOpenResearch(Boolean(session.research));
    researchIdRef.current = null;
  };

  const handleDeleteSession = (id) => {
    setSessions((prev) => prev.filter((session) => session.id !== id));
    if (id === activeSessionId) {
      const remaining = sessions.filter((session) => session.id !== id);
      const nextSession = remaining[0] || null;
      setActiveSessionId(nextSession?.id || null);
      if (!nextSession) {
        setViewMode("landing");
        setOpenResearch(false);
        setIsResearching(false);
        setTimer(0);
        setInputText("");
      }
    }
  };

  return (
    <div className={cn("df-pro-root", appliedTheme === "dark" && "dark")}>
      {viewMode === "landing" ? (
        <div className="df-landing-shell flex flex-col items-center bg-background text-foreground">
          <SiteHeader />
          <main className="df-landing-main container flex flex-col items-center justify-center">
            <Jumbotron onGetStarted={handleGetStarted} />
          </main>
        </div>
      ) : (
        <div className="df-chat-shell flex h-screen w-screen justify-center overscroll-none bg-app">
          <ChatHeader theme={theme} onThemeChange={setTheme} />
          <div className="df-chat-content flex h-full w-full pt-12">
            <Sidebar
              history={sessions}
              activeId={activeSessionId}
              onNew={handleNewSession}
              onSelect={handleSelectSession}
              onDelete={handleDeleteSession}
            />
            <main
              className={cn(
                "df-chat-main flex h-full w-full justify-center px-4 pb-4",
                openResearch && "gap-8",
              )}
            >
              <div
                className={cn(
                  "flex h-full flex-col transition-all duration-300 ease-out",
                  openResearch ? "w-[538px]" : "w-[768px]",
                )}
              >
                <MessageListView
                  className="flex flex-grow"
                  messages={messages}
                  research={research}
                  openResearch={openResearch}
                  listRef={listRef}
                  onToggleResearch={() => setOpenResearch((prev) => !prev)}
                  onSend={handleSend}
                />
                <div className="relative flex h-40 shrink-0 pb-4">
                  <MessageInput
                    value={inputText}
                    onChange={setInputText}
                    onSend={handleSend}
                    responding={isResearching}
                    className="h-full w-full"
                  />
                </div>
              </div>
              <div
                className={cn(
                  "w-[min(max(calc((100vw-538px)*0.75),575px),960px)] pb-4 transition-all duration-300 ease-out",
                  !openResearch && "scale-0",
                )}
              >
                <div className="bg-card relative h-full w-full rounded-xl border pt-4 shadow-sm">
                  {research && (
                    <ResearchBlock
                      message={research}
                      isResearching={isResearching}
                      timer={formatTime(timer)}
                      onClose={() => setOpenResearch(false)}
                      onUpdateReport={(content) =>
                        updateActiveSession((session) => {
                          if (!session?.research) return session;
                          return {
                            ...session,
                            research: { ...session.research, content },
                          };
                        })
                      }
                      onGeneratePodcast={() => {
                        if (!research || !activeSessionId) return;
                        const podcastId = Date.now();
                        addMessageToSession(activeSessionId, {
                          id: podcastId,
                          role: "assistant",
                          type: "podcast",
                          title: `${t("chat.research.podcast")}: ${research.content?.split("\n")[0] ?? t("chat.research.report")}`,
                          isGenerating: true,
                          audioUrl: "",
                        });
                        setTimeout(() => {
                          const audioUrl = createSilentAudioUrl();
                          updateMessageInSession(activeSessionId, podcastId, (prev) => ({
                            ...prev,
                            isGenerating: false,
                            audioUrl,
                          }));
                        }, 1500);
                      }}
                    />
                  )}
                </div>
              </div>
            </main>
          </div>
        </div>
      )}
    </div>
  );
};

const RaycastHomePage = () => (
  <I18nProvider>
    <RaycastHomePageInner />
  </I18nProvider>
);

export default RaycastHomePage;
