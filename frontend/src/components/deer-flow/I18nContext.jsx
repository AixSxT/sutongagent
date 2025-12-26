import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

const translations = {
  en: {
    brand: "人康智能搜索",
    common: {
      getStarted: "Get Started",
      learnMore: "Learn More",
      starOnGitHub: "Star on GitHub",
      send: "Send",
      stop: "Stop",
      cancel: "Cancel",
      save: "Save",
      copy: "Copy",
      download: "Download",
      edit: "Edit",
      delete: "Delete",
      open: "Open",
      close: "Close",
      done: "Done",
      settings: "Settings",
    },
    landing: {
      hero: {
        title: "RenKang Intelligence",
        subtitle: "Search Tool",
        description:
          "Meet {brand}, your personal Deep Research assistant. With powerful tools like search engines, web crawlers, Python and MCP services, it delivers instant insights and comprehensive reports.",
        footnote: "This is the RenKang tool group.",
      },
      caseStudies: {
        title: "Case Studies",
        description: "See {brand} in action through replays.",
        cta: "Click to watch replay",
        cases: [
          {
            title: "How tall is Eiffel Tower compared to tallest building?",
            description:
              "The research compares the heights and global significance of the Eiffel Tower and Burj Khalifa, and uses Python code to calculate the multiples.",
          },
          {
            title: "What are the top trending repositories on GitHub?",
            description:
              "The research utilized MCP services to identify the most popular GitHub repositories and documented them in detail using search engines.",
          },
          {
            title: "Write an article about Nanjing's traditional dishes",
            description:
              "The study vividly showcases Nanjing's famous dishes through rich content and imagery, uncovering their hidden histories and cultural significance.",
          },
          {
            title: "How to decorate a small rental apartment?",
            description:
              "The study provides readers with practical and straightforward methods for decorating apartments, accompanied by inspiring images.",
          },
          {
            title: "Introduce the movie 'Leon: The Professional'",
            description:
              "The research provides a comprehensive introduction to the movie 'Leon: The Professional', including its plot, characters, and themes.",
          },
          {
            title: "How do you view the takeaway war in China? (in Chinese)",
            description:
              "The research analyzes the intensifying competition between JD and Meituan, highlighting their strategies, technological innovations, and challenges.",
          },
          {
            title: "Are ultra-processed foods linked to health?",
            description:
              "The research examines the health risks of rising ultra-processed food consumption, urging more research on long-term effects and individual differences.",
          },
          {
            title: 'Write an article on "Would you insure your AI twin?"',
            description:
              "The research explores the concept of insuring AI twins, highlighting their benefits, risks, ethical considerations, and the evolving regulatory.",
          },
        ],
      },
      multiAgent: {
        title: "Multi-Agent Architecture",
        description:
          "Experience the agent teamwork with our Supervisor + Handoffs design pattern.",
      },
      coreFeatures: {
        title: "Core Features",
        description: "Find out what makes {brand} effective.",
        learnMore: "Learn More",
        features: [
          {
            name: "Dive Deeper and Reach Wider",
            description:
              "Unlock deeper insights with advanced tools. Our powerful search + crawling and Python tools gathers comprehensive data, delivering in-depth reports to enhance your study.",
          },
          {
            name: "Human-in-the-loop",
            description:
              "Refine your research plan, or adjust focus areas all through simple natural language.",
          },
          {
            name: "Lang Stack",
            description:
              "Build with confidence using the LangChain and LangGraph frameworks.",
          },
          {
            name: "MCP Integrations",
            description:
              "Supercharge your research workflow and expand your toolkit with seamless MCP integrations.",
          },
          {
            name: "Podcast Generation",
            description:
              "Instantly generate podcasts from reports. Perfect for on-the-go learning or sharing findings effortlessly.",
          },
        ],
      },
      joinCommunity: {
        title: "Join the {brand} Community",
        description:
          "Contribute brilliant ideas to shape the future of {brand}. Collaborate, innovate, and make impacts.",
        cta: "Contribute Now",
      },
      footer: {
        quote: "Originated from Open Source, give back to Open Source.",
        license: "Licensed under MIT License",
      },
    },
    chat: {
      welcome: {
        greeting: "Hello, there!",
        description:
          "Welcome to {brand}, a deep research assistant built on cutting-edge language models, helps you search on web, browse information, and handle complex tasks.",
      },
      conversationStarters: [
        "利润表是如何算出的",
        "今天的税率变化",
        "我想知道邯郸门店的刘洋团队的利润表",
        "这个商品的原产地是哪里",
      ],
      input: {
        placeholder: "What can I do for you?",
        deepThinking: "Deep Thinking",
        investigation: "Investigation",
        enhancePrompt: "Enhance prompt with AI",
        writingStyle: "Writing Style",
        searchResources: "Search resources",
        noMatches: "No matches",
        styles: [
          "Academic",
          "Popular Science",
          "News",
          "Social Media",
          "Strategic Investment",
        ],
      },
      research: {
        deepResearch: "Deep Research",
        researching: "Researching...",
        reportGenerated: "Report generated",
        report: "Report",
        activities: "Activities",
        thinking: "Deep Thinking",
        searchingFor: "Searching for",
        reading: "Reading",
        runningPython: "Running Python code",
        retrieving: "Retrieving documents",
        executionOutput: "Execution output",
        podcast: "Podcast",
        generatingPodcast: "Generating podcast...",
        generatePodcast: "Generate podcast",
        downloadReport: "Download report",
        reportEmpty: "No report yet.",
        reportGenerating: "Generating report...",
        chunkSize: "chunk-size",
        steps: {
          analyzing: "Analyzing your request...",
          searching: "Searching global knowledge bases...",
          reading: "Reading 12 relevant documents...",
          synthesizing: "Synthesizing findings into a report...",
          investigation: "Running background investigation...",
        },
        evaluation: "Report Quality Evaluation",
        evaluationDesc:
          "Evaluate your report using automated metrics and AI analysis.",
        evaluationRunning: "Running deep analysis...",
        evaluationMetrics: "Report Metrics",
        evaluationAnalysis: "Detailed Analysis",
        evaluationStrengths: "Strengths",
        evaluationWeaknesses: "Areas for Improvement",
        wordCount: "Word Count",
        citations: "Citations",
        sources: "Unique Sources",
        images: "Images",
        sectionCoverage: "Section Coverage",
        downloads: {
          markdown: "Markdown (.md)",
          html: "HTML (.html)",
          pdf: "PDF (.pdf)",
          word: "Word (.docx)",
          image: "Image (.png)",
        },
        internalKnowledgeBase: "internal knowledge base",
        evaluationLabels: {
          factual_accuracy: "Factual accuracy",
          completeness: "Completeness",
          coherence: "Coherence",
          relevance: "Relevance",
          citation_quality: "Citation quality",
          writing_quality: "Writing quality",
        },
        evaluationStrengthItems: [
          "Clear structure with measurable sections.",
          "Uses citations to support key findings.",
          "Balanced coverage of market and technical signals.",
        ],
        evaluationWeaknessItems: [
          "Add more real-world examples for stronger credibility.",
          "Expand competitive analysis section for deeper insights.",
        ],
      },
      plan: {
        title: "Deep Research Plan",
        thought:
          "I will break down the problem, gather evidence, and synthesize a report with citations.",
        writingStyle: "Writing style",
        stepOne: {
          title: "Clarify objectives",
          description: "Identify scope, success metrics, and target audience.",
        },
        stepTwo: {
          title: "Collect evidence",
          description:
            "Run targeted searches and gather insights from reliable sources.",
        },
        stepTwoInvestigation: {
          title: "Background investigation",
          description:
            "Run targeted searches and gather insights from reliable sources.",
        },
        stepThree: {
          title: "Synthesize report",
          description:
            "Aggregate findings, highlight trends, and draft final output.",
        },
        accept: "Looks good",
        adjust: "Adjust focus",
        regenerate: "Regenerate",
        responses: {
          accept: "Looks good. Please proceed.",
          adjust: "Please adjust the plan with more market focus.",
          regenerate: "Regenerate the plan with a different angle.",
        },
      },
    },
    sidebar: {
      newResearch: "New Research",
      searchHistory: "Search history...",
      recently: "Recently",
      today: "Today",
      yesterday: "Yesterday",
      earlier: "Earlier",
      untitled: "Untitled Research",
    },
    settings: {
      title: "{brand} Settings",
      description: "Manage your {brand} settings here.",
      general: "General",
      resources: "Resources",
      mcp: "MCP Servers",
      about: "About",
      newBadge: "New",
      aboutTitle: "About {brand}",
      aboutBody:
        "{brand} is a deep research assistant designed to help you search, analyze, and synthesize information quickly.",
      writingStyle: "Writing Style",
      writingStyleDesc: "Select a default report style for research output.",
      autoAcceptTitle: "Allow automatic acceptance of plans",
      autoAcceptDesc: "Automatically accept plans when suggested.",
      webSearchTitle: "Enable web search",
      webSearchDesc: "When disabled, only local resources will be used.",
      enabled: "Enabled",
      upload: "Upload",
      addServers: "Add Servers",
      resourcesDesc:
        "Manage your knowledge base resources here. Upload markdown or text files to be indexed for retrieval.",
      mcpDesc:
        "Integrate external tools for tasks like private domain searches, web browsing, and more.",
      noResources: "No resources found. Upload a file to get started.",
      noServers: "No MCP servers configured.",
    },
    report: {
      resultsTitle: "Research Results: {query}",
      intro: "Based on my deep research, here is the report:",
      deepIntro: "This report includes deep reasoning with expanded context.",
      executiveSummary: "Executive Summary",
      summaryBody:
        "The data indicates a significant shift towards **autonomous agents** in 2025.",
      keyMetrics: "Key Metrics",
      marketSignals: "Market Signals",
      bullet1: "Adoption rates are accelerating quarter over quarter.",
      bullet2: "Competitive pressure is driving rapid feature differentiation.",
      tableHeaders: ["Category", "Impact", "Confidence"],
      tableRows: [
        ["Technology", "High", "95%"],
        ["Market", "Medium", "80%"],
      ],
      codeComment: "# Analyzed using Internal Logic",
    },
  },
  zh: {
    brand: "人康智能搜索",
    common: {
      getStarted: "立即开始",
      learnMore: "了解更多",
      starOnGitHub: "GitHub 点赞",
      send: "发送",
      stop: "停止",
      cancel: "取消",
      save: "保存",
      copy: "复制",
      download: "下载",
      edit: "编辑",
      delete: "删除",
      open: "打开",
      close: "关闭",
      done: "完成",
      settings: "设置",
    },
    landing: {
      hero: {
        title: "人康智能",
        subtitle: "搜索工具",
        description:
          "认识 {brand}，你的专属深度研究助手。通过搜索引擎、网页爬取、Python 与 MCP 服务，快速生成洞察与报告。",
        footnote: "此为人康工具群组",
      },
      caseStudies: {
        title: "案例回放",
        description: "通过回放看看 {brand} 如何工作。",
        cta: "点击查看回放",
        cases: [
          {
            title: "埃菲尔铁塔比世界最高建筑高多少？",
            description:
              "比较埃菲尔铁塔与哈利法塔的高度差异，并使用 Python 计算倍数。",
          },
          {
            title: "GitHub 最热门仓库有哪些？",
            description:
              "利用 MCP 与搜索工具找出最流行的 GitHub 仓库并进行总结。",
          },
          {
            title: "写一篇南京传统美食文章",
            description:
              "通过丰富内容与图片呈现南京传统菜系的历史与文化。",
          },
          {
            title: "如何装修小型出租屋？",
            description:
              "提供实用装修建议，并给出灵感案例与布局思路。",
          },
          {
            title: "介绍电影《这个杀手不太冷》",
            description:
              "围绕剧情、角色与主题进行综合介绍。",
          },
          {
            title: "如何看待中国外卖大战？",
            description:
              "分析外卖平台的竞争策略、技术创新与挑战。",
          },
          {
            title: "超加工食品是否影响健康？",
            description:
              "研究超加工食品与健康风险的关系并提出进一步研究建议。",
          },
          {
            title: "如果有 AI 替身，你会为它投保吗？",
            description:
              "探讨 AI 替身保险的收益、风险与伦理问题。",
          },
        ],
      },
      multiAgent: {
        title: "多智能体架构",
        description: "体验 Supervisor + Handoffs 的协作流程。",
      },
      coreFeatures: {
        title: "核心能力",
        description: "了解 {brand} 高效的关键能力。",
        learnMore: "了解更多",
        features: [
          {
            name: "深挖洞察，触达更广",
            description:
              "搜索、爬取与 Python 工具协同，汇总多维数据生成深度报告。",
          },
          {
            name: "人类在环",
            description: "使用自然语言快速调整研究计划与重点。",
          },
          {
            name: "Lang 架构",
            description: "基于 LangChain 与 LangGraph 的可靠架构。",
          },
          {
            name: "MCP 集成",
            description: "通过 MCP 扩展工具集，强化研究流程。",
          },
          {
            name: "播客生成",
            description: "将报告自动生成播客，便于传播与学习。",
          },
        ],
      },
      joinCommunity: {
        title: "加入 {brand} 社区",
        description: "贡献灵感，共建 {brand} 的未来。",
        cta: "立即参与",
      },
      footer: {
        quote: "源于开源，回馈开源。",
        license: "MIT 许可",
      },
    },
    chat: {
      welcome: {
        greeting: "你好！",
        description:
          "欢迎使用 {brand}。这是一个基于前沿语言模型的深度研究助手，帮助你检索信息、浏览网页并处理复杂任务。",
      },
      conversationStarters: [
        "利润表是如何算出的",
        "今天的税率变化",
        "我想知道邯郸门店的刘洋团队的利润表",
        "这个商品的原产地是哪里",
      ],
      input: {
        placeholder: "我能为你做什么？",
        deepThinking: "深度思考",
        investigation: "调查模式",
        enhancePrompt: "AI 优化提示词",
        writingStyle: "写作风格",
        searchResources: "检索资源",
        noMatches: "暂无匹配",
        styles: [
          "学术",
          "科普",
          "新闻",
          "社交媒体",
          "战略投资",
        ],
      },
      research: {
        deepResearch: "深度研究",
        researching: "研究中...",
        reportGenerated: "报告已生成",
        report: "报告",
        activities: "活动",
        thinking: "深度思考",
        searchingFor: "正在搜索",
        reading: "正在阅读",
        runningPython: "运行 Python 代码",
        retrieving: "检索文档",
        executionOutput: "执行结果",
        podcast: "播客",
        generatingPodcast: "播客生成中...",
        generatePodcast: "生成播客",
        downloadReport: "下载报告",
        reportEmpty: "暂无报告。",
        reportGenerating: "报告生成中...",
        chunkSize: "块大小",
        steps: {
          analyzing: "正在分析你的需求...",
          searching: "正在检索全局知识库...",
          reading: "正在阅读 12 篇相关文档...",
          synthesizing: "正在整合发现并生成报告...",
          investigation: "正在执行背景调查...",
        },
        evaluation: "报告质量评估",
        evaluationDesc: "通过自动指标与 AI 分析评估报告质量。",
        evaluationRunning: "正在进行深度分析...",
        evaluationMetrics: "报告指标",
        evaluationAnalysis: "详细分析",
        evaluationStrengths: "优势",
        evaluationWeaknesses: "待改进",
        wordCount: "字数",
        citations: "引用数",
        sources: "来源数",
        images: "图片",
        sectionCoverage: "章节覆盖率",
        downloads: {
          markdown: "Markdown (.md)",
          html: "HTML (.html)",
          pdf: "PDF (.pdf)",
          word: "Word (.docx)",
          image: "图片 (.png)",
        },
        internalKnowledgeBase: "内部知识库",
        evaluationLabels: {
          factual_accuracy: "事实准确性",
          completeness: "完整度",
          coherence: "连贯性",
          relevance: "相关性",
          citation_quality: "引用质量",
          writing_quality: "写作质量",
        },
        evaluationStrengthItems: [
          "结构清晰，章节覆盖全面。",
          "引用来源支持关键结论。",
          "市场与技术洞察均衡。",
        ],
        evaluationWeaknessItems: [
          "补充更多真实案例以增强说服力。",
          "拓展竞争分析部分以深入对比。",
        ],
      },
      plan: {
        title: "深度研究计划",
        thought: "我会拆解问题、收集证据并输出带引用的报告。",
        writingStyle: "写作风格",
        stepOne: {
          title: "明确目标",
          description: "确认范围、成功指标与目标受众。",
        },
        stepTwo: {
          title: "收集证据",
          description: "执行定向检索并获取可靠来源。",
        },
        stepTwoInvestigation: {
          title: "背景调查",
          description: "执行定向检索并获取可靠来源。",
        },
        stepThree: {
          title: "汇总报告",
          description: "聚合发现、提炼趋势并生成输出。",
        },
        accept: "看起来不错",
        adjust: "调整重点",
        regenerate: "重新生成",
        responses: {
          accept: "看起来不错，请继续。",
          adjust: "请把重点放在市场层面的调整上。",
          regenerate: "请用不同角度重新生成计划。",
        },
      },
    },
    sidebar: {
      newResearch: "新建研究",
      searchHistory: "搜索历史...",
      recently: "最近",
      today: "今天",
      yesterday: "昨天",
      earlier: "更早",
      untitled: "未命名研究",
    },
    settings: {
      title: "{brand} 设置",
      description: "在这里管理 {brand} 的设置。",
      general: "通用",
      resources: "资源",
      mcp: "MCP 服务",
      about: "关于",
      newBadge: "新增",
      aboutTitle: "关于 {brand}",
      aboutBody: "{brand} 是一款深度研究助手，帮助你快速搜索、分析并输出结论。",
      writingStyle: "写作风格",
      writingStyleDesc: "选择默认的研究报告写作风格。",
      autoAcceptTitle: "自动接受计划",
      autoAcceptDesc: "当系统提出计划时自动接受。",
      webSearchTitle: "启用联网搜索",
      webSearchDesc: "关闭后仅使用本地资源进行研究。",
      enabled: "已启用",
      upload: "上传",
      addServers: "添加服务",
      resourcesDesc: "管理知识库资源，上传 Markdown 或文本以供检索。",
      mcpDesc: "集成外部工具以执行私有检索、网页浏览等任务。",
      noResources: "暂无资源，上传文件开始。",
      noServers: "暂无 MCP 服务配置。",
    },
    report: {
      resultsTitle: "研究结果：{query}",
      intro: "以下是本次深度研究的总结报告：",
      deepIntro: "本报告包含更深入的推理与扩展上下文。",
      executiveSummary: "执行摘要",
      summaryBody: "数据表明 2025 年 **自主智能体** 将出现显著增长。",
      keyMetrics: "关键指标",
      marketSignals: "市场信号",
      bullet1: "采用率在季度层面持续加速。",
      bullet2: "竞争压力推动功能快速分化。",
      tableHeaders: ["类别", "影响", "置信度"],
      tableRows: [
        ["技术", "高", "95%"],
        ["市场", "中", "80%"],
      ],
      codeComment: "# 使用内部逻辑进行分析",
    },
  },
};

const I18nContext = createContext({
  language: "zh",
  setLanguage: () => {},
  t: (key, fallback, vars) => key,
  tArray: () => [],
});

const resolvePath = (obj, path) => {
  return path.split(".").reduce((acc, key) => (acc ? acc[key] : undefined), obj);
};

export const I18nProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    if (typeof window === "undefined") return "zh";
    return localStorage.getItem("df-language") || "zh";
  });

  const t = useCallback(
    (key, fallback, vars) => {
      const value = resolvePath(translations[language], key);
      if (typeof value !== "string") return fallback ?? key;
      if (!vars) return value;
      return Object.keys(vars).reduce(
        (acc, varKey) =>
          acc.replaceAll(`{${varKey}}`, String(vars[varKey])),
        value,
      );
    },
    [language],
  );

  const tArray = useCallback(
    (key, fallback = []) => {
      const value = resolvePath(translations[language], key);
      return Array.isArray(value) ? value : fallback;
    },
    [language],
  );

  const contextValue = useMemo(
    () => ({ language, setLanguage, t, tArray }),
    [language, t, tArray],
  );

  const updateLanguage = (next) => {
    setLanguage(next);
    if (typeof window !== "undefined") {
      localStorage.setItem("df-language", next);
    }
  };

  return (
    <I18nContext.Provider
      value={{
        ...contextValue,
        setLanguage: updateLanguage,
      }}
    >
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => useContext(I18nContext);
