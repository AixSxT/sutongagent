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
        if (!inputValue.trim()) return;
        onSend(inputValue);
        setInputValue('');
    };

    // --- 样式配置 ---
    const islandStyle = {
        position: 'fixed',
        // 核心：如果没有移动过，使用 CSS 居中；否则使用绝对坐标
        top: hasMoved ? position.y : 24,
        left: hasMoved ? position.x : '50%',
        transform: hasMoved ? 'none' : 'translateX(-50%)',
        
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(20px)',
        borderRadius: isExpanded ? '24px' : '30px',
        width: isExpanded ? '500px' : '180px',
        height: isExpanded ? '600px' : '48px',
        transition: dragRef.current.isDragging ? 'none' : 'width 0.5s, height 0.5s, border-radius 0.5s',
        zIndex: 1000,
        boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
        overflow: 'hidden',
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid rgba(255,255,255,0.1)',
        cursor: 'move', // 鼠标变成十字移动图标
        userSelect: 'none'
    };

    return (
        <div 
            ref={islandRef}
            style={islandStyle}
            onMouseDown={handleMouseDown}
        >
            {/* Scrollable but visually hidden scrollbar (Webkit/Firefox/IE) */}
            <style>{`
                .hide-scrollbar {
                    -ms-overflow-style: none; /* IE/Edge */
                    scrollbar-width: none; /* Firefox */
                }
                .hide-scrollbar::-webkit-scrollbar {
                    width: 0;
                    height: 0;
                    display: none; /* Chrome/Safari/Edge */
                }
            `}</style>
            {/* --- 顶部栏 --- */}
            <div 
                onClick={handleHeaderClick}
                style={{ 
                    height: '48px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    padding: '0 6px 0 16px',
                    flexShrink: 0
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ 
                        width: 28, height: 28, borderRadius: '50%', 
                        background: 'linear-gradient(135deg, #00C6FB, #005BEA)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        {loading ? <Spin size="small" /> : <RobotOutlined style={{ fontSize: 16, color: 'white' }} />}
                    </div>
                    
                    <span style={{ 
                        fontSize: 14, fontWeight: 500, 
                        opacity: isExpanded ? 0 : 1, 
                        transition: 'opacity 0.2s',
                        whiteSpace: 'nowrap',
                        position: isExpanded ? 'absolute' : 'relative',
                        pointerEvents: 'none'
                    }}>
                        {loading ? 'AI 正在思考...' : 'AI 助手就绪'}
                    </span>

                    <span style={{ 
                        fontSize: 14, fontWeight: 600, 
                        opacity: isExpanded ? 1 : 0, 
                        transition: 'opacity 0.3s 0.2s', 
                        position: 'absolute', left: 56
                    }}>
                        ExcelFlow Copilot
                    </span>
                </div>

                {isExpanded ? (
                    <Button 
                        type="text" 
                        shape="circle" 
                        icon={<CloseOutlined style={{ color: 'rgba(255,255,255,0.6)' }} />} 
                        onClick={(e) => { e.stopPropagation(); toggleExpand(); }}
                        onMouseDown={(e) => e.stopPropagation()} 
                    />
                ) : (
                    <HolderOutlined style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, marginRight: 6 }} />
                )}
            </div>

            {/* --- 内容区域 --- */}
            <div style={{ 
                flex: 1, 
                minHeight: 0,
                display: 'flex', 
                flexDirection: 'column', 
                opacity: isExpanded ? 1 : 0, 
                transition: 'opacity 0.3s',
                pointerEvents: isExpanded ? 'auto' : 'none',
                padding: '0 16px 16px 16px',
                cursor: 'default'
            }}
            onMouseDown={(e) => e.stopPropagation()} 
            >
                <div
                    className="hide-scrollbar"
                    style={{
                        flex: 1,
                        minHeight: 0,
                        overflowY: 'auto',
                        WebkitOverflowScrolling: 'touch',
                        overscrollBehavior: 'contain',
                        marginBottom: 12,
                        paddingRight: 4
                    }}
                >
                    {messages.length === 0 ? (
                        <div style={{ textAlign: 'center', marginTop: 80, color: 'rgba(255,255,255,0.5)' }}>
                            <ThunderboltFilled style={{ fontSize: 40, marginBottom: 16, opacity: 0.5 }} />
                            <p>我是您的数据助手。<br/>您可以说："帮我把销售表按地区汇总"</p>
                        </div>
                    ) : (
                        messages.map((msg, idx) => (
                            <div key={idx} style={{ 
                                display: 'flex', 
                                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                marginBottom: 12 
                            }}>
                                <div style={{ 
                                    maxWidth: '85%',
                                    padding: '10px 14px',
                                    borderRadius: 16,
                                    background: msg.role === 'user' ? '#007AFF' : 'rgba(255,255,255,0.1)',
                                    color: 'white',
                                    fontSize: 13,
                                    lineHeight: 1.5,
                                    whiteSpace: 'pre-wrap'
                                }}>
                                    {msg.content}
                                </div>
                            </div>
                        ))
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <div style={{ display: 'flex', gap: 8, background: 'rgba(255,255,255,0.1)', padding: 6, borderRadius: 30 }}>
                    <Input 
                        ref={inputRef}
                        value={inputValue}
                        onChange={e => setInputValue(e.target.value)}
                        onPressEnter={handleSend}
                        placeholder="输入您的需求..." 
                        bordered={false}
                        style={{ color: 'white', paddingLeft: 12 }}
                    />
                    <Button 
                        type="primary" 
                        shape="circle" 
                        icon={<SendOutlined />} 
                        onClick={handleSend}
                        loading={loading}
                        style={{ background: '#007AFF', border: 'none' }}
                    />
                </div>
            </div>
        </div>
    );
};

export default AIAssistantIsland;
