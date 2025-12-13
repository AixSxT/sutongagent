# ExcelFlow - 智能Excel工作流系统

一个基于AI和React Flow的现代Excel数据处理系统。支持通过**自然语言描述**自动生成处理工作流，也支持通过**拖拽**手动搭建处理逻辑。

界面采用 **iOS 扁平化设计风格**，提供极致的视觉体验和操作流畅度。

![UI Preview](file:///C:/Users/galf0/.gemini/antigravity/brain/b622f3ae-8d91-4a98-9dd5-47cb70a57561/ios_ui_verification_1765462170352.webp)

## ✨ 核心特性

- **双模式操作**：
  - 🤖 **AI模式**：直接通过中文对话（如"把销售表和退款表合并，按地区求和"）自动生成工作流。
  - 🛠️ **搭建模式**：提供丰富的数据处理节点，通过拖拽和连线自由组合逻辑。

- **强大的数据处理**：
  - 支持多文件、多Sheet导入
  - **7种核心节点**：数据源、列选择、筛选、计算、合并、分组聚合、输出
  - 实时数据预览和结果导出

- **极致UI体验**：
  - **iOS 风格设计**：磨砂玻璃特效、圆角卡片、彩色图标
  - **悬浮式结果面板**：优雅的结果展示交互
  - **响应式布局**：完美适配不同屏幕尺寸

## 🚀 快速开始

### 方式一：一键启动（推荐）
双击根目录下的 `start.bat` 脚本，将自动启动前后端服务。

### 方式二：手动启动

**1. 启动后端 (Port: 8000)**
```bash
cd backend
python -m uvicorn main:app --reload --port 8000
```

**2. 启动前端 (Port: 3000)**
```bash
cd frontend
npm run dev
```

## 🛠️ 技术栈

- **Frontend**: React, React Flow, Ant Design, Tailwind CSS logic (Custom CSS)
- **Backend**: FastAPI, Pandas, SQLite
- **AI**: Volcengine Doubao API (火山引擎豆包)

## 📝 使用指南

1. **上传文件**：在左侧面板拖拽上传Excel文件。
2. **选择模式**：
   - **AI模式**：输入您的需求，点击"生成方案"。
   - **搭建模式**：从"工具箱"拖拽节点到画布，配置参数并连线。
3. **执行**：点击右上角的"执行"按钮等待处理完成。
4. **下载**：在底部悬浮面板中预览数据或下载Excel结果。

---

Built with ❤️ by Antigravity├── data/             # 数据库文件
└── start.bat         # 启动脚本
