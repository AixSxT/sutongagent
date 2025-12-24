import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpOutlined,
  CarOutlined,
  CloseOutlined,
  CreditCardOutlined,
  DownOutlined,
  DownloadOutlined,
  FileTextOutlined,
  HistoryOutlined,
  IdcardOutlined,
  LoadingOutlined,
  PlusOutlined,
  ReloadOutlined
} from '@ant-design/icons';

import { visionApi } from '../services/api';
import './VisionExtractPage.css';

const _COLUMN_RULES = {
  numeric: /(数量|库存|实盘|差异|差额|金额|合计|税额|单价|价格|合格率|重量|净含量|毛重)/,
  date: /(日期|时间|批次|生产|有效|到期)/,
  code: /(编码|编号|条码|税号|身份证|统一社会信用代码|证件号|卡号)/,
  unit: /(单位|计量)/,
  spec: /(规格|型号|包装|容量|含量)/,
  name: /(名称|品名|货品|商品|项目|物料)/
};

function classifyColumn(name) {
  const n = String(name || '').trim();
  if (!n) return 'text';
  if (_COLUMN_RULES.numeric.test(n)) return 'numeric';
  if (_COLUMN_RULES.date.test(n)) return 'date';
  if (_COLUMN_RULES.code.test(n)) return 'code';
  if (_COLUMN_RULES.unit.test(n)) return 'unit';
  if (_COLUMN_RULES.spec.test(n)) return 'spec';
  if (_COLUMN_RULES.name.test(n)) return 'name';
  return 'text';
}

function isLikelyNumber(s) {
  const v = String(s ?? '').trim();
  if (!v) return false;
  // allow integers/decimals and common OCR separators
  const cleaned = v.replace(/[,\uFF0C]/g, '').replace(/\s+/g, '');
  return /^-?\d+(\.\d+)?$/.test(cleaned);
}

function isLikelyDateOrBatch(s) {
  const v = String(s ?? '').trim();
  if (!v) return false;
  if (/^\d{8}$/.test(v)) return true; // 20250303
  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(v)) return true;
  if (/^PC?\d{8,}$/.test(v)) return true; // PC2025...
  return false;
}

function parseTableText(text) {
  const raw = String(text || '').trim();
  if (!raw) return { ok: false, reason: 'empty' };
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return { ok: false, reason: 'not_enough_lines' };

  const headerTokens = lines[0].split(/\s+/).filter(Boolean);
  if (headerTokens.length < 2) return { ok: false, reason: 'no_header' };

  const columns = headerTokens;
  const colTypes = columns.map(classifyColumn);
  const colCount = columns.length;

  const rows = [];
  const issues = []; // { r, c, reason }

  for (let r = 1; r < lines.length; r++) {
    const toks = lines[r].split(/\s+/).filter(Boolean);
    const values = Array(colCount).fill('');
    if (toks.length === 0) continue;

    if (toks.length <= colCount) {
      for (let i = 0; i < colCount; i++) values[i] = toks[i] ?? '';
    } else {
      // Fill from the right for structured columns
      let tokIdx = toks.length - 1;
      let colIdx = colCount - 1;
      const remaining = new Set();
      for (let i = 0; i <= colIdx; i++) remaining.add(i);

      while (colIdx >= 0 && tokIdx >= 0) {
        const t = colTypes[colIdx];
        if (t === 'numeric' || t === 'date' || t === 'code' || t === 'unit' || t === 'spec') {
          values[colIdx] = toks[tokIdx];
          remaining.delete(colIdx);
          tokIdx -= 1;
          colIdx -= 1;
          continue;
        }
        break;
      }

      // Decide absorb column (first "name" or "text", else last remaining)
      let absorbIdx = -1;
      if (colCount === 2) {
        // Common "字段 值" output: value side may contain spaces.
        absorbIdx = 1;
      } else {
        for (let i = 0; i < colCount; i++) {
          if (!remaining.has(i)) continue;
          if (colTypes[i] === 'name') {
            absorbIdx = i;
            break;
          }
        }
        if (absorbIdx === -1) {
          // Safer default: absorb into the last remaining column.
          for (let i = colCount - 1; i >= 0; i--) {
            if (remaining.has(i)) {
              absorbIdx = i;
              break;
            }
          }
        }
      }

      let leftTok = 0;
      for (let i = 0; i < colCount; i++) {
        if (!remaining.has(i)) continue;
        if (i === absorbIdx) {
          values[i] = toks.slice(leftTok, tokIdx + 1).join(' ');
          leftTok = tokIdx + 1;
          remaining.delete(i);
        } else {
          values[i] = toks[leftTok] ?? '';
          leftTok += 1;
          remaining.delete(i);
        }
      }
    }

    // Validate cells and collect suspicious ones.
    for (let c = 0; c < colCount; c++) {
      const val = String(values[c] ?? '').trim();
      const colName = columns[c];
      const t = colTypes[c];

      if (t === 'numeric') {
        if (val && !isLikelyNumber(val)) issues.push({ r: r - 1, c, reason: `${colName} 应为数字` });
      } else if (t === 'date') {
        if (val && !isLikelyDateOrBatch(val)) issues.push({ r: r - 1, c, reason: `${colName} 格式可疑` });
      } else if (t === 'unit') {
        if (val && val.length > 10) issues.push({ r: r - 1, c, reason: `${colName} 过长` });
      } else if (t === 'code') {
        if (val && val.length < 3) issues.push({ r: r - 1, c, reason: `${colName} 过短` });
      }

      // Common OCR confusion in numeric-like columns even when not classified
      if (/(数量|库存|实盘|差异|金额)/.test(colName) && val && /[OoIl]/.test(val)) {
        issues.push({ r: r - 1, c, reason: `${colName} 可能有字符混淆` });
      }
    }

    rows.push(values);
  }

  return { ok: true, columns, rows, issues };
}

const TABLE_TEMPLATE_PROMPT =
  '请从图片中识别表格，并严格按“纯文本表格”输出（不要解释、不要多余文字）：\n' +
  '1) 第一行必须是表头，列名用空格分隔（与图片一致）。\n' +
  '2) 从第二行开始每一行是一条记录，列之间用单个空格分隔。\n' +
  '3) 如果某个单元格为空，用 "-" 占位，确保每行列数与表头完全一致。\n' +
  '4) 不要把多条记录合并成一行；不要在行中换行。\n' +
  '5) 如果某行看不清，请仍输出该行，并在不确定的单元格用 "??" 填充。\n' +
  '只输出表格内容。';

const SUGGESTIONS = [
  {
    title: '身份证识别',
    icon: <IdcardOutlined />,
    prompt:
      '请识别身份证图片中的文字信息，并严格按下面“纯文本表格”格式输出（不要解释）：\n' +
      '字段 值\n' +
      '姓名 -\n' +
      '性别 -\n' +
      '民族 -\n' +
      '出生日期 -\n' +
      '住址 -\n' +
      '公民身份号码 -\n' +
      '要求：看不清的值填 ??；不要合并行；只输出表格内容。'
  },
  {
    title: '发票识别',
    icon: <FileTextOutlined />,
    prompt:
      '请识别发票图片中的文字信息，并严格按下面“纯文本表格”格式输出（不要解释）：\n' +
      '字段 值\n' +
      '发票号码 -\n' +
      '开票日期 -\n' +
      '购买方名称 -\n' +
      '购买方税号 -\n' +
      '销售方名称 -\n' +
      '销售方税号 -\n' +
      '金额 -\n' +
      '税额 -\n' +
      '价税合计 -\n' +
      '备注 -\n' +
      '要求：看不清的值填 ??；只输出表格内容。'
  },
  {
    title: '火车票识别',
    icon: <CarOutlined />,
    prompt:
      '请识别火车票图片中的关键信息，并严格按下面“纯文本表格”格式输出（不要解释）：\n' +
      '字段 值\n' +
      '始发站 -\n' +
      '终到站 -\n' +
      '车次 -\n' +
      '出发日期 -\n' +
      '出发时间 -\n' +
      '座位/席别 -\n' +
      '票价 -\n' +
      '乘车人 -\n' +
      '要求：看不清的值填 ??；只输出表格内容。'
  },
  {
    title: '银行/社保卡识别',
    icon: <CreditCardOutlined />,
    prompt:
      '请识别银行卡/社保卡图片中的文字信息，并严格按下面“纯文本表格”格式输出（不要解释）：\n' +
      '字段 值\n' +
      '卡类型(银行卡/社保卡) -\n' +
      '姓名 -\n' +
      '卡号 -\n' +
      '银行/机构 -\n' +
      '有效期 -\n' +
      '要求：看不清的值填 ??；只输出表格内容。'
  },
  {
    title: '运营执照识别',
    icon: <FileTextOutlined />,
    prompt:
      '请识别运营/营业执照图片中的文字信息，并严格按下面“纯文本表格”格式输出（不要解释）：\n' +
      '字段 值\n' +
      '名称 -\n' +
      '统一社会信用代码 -\n' +
      '类型 -\n' +
      '住所 -\n' +
      '法定代表人 -\n' +
      '注册资本 -\n' +
      '成立日期 -\n' +
      '营业期限 -\n' +
      '经营范围 -\n' +
      '要求：看不清的值填 ??；只输出表格内容。'
  }
];

const STORAGE_KEY = 'vision_extract_prompt_history_v1';
const ACTIVE_JOB_KEY = 'vision_extract_active_job_v1';
const MAX_HISTORY = 5;
const MAX_HISTORY_RESULT_CHARS = 60000;

export default function VisionExtractPage() {
  const fileInputRef = useRef(null);
  const promptRef = useRef(null);
  const abortRef = useRef(null);
  const jobIdRef = useRef('');
  const eventSourceRef = useRef(null);
  const statusMsgIdRef = useRef('');
  const assistantMsgIdRef = useRef('');
  const pendingFilesRef = useRef([]);
  const batchTotalRef = useRef(0);
  const batchCancelRef = useRef(false);
  const startNextJobRef = useRef(null);
  const activeItemRef = useRef(null);
  const cancelModeRef = useRef('none');
  const processedCountRef = useRef(0);

  const [file, setFile] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [batchIndex, setBatchIndex] = useState(0);
  const [batchTotal, setBatchTotal] = useState(0);
  const [batchActiveName, setBatchActiveName] = useState('');
  const [activeItemId, setActiveItemId] = useState('');
  const [isQueueDragActive, setIsQueueDragActive] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [prompt, setPrompt] = useState('请提取图片中的所有文字，按原顺序输出。只输出文字，不要添加解释。');
  const [isLoading, setIsLoading] = useState(false);
  const [resultText, setResultText] = useState('');
  const [error, setError] = useState('');
  const [errorKind, setErrorKind] = useState('error'); // error | cancel
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [history, setHistory] = useState([]);
  const [stage, setStage] = useState('idle'); // idle | uploading | model_request_started | generating | done | error | cancelled
  const [uploadPct, setUploadPct] = useState(0);
  const [startAtMs, setStartAtMs] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [viewMode, setViewMode] = useState('chat'); // chat | text | table
  const [chatMessages, setChatMessages] = useState(() => [
    { id: 'sys-hello', role: 'system', text: '准备就绪：上传图片 → 填写要求 → 点击 ↑ 开始识图。', ts: Date.now() },
  ]);
  const [focusCellKey, setFocusCellKey] = useState('');
  const [issueCursor, setIssueCursor] = useState(0);
  const tableWrapRef = useRef(null);
  const chatEndRef = useRef(null);
  const chatWrapRef = useRef(null);
  const hasInteractedRef = useRef(false);
  const isFirstRenderRef = useRef(true);
  const lastSeqRef = useRef(0);
  const chatNearBottomRef = useRef(true);

  const fileName = useMemo(() => {
    if (selectedFiles.length > 1) return `${selectedFiles.length} 张图片`;
    if (selectedFiles.length === 1) return selectedFiles[0]?.file?.name || '';
    return file ? file.name : '';
  }, [file, selectedFiles]);
  const elapsedText = useMemo(() => {
    if (!startAtMs) return '';
    const sec = Math.max(0, elapsedMs) / 1000;
    return `${sec.toFixed(1)}s`;
  }, [elapsedMs, startAtMs]);

  const scrollChatToBottom = (behavior = 'auto') => {
    const el = chatWrapRef.current;
    if (!el) return;
    try {
      el.scrollTo({ top: el.scrollHeight, behavior });
    } catch {
      // ignore
    }
  };

  const handleChatScroll = () => {
    const el = chatWrapRef.current;
    if (!el) return;
    try {
      chatNearBottomRef.current = el.scrollTop + el.clientHeight >= el.scrollHeight - 40;
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (viewMode !== 'chat') return;
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }
    if (!hasInteractedRef.current && !isLoading) return;
    if (isLoading && !chatNearBottomRef.current) return;
    scrollChatToBottom('smooth');
  }, [chatMessages, viewMode, isLoading]);

  const stageLabel = useMemo(() => {
    const showBatch = batchTotal > 1;
    const batchInfo = showBatch ? `（${batchIndex}/${batchTotal}）` : '';
    const batchName = showBatch && batchActiveName ? ` ${batchActiveName}` : '';
    const suffix = `${batchInfo}${batchName}`;
    if (!isLoading && stage === 'idle') return '';
    if (stage === 'uploading') return uploadPct ? `正在上传… ${uploadPct}%${suffix}` : `正在上传…${suffix}`;
    if (stage === 'model_request_started') return `正在识别…${suffix}`;
    if (stage === 'generating') return `正在生成结果…${suffix}`;
    if (stage === 'cancelled') return '已取消';
    if (stage === 'error') return '识图失败';
    if (stage === 'done') return '已完成';
    return '处理中…';
  }, [batchActiveName, batchIndex, batchTotal, isLoading, stage, uploadPct]);

  const structured = useMemo(() => {
    if (isLoading) return { ok: false, reason: 'loading' };
    return parseTableText(resultText);
  }, [isLoading, resultText]);

  const issueMap = useMemo(() => {
    if (!structured.ok) return null;
    const m = new Map();
    for (const it of structured.issues || []) {
      m.set(`${it.r}:${it.c}`, it.reason || '可疑');
    }
    return m;
  }, [structured]);

  const issueKeys = useMemo(() => {
    if (!structured.ok) return [];
    return (structured.issues || []).map((i) => `${i.r}:${i.c}`);
  }, [structured]);

  useEffect(() => {
    setFocusCellKey('');
    setIssueCursor(0);
  }, [structured.ok, structured.ok ? structured.issues?.length : 0]);

  const makeId = () => `${Date.now().toString(36)}_${Math.random().toString(16).slice(2)}`;

  const addChat = (role, text) => {
    const msg = { id: makeId(), role, text: String(text || ''), ts: Date.now() };
    setChatMessages((prev) => {
      const next = [...prev, msg];
      return next.length > 80 ? next.slice(next.length - 80) : next;
    });
    return msg.id;
  };

  const upsertSystemStatus = (text) => {
    const t = String(text || '').trim();
    if (!t) return;
    const id = statusMsgIdRef.current;
    if (!id) {
      statusMsgIdRef.current = addChat('system', t);
      return;
    }
    setChatMessages((prev) => prev.map((m) => (m.id === id ? { ...m, text: t, ts: Date.now() } : m)));
  };

  const appendAssistantDelta = (delta) => {
    const d = String(delta || '');
    if (!d) return;
    if (!assistantMsgIdRef.current) {
      assistantMsgIdRef.current = addChat('assistant', d);
      return;
    }
    const id = assistantMsgIdRef.current;
    setChatMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, text: String(m.text || '') + d, ts: Date.now() } : m)),
    );
  };

  const saveActiveJob = (partial) => {
    try {
      const prevRaw = window.localStorage.getItem(ACTIVE_JOB_KEY);
      const prev = prevRaw ? JSON.parse(prevRaw) : {};
      const next = { ...prev, ...partial, updatedAt: Date.now() };
      window.localStorage.setItem(ACTIVE_JOB_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const clearActiveJob = () => {
    try {
      window.localStorage.removeItem(ACTIVE_JOB_KEY);
    } catch {
      // ignore
    }
  };

  const loadActiveJob = () => {
    try {
      const raw = window.localStorage.getItem(ACTIVE_JOB_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      const next = parsed
        .slice(0, MAX_HISTORY)
        .map((h) => {
          if (!h) return null;
          if (typeof h === 'string') return { prompt: h, result: '', truncated: false, ts: Date.now() };
          return {
            prompt: String(h.prompt || ''),
            result: typeof h.result === 'string' ? h.result : '',
            truncated: Boolean(h.truncated),
            ts: Number(h.ts) || Date.now(),
          };
        })
        .filter(Boolean);
      setHistory(next);
    } catch {
      // ignore
    }
  }, []);

  // 尝试恢复未完成任务
  useEffect(() => {
    const saved = loadActiveJob();
    const jobId = saved?.jobId;
    if (!jobId) return;
    if (eventSourceRef.current || isLoading) return;

    const savedStage = String(saved?.stage || '');
    const savedText = typeof saved?.resultText === 'string' ? saved.resultText : '';
    const savedPrompt = typeof saved?.prompt === 'string' ? saved.prompt : '';

    if (savedPrompt) setPrompt(savedPrompt);
    if (savedText) setResultText(savedText);
    if (savedStage) setStage(savedStage);

    if (savedStage === 'done' || savedStage === 'error' || savedStage === 'cancelled') return;

    jobIdRef.current = String(jobId);
    lastSeqRef.current = Number(saved?.lastSeq) || 0;
    hasInteractedRef.current = true;
    chatNearBottomRef.current = true;
    setViewMode('chat');
    setIsLoading(true);
    upsertSystemStatus('Resuming...');

    const es = new EventSource(visionApi.eventsUrl(jobIdRef.current, lastSeqRef.current));
    eventSourceRef.current = es;

    es.addEventListener('snapshot', (evt) => {
      try {
        const payload = JSON.parse(evt.data || '{}');
        const s = payload?.stage;
        const t = payload?.text;
        const seq = payload?.seq;
        if (typeof t === 'string') setResultText(t);
        if (Number.isFinite(Number(seq))) lastSeqRef.current = Number(seq) || lastSeqRef.current;
        if (s === 'model_request_started') setStage('model_request_started');
        if (s === 'generating') setStage('generating');
        if (s === 'done') setStage('done');
        saveActiveJob({ jobId: jobIdRef.current, stage: s || '', lastSeq: lastSeqRef.current, resultText: typeof t === 'string' ? t : '' });
      } catch {
        // ignore
      }
    });

    es.addEventListener('stage', (evt) => {
      try {
        const payload = JSON.parse(evt.data || '{}');
        const s = payload?.stage;
        const seq = payload?.seq;
        if (Number.isFinite(Number(seq))) lastSeqRef.current = Number(seq) || lastSeqRef.current;
        saveActiveJob({ jobId: jobIdRef.current, stage: s || '', lastSeq: lastSeqRef.current });
        if (s === 'model_request_started') setStage('model_request_started');
        if (s === 'generating') setStage('generating');
      } catch {
        // ignore
      }
    });

    es.addEventListener('delta', (evt) => {
      try {
        const payload = JSON.parse(evt.data || '{}');
        const delta = payload?.text || '';
        const seq = payload?.seq;
        if (Number.isFinite(Number(seq))) lastSeqRef.current = Number(seq) || lastSeqRef.current;
        if (delta) {
          setStage('generating');
          setResultText((prev) => String(prev || '') + String(delta));
          appendAssistantDelta(delta);
          saveActiveJob({ jobId: jobIdRef.current, stage: 'generating', lastSeq: lastSeqRef.current });
        }
      } catch {
        // ignore
      }
    });

    es.addEventListener('done', (evt) => {
      try {
        const payload = JSON.parse(evt.data || '{}');
        const text = payload?.text || '';
        const seq = payload?.seq;
        if (Number.isFinite(Number(seq))) lastSeqRef.current = Number(seq) || lastSeqRef.current;
        setResultText(text);
        setStage('done');
        pushHistory(savedPrompt || prompt, text);
        saveActiveJob({ jobId: jobIdRef.current, stage: 'done', lastSeq: lastSeqRef.current, resultText: String(text || '') });
      } catch {
        // ignore
      } finally {
        closeStream();
        resetActiveJob();
        setIsLoading(false);
        clearActiveJob();
      }
    });

    es.addEventListener('cancelled', () => {
      setStage('cancelled');
      setErrorKind('cancel');
      setError('已取消');
      closeStream();
      resetActiveJob();
      setIsLoading(false);
      clearActiveJob();
    });

    es.addEventListener('job_error', (evt) => {
      try {
        const payload = JSON.parse(evt.data || '{}');
        setStage('error');
        setErrorKind('error');
        setError(payload?.message || '识图提取失败');
      } catch {
        setStage('error');
        setErrorKind('error');
        setError('识图提取失败');
      } finally {
        closeStream();
        resetActiveJob();
        setIsLoading(false);
        clearActiveJob();
      }
    });

    es.onerror = () => {
      setStage('error');
      setErrorKind('error');
      setError('连接中断，请重试');
      closeStream();
      resetActiveJob();
      setIsLoading(false);
      // 不清理 ACTIVE_JOB_KEY，方便再次尝试恢复
    };
  }, []);

  useEffect(() => {
    const url = previewUrl;
    const queueUrls = selectedFiles.map((item) => item?.url).filter(Boolean);
    return () => {
      if (!url || !url.startsWith('blob:')) return;
      if (queueUrls.includes(url)) return;
      URL.revokeObjectURL(url);
    };
  }, [previewUrl, selectedFiles]);

  useEffect(() => {
    if (!isLoading) {
      setElapsedMs(0);
      setStartAtMs(0);
      setBatchIndex(0);
      setBatchTotal(0);
      setBatchActiveName('');
      setActiveItemId('');
      pendingFilesRef.current = [];
      batchTotalRef.current = 0;
      batchCancelRef.current = false;
      processedCountRef.current = 0;
      activeItemRef.current = null;
      return;
    }
    const started = Date.now();
    setStartAtMs(started);
    setElapsedMs(0);
    const timer = window.setInterval(() => setElapsedMs(Date.now() - started), 100);
    return () => window.clearInterval(timer);
  }, [isLoading]);

  const triggerPick = () => fileInputRef.current?.click();
  const handleQueueDragOver = (event) => {
    event.preventDefault();
    setIsQueueDragActive(true);
  };
  const handleQueueDragLeave = () => {
    setIsQueueDragActive(false);
  };
  const handleQueueDrop = (event) => {
    event.preventDefault();
    setIsQueueDragActive(false);
    const files = event?.dataTransfer?.files;
    if (files && files.length > 0) handleFile(files);
  };

  const isPdfFile = (pickedFile) => {
    const type = String(pickedFile?.type || '').toLowerCase();
    if (type === 'application/pdf') return true;
    const name = String(pickedFile?.name || '').toLowerCase();
    return name.endsWith('.pdf');
  };

  const isImageFile = (pickedFile) => String(pickedFile?.type || '').toLowerCase().startsWith('image/');

  const makeQueueItem = (picked) => {
    const fileObj = picked instanceof File ? picked : null;
    if (!fileObj) return null;
    const id = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    return {
      id,
      file: fileObj,
      url: URL.createObjectURL(fileObj),
      isPdf: isPdfFile(fileObj)
    };
  };

  const appendQueueItems = (items) => {
    if (!items.length) return;
    setSelectedFiles((prev) => [...prev, ...items]);
    if (!file && items[0]) {
      setFile(items[0].file);
      setPreviewUrl(items[0].url);
    }
    if (isLoading) {
      pendingFilesRef.current = [...pendingFilesRef.current, ...items];
      batchTotalRef.current += items.length;
      setBatchTotal(batchTotalRef.current);
    }
  };

  const clearQueue = () => {
    setSelectedFiles((prev) => {
      prev.forEach((item) => {
        if (item?.url?.startsWith('blob:')) {
          try {
            URL.revokeObjectURL(item.url);
          } catch {
            // ignore
          }
        }
      });
      return [];
    });
    if (previewUrl && previewUrl.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(previewUrl);
      } catch {
        // ignore
      }
    }
    setFile(null);
    setPreviewUrl('');
    setBatchIndex(0);
    setBatchTotal(0);
    setBatchActiveName('');
    setActiveItemId('');
    activeItemRef.current = null;
    pendingFilesRef.current = [];
    batchTotalRef.current = 0;
    processedCountRef.current = 0;
  };

  const cancelCurrentJob = async (mode = 'skip') => {
    cancelModeRef.current = mode;
    try {
      abortRef.current?.abort?.();
    } catch {
      // ignore
    }
    try {
      if (jobIdRef.current) await visionApi.cancelExtractText(jobIdRef.current);
    } catch {
      // ignore
    }
    if (!jobIdRef.current && mode === 'skip') {
      startNextJobRef.current?.();
    }
  };

  const removeQueueItem = (itemId) => {
    const current = activeItemRef.current;
    const isCurrent = current && current.id === itemId;
    if (isCurrent) {
      setActiveItemId('');
      activeItemRef.current = null;
      cancelCurrentJob('skip');
    } else {
      pendingFilesRef.current = pendingFilesRef.current.filter((item) => item?.id !== itemId);
    }
    if (isLoading && batchTotalRef.current > 0) {
      batchTotalRef.current = Math.max(0, batchTotalRef.current - 1);
      setBatchTotal(batchTotalRef.current);
    }
    setSelectedFiles((prev) => {
      const next = [];
      for (const item of prev) {
        if (item?.id === itemId) {
          if (item?.url?.startsWith('blob:')) {
            try {
              URL.revokeObjectURL(item.url);
            } catch {
              // ignore
            }
          }
          continue;
        }
        next.push(item);
      }
      if (next.length === 0) {
        setFile(null);
        setPreviewUrl('');
      }
      return next;
    });
  };

  const handleFile = (picked) => {
    setError('');
    setResultText('');
    if (!picked) return;
    const list = Array.isArray(picked)
      ? picked
      : picked instanceof FileList
        ? Array.from(picked)
        : [picked];
    const images = list.filter((item) => isImageFile(item) || isPdfFile(item));
    if (images.length === 0) {
      setError('请选择图片文件（jpg/png/webp 等）');
      return;
    }
    const items = images.map(makeQueueItem).filter(Boolean);
    appendQueueItems(items);
    hasInteractedRef.current = true;
    chatNearBottomRef.current = true;
    if (images.length === 1) {
      addChat('user', `已选择图片：${images[0]?.name || 'image'}`);
    } else {
      addChat('user', `已选择 ${images.length} 张图片`);
    }
    if (images.length !== list.length) {
      addChat('system', '已过滤非图片文件');
    }
  };

  const startNextJob = () => {
    if (batchCancelRef.current) return;
    const nextItem = pendingFilesRef.current.shift();
    if (!nextItem) {
      setIsLoading(false);
      if (batchTotalRef.current > 0) clearQueue();
      return;
    }
    const total = batchTotalRef.current || 1;
    const index = Math.min(total, processedCountRef.current + 1);
    setBatchIndex(index);
    setBatchTotal(total);
    setBatchActiveName(nextItem?.file?.name || `图片${index}`);
    setActiveItemId(nextItem?.id || '');
    activeItemRef.current = nextItem;
    setFile(nextItem?.file || null);
    if (nextItem?.url) setPreviewUrl(nextItem.url);
    startSingleJob(nextItem, index, total);
  };

  startNextJobRef.current = startNextJob;

  const startSingleJob = async (pickedItem, index, total) => {
    resetActiveJob();
    setError('');
    setErrorKind('error');
    setResultText('');
    setUploadPct(0);
    setStage('uploading');
    setViewMode('chat');
    hasInteractedRef.current = true;
    chatNearBottomRef.current = true;
    lastSeqRef.current = 0;

    const displayName = pickedItem?.file?.name || `图片${index}`;
    const pickedFile = pickedItem?.file;
    if (total > 1) {
      addChat('system', `开始识别（${index}/${total}）：${displayName}`);
    }
    upsertSystemStatus('正在上传…');
    saveActiveJob({ jobId: '', stage: 'uploading', prompt: String(prompt || ''), lastSeq: 0, resultText: '' });

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const data = await visionApi.startExtractText(pickedFile, prompt, {
        signal: controller.signal,
        onUploadProgress: (evt) => {
          try {
            const totalBytes = evt?.total || 0;
            const loaded = evt?.loaded || 0;
            if (totalBytes > 0) {
              const pct = Math.max(0, Math.min(100, Math.round((loaded / totalBytes) * 100)));
              setUploadPct(pct);
              upsertSystemStatus(pct ? `正在上传… ${pct}%` : '正在上传…');
            }
          } catch {
            // ignore
          }
        }
      });

      if (data?.status !== 'success' || !data?.job_id) {
        setStage('error');
        setError(data?.detail || data?.message || '识图启动失败');
        addChat('system', data?.detail || data?.message || '识图启动失败');
        pendingFilesRef.current = [];
        resetActiveJob();
        clearActiveJob();
        setIsLoading(false);
        return;
      }

      const jobId = data.job_id;
      jobIdRef.current = jobId;
      upsertSystemStatus('上传完成，等待识别…');
      saveActiveJob({ jobId, stage: 'uploading', prompt: String(prompt || ''), lastSeq: lastSeqRef.current });

      const es = new EventSource(visionApi.eventsUrl(jobId, lastSeqRef.current));
      eventSourceRef.current = es;

      const finalizeJob = (shouldContinue) => {
        closeStream();
        resetActiveJob();
        clearActiveJob();
        activeItemRef.current = null;
        cancelModeRef.current = 'none';
        if (shouldContinue) {
          processedCountRef.current += 1;
        }
        if (shouldContinue && pendingFilesRef.current.length > 0 && !batchCancelRef.current) {
          startNextJobRef.current?.();
          return;
        }
        if (shouldContinue && pendingFilesRef.current.length === 0) {
          setIsLoading(false);
          if (batchTotalRef.current > 0) clearQueue();
          return;
        }
        pendingFilesRef.current = [];
        setActiveItemId('');
        setIsLoading(false);
      };

      es.addEventListener('snapshot', (evt) => {
        try {
          const payload = JSON.parse(evt.data || '{}');
          const s = payload?.stage;
          const t = payload?.text;
          const seq = payload?.seq;
          if (typeof t === 'string') setResultText(t);
          if (Number.isFinite(Number(seq))) lastSeqRef.current = Number(seq) || lastSeqRef.current;
          if (s === 'model_request_started') setStage('model_request_started');
          if (s === 'generating') setStage('generating');
          if (s === 'done') setStage('done');
          saveActiveJob({ jobId, stage: s || '', lastSeq: lastSeqRef.current, resultText: typeof t === 'string' ? t : '' });
        } catch {
          // ignore
        }
      });

      es.addEventListener('stage', (evt) => {
        try {
          const payload = JSON.parse(evt.data || '{}');
          const s = payload?.stage;
          const seq = payload?.seq;
          if (Number.isFinite(Number(seq))) lastSeqRef.current = Number(seq) || lastSeqRef.current;
          saveActiveJob({ jobId, stage: s || '', lastSeq: lastSeqRef.current });
          if (s === 'model_request_started') setStage('model_request_started');
          if (s === 'generating') setStage('generating');
          if (s === 'model_request_started') upsertSystemStatus('正在识别…');
          if (s === 'generating') upsertSystemStatus('正在生成结果…');
        } catch {
          // ignore
        }
      });

      es.addEventListener('delta', (evt) => {
        try {
          const payload = JSON.parse(evt.data || '{}');
          const delta = payload?.text || '';
          const seq = payload?.seq;
          if (Number.isFinite(Number(seq))) lastSeqRef.current = Number(seq) || lastSeqRef.current;
          if (delta) {
            setStage('generating');
            setResultText((prev) => String(prev || '') + String(delta));
            appendAssistantDelta(delta);
            saveActiveJob({ jobId, stage: 'generating', lastSeq: lastSeqRef.current });
          }
        } catch {
          // ignore
        }
      });

      es.addEventListener('done', (evt) => {
        try {
          const payload = JSON.parse(evt.data || '{}');
          const text = payload?.text || '';
          const seq = payload?.seq;
          if (Number.isFinite(Number(seq))) lastSeqRef.current = Number(seq) || lastSeqRef.current;
          setResultText(text);
          setStage('done');
          pushHistory(prompt, text);
          saveActiveJob({ jobId, stage: 'done', lastSeq: lastSeqRef.current, resultText: String(text || '') });
          if (assistantMsgIdRef.current) {
            const id = assistantMsgIdRef.current;
            setChatMessages((prev) => prev.map((m) => (m.id === id ? { ...m, text, ts: Date.now() } : m)));
          } else if (text) {
            assistantMsgIdRef.current = addChat('assistant', text);
          }
          upsertSystemStatus('已完成');
          const sec = startAtMs ? ((Date.now() - startAtMs) / 1000).toFixed(1) : '';
          addChat('system', sec ? `完成 · 用时 ${sec}s` : '完成');
        } catch {
          // ignore
        } finally {
          finalizeJob(true);
        }
      });

      es.addEventListener('cancelled', () => {
        const mode = cancelModeRef.current;
        const isSkip = mode === 'skip';
        setStage('cancelled');
        setErrorKind('cancel');
        if (isSkip) {
          setError('已跳过当前图片');
          addChat('system', `已跳过：${displayName}`);
          finalizeJob(true);
          return;
        }
        setError('已取消');
        addChat('system', '已取消本次识图。');
        pendingFilesRef.current = [];
        finalizeJob(false);
      });

      es.addEventListener('job_error', (evt) => {
        try {
          const payload = JSON.parse(evt.data || '{}');
          setStage('error');
          setErrorKind('error');
          setError(payload?.message || '识图提取失败');
          addChat('system', payload?.message || '识图提取失败');
        } catch {
          setStage('error');
          setErrorKind('error');
          setError('识图提取失败');
          addChat('system', '识图提取失败');
        } finally {
          pendingFilesRef.current = [];
          finalizeJob(false);
        }
      });

      es.onerror = () => {
        setStage('error');
        setErrorKind('error');
        setError('连接中断，请重试');
        addChat('system', '连接中断，请重试');
        pendingFilesRef.current = [];
        finalizeJob(false);
      };
    } catch (e) {
      const detail = e?.response?.data?.detail;
      const msg = detail || e?.message || '请求失败，请确认后端已启动';
      setStage('error');
      setErrorKind('error');
      setError(msg);
      addChat('system', msg);
      pendingFilesRef.current = [];
      closeStream();
      resetActiveJob();
      setIsLoading(false);
      clearActiveJob();
    }
  };

  const saveHistory = (next) => {
    setHistory(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const pushHistory = (promptText, resultTextSnapshot) => {
    const value = String(promptText || '').trim();
    if (!value) return;
    const fullResult = String(resultTextSnapshot || '').trim();
    const clipped = fullResult.length > MAX_HISTORY_RESULT_CHARS ? fullResult.slice(0, MAX_HISTORY_RESULT_CHARS) : fullResult;
    const entry = { prompt: value, result: clipped, truncated: fullResult.length > MAX_HISTORY_RESULT_CHARS, ts: Date.now() };
    const next = [entry, ...history.filter((h) => h?.prompt !== value)].slice(0, MAX_HISTORY);
    saveHistory(next);
  };

  const closeStream = () => {
    try {
      eventSourceRef.current?.close?.();
    } catch {
      // ignore
    }
    eventSourceRef.current = null;
  };

  const resetActiveJob = () => {
    jobIdRef.current = '';
    abortRef.current = null;
    closeStream();
    statusMsgIdRef.current = '';
    assistantMsgIdRef.current = '';
  };

  const handleCancel = async () => {
    if (!isLoading) return;
    cancelModeRef.current = 'stop';
    batchCancelRef.current = true;
    pendingFilesRef.current = [];
    setBatchActiveName('');
    setStage('cancelled');
    setErrorKind('cancel');
    setError('已取消');
    addChat('system', '已取消本次识图。');
    try {
      abortRef.current?.abort?.();
    } catch {
      // ignore
    }
    try {
      if (jobIdRef.current) await visionApi.cancelExtractText(jobIdRef.current);
    } catch {
      // ignore
    }
    closeStream();
    resetActiveJob();
    setIsLoading(false);
    clearActiveJob();
  };

  const onSubmit = async () => {
    setError('');
    setErrorKind('error');
    setResultText('');
    if (isLoading) return;
    const filesToProcess = selectedFiles.length > 0
      ? selectedFiles
      : (file ? [{ id: 'single', file, url: previewUrl || '' }] : []);
    if (filesToProcess.length === 0) {
      setError('请先上传一张图片');
      return;
    }

    batchCancelRef.current = false;
    pendingFilesRef.current = [...filesToProcess];
    batchTotalRef.current = filesToProcess.length;
    processedCountRef.current = 0;
    setBatchTotal(filesToProcess.length);
    setBatchIndex(0);
    setBatchActiveName('');

    setUploadPct(0);
    setStage('uploading');
    setIsLoading(true);
    setViewMode('chat');
    hasInteractedRef.current = true;
    chatNearBottomRef.current = true;
    lastSeqRef.current = 0;
    addChat('user', prompt);
    if (filesToProcess.length > 1) {
      addChat('system', `已选择 ${filesToProcess.length} 张图片，将按顺序识别。`);
    }

    startNextJobRef.current?.();
  };

  const exportExcel = async () => {
    const text = String(resultText || '').trim();
    if (!text) return;

    try {
      const XLSX = await import('xlsx');

      let aoa = null;
      const parsed = parseTableText(text);
      if (parsed.ok) {
        aoa = [parsed.columns, ...parsed.rows];
      } else {
        const lines = text
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter(Boolean);
        aoa = [['raw_text'], ...lines.map((l) => [l])];
      }

      const ws = XLSX.utils.aoa_to_sheet(aoa);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '识别结果');
      const array = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([array], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const filename = `识图提取_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.xlsx`;
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setErrorKind('error');
      setError('导出失败：请确认已安装 xlsx 依赖');
    }
  };

  const copyAsTSV = async () => {
    const text = String(resultText || '').trim();
    if (!text) return;
    try {
      const parsed = parseTableText(text);
      const lines = [];
      if (parsed.ok) {
        lines.push(parsed.columns.join('\t'));
        for (const row of parsed.rows) lines.push(row.map((v) => String(v ?? '')).join('\t'));
      } else {
        for (const line of text.split(/\r?\n/)) lines.push(line);
      }
      await navigator.clipboard.writeText(lines.join('\n'));
      addChat('system', '已复制为 TSV。');
    } catch {
      setErrorKind('error');
      setError('复制失败（浏览器权限限制）');
    }
  };

  const copyAsMarkdown = async () => {
    const text = String(resultText || '').trim();
    if (!text) return;
    try {
      const parsed = parseTableText(text);
      if (!parsed.ok) {
        await navigator.clipboard.writeText(text);
        addChat('system', '已复制（未解析表头，复制原始文本）。');
        return;
      }
      const header = `| ${parsed.columns.join(' | ')} |`;
      const sep = `| ${parsed.columns.map(() => '---').join(' | ')} |`;
      const body = parsed.rows.map((row) => `| ${row.map((v) => String(v ?? '')).join(' | ')} |`);
      await navigator.clipboard.writeText([header, sep, ...body].join('\n'));
      addChat('system', '已复制为 Markdown 表格。');
    } catch {
      setErrorKind('error');
      setError('复制失败（浏览器权限限制）');
    }
  };

  const jumpToNextIssue = () => {
    if (!issueKeys.length) return;
    const idx = issueCursor % issueKeys.length;
    const key = issueKeys[idx];
    setIssueCursor(idx + 1);
    setFocusCellKey(key);
    window.setTimeout(() => {
      try {
        const el = tableWrapRef.current?.querySelector?.(`[data-cell-key="${key}"]`);
        el?.scrollIntoView?.({ block: 'center', inline: 'center' });
      } catch {
        // ignore
      }
    }, 0);
  };

  useEffect(() => {
    return () => {
      try {
        abortRef.current?.abort?.();
      } catch {
        // ignore
      }
      closeStream();
      resetActiveJob();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="visionRoot">
      <div className="visionLayout">
        <aside className="visionSidebar">
          <div className="visionSidebarCard">
            <div className="visionSidebarHeader">
              <div className="visionSidebarTitle">图片队列</div>
              <div className="visionSidebarActions">
                <button type="button" className="visionQueueBtn" onClick={triggerPick}>
                  添加
                </button>
                <button
                  type="button"
                  className="visionQueueBtn ghost"
                  onClick={clearQueue}
                  disabled={isLoading || selectedFiles.length === 0}
                >
                  清空
                </button>
              </div>
            </div>

            <div
              className={isQueueDragActive ? 'visionDropZone visionDropZoneActive' : 'visionDropZone'}
              onDragOver={handleQueueDragOver}
              onDragLeave={handleQueueDragLeave}
              onDrop={handleQueueDrop}
            >
              <div className="visionDropTitle">拖拽图片到此处</div>
              <div className="visionDropHint">支持多张，自动排队识别</div>
            </div>

            <div className="visionQueueList">
              {selectedFiles.length === 0 ? (
                <div className="visionQueueEmpty">暂无图片，点击“添加”或拖拽上传</div>
              ) : (
                selectedFiles.map((item) => {
                  const isActive = activeItemId && item?.id === activeItemId;
                  const statusText = isActive
                    ? '处理中'
                    : isLoading
                      ? '排队中'
                      : '待处理';
                  return (
                    <div key={item.id} className={isActive ? 'visionQueueItem active' : 'visionQueueItem'}>
                      {item?.isPdf ? (
                        <div className="visionQueueThumb visionQueueThumbPdf">PDF</div>
                      ) : (
                        <img className="visionQueueThumb" src={item.url} alt={item.file?.name || 'image'} />
                      )}
                      <div className="visionQueueMeta">
                        <div className="visionQueueName">{item.file?.name || '未命名图片'}</div>
                        <div className="visionQueueStatus">{statusText}</div>
                      </div>
                      <button
                        type="button"
                        className="visionQueueRemove"
                        onClick={() => removeQueueItem(item.id)}
                        title={isActive ? '取消当前' : '移除'}
                      >
                        {isActive ? '取消' : '移除'}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </aside>

        <div className="visionContainer">
        <header className="visionHeader">
          <h1 className="rc-hero-title">
            识图提取 <br />
            <span className="rc-text-gradient">图片文字识别</span>
          </h1>
          <div className="visionSubtitle">上传图片 + 输入识图要求 → 一键提取文字</div>
        </header>

        <div className="visionComposerCard">
          <div className="visionQuickPills">
            <button
              type="button"
              className="visionPill"
              onClick={() => {
                setPrompt('请提取图片中的所有文字，按原顺序输出。只输出文字，不要添加解释。');
                promptRef.current?.focus();
              }}
              disabled={isLoading}
              title="默认：提取全部文字"
            >
              默认：提取全部文字
            </button>
            <button
              type="button"
              className="visionPill"
              onClick={() => {
                setPrompt(TABLE_TEMPLATE_PROMPT);
                promptRef.current?.focus();
              }}
              disabled={isLoading}
              title="建议：表格/票据用模板"
            >
              建议：表格/票据用模板
            </button>
          </div>

          <textarea
            ref={promptRef}
            className="visionPrompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="请输入识图要求，帮你提取图片文字"
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                onSubmit();
              }
              if (e.key === 'Escape' && isLoading) {
                e.preventDefault();
                handleCancel();
              }
            }}
            disabled={isLoading}
          />

          <div className="visionComposerBar">
            <div className="visionComposerLeft">
              <button type="button" className="visionIconBtn" onClick={triggerPick} disabled={isLoading} title="上传图片">
                <PlusOutlined />
              </button>

              <span className="visionFileMeta">{fileName ? `已选择：${fileName}` : '未选择图片（点 + 上传）'}</span>
            </div>

            <button
              type="button"
              className={isLoading ? 'visionSendBtn visionSendBtnLoading' : 'visionSendBtn'}
              onClick={onSubmit}
              disabled={isLoading}
              title={isLoading ? '处理中…' : '开始识图'}
            >
              {isLoading ? (
                <>
                  <LoadingOutlined className="visionSpinner" />
                  <span className="visionSendText">处理中</span>
                </>
              ) : (
                <ArrowUpOutlined />
              )}
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            multiple
            style={{ display: 'none' }}
            onChange={(e) => handleFile(e.target.files)}
          />
        </div>

        {isLoading ? (
          <div className="visionStatusRow">
            <div className="visionStatusLeft">
              <div className="visionProgressBar" aria-hidden="true">
                <div
                  className={uploadPct > 0 && stage === 'uploading' ? 'visionProgressFill' : 'visionProgressIndeterminate'}
                  style={uploadPct > 0 && stage === 'uploading' ? { width: `${uploadPct}%` } : undefined}
                />
              </div>
              <div className="visionStatusText">
                {stageLabel}
                {elapsedText ? <span className="visionStatusTime">· 已耗时 {elapsedText}</span> : null}
              </div>
            </div>
            <button type="button" className="visionCancelBtn" onClick={handleCancel} title="取消">
              <CloseOutlined /> 取消
            </button>
          </div>
        ) : null}

        <div className="visionSteps">1 上传图片 → 2 写要求 → 3 点击↑</div>
        <div className="visionHotkeys">快捷键：`Ctrl/⌘ + Enter` 开始识图 · `Esc` 取消</div>

        {error ? (
          <div className={errorKind === 'cancel' ? 'visionAlert visionAlertCancel' : 'visionAlert visionAlertError'}>
            <div className="visionAlertMsg">{error}</div>
            <div className="visionAlertActions">
              {errorKind !== 'cancel' && file ? (
                <button type="button" className="visionRetryBtn" onClick={onSubmit} disabled={isLoading}>
                  <ReloadOutlined /> 重试
                </button>
              ) : null}
              {isLoading ? (
                <button type="button" className="visionCancelBtn" onClick={handleCancel}>
                  <CloseOutlined /> 取消
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        <section className="visionHistory">
          <div className="visionHistoryHeader">
            <div className="visionHistoryTitle">
              <HistoryOutlined /> 历史记录（本地）
            </div>
            <button
              type="button"
              className="visionHistoryClear"
              onClick={() => saveHistory([])}
              disabled={!history.length}
              title="清空历史"
            >
              清空
            </button>
          </div>
          {history.length ? (
            <div className="visionHistoryList">
              {history.map((h) => (
                <button
                  key={String(h.ts)}
                  type="button"
                  className="visionHistoryItem"
                  onClick={() => {
                    setPrompt(h.prompt || '');
                    if (h?.result) {
                      setResultText(String(h.result || ''));
                      setViewMode('text');
                      setError('');
                      setErrorKind('error');
                    }
                    promptRef.current?.focus();
                  }}
                  title={h.prompt}
                >
                  <div className="visionHistoryItemPrompt">{h.prompt}</div>
                  <div className="visionHistoryItemTime">{new Date(h.ts).toLocaleString()}</div>
                </button>
              ))}
            </div>
          ) : (
            <div className="visionHistoryEmpty">暂无历史记录（识别成功后会自动保存最近 5 条）</div>
          )}
        </section>

        <section className="visionSuggestions">
          <button type="button" className="visionSuggestionsHeader" onClick={() => setShowSuggestions((v) => !v)}>
            <span>试试以下识图任务</span>
            <DownOutlined className={showSuggestions ? 'visionChevronOpen' : 'visionChevron'} />
          </button>

          {showSuggestions ? (
            <div className="visionGrid">
              {SUGGESTIONS.map((item, idx) => (
                <button
                  key={item.title}
                  type="button"
                  className="visionCard"
                  onClick={() => {
                    setPrompt(item.prompt);
                    promptRef.current?.focus();
                  }}
                >
                  <div className={`visionThumb visionThumb${idx % 5}`} aria-hidden="true">
                    <span className="visionThumbIcon" aria-hidden="true">
                      {item.icon}
                    </span>
                  </div>
                  <div className="visionCardTitle">{item.title}</div>
                </button>
              ))}
            </div>
          ) : null}
          <div className="visionFaq">文字小请裁剪 · 图片模糊会降准 · 多张会按顺序识别</div>
        </section>

        <section className="visionResult">
          <div className="visionResultHeader">
            <div className="visionResultTitle">识别结果</div>
            <div className="visionResultActions">
              <button
                type="button"
                className="visionExportBtn"
                onClick={exportExcel}
                disabled={!resultText}
                title={resultText ? '导出 Excel' : '暂无可导出内容'}
              >
                <DownloadOutlined /> 导出Excel
              </button>
              <button
                type="button"
                className="visionExportBtn"
                onClick={copyAsTSV}
                disabled={!resultText}
                title={resultText ? '复制为 TSV' : '暂无可复制内容'}
              >
                复制TSV
              </button>
              <button
                type="button"
                className="visionExportBtn"
                onClick={copyAsMarkdown}
                disabled={!resultText}
                title={resultText ? '复制为 Markdown 表格' : '暂无可复制内容'}
              >
                复制MD
              </button>
              <button
                type="button"
                className="visionCopyBtn"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(resultText || '');
                  } catch {
                    setErrorKind('error');
                    setError('复制失败（浏览器权限限制）');
                  }
                }}
                disabled={!resultText}
                title={resultText ? '复制结果' : '暂无可复制内容'}
              >
                复制
              </button>
            </div>
          </div>

          <div className="visionViewTabs" role="tablist" aria-label="输出视图">
            <button
              type="button"
              className={viewMode === 'chat' ? 'visionTab visionTabActive' : 'visionTab'}
              onClick={() => setViewMode('chat')}
              role="tab"
              aria-selected={viewMode === 'chat'}
            >
              聊天
            </button>
            <button
              type="button"
              className={viewMode === 'text' ? 'visionTab visionTabActive' : 'visionTab'}
              onClick={() => setViewMode('text')}
              role="tab"
              aria-selected={viewMode === 'text'}
            >
              文本
            </button>
            <button
              type="button"
              className={viewMode === 'table' ? 'visionTab visionTabActive' : 'visionTab'}
              onClick={() => setViewMode('table')}
              role="tab"
              aria-selected={viewMode === 'table'}
            >
              表格
            </button>
          </div>

          {viewMode === 'chat' ? (
            <div className="visionChatWrap" ref={chatWrapRef} onScroll={handleChatScroll}>
              {chatMessages.map((m) => (
                <div
                  key={m.id}
                  className={
                    m.role === 'user'
                      ? 'visionChatRow visionChatUser'
                      : m.role === 'assistant'
                        ? 'visionChatRow visionChatAssistant'
                        : 'visionChatRow visionChatSystem'
                  }
                >
                  <div className="visionChatBubble">{m.text}</div>
                  <div className="visionChatMeta">{new Date(m.ts).toLocaleTimeString()}</div>
                </div>
              ))}
              {isLoading ? (
                <div className="visionChatRow visionChatAssistant">
                  <div className="visionChatBubble visionChatTyping">
                    <span className="visionDot" />
                    <span className="visionDot" />
                    <span className="visionDot" />
                    <span style={{ marginLeft: 8, fontWeight: 800, color: 'rgba(29,29,31,0.55)' }}>
                      {stageLabel || '处理中…'} {elapsedText ? `· ${elapsedText}` : ''}
                    </span>
                  </div>
                </div>
              ) : null}
              <div ref={chatEndRef} />
            </div>
          ) : null}

          {viewMode === 'text' ? (
            <>
              {isLoading ? (
                <div className="visionResultLoading">
                  <div className="visionSkeletonLine" />
                  <div className="visionSkeletonLine" />
                  <div className="visionSkeletonLine short" />
                  <div className="visionResultLoadingMeta">
                    <span>{stageLabel || '处理中…'}</span>
                    {elapsedText ? <span>· 已耗时 {elapsedText}</span> : null}
                  </div>
                  {resultText ? <textarea className="visionResultText" value={resultText} readOnly /> : null}
                </div>
              ) : resultText ? (
                <textarea className="visionResultText" value={resultText} readOnly />
              ) : (
                <div className="visionResultEmpty">
                  <div className="visionResultEmptyIcon">
                    <FileTextOutlined />
                  </div>
                  <div className="visionResultEmptyTitle">结果会显示在这里</div>
                  <div className="visionResultEmptyDesc">上传图片并点击右侧 ↑ 开始识图。</div>
                </div>
              )}
            </>
          ) : null}

          {viewMode === 'table' ? (
            <div className="visionSplit">
              <div className="visionSplitLeft">
                <div className="visionSplitTitle">原始文本</div>
                <textarea className="visionResultText" value={resultText || ''} readOnly />
              </div>
              <div className="visionSplitRight">
                <div className="visionSplitTitle">表格预览</div>
                {structured.ok ? (
                  <div className="visionTableSection" style={{ marginTop: 0 }}>
                    <div className="visionTableHeader">
                      <div className="visionTableTitle">结构化预览（自动标红可疑单元格）</div>
                      <div className="visionTableMeta">
                        {structured.issues.length ? `已标记 ${structured.issues.length} 处可疑` : '未发现明显可疑项'}
                        {structured.issues.length ? (
                          <button type="button" className="visionIssueJump" onClick={jumpToNextIssue}>
                            下一处
                          </button>
                        ) : null}
                      </div>
                    </div>
                    <div className="visionTableWrap" ref={tableWrapRef}>
                      <table className="visionTable">
                        <thead>
                          <tr>
                            {structured.columns.map((c) => (
                              <th key={c}>{c}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {structured.rows.map((row, rIdx) => (
                            <tr key={rIdx}>
                              {row.map((cell, cIdx) => {
                                const reason = issueMap?.get(`${rIdx}:${cIdx}`) || '';
                                const key = `${rIdx}:${cIdx}`;
                                return (
                                  <td
                                    key={`${rIdx}-${cIdx}`}
                                    data-cell-key={key}
                                    className={
                                      reason
                                        ? focusCellKey === key
                                          ? 'visionCell visionCellBad visionCellFocus'
                                          : 'visionCell visionCellBad'
                                        : focusCellKey === key
                                          ? 'visionCell visionCellFocus'
                                          : 'visionCell'
                                    }
                                    title={reason ? reason : String(cell ?? '')}
                                  >
                                    {cell}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="visionTableHint">提示：标红是规则校验的“可疑项”，不代表一定错误；优先人工复核这些位置。</div>
                  </div>
                ) : resultText ? (
                  <div className="visionTableHint">
                    未检测到可解析的表头（首行需为列名并用空格分隔），暂无法标红定位可疑单元格。
                  </div>
                ) : (
                  <div className="visionTableHint">暂无内容</div>
                )}
              </div>
            </div>
          ) : null}
          <div className="visionResultFoot">接口：POST /api/vision/extract-text</div>
        </section>
      </div>
    </div>
    </div>
  );
}
