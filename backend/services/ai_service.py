"""
豆包AI服务 - 将自然语言转换为工作流配置
"""
import httpx
import json
import re
import logging
from typing import Dict, Any, List
from config import ARK_API_KEY, ARK_BASE_URL, ARK_MODEL_NAME

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

WORKFLOW_GENERATION_PROMPT = """你是一个Excel工作流生成专家。根据用户需求生成JSON工作流。

## 可用节点类型

### 数据源
- source: Excel读取 - config: {{"file_id": "文件ID", "sheet_name": "Sheet1"}}
- source_csv: CSV读取 - config: {{"file_id": "文件ID", "delimiter": ",", "encoding": "utf-8"}}

### 数据清洗
- transform: 数据清洗 - config: {{"filter_code": "age > 18", "selected_columns": ["col1"], "calculations": [{{"target": "total", "formula": "a + b"}}], "sort_by": "col", "sort_order": "asc"}}
- type_convert: 类型转换 - config: {{"conversions": [{{"column": "日期", "dtype": "datetime"}}]}}
- fill_na: 缺失值处理 - config: {{"strategy": "fill_value/drop/ffill/mean", "fill_value": "0", "columns": []}}
- deduplicate: 去重 - config: {{"subset": ["col1"], "keep": "first"}}
- text_process: 文本处理 - config: {{"column": "name", "operation": "trim/lower/upper/replace", "pattern": "", "replacement": ""}}
- date_process: 日期处理 - config: {{"column": "date", "extract": ["year", "month"], "offset": "+7d"}}

### 数据分析
- group_aggregate: 分组聚合 - config: {{"group_by": ["city"], "aggregations": [{{"column": "amount", "func": "sum", "alias": "总金额"}}]}}
- pivot: 透视表 - config: {{"index": ["产品"], "columns": "月份", "values": "销量", "aggfunc": "sum"}}

### 多表操作
- join: 多表关联 - config: {{"how": "inner/left/right/outer", "left_on": "id", "right_on": "user_id"}}
- concat: 纵向合并 - config: {{"join": "outer", "ignore_index": true}}
- vlookup: VLOOKUP - config: {{"lookup_key": "id", "return_columns": ["name", "price"]}}

### AI/自动化
- ai_agent: AI处理 - config: {{"target_column": "情感", "prompt": "分析{{content}}的情感"}}
- code: Python脚本 - config: {{"python_code": "result = df"}}

### 输出
- output: 导出Excel - config: {{"filename": "result.xlsx"}}
- output_csv: 导出CSV - config: {{"filename": "result.csv", "encoding": "utf-8"}}

## 用户上传的文件
{files_info}

## 用户需求
{user_input}

## 输出要求
严格返回JSON格式，不要添加说明文字：

{{"nodes": [{{"id": "node1", "type": "source", "label": "读取数据", "config": {{...}}}}, ...], "edges": [{{"source": "node1", "target": "node2"}}, ...]}}
"""


class AIService:
    def __init__(self):
        self.api_key = ARK_API_KEY
        self.base_url = ARK_BASE_URL
        self.model = ARK_MODEL_NAME
    
    def _extract_json(self, content: str) -> Dict[str, Any]:
        try:
            return json.loads(content.strip())
        except json.JSONDecodeError:
            pass
        
        patterns = [r'```json\s*([\s\S]*?)\s*```', r'```\s*([\s\S]*?)\s*```', r'\{[\s\S]*\}']
        
        for pattern in patterns:
            match = re.search(pattern, content)
            if match:
                try:
                    json_str = match.group(1) if '```' in pattern else match.group(0)
                    return json.loads(json_str.strip())
                except:
                    continue
        
        raise ValueError("无法解析AI返回的JSON")
    
    async def generate_workflow(self, user_input: str, files_info: List[Dict]) -> Dict[str, Any]:
        files_info_str = json.dumps(files_info, ensure_ascii=False, indent=2)
        prompt = WORKFLOW_GENERATION_PROMPT.format(files_info=files_info_str, user_input=user_input)
        
        logger.info(f"调用AI生成工作流: {user_input[:100]}...")
        
        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers={"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"},
                    json={
                        "model": self.model,
                        "messages": [
                            {"role": "system", "content": "你是Excel处理专家，只返回JSON格式配置。"},
                            {"role": "user", "content": prompt}
                        ],
                        "max_tokens": 4096,
                        "temperature": 0.1
                    }
                )
                
                logger.info(f"AI API响应状态码: {response.status_code}")
                
                if response.status_code != 200:
                    raise Exception(f"AI API调用失败: {response.text[:200]}")
                
                result = response.json()
                content = result["choices"][0]["message"]["content"]
                logger.info(f"AI返回内容: {content[:300]}...")
                
                workflow_config = self._extract_json(content)
                
                if "nodes" not in workflow_config:
                    workflow_config["nodes"] = []
                if "edges" not in workflow_config:
                    workflow_config["edges"] = []
                
                return workflow_config
                
        except Exception as e:
            logger.error(f"生成工作流错误: {e}")
            raise
    
    async def explain_workflow(self, workflow_config: Dict) -> str:
        prompt = f"请用简洁中文解释这个工作流：\n\n{json.dumps(workflow_config, ensure_ascii=False, indent=2)}"
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers={"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"},
                    json={"model": self.model, "messages": [{"role": "user", "content": prompt}], "max_tokens": 500}
                )
                if response.status_code == 200:
                    return response.json()["choices"][0]["message"]["content"]
                return "无法生成解释"
        except:
            return "无法生成解释"

ai_service = AIService()
