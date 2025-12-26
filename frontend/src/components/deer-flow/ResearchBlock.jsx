import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Check,
  Copy,
  Download,
  FileCode,
  FileImage,
  FileText,
  FileType,
  GraduationCap,
  Headphones,
  Loader2,
  Pencil,
  Save,
  Undo2,
  X,
} from "lucide-react";
import DOMPurify from "dompurify";
import { marked } from "marked";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { saveAs } from "file-saver";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { LoadingAnimation } from "./LoadingAnimation";
import { cn } from "../../lib/utils";
import { useI18n } from "./I18nContext";

const downloadText = (content, filename, mimeType) => {
  const blob = new Blob([content], { type: mimeType });
  saveAs(blob, filename);
};

const stripMarkdown = (markdown) => {
  return markdown
    .replace(/`{3}[\s\S]*?`{3}/g, "")
    .replace(/`(.+?)`/g, "$1")
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/[#>*_~]/g, "")
    .replace(/\n{2,}/g, "\n");
};

const createSilentAudioUrl = () => {
  const sampleRate = 8000;
  const duration = 2;
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

const computeEvaluation = (content) => {
  const plain = stripMarkdown(content || "");
  const words = plain.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const headings = (content.match(/^#{1,6}\s/gm) || []).length;
  const imageCount = (content.match(/!\[.*?\]\(.*?\)/g) || []).length;
  const linkMatches = content.match(/\[(.*?)\]\((.*?)\)/g) || [];
  const linkUrls = linkMatches
    .map((match) => match.replace(/\[(.*?)\]\((.*?)\)/, "$2"))
    .filter(Boolean);
  const uniqueSources = new Set();
  linkUrls.forEach((url) => {
    try {
      uniqueSources.add(new URL(url).hostname);
    } catch {
      uniqueSources.add(url);
    }
  });
  const citations = linkUrls.length;
  const sectionCoverage = Math.min(100, headings * 20);
  const baseScore = Math.min(95, 65 + Math.floor(wordCount / 40));
  const scores = {
    factual_accuracy: Math.min(95, baseScore + Math.min(citations * 2, 10)),
    completeness: Math.min(95, baseScore + Math.min(headings * 3, 10)),
    coherence: Math.min(95, baseScore + 5),
    relevance: Math.min(95, baseScore + 3),
    citation_quality: Math.min(95, 60 + Math.min(uniqueSources.size * 8, 30)),
    writing_quality: Math.min(95, baseScore + 4),
  };

  return {
    wordCount,
    citations,
    sources: uniqueSources.size,
    images: imageCount,
    sectionCoverage,
    scores,
    strengths: [
      "Clear structure with measurable sections.",
      "Uses citations to support key findings.",
      "Balanced coverage of market and technical signals.",
    ],
    weaknesses: [
      "Add more real-world examples for stronger credibility.",
      "Expand competitive analysis section for deeper insights.",
    ],
  };
};

export const ResearchBlock = ({
  message,
  isResearching,
  timer,
  onClose,
  onUpdateReport,
  onGeneratePodcast,
}) => {
  const { t, tArray } = useI18n();
  const [activeTab, setActiveTab] = useState(
    message?.isComplete ? "report" : "activities",
  );
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message?.content ?? "");
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [showEvaluation, setShowEvaluation] = useState(false);
  const [evaluationState, setEvaluationState] = useState("idle");
  const [evaluationResult, setEvaluationResult] = useState(null);
  const [podcastState, setPodcastState] = useState({
    status: "idle",
    audioUrl: "",
  });
  const evaluationDefaults = useMemo(
    () => ({
      strengths: tArray("chat.research.evaluationStrengthItems", [
        "Clear structure with measurable sections.",
        "Uses citations to support key findings.",
        "Balanced coverage of market and technical signals.",
      ]),
      weaknesses: tArray("chat.research.evaluationWeaknessItems", [
        "Add more real-world examples for stronger credibility.",
        "Expand competitive analysis section for deeper insights.",
      ]),
    }),
    [tArray],
  );

  useEffect(() => {
    if (message?.isComplete) {
      setActiveTab("report");
    }
  }, [message?.isComplete]);

  useEffect(() => {
    setDraft(message?.content ?? "");
  }, [message?.content]);

  useEffect(() => {
    if (!showEvaluation || !message?.content) return;
    setEvaluationState("loading");
    const timer = setTimeout(() => {
      const computed = computeEvaluation(message.content);
      setEvaluationResult({
        ...computed,
        strengths: evaluationDefaults.strengths,
        weaknesses: evaluationDefaults.weaknesses,
      });
      setEvaluationState("done");
    }, 900);
    return () => clearTimeout(timer);
  }, [showEvaluation, message?.content, evaluationDefaults]);

  const status = useMemo(() => {
    if (!message) return "";
    if (message.isComplete) return t("chat.research.reportGenerated");
    return t("chat.research.researching");
  }, [message, t]);

  const handleCopy = () => {
    if (!message?.content) return;
    void navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  const timestamp = useMemo(
    () =>
      new Date()
        .toISOString()
        .replace(/[:T]/g, "-")
        .split(".")[0],
    [message?.content],
  );

  const handleDownloadMarkdown = () => {
    if (!message?.content) return;
    downloadText(message.content, `research-report-${timestamp}.md`, "text/markdown");
  };

  const handleDownloadHTML = () => {
    if (!message?.content) return;
    const rawHtml = marked(message.content);
    const sanitizedHtml = DOMPurify.sanitize(rawHtml);
    const fullHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Research Report</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 24px; line-height: 1.6; color: #111; }
    h1, h2, h3 { color: #111; }
    code { background: #f5f5f5; padding: 2px 6px; border-radius: 4px; }
    pre { background: #f5f5f5; padding: 16px; border-radius: 8px; overflow-x: auto; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background: #f4f4f4; }
  </style>
</head>
<body>${sanitizedHtml}</body>
</html>`;
    downloadText(fullHTML, `research-report-${timestamp}.html`, "text/html");
  };

  const handleDownloadPDF = () => {
    if (!message?.content) return;
    const pdf = new jsPDF("p", "mm", "a4");
    const margin = 16;
    const maxWidth = 210 - margin * 2;
    const lines = stripMarkdown(message.content).split("\n");
    let y = 20;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(11);
    lines.forEach((line) => {
      const split = pdf.splitTextToSize(line, maxWidth);
      if (y + split.length * 6 > 280) {
        pdf.addPage();
        y = 20;
      }
      pdf.text(split, margin, y);
      y += split.length * 6 + 2;
    });
    pdf.save(`research-report-${timestamp}.pdf`);
  };

  const handleDownloadWord = async () => {
    if (!message?.content) return;
    const plain = stripMarkdown(message.content);
    const paragraphs = plain.split("\n").map((line) => new Paragraph({
      children: [new TextRun(line)],
    }));
    const doc = new Document({
      sections: [{ children: paragraphs }],
    });
    const blob = await Packer.toBlob(doc);
    saveAs(blob, `research-report-${timestamp}.docx`);
  };

  const handleDownloadImage = async () => {
    if (!message?.content) return;
    const container = document.createElement("div");
    container.style.cssText =
      "position:absolute;left:-9999px;top:0;width:800px;padding:24px;background:#fff;color:#111;font-family:Arial,sans-serif;line-height:1.6;";
    const rawHtml = marked(message.content);
    container.innerHTML = DOMPurify.sanitize(rawHtml);
    document.body.appendChild(container);
    try {
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });
      const blob = await new Promise((resolve) =>
        canvas.toBlob((result) => resolve(result), "image/png"),
      );
      if (blob) {
        saveAs(blob, `research-report-${timestamp}.png`);
      }
    } finally {
      container.remove();
    }
  };

  const handleGeneratePodcast = () => {
    if (podcastState.status === "generating") return;
    setPodcastState({ status: "generating", audioUrl: "" });
    onGeneratePodcast?.();
    setTimeout(() => {
      const audioUrl = createSilentAudioUrl();
      setPodcastState({ status: "ready", audioUrl });
    }, 1600);
  };

  const evaluation = evaluationResult || {
    wordCount: 0,
    citations: 0,
    sources: 0,
    images: 0,
    sectionCoverage: 0,
    scores: {},
    strengths: [],
    weaknesses: [],
  };

  return (
    <div className="df-research-block relative h-full w-full">
      <div className="df-research-toolbar absolute right-4 top-4 flex h-9 items-center gap-1 text-muted-foreground">
        {isResearching && (
          <span className="mr-2 text-xs font-mono text-blue-500">
            {timer}
          </span>
        )}
        {message?.content && (
          <>
            <button
              className="rounded-md p-2 transition-colors hover:text-foreground"
              type="button"
              title={t("chat.research.generatePodcast")}
              onClick={handleGeneratePodcast}
            >
              <Headphones size={16} />
            </button>
            <button
              className="rounded-md p-2 transition-colors hover:text-foreground"
              type="button"
              title={t("common.edit")}
              onClick={() => setEditing((prev) => !prev)}
            >
              {editing ? <Undo2 size={16} /> : <Pencil size={16} />}
            </button>
            <button
              className="rounded-md p-2 transition-colors hover:text-foreground"
              onClick={handleCopy}
              type="button"
              title={t("common.copy")}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
            <button
              className="rounded-md p-2 transition-colors hover:text-foreground"
              type="button"
              title={t("chat.research.evaluation")}
              onClick={() => setShowEvaluation(true)}
            >
              <GraduationCap size={16} />
            </button>
            <div className="relative">
              <button
                className="rounded-md p-2 transition-colors hover:text-foreground"
                type="button"
                title={t("chat.research.downloadReport")}
                onClick={() => setDownloadOpen((prev) => !prev)}
              >
                <Download size={16} />
              </button>
              {downloadOpen && (
                <div className="bg-card absolute right-0 mt-2 w-44 rounded-lg border p-1 shadow-lg">
                  <button
                    type="button"
                    className="hover:bg-accent flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm"
                    onClick={handleDownloadMarkdown}
                  >
                    <FileText className="h-4 w-4" />
                    {t("chat.research.downloads.markdown")}
                  </button>
                  <button
                    type="button"
                    className="hover:bg-accent flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm"
                    onClick={handleDownloadHTML}
                  >
                    <FileCode className="h-4 w-4" />
                    {t("chat.research.downloads.html")}
                  </button>
                  <button
                    type="button"
                    className="hover:bg-accent flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm"
                    onClick={handleDownloadPDF}
                  >
                    <FileType className="h-4 w-4" />
                    {t("chat.research.downloads.pdf")}
                  </button>
                  <button
                    type="button"
                    className="hover:bg-accent flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm"
                    onClick={handleDownloadWord}
                  >
                    <FileText className="h-4 w-4" />
                    {t("chat.research.downloads.word")}
                  </button>
                  <button
                    type="button"
                    className="hover:bg-accent flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm"
                    onClick={handleDownloadImage}
                  >
                    <FileImage className="h-4 w-4" />
                    {t("chat.research.downloads.image")}
                  </button>
                </div>
              )}
            </div>
          </>
        )}
        <button
          className="rounded-md p-2 transition-colors hover:text-foreground"
          onClick={onClose}
          type="button"
          title={t("common.close")}
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex w-full justify-center pt-4">
        <div className="df-research-tabs bg-muted text-muted-foreground inline-flex h-9 items-center justify-center rounded-lg p-[3px]">
          <button
            className={cn(
              "df-research-tab inline-flex h-[calc(100%-1px)] items-center gap-2 rounded-md px-4 text-sm font-medium transition-all",
              activeTab === "report"
                ? "bg-background text-foreground shadow-sm"
                : "hover:text-foreground",
            )}
            onClick={() => setActiveTab("report")}
            type="button"
            disabled={!message?.isComplete}
          >
            <FileText size={14} /> {t("chat.research.report")}
          </button>
          <button
            className={cn(
              "df-research-tab inline-flex h-[calc(100%-1px)] items-center gap-2 rounded-md px-4 text-sm font-medium transition-all",
              activeTab === "activities"
                ? "bg-background text-foreground shadow-sm"
                : "hover:text-foreground",
            )}
            onClick={() => setActiveTab("activities")}
            type="button"
          >
            <Activity size={14} /> {t("chat.research.activities")}
            {isResearching && (
              <span className="ml-1 h-1.5 w-1.5 rounded-full bg-blue-500" />
            )}
          </button>
        </div>
      </div>

      <div className="df-research-body h-full min-h-0 px-8 pb-6 pt-4">
        <div className="df-research-scroll custom-scrollbar h-full max-h-[600px] overflow-y-auto pr-2">
          {activeTab === "activities" ? (
            <div className="flex flex-col gap-4 pt-4">
              {(message?.steps || []).map((step, index) => (
                <div key={index} className="df-activity-item flex gap-4 items-start">
                  <div className="mt-1">
                    {step.status === "done" ? (
                      <Check className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p
                      className={cn(
                        "text-sm transition-colors",
                        step.status === "done"
                          ? "text-muted-foreground"
                          : "text-foreground font-medium",
                      )}
                    >
                      {step.text}
                    </p>
                    {step.details && (
                      <div className="mt-2 text-xs text-muted-foreground border-l-2 border-border pl-3 py-1">
                        {step.details}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isResearching && (
                <LoadingAnimation className="mx-4 my-8" />
              )}
            </div>
          ) : (
            <div className="max-w-none pt-4">
              {message?.content ? (
                <>
                  {editing ? (
                    <div className="space-y-3">
                      <textarea
                        className="df-report-editor min-h-[280px] w-full rounded-lg border p-3 text-sm"
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="df-report-action rounded-full bg-foreground px-4 py-2 text-sm text-background"
                          onClick={() => {
                            onUpdateReport?.(draft);
                            setEditing(false);
                          }}
                        >
                          <Save className="mr-2 inline-flex h-4 w-4" />
                          {t("common.save")}
                        </button>
                        <button
                          type="button"
                          className="df-report-action rounded-full border px-4 py-2 text-sm"
                          onClick={() => {
                            setDraft(message.content);
                            setEditing(false);
                          }}
                        >
                          {t("common.cancel")}
                        </button>
                      </div>
                    </div>
                ) : (
                  <MarkdownRenderer content={message.content} />
                )}
              </>
            ) : (
              <div className="df-report-empty text-muted-foreground flex flex-col items-center justify-center py-24 text-sm">
                {isResearching
                  ? t("chat.research.reportGenerating")
                  : t("chat.research.reportEmpty")}
              </div>
            )}

            {podcastState.status !== "idle" && (
              <div className="df-report-podcast mt-8 rounded-xl border p-4">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-semibold">
                    {t("chat.research.podcast")}
                  </span>
                  {podcastState.audioUrl && (
                    <a
                      className="text-muted-foreground hover:text-foreground text-xs"
                      href={podcastState.audioUrl}
                      download={`research-podcast-${timestamp}.wav`}
                    >
                      {t("common.download")}
                    </a>
                  )}
                </div>
                {podcastState.status === "generating" ? (
                  <LoadingAnimation />
                  ) : (
                    <audio
                      className="w-full"
                      controls
                      src={podcastState.audioUrl}
                    />
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showEvaluation && (
        <div className="df-eval-overlay fixed inset-0 z-[110] flex items-center justify-center bg-black/40 px-4">
          <div className="df-eval-dialog bg-card w-full max-w-2xl rounded-xl border p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h4 className="text-lg font-semibold">
                {t("chat.research.evaluation")}
              </h4>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setShowEvaluation(false);
                  setEvaluationState("idle");
                  setEvaluationResult(null);
                }}
              >
                <X size={16} />
              </button>
            </div>
            <p className="text-muted-foreground text-sm">
              {t("chat.research.evaluationDesc")}
            </p>
            {evaluationState === "loading" ? (
              <div className="py-8">
                <LoadingAnimation />
                <div className="text-muted-foreground mt-3 text-xs">
                  {t("chat.research.evaluationRunning")}
                </div>
              </div>
            ) : (
              <div className="mt-6 grid gap-6 md:grid-cols-2">
                <div>
                  <h5 className="text-sm font-semibold">
                    {t("chat.research.evaluationMetrics")}
                  </h5>
                  <div className="mt-4 space-y-3 text-sm">
                    <div className="df-eval-metric flex justify-between">
                      <span>{t("chat.research.wordCount")}</span>
                      <span className="font-semibold">{evaluation.wordCount}</span>
                    </div>
                    <div className="df-eval-metric flex justify-between">
                      <span>{t("chat.research.citations")}</span>
                      <span className="font-semibold">{evaluation.citations}</span>
                    </div>
                    <div className="df-eval-metric flex justify-between">
                      <span>{t("chat.research.sources")}</span>
                      <span className="font-semibold">{evaluation.sources}</span>
                    </div>
                    <div className="df-eval-metric flex justify-between">
                      <span>{t("chat.research.images")}</span>
                      <span className="font-semibold">{evaluation.images}</span>
                    </div>
                    <div className="df-eval-metric flex justify-between">
                      <span>{t("chat.research.sectionCoverage")}</span>
                      <span className="font-semibold">
                        {evaluation.sectionCoverage}%
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <h5 className="text-sm font-semibold">
                    {t("chat.research.evaluationAnalysis")}
                  </h5>
                  <div className="mt-4 space-y-4 text-sm">
                    {Object.entries(evaluation.scores).map(([label, value]) => (
                      <div key={label}>
                        <div className="flex justify-between text-xs">
                          <span className="uppercase tracking-wide">
                            {t(`chat.research.evaluationLabels.${label}`, label)}
                          </span>
                          <span className="font-semibold">{value}%</span>
                        </div>
                        <div className="bg-muted mt-2 h-2 w-full rounded-full">
                          <div
                            className="bg-foreground h-2 rounded-full"
                            style={{ width: `${value}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h5 className="text-sm font-semibold">
                    {t("chat.research.evaluationStrengths")}
                  </h5>
                  <ul className="text-muted-foreground mt-3 list-disc space-y-2 pl-4 text-sm">
                    {evaluation.strengths.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h5 className="text-sm font-semibold">
                    {t("chat.research.evaluationWeaknesses")}
                  </h5>
                  <ul className="text-muted-foreground mt-3 list-disc space-y-2 pl-4 text-sm">
                    {evaluation.weaknesses.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                className="rounded-full bg-foreground px-4 py-2 text-sm text-background"
                onClick={() => setShowEvaluation(false)}
              >
                {t("common.done")}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="df-research-status absolute left-6 bottom-4 text-xs text-muted-foreground">
        {status}
      </div>
    </div>
  );
};
