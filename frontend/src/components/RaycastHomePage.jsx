import React from 'react';
import { Button } from 'antd';
import { AppleFilled, ArrowRightOutlined, SearchOutlined } from '@ant-design/icons';
import './RaycastHomePage.css'; // 引入独立的样式文件

const RaycastHomePage = () => {
  return (
    <div className="rc-home-container">
      {/* 背景光晕特效 */}
      <div className="rc-bg-glow-top"></div>

      {/* 顶部导航栏 */}
      <header className="rc-header">
        <div className="rc-nav-content">
          <div className="rc-logo">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 4C4 2.89543 4.89543 2 6 2H18C19.1046 2 20 2.89543 20 4V18C20 19.1046 19.1046 20 18 20H6C4.89543 20 4 19.1046 4 18V4Z" fill="#FF6363"/>
              <path d="M8 8H16V16H8V8Z" fill="white"/>
            </svg>
            <span>Raycast</span>
          </div>
          <nav className="rc-nav-links">
            <a href="#store">Store</a>
            <a href="#developer">Developer</a>
            <a href="#teams">Teams</a>
            <a href="#pro">Pro</a>
            <a href="#changelog">Changelog</a>
            <a href="#pricing">Pricing</a>
          </nav>
          <div className="rc-nav-actions">
            <a href="#login" className="rc-login-link">Log in</a>
            <Button type="primary" size="small" className="rc-download-btn-small">Download</Button>
          </div>
        </div>
      </header>

      {/* 主体 Hero 区域 */}
      <main className="rc-hero-section">
        <div className="rc-hero-content">
          {/* New 功能提示 */}
          <a href="#ai" className="rc-new-badge">
            <span className="rc-badge-label">New</span>
            <span className="rc-badge-text">Raycast AI - The next chapter</span>
            <ArrowRightOutlined style={{ fontSize: '10px' }} />
          </a>

          {/* 主标题 */}
          <h1 className="rc-hero-title">
            Your shortcut to <br />
            <span className="rc-text-gradient">everything</span>
          </h1>

          {/* 副标题 */}
          <p className="rc-hero-subtitle">
            Raycast is a blazingly fast, totally extendable launcher. It lets you complete tasks, calculate, share common links, and much more.
          </p>

          {/* 下载按钮组 */}
          <div className="rc-hero-cta">
            <Button type="primary" size="large" icon={<AppleFilled style={{ fontSize: '20px' }} />} className="rc-primary-download-btn">
              Download for Mac
            </Button>
            <p className="rc-version-text">
              v1.86.0 · macOS 12+ · <a href="#install">Install via Homebrew</a>
            </p>
          </div>
        </div>

        {/* Raycast 软件界面演示图 */}
        <div className="rc-app-mockup-wrapper">
          <div className="rc-app-mockup">
            <div className="rc-app-search-bar">
              <SearchOutlined className="rc-search-icon" />
              <span className="rc-search-placeholder">Search for apps and commands...</span>
              <div className="rc-shortcut-hint">
                <kbd>⌘</kbd> <kbd>K</kbd>
              </div>
            </div>
            <div className="rc-app-list">
              <div className="rc-app-list-item active">
                <img src="https://cdn.svgporn.com/logos/linear.svg" alt="Linear" className="rc-app-icon" style={{ padding: '4px', background: '#1e1e1e' }} />
                <div className="rc-app-list-content">
                  <div className="rc-app-list-title">Create Issue</div>
                  <div className="rc-app-list-subtitle">Linear</div>
                </div>
                <span className="rc-enter-hint">↵</span>
              </div>
              <div className="rc-app-list-item">
                <div className="rc-app-icon-placeholder" style={{ background: '#5E5CE6' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                </div>
                <div className="rc-app-list-content">
                  <div className="rc-app-list-title">Search Files</div>
                  <div className="rc-app-list-subtitle">Finder</div>
                </div>
              </div>
              <div className="rc-app-list-item">
                <img src="https://cdn.svgporn.com/logos/spotify.svg" alt="Spotify" className="rc-app-icon" />
                <div className="rc-app-list-content">
                  <div className="rc-app-list-title">Spotify Player</div>
                  <div className="rc-app-list-subtitle">Spotify</div>
                </div>
              </div>
              <div className="rc-app-list-item">
                <img src="https://cdn.svgporn.com/logos/notion.svg" alt="Notion" className="rc-app-icon" />
                <div className="rc-app-list-content">
                  <div className="rc-app-list-title">Search Notion</div>
                  <div className="rc-app-list-subtitle">Notion</div>
                </div>
              </div>
            </div>
            <div className="rc-app-footer">
              <div className="rc-footer-item">Open Application</div>
              <div className="rc-footer-item">Actions <kbd>⌘</kbd><kbd>K</kbd></div>
            </div>
          </div>
          <div className="rc-app-glow"></div>
        </div>
      </main>
    </div>
  );
};

export default RaycastHomePage;