// src/components/RaycastHomePage.jsx
import React, { useRef } from 'react';
import { ArrowRightOutlined, SearchOutlined, DownOutlined, RobotOutlined, UserOutlined, ThunderboltFilled } from '@ant-design/icons';
import './RaycastHomePage.css'; 

const RaycastHomePage = () => {
  const terminalRef = useRef(null);

  const scrollToTerminal = () => {
    terminalRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="rc-home-container">
      {/* 背景光晕 */}
      <div className="rc-bg-glow-top"></div>

      {/* 注意：此处原有的 <header> 已删除。
         现在使用 App.jsx 的全局导航栏，它位于此组件外部。
      */}

      {/* ================= 第一屏：Hero 区域 ================= */}
      <section className="rc-section">
        <div className="rc-hero-content">
          {/* New 功能提示 */}
          <a href="#ai" className="rc-new-badge">
            <span className="rc-badge-label">测试</span>
            <span className="rc-badge-text">预览中---也许会做</span>
            <ArrowRightOutlined style={{ fontSize: '10px' }} />
          </a>

          {/* 主标题 */}
          <h1 className="rc-hero-title">
            人康智能 <br />
            <span className="rc-text-gradient">搜索工具</span>
          </h1>

          {/* 副标题 */}
          <p className="rc-hero-subtitle">
            你可以在此处搜索任何实时信息、应用程序和命令，一切尽在指尖。
          </p>

          {/* 下载按钮组已删除 */}
        </div>

        {/* 滚动提示 */}
        <div className="rc-scroll-hint" onClick={scrollToTerminal}>
          <span className="rc-scroll-text">Scroll to Chat</span>
          <DownOutlined />
        </div>
      </section>

      {/* ================= 第二屏：AI 终端 ================= */}
      <section className="rc-section" ref={terminalRef}>
        <div className="rc-terminal-wrapper">
          <div className="rc-glass-terminal">
            
            {/* 终端头部 */}
            <div className="rc-terminal-header">
              <div className="rc-terminal-dots">
                <div className="rc-dot red"></div>
                <div className="rc-dot yellow"></div>
                <div className="rc-dot green"></div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <ThunderboltFilled style={{ color: '#FF6363' }} />
                RenKang AI Agent
              </div>
              <div style={{ width: 40 }}></div>
            </div>

            {/* 对话内容 (预览) */}
            <div className="rc-chat-area">
              <div className="rc-message-row">
                <div className="rc-avatar ai"><RobotOutlined /></div>
                <div className="rc-message-content">
                  <div className="rc-sender-name">人康智能助手</div>
                  <div className="rc-text-bubble">
                    你好！我是您的全能业务助手。已为您连接到最新政策库。<br/>
                    您可以问我："最新的医疗补贴标准是什么？" 或 "分析上季度数据"。
                  </div>
                </div>
              </div>

              <div className="rc-message-row">
                <div className="rc-avatar"><UserOutlined /></div>
                <div className="rc-message-content">
                  <div className="rc-sender-name">我</div>
                  <div className="rc-text-bubble">帮我生成一个数据清洗工作流。</div>
                </div>
              </div>

              <div className="rc-message-row">
                <div className="rc-avatar ai"><RobotOutlined /></div>
                <div className="rc-message-content">
                  <div className="rc-sender-name">人康智能助手</div>
                  <div className="rc-text-bubble">
                    没问题。根据您的需求，建议使用 <b>Pandas 清洗节点</b> 配合 <b>去重节点</b>。
                    <br/><br/>
                    我已为您准备好模板，请在下方确认执行。
                  </div>
                </div>
              </div>
            </div>

            {/* 输入框 */}
            <div className="rc-input-area">
              <div className="rc-input-box">
                <SearchOutlined style={{ fontSize: 18, color: 'rgba(255,255,255,0.4)', marginRight: 12 }} />
                <input type="text" className="rc-input-field" placeholder="Ask AI anything..." readOnly />
                <span className="rc-kbd">⌘ K</span>
              </div>
            </div>

          </div>
        </div>
      </section>

    </div>
  );
};

export default RaycastHomePage;