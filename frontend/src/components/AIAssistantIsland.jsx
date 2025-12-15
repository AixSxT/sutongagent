import React, { useState, useEffect, useRef } from 'react';
import { Input, Button, Tooltip, Select } from 'antd';
import {
    CloseOutlined,
    PlusOutlined,
    HistoryOutlined,
    StopOutlined,
    MinusOutlined,
    CompressOutlined
} from '@ant-design/icons';

const CatAvatar = () => (
    <svg
        className="cat-avatar"
        width="18"
        height="18"
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
    >
        <g className="cat-runner">
            {/* Fishing rod + line + fish */}
            <g className="cat-fishing">
                <path className="cat-rod" d="M44 18 L58 10" stroke="rgba(255,255,255,0.9)" strokeWidth="2.5" strokeLinecap="round" />
                <path className="cat-line" d="M58 10 C59 18 56 24 52 30" stroke="rgba(255,255,255,0.75)" strokeWidth="1.6" strokeLinecap="round" strokeDasharray="2 3" />
                <path className="cat-fish" d="M50 30 C47 28 45 30 44 32 C45 34 47 36 50 34 C52 36 55 36 57 34 C55 32 52 30 50 30 Z" fill="rgba(255,255,255,0.92)" opacity="0.95" />
                <circle className="cat-fish-eye" cx="46.8" cy="31.5" r="0.8" fill="rgba(0,0,0,0.6)" />
            </g>

            {/* Cat body (pink) */}
            <g className="cat-body">
                <path d="M18 16 L10 8 L12 20" stroke="rgba(255,255,255,0.35)" strokeWidth="0.6" opacity="0.25" />
                <path d="M20 16 L14 8 L22 18" stroke="rgba(255,255,255,0.35)" strokeWidth="0.6" opacity="0.25" />

                <path
                    className="cat-head"
                    d="M22 20
                       C22 14 26 10 32 10
                       C38 10 42 14 42 20
                       C42 26 38 30 32 30
                       C26 30 22 26 22 20 Z"
                    fill="#FF9FD6"
                    stroke="rgba(255,255,255,0.55)"
                    strokeWidth="1.2"
                />
                <path d="M25 14 L22 9 L28 13" fill="#FF9FD6" stroke="rgba(255,255,255,0.55)" strokeWidth="1.2" strokeLinejoin="round" />
                <path d="M39 14 L42 9 L36 13" fill="#FF9FD6" stroke="rgba(255,255,255,0.55)" strokeWidth="1.2" strokeLinejoin="round" />

                <path d="M27 21 C27 19.8 28 18.8 29.2 18.8 C30.4 18.8 31.4 19.8 31.4 21" stroke="rgba(0,0,0,0.55)" strokeWidth="1.2" strokeLinecap="round" />
                <path d="M32.6 21 C32.6 19.8 33.6 18.8 34.8 18.8 C36 18.8 37 19.8 37 21" stroke="rgba(0,0,0,0.55)" strokeWidth="1.2" strokeLinecap="round" />
                <path d="M31.2 23.2 L32 24 L32.8 23.2" stroke="rgba(0,0,0,0.55)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M32 24.2 C30.2 26 28.3 26.3 26.6 25.8" stroke="rgba(0,0,0,0.45)" strokeWidth="1.2" strokeLinecap="round" />
                <path d="M32 24.2 C33.8 26 35.7 26.3 37.4 25.8" stroke="rgba(0,0,0,0.45)" strokeWidth="1.2" strokeLinecap="round" />

                <path
                    className="cat-torso"
                    d="M20 44
                       C20 36 25 30 32 30
                       C39 30 44 36 44 44
                       C44 50 40 54 32 54
                       C24 54 20 50 20 44 Z"
                    fill="#FF8FD0"
                    stroke="rgba(255,255,255,0.55)"
                    strokeWidth="1.2"
                />

                {/* Scarf */}
                <path
                    className="cat-scarf"
                    d="M24 32
                       C27 35 37 35 40 32
                       C39 30 36 28 32 28
                       C28 28 25 30 24 32 Z"
                    fill="#FF4FA3"
                    opacity="0.95"
                />
                <path className="cat-scarf-tail" d="M36 34 C39 36 41 39 40 43 C37 41 35 38 36 34 Z" fill="#FF4FA3" opacity="0.9" />

                {/* Tail */}
                <path
                    className="cat-tail"
                    d="M44 46 C50 48 52 54 48 56"
                    stroke="#FF8FD0"
                    strokeWidth="5"
                    strokeLinecap="round"
                    opacity="0.95"
                />
                <path
                    d="M44 46 C50 48 52 54 48 56"
                    stroke="rgba(255,255,255,0.55)"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                />

                {/* Feet */}
                <path className="cat-feet" d="M24 54 C26 56 29 56 31 54" stroke="rgba(0,0,0,0.35)" strokeWidth="2" strokeLinecap="round" />
                <path className="cat-feet" d="M33 54 C35 56 38 56 40 54" stroke="rgba(0,0,0,0.35)" strokeWidth="2" strokeLinecap="round" />
            </g>
        </g>
    </svg>
);

const AIAssistantIsland = ({
    onSend,
    onApplyWorkflow,
    loading,
    messages,
    onNewChat,
    onStop,
    autoExpandOnFirstLoad,
    presetPrompts,
    availableTables,
    selectedTableKeys,
    onChangeSelectedTableKeys,
    conversations,
    activeConversationId,
    onSelectConversation,
    onDeleteConversation
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [detailedStatus, setDetailedStatus] = useState('idle'); // 'idle' | 'thinking' | 'generating'
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [expandedSize, setExpandedSize] = useState({ width: 720, height: 620 });
     
    // --- 拖拽相关的状态 ---
    const [position, setPosition] = useState({ x: 0, y: 24 }); // 默认 Y=24 (顶部)
    const [hasMoved, setHasMoved] = useState(false); // 是否发生过移动
    const islandRef = useRef(null);
    const dragRef = useRef({ 
        isDragging: false, 
        startX: 0, startY: 0, 
        initialLeft: 0, initialTop: 0,
        hasDragged: false // 用于区分“点击”和“拖拽”
    });

    const inputRef = useRef(null);
    const messagesEndRef = useRef(null);
    const historyButtonRef = useRef(null);
    const historyPanelRef = useRef(null);
    const resizeRef = useRef({ isResizing: false, startX: 0, startY: 0, startW: 0, startH: 0, dir: 'se' });

    // 自动滚动到底部
    useEffect(() => {
        if (isExpanded && messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isExpanded]);

    const getClampedExpandedSize = (width, height) => {
        const viewportW = typeof window !== 'undefined' ? window.innerWidth : 1200;
        const viewportH = typeof window !== 'undefined' ? window.innerHeight : 800;
        const maxW = Math.max(520, viewportW - 40);
        const maxH = Math.max(420, viewportH - 140);
        const nextW = Math.min(Math.max(520, width), maxW);
        const nextH = Math.min(Math.max(420, height), maxH);
        return { width: nextW, height: nextH };
    };

    const resetExpandedSize = () => {
        setExpandedSize(getClampedExpandedSize(720, 620));
    };

    // 保持尺寸在视口范围内（窗口大小变化时）
    useEffect(() => {
        const onResize = () => {
            setExpandedSize(prev => getClampedExpandedSize(prev.width, prev.height));
        };
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // 页面打开后：首次自动展开一次（不影响悬浮球形态，用户可手动关闭）
    useEffect(() => {
        if (!autoExpandOnFirstLoad) return;
        if (isExpanded) return;
        try {
            const KEY = 'ai_island_auto_opened_v1';
            if (localStorage.getItem(KEY) === '1') return;
            localStorage.setItem(KEY, '1');
        } catch { }
        setIsExpanded(true);
        setTimeout(() => inputRef.current?.focus(), 350);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [autoExpandOnFirstLoad]);

    // 关闭灵动岛时，收起历史侧边栏
    useEffect(() => {
        if (!isExpanded && isHistoryOpen) setIsHistoryOpen(false);
    }, [isExpanded, isHistoryOpen]);

    // 点击其它地方：收起历史侧边栏
    useEffect(() => {
        if (!isHistoryOpen) return;

        const onDocMouseDown = (e) => {
            const islandEl = islandRef.current;
            const btnEl = historyButtonRef.current;
            const panelEl = historyPanelRef.current;
            const target = e.target;

            if (!islandEl || !target) return;
            if (panelEl?.contains?.(target)) return;
            if (btnEl?.contains?.(target)) return;

            setIsHistoryOpen(false);
        };

        document.addEventListener('mousedown', onDocMouseDown);
        return () => document.removeEventListener('mousedown', onDocMouseDown);
    }, [isHistoryOpen]);

    // === 新增：细分状态逻辑 ===
    // 监听 loading 变化，模拟“思考 -> 生成”的过程
    useEffect(() => {
        let timer;
        if (loading) {
            setDetailedStatus('thinking');
            // 2.5秒后切换为“生成中”，模拟长任务的阶段感
            timer = setTimeout(() => {
                setDetailedStatus('generating');
            }, 2500);
        } else {
            setDetailedStatus('idle');
            if (timer) clearTimeout(timer);
        }
        return () => { if (timer) clearTimeout(timer); };
    }, [loading]);

    // --- 拖拽逻辑处理 ---
    const handleMouseDown = (e) => {
        // 如果点击的是关闭按钮或输入框内部，不触发拖拽
        if (e.target.closest('button') || e.target.closest('input')) return;

        e.preventDefault(); // 防止选中文本
        const island = islandRef.current;
        if (!island) return;

        const rect = island.getBoundingClientRect();

        // 记录初始状态
        dragRef.current.isDragging = true;
        dragRef.current.startX = e.clientX;
        dragRef.current.startY = e.clientY;
        dragRef.current.hasDragged = false;

        // 关键逻辑：如果是第一次拖动，先锁定当前的绝对位置，解除 CSS 的居中
        if (!hasMoved) {
            setPosition({ x: rect.left, y: rect.top });
            setHasMoved(true);
            dragRef.current.initialLeft = rect.left;
            dragRef.current.initialTop = rect.top;
        } else {
            dragRef.current.initialLeft = position.x;
            dragRef.current.initialTop = position.y;
        }

        // 添加全局事件监听
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    const handleMouseMove = (e) => {
        if (!dragRef.current.isDragging) return;

        const dx = e.clientX - dragRef.current.startX;
        const dy = e.clientY - dragRef.current.startY;

        // 如果移动距离超过 5px，则视为拖拽，不再触发点击展开
        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
            dragRef.current.hasDragged = true;
        }

        setPosition({
            x: dragRef.current.initialLeft + dx,
            y: dragRef.current.initialTop + dy
        });
    };

    const handleMouseUp = () => {
        dragRef.current.isDragging = false;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    };

    // 点击 Header 时的逻辑
    const handleHeaderClick = (e) => {
        if (dragRef.current.hasDragged) return; // 刚才在拖拽，忽略点击
        if (!isExpanded) toggleExpand();
    };

    const toggleExpand = () => {
        setIsExpanded(!isExpanded);
        if (!isExpanded) {
            setExpandedSize(prev => getClampedExpandedSize(prev.width, prev.height));
            setTimeout(() => inputRef.current?.focus(), 300);
        }
    };

    const handleSend = () => {
        if (loading) return;
        if (!inputValue.trim()) return;
        onSend(inputValue);
        setInputValue('');
    };

    // 获取当前状态的文案和颜色类名
    const getStatusConfig = () => {
        if (detailedStatus === 'thinking') return { text: '思考中...', class: 'thinking' };
        if (detailedStatus === 'generating') return { text: '生成中...', class: 'generating' };
        return { text: 'AI 助手', class: '' }; // Idle
    };

    const statusConfig = getStatusConfig();

    const safeConversations = Array.isArray(conversations) ? conversations : [];
    const safeAvailableTables = Array.isArray(availableTables) ? availableTables : [];
    const safeSelectedTableKeys = Array.isArray(selectedTableKeys) ? selectedTableKeys : [];
    const formatUpdatedAt = (ts) => {
        if (!ts) return '';
        try {
            return new Date(ts).toLocaleString();
        } catch {
            return '';
        }
    };

    const quickPrompts = Array.isArray(presetPrompts) && presetPrompts.length > 0
        ? presetPrompts
        : [
            '你可以干什么？',
            '帮我生成一个工作流来分析这些表',
            '帮我找出表一和表二的差异',
            '帮我按条件筛选并汇总'
        ];

    const extractWorkflowJson = (content) => {
        if (typeof content !== 'string') return null;

        const findWorkflow = (obj) => {
            if (!obj || typeof obj !== 'object') return null;
            if (Array.isArray(obj.nodes)) return obj;
            if (obj.workflow && typeof obj.workflow === 'object' && Array.isArray(obj.workflow.nodes)) return obj.workflow;
            return null;
        };

        const tryParse = (jsonString) => {
            try {
                return findWorkflow(JSON.parse(jsonString));
            } catch {
                return null;
            }
        };

        const fenced = content.match(/```json\\s*([\\s\\S]*?)```/i);
        if (fenced?.[1]) {
            const parsed = tryParse(fenced[1].trim());
            if (parsed) return { workflow: parsed, jsonString: fenced[1].trim(), start: fenced.index ?? 0, end: (fenced.index ?? 0) + fenced[0].length };
        }

        const extractBalancedObject = (text, startIdx) => {
            let depth = 0;
            let inString = false;
            let escape = false;
            for (let i = startIdx; i < text.length; i++) {
                const ch = text[i];
                if (inString) {
                    if (escape) escape = false;
                    else if (ch === '\\\\') escape = true;
                    else if (ch === '"') inString = false;
                    continue;
                }

                if (ch === '"') {
                    inString = true;
                    continue;
                }
                if (ch === '{') depth++;
                if (ch === '}') {
                    depth--;
                    if (depth === 0) return { jsonString: text.slice(startIdx, i + 1), endIdx: i + 1 };
                }
            }
            return null;
        };

        for (let i = 0; i < content.length; i++) {
            if (content[i] !== '{') continue;
            const extracted = extractBalancedObject(content, i);
            if (!extracted?.jsonString) continue;
            if (!extracted.jsonString.includes('"nodes"')) continue;
            const workflow = tryParse(extracted.jsonString);
            if (workflow) return { workflow, jsonString: extracted.jsonString, start: i, end: extracted.endIdx };
            i = extracted.endIdx - 1;
        }

        return null;
    };

    const renderMessageContent = (msg) => {
        const content = typeof msg?.content === 'string' ? msg.content : '';
        const isAssistant = msg?.role === 'assistant';

        if (isAssistant) {
            const extracted = extractWorkflowJson(content);
            if (extracted?.workflow) {
                const explanation = [
                    content.slice(0, extracted.start).trim(),
                    content.slice(extracted.end).trim()
                ].filter(Boolean).join('\n\n').trim();

                const nodeCount = Array.isArray(extracted.workflow.nodes) ? extracted.workflow.nodes.length : 0;
                const edgeCount = Array.isArray(extracted.workflow.edges) ? extracted.workflow.edges.length : 0;

                return (
                    <div style={{ whiteSpace: 'pre-wrap' }}>
                        <div style={{ opacity: 0.9 }}>
                            {explanation || '已生成工作流：'}
                        </div>
                        <div style={{ marginTop: 8, opacity: 0.75, fontSize: 12 }}>
                            节点：{nodeCount}，连线：{edgeCount}
                        </div>
                        <div style={{ marginTop: 10 }}>
                            <Button
                                size="small"
                                onClick={() => onApplyWorkflow?.(extracted.workflow)}
                                disabled={!onApplyWorkflow}
                            >
                                应用到画布
                            </Button>
                        </div>
                    </div>
                );
            }
        }

        return <div style={{ whiteSpace: 'pre-wrap' }}>{content}</div>;
    };

    const startResize = (e, dir) => {
        if (!isExpanded) return;
        e.preventDefault();
        e.stopPropagation();

        resizeRef.current.isResizing = true;
        resizeRef.current.startX = e.clientX;
        resizeRef.current.startY = e.clientY;
        resizeRef.current.startW = expandedSize.width;
        resizeRef.current.startH = expandedSize.height;
        resizeRef.current.dir = dir;

        const onMove = (ev) => {
            if (!resizeRef.current.isResizing) return;
            const dx = ev.clientX - resizeRef.current.startX;
            const dy = ev.clientY - resizeRef.current.startY;

            let nextW = resizeRef.current.startW;
            let nextH = resizeRef.current.startH;

            if (resizeRef.current.dir.includes('e')) nextW = resizeRef.current.startW + dx;
            if (resizeRef.current.dir.includes('s')) nextH = resizeRef.current.startH + dy;

            setExpandedSize(getClampedExpandedSize(nextW, nextH));
        };

        const onUp = () => {
            resizeRef.current.isResizing = false;
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    };

    // --- 动态样式 ---
    const dynamicStyle = {
        top: hasMoved ? position.y : 80, // Raycast 通常默认在屏幕中上部，稍微下来一点
        left: hasMoved ? position.x : '50%',
        transform: hasMoved ? 'none' : 'translateX(-50%)',
        width: isExpanded ? `${expandedSize.width}px` : '200px',
        height: isExpanded ? `${expandedSize.height}px` : '48px',
        cursor: dragRef.current.isDragging ? 'grabbing' : 'default',
        transition: dragRef.current.isDragging ? 'none' : undefined
    };

    return (
        <div 
            ref={islandRef}
            className="ai-island" 
            style={dynamicStyle}
        >
            {loading && <div className="ai-loading-line" />}
            {/* --- Header (拖拽区) --- */}
            <div 
                className="ai-island-header" 
                onMouseDown={handleMouseDown} // 只有按住头部才能拖动
                onClick={handleHeaderClick}
            >
                <div className="ai-header-title">
                    {/* 头像根据状态变化颜色 */}
                    <div
                        className={`ai-avatar-container ${statusConfig.class} ${loading ? 'ai-avatar-pulse' : ''}`}
                        style={{ width: 24, height: 24, marginRight: 8 }}
                    >
                        <CatAvatar />
                    </div>
                     
                    {/* 状态文字 */}
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span className="status-text-anim" style={{ fontSize: 13, fontWeight: 600, color: 'white' }}>
                                {loading ? statusConfig.text : '小助手'}
                            </span>
                            {isExpanded && (
                                <Tooltip title="大小复位">
                                    <Button
                                        size="small"
                                        type="text"
                                        icon={<CompressOutlined style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }} />}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            resetExpandedSize();
                                        }}
                                    />
                                </Tooltip>
                            )}
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                    {isExpanded && typeof onNewChat === 'function' && (
                        <Tooltip title="新对话">
                            <Button
                                size="small"
                                type="text"
                                icon={<PlusOutlined style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }} />}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onNewChat();
                                }}
                            />
                        </Tooltip>
                    )}

                    {isExpanded && typeof onSelectConversation === 'function' && safeConversations.length > 0 && (
                        <span ref={historyButtonRef}>
                            <Tooltip title="历史">
                                <Button
                                    size="small"
                                    type="text"
                                    icon={<HistoryOutlined style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }} />}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsHistoryOpen(v => !v);
                                    }}
                                />
                            </Tooltip>
                        </span>
                    )}

                    {isExpanded && loading && typeof onStop === 'function' && (
                        <Tooltip title="停止">
                            <Button
                                size="small"
                                type="text"
                                icon={<StopOutlined style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }} />}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onStop();
                                }}
                            />
                        </Tooltip>
                    )}

                    {/* 窗口控制红绿灯模拟 (装饰用，或者作为折叠按钮) */}
                    {isExpanded && (
                        <CloseOutlined 
                            style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', cursor: 'pointer' }}
                            onClick={(e) => { e.stopPropagation(); toggleExpand(); }}
                        />
                    )}
                </div>
            </div>

            {/* --- Body (内容区) --- */}
            <div style={{ 
                flex: 1, 
                minHeight: 0,
                display: 'flex', 
                flexDirection: 'column', 
                opacity: isExpanded ? 1 : 0, 
                pointerEvents: isExpanded ? 'auto' : 'none',
                height: isExpanded ? 'auto' : 0,
                position: 'relative'
            }}
            onMouseDown={(e) => e.stopPropagation()} 
            >
                {isExpanded && safeAvailableTables.length > 0 && typeof onChangeSelectedTableKeys === 'function' && (
                    <div style={{ padding: '12px 16px 0' }}>
                        <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>
                            选择表（不选则默认全部）
                        </div>
                        <Select
                            mode="multiple"
                            size="small"
                            style={{ width: '100%' }}
                            value={safeSelectedTableKeys}
                            onChange={(vals) => onChangeSelectedTableKeys(vals)}
                            placeholder="选择要操作的表…"
                            maxTagCount="responsive"
                            allowClear
                            popupClassName="ai-island-select-dropdown"
                            options={safeAvailableTables.map(t => ({
                                value: t.key,
                                label: `${t.filename} · ${t.sheet_name}`
                            }))}
                        />
                    </div>
                )}

                <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
                    <div className="ai-message-area" style={{ flex: 1 }}>
                        {messages.length === 0 ? (
                            <div style={{ padding: '20px 0', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
                                试试这样问：“帮我分析一下销售趋势”
                            </div>
                        ) : (
                            messages.map((msg, idx) => (
                                <div key={idx} className={`chat-bubble ${msg.role === 'user' ? 'user' : 'ai'}`}>
                                    <div className={`chat-speaker ${msg.role === 'user' ? 'user' : 'ai'}`}>
                                        {msg.role === 'user' ? '你' : '小助手'}
                                    </div>
                                    <div className="chat-content">
                                        {renderMessageContent(msg)}
                                    </div>
                                </div>
                            ))
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {isExpanded && isHistoryOpen && typeof onSelectConversation === 'function' && safeConversations.length > 0 && (
                        <div
                            ref={historyPanelRef}
                            className="ai-island-history-panel"
                            style={{
                                width: 280,
                                flex: '0 0 280px',
                                borderLeft: '1px solid rgba(255,255,255,0.06)',
                                background: 'rgba(0,0,0,0.18)',
                                backdropFilter: 'blur(20px) saturate(140%)',
                                WebkitBackdropFilter: 'blur(20px) saturate(140%)',
                                padding: 12,
                                overflowY: 'auto'
                            }}
                        >
                            <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 10 }}>历史对话</div>
                            {safeConversations.map((c) => {
                                const isActive = c?.id && c.id === activeConversationId;
                                return (
                                    <div
                                        key={c.id}
                                        style={{
                                            padding: '10px 10px',
                                            borderRadius: 10,
                                            cursor: 'pointer',
                                            background: isActive ? 'rgba(0, 122, 255, 0.14)' : 'transparent',
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            gap: 10
                                        }}
                                        onClick={() => {
                                            onSelectConversation(c.id);
                                            setIsHistoryOpen(false);
                                        }}
                                    >
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.9)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {c.title || '会话'}
                                            </div>
                                            <div style={{ fontSize: 11, opacity: 0.65, marginTop: 2, color: 'rgba(255,255,255,0.7)' }}>
                                                {formatUpdatedAt(c.updatedAt)}
                                            </div>
                                        </div>

                                        {typeof onDeleteConversation === 'function' && (
                                            <Tooltip title="删除">
                                                <Button
                                                    size="small"
                                                    type="text"
                                                    icon={<MinusOutlined style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)' }} />}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onDeleteConversation(c.id);
                                                    }}
                                                />
                                            </Tooltip>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {isExpanded && quickPrompts.length > 0 && (
                    <div style={{ padding: '0 16px 10px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {quickPrompts.slice(0, 6).map((prompt) => (
                            <Button
                                key={prompt}
                                size="small"
                                type="default"
                                style={{
                                    background: 'rgba(255,255,255,0.06)',
                                    borderColor: 'rgba(255,255,255,0.08)',
                                    color: 'rgba(255,255,255,0.9)'
                                }}
                                disabled={loading}
                                onClick={() => {
                                    if (loading) return;
                                    onSend?.(prompt);
                                }}
                            >
                                {prompt}
                            </Button>
                        ))}
                    </div>
                )}

                {/* Footer Input */}
                <div className={`ai-input-wrapper ${loading ? 'disabled' : ''}`}>
                    <Input 
                        ref={inputRef}
                        className="ai-input-field"
                        value={inputValue}
                        onChange={e => setInputValue(e.target.value)}
                        onPressEnter={loading ? undefined : handleSend} // 忙碌时禁止回车
                        placeholder={loading ? "请稍候..." : "输入指令或提问..."}
                        disabled={loading} // 禁用输入
                        bordered={false}
                    />
                    <div className="ai-enter-hint">{loading ? '⏳' : '↵'}</div>
                </div>
            </div>

            {/* Resize handles (expanded only) */}
            {isExpanded && (
                <>
                    <div className="ai-island-resize-handle right" onMouseDown={(e) => startResize(e, 'e')} />
                    <div className="ai-island-resize-handle bottom" onMouseDown={(e) => startResize(e, 's')} />
                    <div className="ai-island-resize-handle corner" onMouseDown={(e) => startResize(e, 'se')} />
                </>
            )}
        </div>
    );
};

export default AIAssistantIsland;
