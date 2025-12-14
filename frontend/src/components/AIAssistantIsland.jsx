import React, { useState, useEffect, useRef } from 'react';
import { Input, Button, Spin } from 'antd';
import {
    SendOutlined,
    RobotOutlined,
    CloseOutlined,
    ThunderboltFilled,
    HolderOutlined
} from '@ant-design/icons';

const AIAssistantIsland = ({ onSend, loading, messages }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [detailedStatus, setDetailedStatus] = useState('idle'); // 'idle' | 'thinking' | 'generating'
    
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

    // 自动滚动到底部
    useEffect(() => {
        if (isExpanded && messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isExpanded]);

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
        if (detailedStatus === 'thinking') return { text: 'Thinking...', class: 'thinking' };
        if (detailedStatus === 'generating') return { text: 'Generating...', class: 'generating' };
        return { text: 'AI Assistant', class: '' }; // Idle
    };

    const statusConfig = getStatusConfig();

    // --- 动态样式 ---
    const dynamicStyle = {
        top: hasMoved ? position.y : 80, // Raycast 通常默认在屏幕中上部，稍微下来一点
        left: hasMoved ? position.x : '50%',
        transform: hasMoved ? 'none' : 'translateX(-50%)',
        width: isExpanded ? '520px' : '200px', // 展开更宽，像一个 Command 面板
        height: isExpanded ? '400px' : '48px', // 高度适中
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
                        <RobotOutlined style={{ fontSize: 14, color: 'white' }} />
                    </div>
                    
                    {/* 状态文字 */}
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <span className="status-text-anim" style={{ fontSize: 13, fontWeight: 600, color: 'white' }}>
                            {loading ? statusConfig.text : 'ExcelFlow Copilot'}
                        </span>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
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
                height: isExpanded ? 'auto' : 0
            }}
            onMouseDown={(e) => e.stopPropagation()} 
            >
                <div className="ai-message-area">
                    {messages.length === 0 ? (
                        <div style={{ padding: '20px 0', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
                            Try asking: "Analyze the sales trend"
                        </div>
                    ) : (
                        messages.map((msg, idx) => (
                            <div key={idx} className={`chat-bubble ${msg.role === 'user' ? 'user' : 'ai'}`}>
                                {msg.content}
                            </div>
                        ))
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Footer Input */}
                <div className={`ai-input-wrapper ${loading ? 'disabled' : ''}`}>
                    <Input 
                        ref={inputRef}
                        className="ai-input-field"
                        value={inputValue}
                        onChange={e => setInputValue(e.target.value)}
                        onPressEnter={loading ? undefined : handleSend} // 忙碌时禁止回车
                        placeholder={loading ? "Please wait..." : "Type a command..."}
                        disabled={loading} // 禁用输入
                        bordered={false}
                    />
                    <div className="ai-enter-hint">{loading ? '⏳' : '↵'}</div>
                </div>
            </div>
        </div>
    );
};

export default AIAssistantIsland;
