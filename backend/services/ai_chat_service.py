"""
AI Chat Service - 交互式工作流生成器
支持多轮对话，先选表再对话模式
"""
import logging
import uuid
from typing import Dict, List, Optional
from datetime import datetime
from openai import OpenAI
from config import ARK_API_KEY, ARK_BASE_URL, ARK_MODEL_NAME

# 配置日志
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

# 会话存储 (生产环境应使用Redis)
chat_sessions: Dict[str, dict] = {}


class AIChatService:
    """AI对话服务 - 交互式工作流生成"""
    
    def __init__(self):
        logger.info("[AIChatService] 初始化AI对话服务")
        self.client = OpenAI(api_key=ARK_API_KEY, base_url=ARK_BASE_URL)
        self.model = ARK_MODEL_NAME
        
    def start_session(self, selected_files: List[dict], file_metadata: List[dict]) -> dict:
        """
        开始新的对话会话
        
        Args:
            selected_files: 用户选择的文件列表 [{"file_id": "xxx", "sheet_name": "Sheet1"}, ...]
            file_metadata: 文件元数据（含列名、样例数据）
        
        Returns:
            {"session_id": "xxx", "message": "AI开场白", "status": "clarifying"}
        """
        session_id = str(uuid.uuid4())[:8]
        logger.info(f"[AIChatService] 开始新会话: session_id={session_id}")
        logger.debug(f"[AIChatService] 选择的文件: {selected_files}")
        logger.debug(f"[AIChatService] 文件元数据: {file_metadata}")
        
        # 构建表结构上下文
        tables_context = self._build_tables_context(file_metadata)
        logger.debug(f"[AIChatService] 表结构上下文:\n{tables_context}")
        
        # 系统提示词
        system_prompt = self._build_system_prompt(tables_context)
        
        # 初始化会话
        chat_sessions[session_id] = {
            "created_at": datetime.now().isoformat(),
            "selected_files": selected_files,
            "file_metadata": file_metadata,
            "tables_context": tables_context,
            "messages": [
                {"role": "system", "content": system_prompt}
            ],
            "status": "clarifying",  # clarifying / confirmed / generated
            "extracted_requirements": None
        }
        
        # 生成AI开场白
        opening_message = self._generate_opening(session_id, file_metadata)
        logger.info(f"[AIChatService] AI开场白: {opening_message[:100]}...")
        
        # 保存AI消息
        chat_sessions[session_id]["messages"].append({
            "role": "assistant",
            "content": opening_message
        })
        
        return {
            "session_id": session_id,
            "message": opening_message,
            "status": "clarifying"
        }
    
    def send_message(self, session_id: str, user_message: str) -> dict:
        """
        发送用户消息，获取AI回复
        
        Args:
            session_id: 会话ID
            user_message: 用户消息
            
        Returns:
            {"message": "AI回复", "status": "clarifying/confirmed", "requirements": {...}}
        """
        logger.info(f"[AIChatService] 收到用户消息: session={session_id}, msg={user_message[:50]}...")
        
        if session_id not in chat_sessions:
            logger.error(f"[AIChatService] 会话不存在: {session_id}")
            return {"error": "会话不存在或已过期", "status": "error"}
        
        session = chat_sessions[session_id]
        
        # 添加用户消息
        session["messages"].append({
            "role": "user",
            "content": user_message
        })
        
        # 调用AI
        try:
            logger.debug(f"[AIChatService] 调用AI，消息数: {len(session['messages'])}")
            
            response = self.client.chat.completions.create(
                model=self.model,
                messages=session["messages"],
                temperature=0.7
            )
            
            ai_reply = response.choices[0].message.content
            logger.info(f"[AIChatService] AI回复: {ai_reply[:100]}...")
            
            # 保存AI回复
            session["messages"].append({
                "role": "assistant",
                "content": ai_reply
            })
            
            # 分析AI回复，判断是否已确认需求
            status = self._analyze_reply_status(ai_reply)
            session["status"] = status
            logger.debug(f"[AIChatService] 当前状态: {status}")
            
            return {
                "message": ai_reply,
                "status": status
            }
            
        except Exception as e:
            logger.error(f"[AIChatService] AI调用失败: {e}")
            return {"error": str(e), "status": "error"}
    
    def generate_workflow(self, session_id: str) -> dict:
        """
        根据对话生成工作流
        
        Args:
            session_id: 会话ID
            
        Returns:
            {"workflow": {...}, "status": "generated"}
        """
        logger.info(f"[AIChatService] 生成工作流: session={session_id}")
        
        if session_id not in chat_sessions:
            logger.error(f"[AIChatService] 会话不存在: {session_id}")
            return {"error": "会话不存在", "status": "error"}
        
        session = chat_sessions[session_id]
        
        # 构建文件信息映射，供AI使用真实的file_id和列名
        file_info_lines = []
        for i, meta in enumerate(session.get("file_metadata", []), 1):
            file_id = meta.get("file_id", "")
            filename = meta.get("filename", "")
            sheet_name = meta.get("sheet_name", "")
            columns = meta.get("columns", [])
            columns_str = ", ".join(columns) if columns else "未获取到列信息"
            
            file_info_lines.append(f"  - 表{i}: file_id=\"{file_id}\", sheet_name=\"{sheet_name}\" (文件: {filename})")
            file_info_lines.append(f"    包含列: [{columns_str}]")
        
        file_mapping_text = "\n".join(file_info_lines)
        
        # 添加生成指令，包含真实的file_id信息和完整的节点配置说明
        generate_prompt = f"""用户已确认需求，请根据之前的对话生成工作流。

========== 数据源信息（必须使用真实的file_id和sheet_name） ==========
{file_mapping_text}

========== 重要规则 ==========
1. 【列名】必须严格使用上述【包含列】中存在的准确列名，严禁臆造！
2. 【参数】每种节点只能使用其专属参数，禁止混用！
3. 【顺序】节点连接顺序：source → 清洗/补全 → 汇总 → 对比 → 输出

========== 全部节点配置格式（严格按此填写config） ==========

【数据源节点】
source: {{"file_id": "使用真实ID", "sheet_name": "使用真实Sheet名"}}
source_csv: {{"file_id": "真实ID", "delimiter": ",", "encoding": "utf-8"}}

【数据清洗节点】
transform（筛选/计算/选列/排序）: {{
  "filter_code": "列名 > 0 and 列名2 == '值'",
  "calculations": [{{"target": "新列名", "formula": "列A - 列B"}}],
  "drop_columns": ["要删除的列"],
  "selected_columns": ["只保留的列1", "只保留的列2"],
  "rename_map": {{"旧列名": "新列名"}},
  "sort_by": "排序列", "sort_order": "asc"
}}

type_convert（类型转换）: {{
  "conversions": [{{"column": "列名", "dtype": "int/float/str/datetime"}}]
}}

fill_na（缺失值处理）: {{
  "strategy": "drop/fill_value/ffill/bfill/mean/median",
  "columns": ["处理的列"],
  "fill_value": "填充值（strategy为fill_value时使用）"
}}

deduplicate（去重）: {{
  "subset": ["判断重复的列1", "列2"],
  "keep": "first/last/false"
}}

text_process（文本处理）: {{
  "column": "要处理的列",
  "operation": "trim/lower/upper/replace/extract",
  "pattern": "查找文本或正则",
  "replacement": "替换为"
}}

date_process（日期处理）: {{
  "column": "日期列",
  "extract": ["year", "month", "day", "weekday", "quarter"],
  "offset": "+7d/-1M/+1y"
}}

【数据分析节点】
group_aggregate（分组汇总，核心节点）: {{
  "group_by": ["分组维度1", "分组维度2"],
  "aggregations": [
    {{"column": "金额列", "func": "sum", "alias": "合计金额"}},
    {{"column": "数量列", "func": "count", "alias": "记录数"}}
  ]
}}
可用func: sum, count, mean, min, max, first, last

pivot（透视表）: {{
  "index": ["作为行的列"],
  "columns": "作为列的字段",
  "values": "汇总的值字段",
  "aggfunc": "sum/mean/count"
}}

unpivot（逆透视，列转行）: {{
  "id_vars": ["保留不变的列"],
  "value_vars": ["要转换的列"],
  "var_name": "新类别列名",
  "value_name": "新值列名"
}}

【多表操作节点（重点区分！）】
vlookup（查找补列，主表+指定列）: {{
  "left_key": "主表关联列",
  "right_key": "查找表关联列（可与left_key不同）",
  "columns_to_get": ["要从查找表获取的列1", "列2"]
}}
用途示例：退货表缺主品类别，通过商品名称从订单表查找
【重要】连接顺序：先连主表（需要补全的表），后连查找表（提供数据的表）

join（合并两表，返回所有列）: {{
  "how": "inner/left/right/outer",
  "left_on": ["左表关联列1", "列2"],
  "right_on": ["右表关联列1", "列2"]
}}
用途示例：需要两表的全部字段信息
连接顺序：先连左表，后连右表

concat（纵向堆叠多表）: {{
  "join": "outer/inner",
  "ignore_index": true
}}
用途示例：合并多个相同格式的结果

diff（差异对比）: {{
  "compare_columns": ["对比列1", "对比列2"]
}}

reconcile（对账核算，最适合财务核对）: {{
  "join_keys": ["关联维度1", "关联维度2"],
  "left_column": "明细表金额列（会自动汇总）",
  "right_column": "汇总表金额列",
  "output_mode": "diff_only/all",
  "tolerance": 0.01
}}
工作原理：自动将明细表(第一输入)按join_keys汇总，与汇总表(第二输入)对比

【自动化节点】
code（自定义Python代码）: {{
  "python_code": "# 可用变量: inputs(输入列表), df(第一个输入), pd(pandas)\\nresult = df[df['金额'] > 100]"
}}

【输出节点】
output: {{"filename": "结果.xlsx"}}
output_csv: {{"filename": "结果.csv", "encoding": "utf-8"}}

========== 输出格式 ==========
请只输出纯JSON，格式如下：
{{
  "nodes": [
    {{"id": "唯一标识", "type": "节点类型", "label": "中文描述", "config": {{配置对象}}}}
  ],
  "edges": [
    {{"source": "源节点id", "target": "目标节点id"}}
  ]
}}
"""
        
        session["messages"].append({
            "role": "user", 
            "content": generate_prompt
        })
        
        try:
            logger.debug(f"[AIChatService] 请求生成工作流...")
            
            response = self.client.chat.completions.create(
                model=self.model,
                messages=session["messages"],
                temperature=0.3
            )
            
            ai_reply = response.choices[0].message.content
            logger.debug(f"[AIChatService] 生成结果: {ai_reply[:200]}...")
            
            # 解析JSON
            import json
            import re
            
            # 提取JSON部分
            json_match = re.search(r'\{[\s\S]*\}', ai_reply)
            if json_match:
                workflow = json.loads(json_match.group())
                logger.info(f"[AIChatService] 工作流生成成功: {len(workflow.get('nodes', []))} 个节点")
                
                # 【关键修复】将生成的JSON保存到对话历史，供后续修改使用
                session["messages"].append({
                    "role": "assistant",
                    "content": ai_reply
                })
                
                session["status"] = "generated"
                
                return {
                    "workflow": workflow,
                    "status": "generated"
                }
            else:
                logger.error(f"[AIChatService] 无法解析工作流JSON")
                return {"error": "生成的工作流格式错误", "status": "error"}
                
        except Exception as e:
            logger.error(f"[AIChatService] 生成工作流失败: {e}")
            return {"error": str(e), "status": "error"}
    
    def _build_tables_context(self, file_metadata: List[dict]) -> str:
        """构建表结构上下文"""
        context_parts = []
        
        for i, meta in enumerate(file_metadata, 1):
            filename = meta.get("filename", f"表{i}")
            sheet_name = meta.get("sheet_name", "Sheet1")
            columns = meta.get("columns", [])
            sample_data = meta.get("sample_data", [])
            row_count = meta.get("row_count", 0)
            
            part = f"""表{i}: {filename} / {sheet_name}
  - 行数: {row_count}
  - 列名: {', '.join(columns[:15])}{'...' if len(columns) > 15 else ''}
  - 样例数据: {sample_data[:3]}"""
            
            context_parts.append(part)
        
        return "\n\n".join(context_parts)
    
    def _build_system_prompt(self, tables_context: str) -> str:
        """构建系统提示词"""
        return f"""你是ExcelFlow工作流设计专家。你的任务是帮助用户设计数据处理工作流。

========== 用户选择的数据表 ==========
{tables_context}

========== 你的思考流程（必须严格遵循） ==========

【第一步：深度分析表结构】
1. 逐个阅读每张表的列名，理解每列的业务含义
2. 标记关键字段：
   - 唯一标识字段（如：订单号、用户ID）
   - 维度字段（如：市场id、门店id、类别）
   - 度量字段（如：金额、数量）
   - 日期字段
3. 识别表间关系：
   - 哪些列可以作为关联键连接不同表？
   - 有没有表缺少某些字段，需要从其他表查找补全？
4. 向用户确认你的理解是否正确

【第二步：拆解用户需求】
将复杂需求分解为清晰的子任务，例如：
- "业绩核对" = 签收核对 + 退货核对 + 差异汇总
- "数据清洗" = 去重 + 填充空值 + 格式统一
- "报表生成" = 筛选 + 分组汇总 + 排序
每个子任务对应1-2个节点

【第三步：设计数据流】
思考数据从源头到输出的流向：
1. 源表读取（source节点）
2. 数据补全（vlookup节点，如果需要）
3. 数据清洗（transform/fill_na/deduplicate）
4. 分组汇总（group_aggregate）
5. 多表关联或对比（join/reconcile）
6. 结果输出（output节点）

【第四步：选择正确的节点】

=== 数据源节点 ===
• source: 读取Excel文件的一个Sheet
• source_csv: 读取CSV文件

=== 数据清洗节点 ===
• transform: 万能清洗节点
  - filter_code: 筛选行（如 "金额 > 0"）
  - calculations: 计算新列（如 目标列 = 列A - 列B）
  - selected_columns: 只保留指定列
  - rename_map: 列重命名
  - sort_by: 排序
• type_convert: 转换数据类型（文本→数字、日期）
• fill_na: 处理缺失值（删除/填充/均值）
• deduplicate: 去重
• text_process: 文本处理（去空格、大小写、替换）
• date_process: 日期处理（提取年月日、日期偏移）

=== 数据分析节点 ===
• group_aggregate: 分组汇总（核心节点！）
  - group_by: 分组维度
  - aggregations: 对哪列做什么聚合（sum/count/mean/min/max）
• pivot: 透视表（行列转换）
• unpivot: 逆透视（列转行）

=== 多表操作节点（重点区分！）===
• vlookup: 查找补列（主表保持不变，从查找表获取指定列）
  用途：表A缺某字段，从表B查找补全
  配置：left_key(主表列), right_key(查找表列), columns_to_get(获取的列)
  
• join: 合并两表（返回两表所有列的交集/并集）
  用途：需要两表的全部信息
  配置：how(inner/left/right/outer), left_on, right_on
  
• concat: 纵向堆叠（相同结构的表上下拼接）
  用途：合并多个相同格式的表
  
• diff: 差异对比（找出两表不同的行）

• reconcile: 对账核算（最适合财务核对！）
  用途：明细表汇总后与汇总表对比，找差异
  配置：join_keys(关联维度), left_column(明细金额), right_column(汇总金额)
  工作原理：自动将明细表按join_keys汇总，与汇总表对比，输出差异

=== 自动化节点 ===
• code: 自定义Python代码（复杂逻辑时使用）

=== 输出节点 ===
• output: 输出Excel文件
• output_csv: 输出CSV文件

【第五步：验证设计】
- 所有列名是否都来自实际表结构？禁止臆造列名！
- 节点连接顺序是否正确？（源头→处理→输出）
- 能否完整解决用户的全部需求？

========== 对话规则 ==========
1. 分析完表结构后，向用户确认你的理解
2. 向用户询问关键信息（关联键是什么？按什么维度汇总？对比哪些金额？）
3. 用列表清晰展示你的设计方案
4. 确认需求后询问"是否确认生成工作流？"
5. 对话阶段绝不输出JSON，JSON只在生成步骤输出
6. JSON必须是标准格式，禁止包含任何注释"""
    
    def _generate_opening(self, session_id: str, file_metadata: List[dict]) -> str:
        """生成AI开场白"""
        table_names = [f"{m.get('filename', '未知')}/{m.get('sheet_name', 'Sheet1')}" 
                       for m in file_metadata]
        
        if len(file_metadata) == 1:
            meta = file_metadata[0]
            cols = meta.get("columns", [])[:8]
            return f"""我看到您选择了表 **{table_names[0]}**，包含列：{', '.join(cols)}{'...' if len(meta.get('columns', [])) > 8 else ''}

请告诉我您想对这个表做什么处理？例如：筛选、分组汇总、去重、计算新列等。"""
        else:
            return f"""我看到您选择了 {len(file_metadata)} 张表：
{chr(10).join([f"• {name}" for name in table_names])}

请告诉我您想如何处理这些数据？例如：关联合并、对比差异、汇总统计等。"""
    
    def _analyze_reply_status(self, ai_reply: str) -> str:
        """分析AI回复，判断需求状态"""
        # 扩展触发词列表 - 当AI理解需求后会触发确认
        confirm_keywords = [
            "确认生成", "开始生成", "是否确认", "确定生成",
            "生成工作流", "开始构建", "帮您生成", "立即生成",
            "可以生成", "需要确认", "是否开始", "是否生成",
            "方案如下", "以下步骤", "处理步骤", "工作流方案",
            "帮您处理", "开始处理", "如您确认", "确认后",
            "请确认", "好的", "明白", "了解", "没问题", "可以"
        ]
        
        for keyword in confirm_keywords:
            if keyword in ai_reply:
                return "confirmed"
        
        return "clarifying"


# 单例
ai_chat_service = AIChatService()
