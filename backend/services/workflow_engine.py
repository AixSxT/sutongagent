import pandas as pd
import json
import asyncio
import logging
import os
import re
from typing import Dict, List, Any, Optional
from uuid import uuid4
from datetime import datetime, timedelta
from config import UPLOAD_DIR
from services.ai_service import ai_service

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class WorkflowContext:
    """工作流执行上下文，存储节点结果"""
    def __init__(self):
        self._results: Dict[str, pd.DataFrame] = {}
        self._logs: List[str] = []
    
    def set_result(self, node_id: str, df: pd.DataFrame):
        self._results[node_id] = df
        
    def get_result(self, node_id: str) -> Optional[pd.DataFrame]:
        return self._results.get(node_id)
    
    def get_all_results(self) -> Dict[str, pd.DataFrame]:
        return self._results
        
    def log(self, message: str):
        timestamp = datetime.now().strftime("%H:%M:%S")
        self._logs.append(f"[{timestamp}] {message}")
        print(f"[{timestamp}] {message}")

class WorkflowEngine:
    async def execute_workflow(self, workflow_config: Dict, file_mapping: Dict[str, str]) -> Dict:
        """执行工作流"""
        context = WorkflowContext()
        nodes = workflow_config.get("nodes", [])
        edges = workflow_config.get("edges", [])
        
        # 构建图的邻接表
        adj = {node['id']: [] for node in nodes}
        in_degree = {node['id']: 0 for node in nodes}
        node_map = {node['id']: node for node in nodes}
        
        for edge in edges:
            source = edge['source']
            target = edge['target']
            if source in adj and target in in_degree:
                adj[source].append(target)
                in_degree[target] += 1
        
        # 拓扑排序
        queue = [node['id'] for node in nodes if in_degree[node['id']] == 0]
        execution_order = []
        
        while queue:
            node_id = queue.pop(0)
            execution_order.append(node_id)
            for neighbor in adj[node_id]:
                in_degree[neighbor] -= 1
                if in_degree[neighbor] == 0:
                    queue.append(neighbor)
        
        # 执行
        output_file = None
        final_preview = None
        node_results = {}  # 存储每个节点的执行结果
        node_status = {}   # 存储每个节点的状态: 'success', 'error', 'pending'
        
        # 初始化所有节点为pending状态
        for node in nodes:
            node_status[node['id']] = 'pending'
        
        try:
            for node_id in execution_order:
                if node_id not in node_map:
                    continue
                    
                node = node_map[node_id]
                
                # 兼容两种节点格式
                if 'data' in node:
                    node_data = node['data']
                else:
                    node_data = node
                
                node_type = node_data.get('type')
                node_label = node_data.get('label', node_type)
                node_config = node_data.get('config', {})
                
                context.log(f"开始执行节点: {node_label} ({node_id})")
                
                try:
                    # 获取输入数据
                    input_dfs = []
                    for edge in edges:
                        if edge['target'] == node_id:
                            source_id = edge['source']
                            df = context.get_result(source_id)
                            if df is not None:
                                input_dfs.append(df)
                    
                    # 执行节点
                    result_df = await self._execute_node_by_type(node_type, node_config, input_dfs, context, file_mapping)
                    
                    if result_df is not None:
                        context.set_result(node_id, result_df)
                        context.log(f"节点 {node_label} 执行成功，输出 {len(result_df)} 行数据")
                        
                        # 记录节点结果（用于前端预览）
                        node_status[node_id] = 'success'

                        def _safe_records(df: pd.DataFrame, limit: Optional[int] = None):
                            view = df.head(limit).copy() if limit else df.copy()
                            # Categorical 列不能直接 fillna("")（"" 不是其合法类别），需要先添加空类别
                            for col in view.columns:
                                try:
                                    if pd.api.types.is_categorical_dtype(view[col].dtype):
                                        if '' not in view[col].cat.categories:
                                            view[col] = view[col].cat.add_categories([''])
                                        view[col] = view[col].fillna('')
                                except Exception:
                                    # 如果某些扩展类型不支持上述处理，退化为后续统一 fillna
                                    pass
                            return view.fillna("").to_dict(orient="records")

                        node_results[node_id] = {
                            "columns": result_df.columns.tolist(),
                            "data": _safe_records(result_df),  # 返回全部数据
                            "total_rows": len(result_df)
                        }
                        
                        if node_type in ['output', 'output_csv']:
                            output_file = self._save_output(result_df, node_config, node_type)
                            final_preview = {
                                "columns": result_df.columns.tolist(),
                                "data": _safe_records(result_df, limit=100),
                                "total_rows": len(result_df)
                            }
                    else:
                        node_status[node_id] = 'success'  # 无输出但成功
                        
                except Exception as node_error:
                    node_status[node_id] = 'error'
                    import traceback
                    node_results[node_id] = {"error": str(node_error), "traceback": traceback.format_exc()}
                    context.log(f"节点 {node_label} 执行失败: {str(node_error)}")
                    raise node_error  # 继续抛出，中断工作流
            
            return {
                "success": True,
                "output_file": output_file,
                "preview": final_preview,
                "logs": context._logs,
                "node_status": node_status,
                "node_results": node_results
            }
            
        except Exception as e:
            logger.error(f"工作流执行失败: {str(e)}")
            import traceback
            traceback.print_exc()
            return {
                "success": False,
                "error": str(e),
                "logs": context._logs,
                "node_status": node_status,
                "node_results": node_results
            }

    async def preview_node(
        self,
        workflow_config: Dict,
        file_mapping: Dict[str, str],
        node_id: str,
        source_rows: int = 600,
        display_rows: int = 50
    ) -> Dict:
        """
        预览指定节点的输出（样本执行）：
        - 仅执行该节点的上游依赖
        - 数据源节点最多读取 source_rows 行
        - 返回该节点 display_rows 行抽样、以及简单统计
        """
        context = WorkflowContext()
        nodes = workflow_config.get("nodes", [])
        edges = workflow_config.get("edges", [])

        node_map = {node['id']: node for node in nodes if isinstance(node, dict) and 'id' in node}
        if node_id not in node_map:
            return {"success": False, "error": f"预览失败: 找不到节点 {node_id}"}

        # 1) 仅保留目标节点的上游依赖（包含自身）
        required = {node_id}
        changed = True
        while changed:
            changed = False
            for e in edges:
                src = e.get('source')
                tgt = e.get('target')
                if tgt in required and src and src not in required:
                    required.add(src)
                    changed = True

        # 2) 拓扑排序（限制在 required 子图）
        adj = {nid: [] for nid in required}
        in_degree = {nid: 0 for nid in required}
        for e in edges:
            src = e.get('source')
            tgt = e.get('target')
            if src in required and tgt in required:
                adj[src].append(tgt)
                in_degree[tgt] += 1

        queue = [nid for nid in required if in_degree.get(nid, 0) == 0]
        execution_order = []
        while queue:
            nid = queue.pop(0)
            execution_order.append(nid)
            for neighbor in adj.get(nid, []):
                in_degree[neighbor] -= 1
                if in_degree[neighbor] == 0:
                    queue.append(neighbor)

        if node_id not in execution_order:
            return {"success": False, "error": "预览失败: 工作流存在环或依赖不完整，无法得到执行顺序"}

        def _safe_records(df: pd.DataFrame, limit: int):
            view = df.head(limit).copy()
            for col in view.columns:
                try:
                    if pd.api.types.is_categorical_dtype(view[col].dtype):
                        if '' not in view[col].cat.categories:
                            view[col] = view[col].cat.add_categories([''])
                        view[col] = view[col].fillna('')
                except Exception:
                    pass
            return view.fillna("").to_dict(orient="records")

        # 3) 执行到目标节点（样本）
        node_status = {nid: 'pending' for nid in required}
        node_results = {}
        try:
            for nid in execution_order:
                node = node_map.get(nid)
                if not node:
                    continue

                node_data = node.get('data') if isinstance(node, dict) and 'data' in node else node
                node_type = (node_data or {}).get('type')
                node_label = (node_data or {}).get('label', node_type)
                node_config = (node_data or {}).get('config', {}) or {}

                context.log(f"[Preview] 开始执行节点: {node_label} ({nid})")

                input_dfs = []
                for e in edges:
                    if e.get('target') == nid:
                        src_id = e.get('source')
                        df = context.get_result(src_id)
                        if df is not None:
                            input_dfs.append(df)

                result_df = await self._execute_node_by_type_preview(
                    node_type=node_type,
                    config=node_config,
                    input_dfs=input_dfs,
                    context=context,
                    file_mapping=file_mapping,
                    source_rows=source_rows
                )

                if result_df is not None:
                    context.set_result(nid, result_df)
                    node_status[nid] = 'success'
                    node_results[nid] = {
                        "columns": result_df.columns.tolist(),
                        "total_rows": len(result_df)
                    }
                else:
                    node_status[nid] = 'success'

                if nid == node_id:
                    break

            df = context.get_result(node_id)
            if df is None:
                return {"success": False, "error": "预览失败: 该节点无输出或上游未提供数据", "logs": context._logs}

            # 4) 统计 + 抽样（对账优先看差异）
            node_data = node_map[node_id].get('data') if 'data' in node_map[node_id] else node_map[node_id]
            node_type = (node_data or {}).get('type')
            node_config = (node_data or {}).get('config', {}) or {}

            stats: Dict[str, Any] = {
                "rows_total": int(len(df)),
                "columns_total": int(len(df.columns)),
                "source_rows": int(source_rows),
                "display_rows": int(display_rows),
                "note": f"预览基于上游最多 {source_rows} 行样本执行"
            }

            sample_df = df
            if node_type == 'reconcile':
                tolerance = float(node_config.get('tolerance', 0) or 0)
                if '差额' in df.columns:
                    abs_diff = pd.to_numeric(df['差额'], errors='coerce').fillna(0).abs()
                    stats.update({
                        "tolerance": tolerance,
                        "diff_count": int((abs_diff > tolerance).sum()),
                        "match_count": int((abs_diff <= tolerance).sum()),
                        "sum_abs_diff": float(abs_diff.sum()),
                        "max_abs_diff": float(abs_diff.max() if len(abs_diff) else 0)
                    })
                    sample_df = df.assign(_abs_diff=abs_diff).sort_values('_abs_diff', ascending=False).drop(columns=['_abs_diff'])
                    diff_view = sample_df[abs_diff > tolerance]
                    if len(diff_view) > 0:
                        sample_df = diff_view
                elif '核算结果' in df.columns:
                    s = df['核算结果'].astype(str)
                    diff_mask = s.str.contains('不一致')
                    stats.update({
                        "diff_count": int(diff_mask.sum()),
                        "match_count": int((~diff_mask).sum())
                    })
                    if diff_mask.any():
                        sample_df = df[diff_mask]

            preview_payload = {
                "columns": df.columns.tolist(),
                "data": _safe_records(sample_df, display_rows),
                "total_rows": len(df)
            }

            return {
                "success": True,
                "node_id": node_id,
                "node_type": node_type,
                "stats": stats,
                "preview": preview_payload,
                "logs": context._logs,
                "node_status": node_status,
                "node_results": node_results
            }
        except Exception as e:
            logger.error(f"节点预览失败: {str(e)}")
            import traceback
            return {
                "success": False,
                "error": str(e),
                "traceback": traceback.format_exc(),
                "logs": context._logs,
                "node_status": node_status,
                "node_results": node_results
            }

    async def _execute_node_by_type(self, node_type: str, config: Dict, input_dfs: List[pd.DataFrame], context: WorkflowContext, file_mapping: Dict) -> Optional[pd.DataFrame]:
        """根据节点类型执行具体逻辑"""
        
        # ========== 数据源 ==========
        if node_type == 'source':
            return self._execute_source(config, file_mapping)
            
        elif node_type == 'source_csv':
            return self._execute_source_csv(config, file_mapping)

        elif node_type == 'source_optional':
            return self._execute_source_optional(config, file_mapping)
        
        # ========== 数据清洗 ==========
        elif node_type == 'transform':
            if not input_dfs: return None
            return self._execute_transform(input_dfs[0], config)
            
        elif node_type == 'type_convert':
            if not input_dfs: return None
            return self._execute_type_convert(input_dfs[0], config)
            
        elif node_type == 'fill_na':
            if not input_dfs: return None
            return self._execute_fill_na(input_dfs[0], config)
            
        elif node_type == 'deduplicate':
            if not input_dfs: return None
            return self._execute_deduplicate(input_dfs[0], config)
            
        elif node_type == 'text_process':
            if not input_dfs: return None
            return self._execute_text_process(input_dfs[0], config)
            
        elif node_type == 'date_process':
            if not input_dfs: return None
            return self._execute_date_process(input_dfs[0], config)
        
        # ========== 数据分析 ==========
        elif node_type == 'group_aggregate':
            if not input_dfs: return None
            return self._execute_group_aggregate(input_dfs[0], config)
            
        elif node_type == 'pivot':
            if not input_dfs: return None
            return self._execute_pivot(input_dfs[0], config)
            
        elif node_type == 'unpivot':
            if not input_dfs: return None
            return self._execute_unpivot(input_dfs[0], config)
        
        # ========== 多表操作 ==========
        elif node_type == 'join':
            if len(input_dfs) < 2: 
                raise ValueError("合并节点需要至少两个输入")
            return self._execute_join(input_dfs[0], input_dfs[1], config)
            
        elif node_type == 'concat':
            if not input_dfs: return None
            return self._execute_concat(input_dfs, config)
            
        elif node_type == 'vlookup':
            if len(input_dfs) < 2: 
                raise ValueError("VLOOKUP需要两个输入")
            return self._execute_vlookup(input_dfs[0], input_dfs[1], config)
            
        elif node_type == 'diff':
            if len(input_dfs) < 2: 
                raise ValueError("对比需要两个输入")
            return self._execute_diff(input_dfs[0], input_dfs[1], config)
        
        elif node_type == 'reconcile':
            if len(input_dfs) < 2:
                raise ValueError("对账核算需要两个输入：明细表和汇总表")
            return self._execute_reconcile(input_dfs[0], input_dfs[1], config)

        # ========== 利润表（业务模块） ==========
        elif node_type == 'profit_income':
            if not input_dfs: return None
            return self._execute_profit_income(input_dfs[0], config)

        elif node_type == 'profit_cost':
            if not input_dfs: return None
            return self._execute_profit_cost(input_dfs[0], config)

        elif node_type == 'profit_expense':
            if not input_dfs: return None
            return self._execute_profit_expense(input_dfs[0], config)

        elif node_type == 'profit_summary':
            # 汇总节点支持通过 config 指定上游节点ID；也支持仅按连线输入顺序（input_dfs）推断
            return self._execute_profit_summary(input_dfs, config, context)

        elif node_type == 'profit_table':
            # 利润表节点：从单个工作簿读取多Sheet并汇总输出（不依赖 input_dfs）
            return self._execute_profit_table(config, file_mapping)
        
        # ========== AI/自动化 ==========
        elif node_type == 'code':
            return self._execute_code(input_dfs, config, context)
            
        elif node_type == 'ai_agent':
            if not input_dfs: return None
            return await self._execute_ai_agent(input_dfs[0], config)
        
        # ========== 输出 ==========
        elif node_type in ['output', 'output_csv']:
            if not input_dfs: return None
            return input_dfs[0]
        
        return None

    async def _execute_node_by_type_preview(
        self,
        node_type: str,
        config: Dict,
        input_dfs: List[pd.DataFrame],
        context: WorkflowContext,
        file_mapping: Dict,
        source_rows: int
    ) -> Optional[pd.DataFrame]:
        """预览模式：数据源读取限制行数，避免全量读取。"""
        if node_type == 'source':
            return self._execute_source_limited(config, file_mapping, source_rows)
        if node_type == 'source_csv':
            return self._execute_source_csv_limited(config, file_mapping, source_rows)
        if node_type == 'source_optional':
            return self._execute_source_optional_limited(config, file_mapping, source_rows)
        if node_type == 'profit_table':
            return self._execute_profit_table(config, file_mapping, nrows=source_rows)

        # 预览不支持 AI 节点（可能很慢/有副作用）
        if node_type == 'ai_agent':
            raise ValueError("预览暂不支持 AI 节点")

        # 其余节点复用原执行逻辑
        return await self._execute_node_by_type(node_type, config, input_dfs, context, file_mapping)

    def _execute_source_limited(self, config: Dict, file_mapping: Dict, nrows: int) -> pd.DataFrame:
        file_id = config.get('file_id')
        mapped_id = file_mapping.get(file_id, file_id)

        for f in os.listdir(UPLOAD_DIR):
            if f.startswith(mapped_id):
                file_path = os.path.join(UPLOAD_DIR, f)
                sheet_name = config.get('sheet_name', 0)
                header_row = config.get('header_row', 1) - 1
                skip_rows = config.get('skip_rows', 0)

                try:
                    sheet_name = int(sheet_name)
                except Exception:
                    pass

                return pd.read_excel(
                    file_path,
                    sheet_name=sheet_name,
                    header=header_row,
                    skiprows=range(1, skip_rows + 1) if skip_rows else None,
                    nrows=int(nrows) if nrows else None
                )

        raise FileNotFoundError(f"找不到文件: {file_id}")

    def _execute_source_csv_limited(self, config: Dict, file_mapping: Dict, nrows: int) -> pd.DataFrame:
        file_id = config.get('file_id')
        mapped_id = file_mapping.get(file_id, file_id)

        for f in os.listdir(UPLOAD_DIR):
            if f.startswith(mapped_id):
                file_path = os.path.join(UPLOAD_DIR, f)
                delimiter = config.get('delimiter', ',')
                encoding = config.get('encoding', 'utf-8')
                return pd.read_csv(file_path, delimiter=delimiter, encoding=encoding, nrows=int(nrows) if nrows else None)

        raise FileNotFoundError(f"找不到文件: {file_id}")

    def _execute_source_optional_limited(self, config: Dict, file_mapping: Dict, nrows: int) -> pd.DataFrame:
        file_id = config.get('file_id')
        if not file_id:
            return pd.DataFrame()
        cfg = dict(config or {})
        if not cfg.get('sheet_name') and cfg.get('sheet_name') != 0:
            cfg['sheet_name'] = 0
        return self._execute_source_limited(cfg, file_mapping, nrows)

    # ========== 数据源实现 ==========
    def _execute_source(self, config: Dict, file_mapping: Dict) -> pd.DataFrame:
        file_id = config.get('file_id')
        mapped_id = file_mapping.get(file_id, file_id)
        
        for f in os.listdir(UPLOAD_DIR):
            if f.startswith(mapped_id):
                file_path = os.path.join(UPLOAD_DIR, f)
                sheet_name = config.get('sheet_name', 0)
                header_row = config.get('header_row', 1) - 1
                skip_rows = config.get('skip_rows', 0)
                
                try:
                    sheet_name = int(sheet_name)
                except:
                    pass
                
                df = pd.read_excel(file_path, sheet_name=sheet_name, header=header_row, skiprows=range(1, skip_rows + 1) if skip_rows else None)
                return df
                
        raise FileNotFoundError(f"找不到文件: {file_id}")

    def _execute_source_optional(self, config: Dict, file_mapping: Dict) -> pd.DataFrame:
        file_id = config.get('file_id')
        if not file_id:
            return pd.DataFrame()
        cfg = dict(config or {})
        if not cfg.get('sheet_name') and cfg.get('sheet_name') != 0:
            cfg['sheet_name'] = 0
        return self._execute_source(cfg, file_mapping)

    def _execute_source_csv(self, config: Dict, file_mapping: Dict) -> pd.DataFrame:
        file_id = config.get('file_id')
        mapped_id = file_mapping.get(file_id, file_id)
        
        for f in os.listdir(UPLOAD_DIR):
            if f.startswith(mapped_id):
                file_path = os.path.join(UPLOAD_DIR, f)
                delimiter = config.get('delimiter', ',')
                encoding = config.get('encoding', 'utf-8')
                
                df = pd.read_csv(file_path, delimiter=delimiter, encoding=encoding)
                return df
                
        raise FileNotFoundError(f"找不到文件: {file_id}")

    # ========== 数据清洗实现 ==========
    def _execute_transform(self, df: pd.DataFrame, config: Dict) -> pd.DataFrame:
        df = df.copy()
        
        # 筛选
        filter_expr = config.get('filter_code')
        if filter_expr:
            df = df.query(self._normalize_filter_expr(filter_expr, df))
        
        # 删除列
        drop_cols = config.get('drop_columns', [])
        if drop_cols:
            df = df.drop(columns=[c for c in drop_cols if c in df.columns], errors='ignore')
        
        # 计算列
        calculations = config.get('calculations', [])
        for calc in calculations:
            target = calc.get('target')
            formula = calc.get('formula')
            if target and formula:
                try:
                    df[target] = df.eval(formula)
                except:
                    pass
        
        # 列重命名
        rename_map = config.get('rename_map', {})
        if rename_map:
            df = df.rename(columns=rename_map)
        
        # 列选择
        selected_cols = config.get('selected_columns', [])
        if selected_cols:
            cols_to_keep = [c for c in selected_cols if c in df.columns]
            if cols_to_keep:
                df = df[cols_to_keep]
        
        # 排序
        sort_by = config.get('sort_by')
        sort_order = config.get('sort_order', 'asc')
        if sort_by and sort_by in df.columns:
            df = df.sort_values(by=sort_by, ascending=(sort_order == 'asc'))
            
        return df

    def _normalize_filter_expr(self, expr: Any, df: pd.DataFrame) -> str:
        """
        兼容用户更接近“Excel 直觉”的写法（不影响原有 pandas query 语法）：
        - 支持 `办公室团队=邯郸刘洋` → `办公室团队 == '邯郸刘洋'`
        - 支持 `col=123` → `col == 123`
        - 仅把“单个等号”替换为“==”（不影响 >=/<=/!=/==）
        - 对 `==/!=` 右侧的裸文本（非数字、非列名、非 True/False/None、非引号包裹）自动加引号
        """
        raw = '' if expr is None else str(expr)
        s = raw.strip()
        if not s:
            return s

        # 全角符号兼容
        s = s.replace('＝', '=')

        # 1) 把“单个等号”替换为“==”
        s = re.sub(r'(?<![<>!=])=(?![=])', '==', s)

        # 2) 对比较右侧的裸文本自动加引号（尽量不破坏原 query）
        cols = set(map(str, getattr(df, 'columns', [])))
        keywords = {'True', 'False', 'None'}

        def is_number_token(tok: str) -> bool:
            t = tok.strip()
            if not t:
                return False
            # 形如 00123 更可能是字符串
            if re.fullmatch(r'0\d+', t):
                return False
            try:
                float(t)
                return True
            except Exception:
                return False

        def repl(m: re.Match) -> str:
            op = m.group(1)
            val = m.group(2)
            if val is None:
                return m.group(0)
            v = val.strip()
            if not v:
                return m.group(0)
            if v[0] in ("'", '"') or v.startswith('@'):
                return f"{op} {val}"
            if v in keywords:
                return f"{op} {val}"
            if v in cols:
                return f"{op} {val}"
            if is_number_token(v):
                return f"{op} {val}"
            return f"{op} '{v}'"

        # 只处理 `== something` / `!= something` 这种简单右值
        s = re.sub(r'(==|!=)\s*([A-Za-z0-9_\u4e00-\u9fff\.\-]+)', repl, s)

        return s

    def _execute_type_convert(self, df: pd.DataFrame, config: Dict) -> pd.DataFrame:
        df = df.copy()
        conversions = config.get('conversions', [])
        
        for conv in conversions:
            col = conv.get('column')
            dtype = conv.get('dtype')
            if col and dtype and col in df.columns:
                try:
                    if dtype == 'int':
                        df[col] = pd.to_numeric(df[col], errors='coerce').astype('Int64')
                    elif dtype == 'float':
                        df[col] = pd.to_numeric(df[col], errors='coerce')
                    elif dtype == 'str':
                        df[col] = df[col].astype(str)
                    elif dtype == 'datetime':
                        df[col] = pd.to_datetime(df[col], errors='coerce')
                    elif dtype == 'bool':
                        df[col] = df[col].astype(bool)
                except:
                    pass
        return df

    def _execute_fill_na(self, df: pd.DataFrame, config: Dict) -> pd.DataFrame:
        df = df.copy()
        strategy = config.get('strategy', 'drop')
        columns = config.get('columns', [])
        fill_value = config.get('fill_value')
        
        target_cols = columns if columns else df.columns.tolist()
        
        if strategy == 'drop':
            df = df.dropna(subset=target_cols)
        elif strategy == 'fill_value':
            df[target_cols] = df[target_cols].fillna(fill_value)
        elif strategy == 'ffill':
            df[target_cols] = df[target_cols].ffill()
        elif strategy == 'bfill':
            df[target_cols] = df[target_cols].bfill()
        elif strategy == 'mean':
            for col in target_cols:
                if df[col].dtype in ['int64', 'float64']:
                    df[col] = df[col].fillna(df[col].mean())
        elif strategy == 'median':
            for col in target_cols:
                if df[col].dtype in ['int64', 'float64']:
                    df[col] = df[col].fillna(df[col].median())
        
        return df

    def _execute_deduplicate(self, df: pd.DataFrame, config: Dict) -> pd.DataFrame:
        subset = config.get('subset', [])
        keep = config.get('keep', 'first')
        
        if keep == 'false':
            keep = False
        
        return df.drop_duplicates(subset=subset if subset else None, keep=keep)

    def _execute_text_process(self, df: pd.DataFrame, config: Dict) -> pd.DataFrame:
        df = df.copy()
        col = config.get('column')
        operation = config.get('operation')
        pattern = config.get('pattern', '')
        replacement = config.get('replacement', '')
        
        if not col or col not in df.columns:
            return df
        
        if operation == 'trim':
            df[col] = df[col].astype(str).str.strip()
        elif operation == 'lower':
            df[col] = df[col].astype(str).str.lower()
        elif operation == 'upper':
            df[col] = df[col].astype(str).str.upper()
        elif operation == 'replace':
            df[col] = df[col].astype(str).str.replace(pattern, replacement, regex=True)
        elif operation == 'extract':
            df[col + '_extracted'] = df[col].astype(str).str.extract(f'({pattern})', expand=False)
        
        return df

    def _execute_date_process(self, df: pd.DataFrame, config: Dict) -> pd.DataFrame:
        df = df.copy()
        col = config.get('column')
        extracts = config.get('extract', [])
        offset = config.get('offset', '')
        
        if not col or col not in df.columns:
            return df
        
        df[col] = pd.to_datetime(df[col], errors='coerce')
        
        for ext in extracts:
            if ext == 'year':
                df[f'{col}_年'] = df[col].dt.year
            elif ext == 'month':
                df[f'{col}_月'] = df[col].dt.month
            elif ext == 'day':
                df[f'{col}_日'] = df[col].dt.day
            elif ext == 'weekday':
                df[f'{col}_周几'] = df[col].dt.dayofweek + 1
            elif ext == 'quarter':
                df[f'{col}_季度'] = df[col].dt.quarter
        
        # 日期偏移
        if offset:
            match = re.match(r'([+-]?\d+)([dMy])', offset)
            if match:
                num, unit = int(match.group(1)), match.group(2)
                if unit == 'd':
                    df[col] = df[col] + timedelta(days=num)
                elif unit == 'M':
                    df[col] = df[col] + pd.DateOffset(months=num)
                elif unit == 'y':
                    df[col] = df[col] + pd.DateOffset(years=num)
        
        return df

    # ========== 数据分析实现 ==========
    def _execute_group_aggregate(self, df: pd.DataFrame, config: Dict) -> pd.DataFrame:
        group_by = config.get('group_by', [])
        aggregations = config.get('aggregations', [])
        
        if not group_by:
            return df
        
        agg_dict = {}
        rename_dict = {}
        
        for agg in aggregations:
            col = agg.get('column')
            func = agg.get('func', 'sum')
            alias = agg.get('alias', f'{col}_{func}')
            
            if col and col in df.columns:
                agg_dict[col] = func
                rename_dict[col] = alias
        
        if agg_dict:
            result = df.groupby(group_by).agg(agg_dict).reset_index()
            result = result.rename(columns=rename_dict)
            return result
        else:
            return df.groupby(group_by).sum().reset_index()

    def _execute_pivot(self, df: pd.DataFrame, config: Dict) -> pd.DataFrame:
        index = config.get('index', [])
        columns = config.get('columns')
        values = config.get('values')
        aggfunc = config.get('aggfunc', 'sum')
        
        if not index or not columns or not values:
            return df
        
        return pd.pivot_table(df, index=index, columns=columns, values=values, aggfunc=aggfunc, fill_value=0).reset_index()

    def _execute_unpivot(self, df: pd.DataFrame, config: Dict) -> pd.DataFrame:
        id_vars = config.get('id_vars', [])
        value_vars = config.get('value_vars', [])
        var_name = config.get('var_name', 'variable')
        value_name = config.get('value_name', 'value')
        
        return pd.melt(df, id_vars=id_vars if id_vars else None, value_vars=value_vars if value_vars else None, var_name=var_name, value_name=value_name)

    # ========== 多表操作实现 ==========
    def _execute_join(self, df1: pd.DataFrame, df2: pd.DataFrame, config: Dict) -> pd.DataFrame:
        """
        Join节点：合并两张表
        
        支持的配置格式：
        - how: 'inner', 'left', 'right', 'outer'
        - left_on: 左表关联列（支持字符串或列表）
        - right_on: 右表关联列（支持字符串或列表）
        - 兼容: on（当左右表列名相同时）
        """
        how = config.get('how', 'inner')
        # 兼容性处理：防止AI生成 full_outer 导致pandas报错
        if how == 'full_outer':
            how = 'outer'
            
        left_on = config.get('left_on') or config.get('on')
        right_on = config.get('right_on') or config.get('on')
        
        if not left_on or not right_on:
            raise ValueError("Join节点必须指定关联键 (left_on/right_on 或 on)")
        
        # 确保是列表格式
        if isinstance(left_on, str):
            left_on = [left_on]
        if isinstance(right_on, str):
            right_on = [right_on]
            
        # 复制数据并转换类型，避免int vs string匹配失败
        df1 = df1.copy()
        df2 = df2.copy()
        
        # 验证列存在并转换类型
        for col in left_on:
            if col not in df1.columns:
                raise ValueError(f"Join失败: 左表中找不到关联列 '{col}'。现有列: {list(df1.columns)}")
            df1[col] = df1[col].astype(str)
        
        for col in right_on:
            if col not in df2.columns:
                raise ValueError(f"Join失败: 右表中找不到关联列 '{col}'。现有列: {list(df2.columns)}")
            df2[col] = df2[col].astype(str)
        
        logger.info(f"[Join] 模式: {how}, 左表[{left_on}] <-> 右表[{right_on}]")
        
        result = pd.merge(df1, df2, left_on=left_on, right_on=right_on, how=how)
        
        # 如果左右键名不同，删除右表的冗余键列
        for l, r in zip(left_on, right_on):
            if l != r and r in result.columns:
                result = result.drop(columns=[r])
        
        logger.info(f"[Join] 完成: 左表{len(df1)}行 + 右表{len(df2)}行 -> 结果{len(result)}行")
        return result

    def _execute_concat(self, dfs: List[pd.DataFrame], config: Dict) -> pd.DataFrame:
        join = config.get('join', 'outer')
        ignore_index = config.get('ignore_index', True)
        
        return pd.concat(dfs, join=join, ignore_index=ignore_index)

    def _execute_vlookup(self, main_df: pd.DataFrame, lookup_df: pd.DataFrame, config: Dict) -> pd.DataFrame:
        """
        VLOOKUP节点：从查找表获取列并添加到主表
        
        支持的配置格式：
        - left_key: 主表关联列名
        - right_key: 查找表关联列名（可与left_key不同）
        - columns_to_get: 从查找表返回的列列表
        - 兼容旧版: lookup_key, return_columns
        """
        # 兼容多种配置格式
        left_key = config.get('left_key') or config.get('lookup_key')
        right_key = config.get('right_key') or config.get('lookup_key') or left_key
        return_columns = config.get('columns_to_get') or config.get('return_columns', [])
        
        if not left_key:
            raise ValueError("VLOOKUP必须指定主表关联列 (left_key 或 lookup_key)")
        if not right_key:
            raise ValueError("VLOOKUP必须指定查找表关联列 (right_key 或 lookup_key)")
        
        # 复制数据避免修改原始数据
        main_df = main_df.copy()
        lookup_df = lookup_df.copy()
        
        # 验证列存在
        if left_key not in main_df.columns:
            raise ValueError(f"VLOOKUP失败: 主表中找不到关联列 '{left_key}'。现有列: {list(main_df.columns)}")
        if right_key not in lookup_df.columns:
            raise ValueError(f"VLOOKUP失败: 查找表中找不到关联列 '{right_key}'。现有列: {list(lookup_df.columns)}")

        # 统一关联键的类型为字符串，避免int64和object类型不匹配
        main_df[left_key] = main_df[left_key].astype(str)
        lookup_df[right_key] = lookup_df[right_key].astype(str)
        logger.debug(f"[VLOOKUP] 关联: 主表[{left_key}] <- 查找表[{right_key}]")
        
        # 过滤掉查找表中不存在的返回列
        valid_return_columns = [c for c in return_columns if c in lookup_df.columns and c != right_key]
        missing_columns = [c for c in return_columns if c not in lookup_df.columns]
        if missing_columns:
            logger.warning(f"[VLOOKUP] 忽略查找表中不存在的列: {missing_columns}")
        
        # 如果没有指定返回列，返回查找表所有非关联列
        if not valid_return_columns:
            # 修改：自动排除掉已经在主表中存在的列，避免产生 _x, _y 后缀导致下游节点KeyError
            valid_return_columns = [c for c in lookup_df.columns if c != right_key and c not in main_df.columns]
            logger.info(f"[VLOOKUP] 未指定返回列，默认返回全部(已去重): {valid_return_columns}")
            
        cols_to_merge = [right_key] + valid_return_columns
        
        # 执行左连接
        result = pd.merge(
            main_df, 
            lookup_df[cols_to_merge], 
            left_on=left_key, 
            right_on=right_key, 
            how='left'
        )
        
        # 如果左右键名不同，删除右表的冗余键列
        if left_key != right_key and right_key in result.columns:
            result = result.drop(columns=[right_key])
        
        logger.info(f"[VLOOKUP] 完成: 主表{len(main_df)}行 + 查找表{len(lookup_df)}行 -> 结果{len(result)}行, 新增列: {valid_return_columns}")
        return result

    def _execute_diff(self, df1: pd.DataFrame, df2: pd.DataFrame, config: Dict) -> pd.DataFrame:
        compare_columns = config.get('compare_columns', [])
        
        if not compare_columns:
            compare_columns = list(set(df1.columns) & set(df2.columns))
        
        df1_keys = df1[compare_columns].apply(lambda x: tuple(x), axis=1)
        df2_keys = df2[compare_columns].apply(lambda x: tuple(x), axis=1)
        
        only_in_df1 = df1[~df1_keys.isin(df2_keys)].copy()
        only_in_df1['_diff_status'] = '仅在表1'
        
        only_in_df2 = df2[~df2_keys.isin(df1_keys)].copy()
        only_in_df2['_diff_status'] = '仅在表2'
        
        return pd.concat([only_in_df1, only_in_df2], ignore_index=True)

    def _execute_reconcile(self, detail_df: pd.DataFrame, summary_df: pd.DataFrame, config: Dict) -> pd.DataFrame:
        """
        对账核算节点：
        1. 对明细表按关联键分组汇总
        2. 与汇总表进行关联对比
        3. 输出差异记录
        
        支持的配置格式：
        - join_keys: 关联键列表（多列支持），如 ["市场id", "门店id"]
        - left_column: 明细表金额列（汇总计算）
        - right_column: 汇总表金额列（直接对比）
        - output_mode: "diff_only"（仅差异）或 "all"（全部）
        - tolerance: 容差值（默认0）
        - 兼容旧版: detail_key/summary_key/detail_amount/summary_amount
        """
        # 兼容多种配置格式
        join_keys = config.get('join_keys')
        detail_keys = config.get('detail_keys') or config.get('detail_key')
        summary_keys = config.get('summary_keys') or config.get('summary_key')
        if (detail_keys and summary_keys) and not join_keys:
            # 支持左右键不同名：detail_keys/summary_keys
            join_keys = None
        elif not join_keys:
            # 旧版格式兼容（同名键）
            if detail_keys:
                join_keys = [detail_keys] if isinstance(detail_keys, str) else detail_keys
        
        left_column = config.get('left_column') or config.get('detail_amount')
        right_column = config.get('right_column') or config.get('summary_amount')
        output_mode = config.get('output_mode', 'diff_only')
        tolerance = float(config.get('tolerance', 0))
        
        if not join_keys and not (detail_keys and summary_keys):
            raise ValueError("对账核算必须指定关联键 (join_keys) 或左右键映射 (detail_keys + summary_keys)")
        if not left_column:
            raise ValueError("对账核算必须指定明细表金额列 (left_column 或 detail_amount)")
        if not right_column:
            raise ValueError("对账核算必须指定汇总表金额列 (right_column 或 summary_amount)")
        
        use_key_mapping = bool(detail_keys and summary_keys and not join_keys)
        if use_key_mapping:
            if isinstance(detail_keys, str):
                detail_keys = [detail_keys]
            if isinstance(summary_keys, str):
                summary_keys = [summary_keys]
            if not isinstance(detail_keys, list) or not isinstance(summary_keys, list):
                raise ValueError("对账核算左右键映射必须为列表/字符串 (detail_keys/summary_keys)")
            if len(detail_keys) != len(summary_keys):
                raise ValueError(f"对账核算左右键映射列数必须一致: detail_keys={detail_keys}, summary_keys={summary_keys}")
            # 验证列存在
            for key in detail_keys:
                if key not in detail_df.columns:
                    raise ValueError(f"对账失败: 明细表中找不到关联列 '{key}'。现有列: {list(detail_df.columns)}")
            for key in summary_keys:
                if key not in summary_df.columns:
                    raise ValueError(f"对账失败: 汇总表中找不到关联列 '{key}'。现有列: {list(summary_df.columns)}")
            logger.info(f"[Reconcile] 左右键映射: 明细{detail_keys} -> 汇总{summary_keys}, 明细列: {left_column}, 汇总列: {right_column}")
        else:
            # 确保join_keys是列表
            if isinstance(join_keys, str):
                join_keys = [join_keys]
            if not isinstance(join_keys, list) or not join_keys:
                raise ValueError("对账核算必须指定关联键 (join_keys 或 detail_key)")
            logger.info(f"[Reconcile] 关联键: {join_keys}, 明细列: {left_column}, 汇总列: {right_column}")
            # 验证列存在
            for key in join_keys:
                if key not in detail_df.columns:
                    raise ValueError(f"对账失败: 明细表中找不到关联列 '{key}'。现有列: {list(detail_df.columns)}")
                if key not in summary_df.columns:
                    raise ValueError(f"对账失败: 汇总表中找不到关联列 '{key}'。现有列: {list(summary_df.columns)}")
        
        if left_column not in detail_df.columns:
            raise ValueError(f"对账失败: 明细表中找不到金额列 '{left_column}'。现有列: {list(detail_df.columns)}")
        if right_column not in summary_df.columns:
            raise ValueError(f"对账失败: 汇总表中找不到金额列 '{right_column}'。现有列: {list(summary_df.columns)}")
        
        # 1. 对明细表分组汇总
        detail_group_keys = detail_keys if use_key_mapping else join_keys
        summary_group_keys = summary_keys if use_key_mapping else join_keys

        detail_grouped = detail_df.groupby(detail_group_keys)[left_column].sum().reset_index()
        detail_grouped = detail_grouped.rename(columns={left_column: '明细汇总金额'})
        logger.debug(f"[Reconcile] 明细汇总后: {len(detail_grouped)} 行")
        
        # 2. 准备汇总表（按关联键汇总，避免一对多 merge 导致重复行）
        summary_cols = summary_group_keys + [right_column]
        summary_view = summary_df[summary_cols].copy()
        summary_view[right_column] = pd.to_numeric(summary_view[right_column], errors='coerce')
        summary_grouped = summary_view.groupby(summary_group_keys)[right_column].sum().reset_index()
        summary_renamed = summary_grouped.rename(columns={right_column: '汇总表金额'})

        # 2.1 若左右键不同名：将汇总表的键列重命名为明细键列名，以便 merge
        if use_key_mapping:
            rename_key_map = {sk: dk for dk, sk in zip(detail_group_keys, summary_group_keys)}
            summary_renamed = summary_renamed.rename(columns=rename_key_map)
        
        # 3. 统一关联键类型为字符串
        for key in (detail_group_keys or []):
            detail_grouped[key] = detail_grouped[key].astype(str)
            if key in summary_renamed.columns:
                summary_renamed[key] = summary_renamed[key].astype(str)
        
        # 4. 合并对比
        merged = pd.merge(
            detail_grouped, 
            summary_renamed, 
            on=detail_group_keys, 
            how='outer'
        )
        
        # 5. 计算差异
        merged['明细汇总金额'] = merged['明细汇总金额'].fillna(0)
        merged['汇总表金额'] = merged['汇总表金额'].fillna(0)
        merged['差额'] = merged['明细汇总金额'] - merged['汇总表金额']
        merged['差额绝对值'] = merged['差额'].abs()
        
        # 6. 根据容差判断是否一致
        merged['核算结果'] = merged['差额绝对值'].apply(
            lambda x: '✅ 一致' if x <= tolerance else '❌ 不一致'
        )
        
        # 7. 根据输出模式过滤
        if output_mode == 'diff_only':
            result = merged[merged['差额绝对值'] > tolerance].copy()
        else:
            result = merged.copy()
        
        # 清理临时列
        result = result.drop(columns=['差额绝对值'])
        
        diff_count = len(result[result['核算结果'] == '❌ 不一致']) if '核算结果' in result.columns else 0
        logger.info(f"[Reconcile] 完成: 明细{len(detail_df)}行 vs 汇总{len(summary_df)}行, 发现差异{diff_count}条")
        
        return result

    # ========== 利润表（业务模块）实现 ==========
    def _execute_profit_table(self, config: Dict, file_mapping: Dict, nrows: Optional[int] = None) -> pd.DataFrame:
        """
        利润表（模板列）汇总：从单个工作簿读取多张来源Sheet，能计算的列尽量填充，其它列留空。

        设计目标：用户只需要选择一个 Excel 文件（如“邯郸市场-2025年10月利润表 - 刘洋.xlsx”），
        系统从其中的来源Sheet（订单明细/直播间/退货/资金日报/分摊费用/工资表/财务系统/富友流水/房租/市场定额…）
        汇总得到一张“部分利润表”。

        nrows 仅用于预览模式：限制读取行数，避免全量读取导致卡顿。
        """
        cfg = config or {}
        file_id = cfg.get('file_id')
        if not file_id:
            raise ValueError("利润表节点缺少配置：file_id（请选择Excel文件）")

        mapped_id = file_mapping.get(file_id, file_id)
        file_path = None
        for f in os.listdir(UPLOAD_DIR):
            if f.startswith(mapped_id):
                file_path = os.path.join(UPLOAD_DIR, f)
                break
        if not file_path:
            raise FileNotFoundError(f"找不到文件: {file_id}")

        def _read_sheet(sheet_name: str, limit: Optional[int] = None) -> pd.DataFrame:
            try:
                return pd.read_excel(file_path, sheet_name=sheet_name, nrows=int(limit) if limit else None)
            except Exception:
                return pd.DataFrame()

        # 来源Sheet（缺失则为空表）
        orders = _read_sheet('订单明细', nrows)
        live = _read_sheet('直播间', nrows)
        returns = _read_sheet('退货', nrows)
        funds = _read_sheet('资金日报', nrows)
        alloc = _read_sheet('分摊费用', nrows)
        payroll = _read_sheet('工资表', nrows)
        finance = _read_sheet('财务系统', nrows)
        fuiou = _read_sheet('富友流水', nrows)
        rent_liu = _read_sheet('刘洋房租', nrows)
        rent_hu = _read_sheet('胡兴旺房租', nrows)
        quota = _read_sheet('市场定额', nrows)

        # 输出列（对齐模板：docx/2025年转加盟利润表模板.xlsx → “利润表表头统一格式（2025.8启用）” 第4行）
        columns = [
            '年份', '月份', '市场', '办公室', '店长姓名', 'erp门店编号', '门店名称（自定义）', '开店时间', '关店时间', 'erp门店名称', '是否店中店',
            '所属实体店门店名称', '人数',
            '一、收入', '计业绩产品收入', '不计业绩产品收入', '产品退货', '计业绩团品收入', '不计业绩团品收入', '旅游收入（非赠）', '其他收入',
            '二、成本', '计业绩产品成本', '计业绩产品赠品（主品）', '不计业绩产品成本', '成本优惠', '退货成本', '计业绩团品成本', '不计业绩团品成本',
            '旅游成本（非赠）', '其他成本',
            '三、费用', '一线工资', '高管工资', '二线工资（人事司机）', '一线社保', '高管社保', '二线社保（人事司机）',
            '主品赠送（非主品）', '小单礼品', '绑定上人礼品', '分享会礼品', '维护客户礼品',
            '业务办公费', '旅游', '任务款', '红包', '门店押金', '门店转让费、中介费', '门店房租', '门店装修', '门店资产', '门店暖气费',
            '门店物业费', '门店水、电、液化气', '公司服务费', '代账费', '运费',
            '利息收支、手续费（转账）', '直播间APP手续费（0.6%）', '辅酶手续费（千分之6）', '富友手续费（千分之2.2）',
            '门店税费', '企微年费分摊', '直播流量费分摊', '仓储运费分摊', '其他分摊', '其他费用',
            '四、利润',
            '一代管道', '二代管道', '三代管道', '四代管道', '五代管道', '六代管道', '股东1', '股东2',
            '一代经理级别', '一代提成比例', '一代提成金额',
            '二代经理级别', '二代提成比例', '二代提成金额',
            '三代经理级别', '三代提成比例', '三代提成金额',
            '一级经理姓名', '一级经理提成比例', '一级经理提成金额',
            '特殊一级经理姓名', '特殊一级经理提成比例', '特殊一级经理提成金额',
            '特特殊一级经理姓名', '特特殊一级经理提成比例', '特特殊一级经理提成金额',
            '股东1姓名', '股东1提成比例', '股东1提成金额', '股东2姓名', '股东2提成比例', '股东2提成金额', '品牌、软件公司'
        ]

        def _normalize_store_name(val: Any) -> str:
            s = '' if val is None else str(val)
            s = s.strip()
            if not s or s.lower() in {'nan', 'none'}:
                return ''
            s = re.sub(r'^（[^）]+）', '', s)  # 去掉前缀（市场）
            s = re.sub(r'^\\([^)]*\\)', '', s)
            return s.strip()

        def _to_num(series: pd.Series) -> pd.Series:
            return pd.to_numeric(series, errors='coerce').fillna(0)

        def _infer_team_name() -> str:
            for df, col in [(orders, '所属团队'), (live, '所属团队'), (returns, '团队'), (funds, '团队'), (finance, '市场团队')]:
                if isinstance(df, pd.DataFrame) and (not df.empty) and col in df.columns:
                    s = df[col].dropna().astype(str).str.strip()
                    s = s[s.astype(bool)]
                    if not s.empty:
                        return s.value_counts().index[0]
            return ''

        def _infer_year_month() -> (Optional[int], Optional[int]):
            for df, col in [(orders, '订单提交时间'), (live, '订单提交时间'), (funds, '日期'), (returns, '订单时间'), (returns, '申请时间')]:
                if not isinstance(df, pd.DataFrame) or df.empty or col not in df.columns:
                    continue
                dt = pd.to_datetime(df[col], errors='coerce').dropna()
                if dt.empty:
                    continue
                ym = dt.dt.to_period('M').astype(str).value_counts().index[0]  # e.g. '2025-10'
                try:
                    y, m = ym.split('-')
                    return int(y), int(m)
                except Exception:
                    continue
            return None, None

        team_name = str(cfg.get('team_name') or '').strip() or _infer_team_name()
        market_name = str(cfg.get('market_name') or '').strip()
        office_name = str(cfg.get('office_name') or '').strip()
        if not market_name and team_name:
            market_name = team_name[:2]
        if not office_name and team_name:
            office_name = team_name[len(market_name):] if market_name and team_name.startswith(market_name) else team_name

        year = cfg.get('year')
        month = cfg.get('month')
        try:
            year = int(year) if year not in (None, '') else None
        except Exception:
            year = None
        try:
            month = int(month) if month not in (None, '') else None
        except Exception:
            month = None
        if not year or not month:
            y2, m2 = _infer_year_month()
            year = year or y2
            month = month or m2
        if not year or not month:
            raise ValueError("利润表节点无法推断年份/月份：请在配置中填写 year/month 或确保来源表含日期列")

        ym_int = int(f"{year:04d}{month:02d}")

        def _filter_ym(df: pd.DataFrame, date_col: str) -> pd.DataFrame:
            if df is None or not isinstance(df, pd.DataFrame) or df.empty or date_col not in df.columns:
                return pd.DataFrame()
            dt = pd.to_datetime(df[date_col], errors='coerce')
            out = df.copy()
            out['_dt'] = dt
            out = out.dropna(subset=['_dt'])
            out = out[(out['_dt'].dt.year == year) & (out['_dt'].dt.month == month)].copy()
            return out

        # ========== 订单明细：收入/成本核心 ==========
        orders_f = orders.copy() if isinstance(orders, pd.DataFrame) else pd.DataFrame()
        if not orders_f.empty:
            if team_name and '所属团队' in orders_f.columns:
                orders_f = orders_f[orders_f['所属团队'].astype(str) == team_name].copy()
            orders_f = _filter_ym(orders_f, '订单提交时间')
            orders_f['_store'] = orders_f['所属门店'].map(_normalize_store_name) if '所属门店' in orders_f.columns else ''

        # 门店编号映射（市场定额：店面 → 店面编号）
        store_id_map: Dict[str, int] = {}
        if isinstance(quota, pd.DataFrame) and (not quota.empty) and '店面' in quota.columns and '店面编号' in quota.columns:
            q = quota.copy()
            q['_store'] = q['店面'].map(_normalize_store_name)
            q['_id'] = _to_num(q['店面编号'])
            for _, r in q.dropna(subset=['_store']).iterrows():
                st = str(r['_store'])
                if st and st.lower() not in {'nan', 'none'} and r['_id']:
                    store_id_map[st] = int(r['_id'])

        # 门店列表（以订单为主）
        stores: List[str] = []
        if not orders_f.empty and '_store' in orders_f.columns:
            stores = sorted([s for s in orders_f['_store'].astype(str).unique().tolist() if s and s.lower() not in {'nan', 'none'}])

        # fallback：订单为空时从工资表推门店
        if not stores and isinstance(payroll, pd.DataFrame) and (not payroll.empty) and '门店名称' in payroll.columns:
            stores = sorted([_normalize_store_name(s) for s in payroll['门店名称'].dropna().astype(str).unique().tolist() if _normalize_store_name(s)])

        if not stores:
            return pd.DataFrame(columns=columns)

        # 订单收入口径：按“订单实际支付”
        def _sum_orders(mask: pd.Series, amount_col: str) -> pd.Series:
            if orders_f.empty or amount_col not in orders_f.columns:
                return pd.Series(dtype=float)
            m = mask.fillna(False)
            if int(m.sum()) == 0:
                return pd.Series(dtype=float)
            s = _to_num(orders_f.loc[m, amount_col])
            return s.groupby(orders_f.loc[m, '_store']).sum()

        def _sum_orders_cost(mask: pd.Series) -> pd.Series:
            if orders_f.empty or '成本合计' not in orders_f.columns:
                return pd.Series(dtype=float)
            m = mask.fillna(False)
            if int(m.sum()) == 0:
                return pd.Series(dtype=float)
            s = _to_num(orders_f.loc[m, '成本合计'])
            return s.groupby(orders_f.loc[m, '_store']).sum()

        prod = orders_f['商品类型'].astype(str) if (not orders_f.empty and '商品类型' in orders_f.columns) else pd.Series([], dtype=str)
        perf = orders_f['是否计入业绩'].astype(str) if (not orders_f.empty and '是否计入业绩' in orders_f.columns) else pd.Series([], dtype=str)
        gift = orders_f['是否赠品'].astype(str) if (not orders_f.empty and '是否赠品' in orders_f.columns) else pd.Series([], dtype=str)

        is_main = prod == '主品'
        is_group = prod == '团品'
        is_perf = perf == '计入业绩'
        is_nonperf = perf == '不计入业绩'
        is_nongift = gift == '非赠品'
        is_gift = gift != '非赠品'

        s_rev_main_perf = _sum_orders(is_main & is_perf, '订单实际支付')
        s_rev_main_nonperf = _sum_orders(is_main & is_nonperf, '订单实际支付')
        s_rev_group_perf = _sum_orders(is_group & is_perf, '订单实际支付')
        s_rev_group_nonperf = _sum_orders(is_group & is_nonperf, '订单实际支付')

        s_cost_main_perf = _sum_orders_cost(is_main & is_perf & is_nongift)
        s_cost_main_gift = _sum_orders_cost(is_main & is_perf & is_gift)
        s_cost_main_nonperf = _sum_orders_cost(is_main & is_nonperf & is_nongift)
        s_cost_group_perf = _sum_orders_cost(is_group & is_perf)
        s_cost_group_nonperf = _sum_orders_cost(is_group & is_nonperf)

        # ========== 直播间：补充团品收入/成本 ==========
        live_f = live.copy() if isinstance(live, pd.DataFrame) else pd.DataFrame()
        if not live_f.empty:
            if team_name and '所属团队' in live_f.columns:
                live_f = live_f[live_f['所属团队'].astype(str) == team_name].copy()
            live_f = _filter_ym(live_f, '订单提交时间')
            live_f['_store'] = live_f['所属门店'].map(_normalize_store_name) if '所属门店' in live_f.columns else ''

        def _sum_live(mask: pd.Series, amount_col: str) -> pd.Series:
            if live_f.empty or amount_col not in live_f.columns:
                return pd.Series(dtype=float)
            m = mask.fillna(False)
            if int(m.sum()) == 0:
                return pd.Series(dtype=float)
            s = _to_num(live_f.loc[m, amount_col])
            return s.groupby(live_f.loc[m, '_store']).sum()

        live_perf = live_f['是否计入业绩'].astype(str) if (not live_f.empty and '是否计入业绩' in live_f.columns) else pd.Series([], dtype=str)
        s_live_rev_perf = _sum_live(live_perf == '计入业绩', '实际支付金额')
        s_live_rev_nonperf = _sum_live(live_perf == '不计入业绩', '实际支付金额')
        s_live_cost_perf = _sum_live(live_perf == '计入业绩', '成本合计')
        s_live_cost_nonperf = _sum_live(live_perf == '不计入业绩', '成本合计')

        s_rev_group_perf = s_rev_group_perf.add(s_live_rev_perf, fill_value=0)
        s_rev_group_nonperf = s_rev_group_nonperf.add(s_live_rev_nonperf, fill_value=0)
        s_cost_group_perf = s_cost_group_perf.add(s_live_cost_perf, fill_value=0)
        s_cost_group_nonperf = s_cost_group_nonperf.add(s_live_cost_nonperf, fill_value=0)

        # ========== 退货：退款金额/退货成本（负数） ==========
        returns_f = returns.copy() if isinstance(returns, pd.DataFrame) else pd.DataFrame()
        if not returns_f.empty:
            if team_name and '团队' in returns_f.columns:
                returns_f = returns_f[returns_f['团队'].astype(str) == team_name].copy()
            date_col = '订单时间' if '订单时间' in returns_f.columns else ('申请时间' if '申请时间' in returns_f.columns else None)
            if date_col:
                returns_f = _filter_ym(returns_f, date_col)
            returns_f['_store'] = returns_f['门店'].map(_normalize_store_name) if '门店' in returns_f.columns else ''

        def _sum_returns(mask: pd.Series, amount_col: str) -> pd.Series:
            if returns_f.empty or amount_col not in returns_f.columns:
                return pd.Series(dtype=float)
            m = mask.fillna(False)
            if int(m.sum()) == 0:
                return pd.Series(dtype=float)
            s = _to_num(returns_f.loc[m, amount_col])
            return s.groupby(returns_f.loc[m, '_store']).sum()

        ret_kind = returns_f['是否团品'].astype(str) if (not returns_f.empty and '是否团品' in returns_f.columns) else pd.Series([], dtype=str)
        s_ret_amt_main = _sum_returns(ret_kind == '主品', '总退货金额')
        s_ret_cost_all = _sum_returns(pd.Series([True] * len(returns_f)), '成本合计') if (not returns_f.empty) else pd.Series(dtype=float)

        # ========== 工资表：一线工资（税前工资） ==========
        payroll_f = payroll.copy() if isinstance(payroll, pd.DataFrame) else pd.DataFrame()
        if not payroll_f.empty:
            team_col = '市场名称' if '市场名称' in payroll_f.columns else None
            if team_col and (team_name or office_name):
                key = team_name or office_name
                payroll_f = payroll_f[payroll_f[team_col].astype(str).str.contains(key, na=False)].copy()
            if '年月' in payroll_f.columns:
                payroll_f = payroll_f[_to_num(payroll_f['年月']).astype(int) == ym_int].copy()
            payroll_f['_store'] = payroll_f['门店名称'].map(_normalize_store_name) if '门店名称' in payroll_f.columns else ''

        s_salary = _to_num(payroll_f['税前工资']).groupby(payroll_f['_store']).sum() if (not payroll_f.empty and '税前工资' in payroll_f.columns) else pd.Series(dtype=float)

        # ========== 财务系统：任务款 ==========
        finance_f = finance.copy() if isinstance(finance, pd.DataFrame) else pd.DataFrame()
        if not finance_f.empty:
            if team_name and '市场团队' in finance_f.columns:
                finance_f = finance_f[finance_f['市场团队'].astype(str) == team_name].copy()
            if '月份' in finance_f.columns:
                finance_f = finance_f[_to_num(finance_f['月份']).astype(int) == ym_int].copy()
            finance_f['_store'] = finance_f['门店名称'].map(_normalize_store_name) if '门店名称' in finance_f.columns else ''

        s_task = _to_num(finance_f['任务款']).groupby(finance_f['_store']).sum() if (not finance_f.empty and '任务款' in finance_f.columns) else pd.Series(dtype=float)

        # ========== 富友流水：手续费 ==========
        fuiou_f = fuiou.copy() if isinstance(fuiou, pd.DataFrame) else pd.DataFrame()
        if not fuiou_f.empty:
            fuiou_f = _filter_ym(fuiou_f, '交易日期') if '交易日期' in fuiou_f.columns else fuiou_f
            fuiou_f['_store'] = fuiou_f['门店名称'].map(_normalize_store_name) if '门店名称' in fuiou_f.columns else ''

        s_fuiou_fee = _to_num(fuiou_f['订单手续费']).groupby(fuiou_f['_store']).sum() if (not fuiou_f.empty and '订单手续费' in fuiou_f.columns) else pd.Series(dtype=float)

        # ========== 资金日报：社保/水电等科目（按“减少”列作为支出） ==========
        funds_f = funds.copy() if isinstance(funds, pd.DataFrame) else pd.DataFrame()
        if not funds_f.empty:
            if team_name and '团队' in funds_f.columns:
                funds_f = funds_f[funds_f['团队'].astype(str) == team_name].copy()
            funds_f = _filter_ym(funds_f, '日期') if '日期' in funds_f.columns else funds_f
            funds_f['_store'] = funds_f['店面名称'].map(_normalize_store_name) if '店面名称' in funds_f.columns else ''

        amount_col = None
        for c in ['减少', '（市场报销）', '增加']:
            if not funds_f.empty and c in funds_f.columns:
                amount_col = c
                break
        funds_pivot = pd.DataFrame()
        if (not funds_f.empty) and amount_col and '科目' in funds_f.columns:
            funds_f['_amt'] = _to_num(funds_f[amount_col])
            funds_pivot = funds_f.pivot_table(index='_store', columns='科目', values='_amt', aggfunc='sum', fill_value=0)

        # ========== 房租：按月份摊销（选择与当前门店列表交集更多的房租表） ==========
        def _rent_series(df: pd.DataFrame) -> (pd.Series, Dict[str, str]):
            if df is None or not isinstance(df, pd.DataFrame) or df.empty:
                return pd.Series(dtype=float), {}
            store_col = '店面名称' if '店面名称' in df.columns else None
            if not store_col:
                return pd.Series(dtype=float), {}
            d = df.copy()
            d['_store'] = d[store_col].map(_normalize_store_name)
            prefer_cols = [f'{month}月摊销', f'{month}月摊', '本月下费用']
            val_col = next((c for c in prefer_cols if c in d.columns), None)
            if not val_col:
                return pd.Series(dtype=float), {}
            s = _to_num(d[val_col]).groupby(d['_store']).sum()
            manager_map: Dict[str, str] = {}
            if '店长' in d.columns:
                for _, r in d.dropna(subset=['_store']).iterrows():
                    st = str(r['_store']).strip()
                    if st and st not in manager_map:
                        v = r.get('店长')
                        if v not in (None, '', 'nan') and str(v).strip():
                            manager_map[st] = str(v).strip()
            return s, manager_map

        rent_s_liu, manager_map_liu = _rent_series(rent_liu)
        rent_s_hu, manager_map_hu = _rent_series(rent_hu)
        inter_liu = len(set(rent_s_liu.index.astype(str)).intersection(set(stores))) if not rent_s_liu.empty else 0
        inter_hu = len(set(rent_s_hu.index.astype(str)).intersection(set(stores))) if not rent_s_hu.empty else 0
        rent_s = rent_s_liu if inter_liu >= inter_hu else rent_s_hu
        manager_map = manager_map_liu if inter_liu >= inter_hu else manager_map_hu

        # ========== 分摊费用：代账费/门店税费/企微分摊 ==========
        alloc_f = alloc.copy() if isinstance(alloc, pd.DataFrame) else pd.DataFrame()
        if not alloc_f.empty:
            team_col = '团队.1' if '团队.1' in alloc_f.columns else ('团队' if '团队' in alloc_f.columns else None)
            if team_col and (office_name or team_name):
                key = office_name or team_name
                alloc_f = alloc_f[alloc_f[team_col].astype(str).str.contains(key, na=False)].copy()
            if '门店' in alloc_f.columns:
                alloc_f['_store'] = alloc_f['门店'].map(_normalize_store_name)

        s_tax = _to_num(alloc_f['门店税费']).groupby(alloc_f['_store']).sum() if (not alloc_f.empty and '门店税费' in alloc_f.columns and '_store' in alloc_f.columns) else pd.Series(dtype=float)
        s_qiye = _to_num(alloc_f['企信分摊金额']).groupby(alloc_f['_store']).sum() if (not alloc_f.empty and '企信分摊金额' in alloc_f.columns and '_store' in alloc_f.columns) else pd.Series(dtype=float)
        s_daizhang = _to_num(alloc_f['10月下费用']).groupby(alloc_f['_store']).sum() if (not alloc_f.empty and '10月下费用' in alloc_f.columns and '_store' in alloc_f.columns) else pd.Series(dtype=float)

        # ========== 组装输出 ==========
        rows: List[Dict[str, Any]] = []
        for st in stores:
            row: Dict[str, Any] = {c: None for c in columns}
            row['年份'] = year
            row['月份'] = month
            row['市场'] = market_name
            row['办公室'] = office_name
            row['所属实体店门店名称'] = st
            row['erp门店名称'] = st
            row['门店名称（自定义）'] = st
            if st in store_id_map:
                row['erp门店编号'] = store_id_map[st]
            if st in manager_map:
                row['店长姓名'] = manager_map[st]

            # 收入
            row['计业绩产品收入'] = float(s_rev_main_perf.get(st, 0))
            row['不计业绩产品收入'] = float(s_rev_main_nonperf.get(st, 0))
            row['产品退货'] = float(-s_ret_amt_main.get(st, 0))
            row['计业绩团品收入'] = float(s_rev_group_perf.get(st, 0))
            row['不计业绩团品收入'] = float(s_rev_group_nonperf.get(st, 0))
            row['一、收入'] = (
                row['计业绩产品收入']
                + row['不计业绩产品收入']
                + row['产品退货']
                + row['计业绩团品收入']
                + row['不计业绩团品收入']
            )

            # 成本
            row['计业绩产品成本'] = float(s_cost_main_perf.get(st, 0))
            row['计业绩产品赠品（主品）'] = float(s_cost_main_gift.get(st, 0))
            row['不计业绩产品成本'] = float(s_cost_main_nonperf.get(st, 0))
            row['退货成本'] = float(-s_ret_cost_all.get(st, 0))
            row['计业绩团品成本'] = float(s_cost_group_perf.get(st, 0))
            row['不计业绩团品成本'] = float(s_cost_group_nonperf.get(st, 0))
            row['二、成本'] = (
                row['计业绩产品成本']
                + row['计业绩产品赠品（主品）']
                + row['不计业绩产品成本']
                + row['退货成本']
                + row['计业绩团品成本']
                + row['不计业绩团品成本']
            )

            # 费用（只填能从来源表明确得到的）
            row['一线工资'] = float(s_salary.get(st, 0))
            if not funds_pivot.empty:
                row['一线社保'] = float(funds_pivot.get('一线社保', pd.Series(dtype=float)).get(st, 0))
                row['高管社保'] = float(funds_pivot.get('高管社保', pd.Series(dtype=float)).get(st, 0))
                row['门店水、电、液化气'] = float(funds_pivot.get('门店水、电、液化气', pd.Series(dtype=float)).get(st, 0))
            row['任务款'] = float(s_task.get(st, 0))
            row['门店房租'] = float(rent_s.get(st, 0))
            row['代账费'] = float(s_daizhang.get(st, 0))
            row['门店税费'] = float(s_tax.get(st, 0))
            row['企微年费分摊'] = float(s_qiye.get(st, 0))
            row['富友手续费（千分之2.2）'] = float(s_fuiou_fee.get(st, 0))

            expense_parts = [
                row.get('一线工资', 0) or 0,
                row.get('一线社保', 0) or 0,
                row.get('高管社保', 0) or 0,
                row.get('门店水、电、液化气', 0) or 0,
                row.get('任务款', 0) or 0,
                row.get('门店房租', 0) or 0,
                row.get('代账费', 0) or 0,
                row.get('门店税费', 0) or 0,
                row.get('企微年费分摊', 0) or 0,
                row.get('富友手续费（千分之2.2）', 0) or 0,
            ]
            row['三、费用'] = float(sum(expense_parts))

            row['四、利润'] = float(row['一、收入'] - row['二、成本'] - row['三、费用'])
            rows.append(row)

        return pd.DataFrame(rows, columns=columns)

    def _execute_profit_income(self, df: pd.DataFrame, config: Dict) -> pd.DataFrame:
        df = df.copy()

        def req(col_key: str) -> str:
            v = (config or {}).get(col_key)
            v = '' if v is None else str(v).strip()
            if not v:
                raise ValueError(f"收入节点缺少配置：{col_key}")
            if v not in df.columns:
                raise ValueError(f"收入节点找不到列 '{v}'（{col_key}）。现有列: {list(df.columns)}")
            return v

        team_col = req('team_col')
        date_col = req('date_col')
        product_col = req('product_type_col')
        perf_col = req('perf_flag_col')
        perf_amount_col = req('perf_amount_col')
        nonperf_amount_col = req('nonperf_amount_col')

        # 可选：状态过滤
        if bool((config or {}).get('filter_by_status')):
            status_col = str((config or {}).get('status_col') or '').strip()
            allowed = (config or {}).get('allowed_status_values') or []
            allowed = [str(x).strip() for x in (allowed if isinstance(allowed, list) else [allowed]) if str(x).strip()]
            if status_col and status_col in df.columns and allowed:
                df = df[df[status_col].astype(str).isin(set(allowed))].copy()

        dt = pd.to_datetime(df[date_col], errors='coerce')
        df['_year'] = dt.dt.year
        df['_month'] = dt.dt.month
        df['_team'] = df[team_col].astype(str).replace({'nan': '', 'None': ''}).fillna('')
        df['_team'] = df['_team'].where(df['_team'].astype(str).str.len() > 0, '未知团队')

        main_vals = (config or {}).get('main_product_values') or []
        group_vals = (config or {}).get('group_product_values') or []
        perf_vals = (config or {}).get('perf_values') or []
        main_vals = set(map(str, main_vals if isinstance(main_vals, list) else [main_vals]))
        group_vals = set(map(str, group_vals if isinstance(group_vals, list) else [group_vals]))
        perf_vals = set(map(str, perf_vals if isinstance(perf_vals, list) else [perf_vals]))

        prod = df[product_col].astype(str)
        perf = df[perf_col].astype(str)
        is_main = prod.isin(main_vals)
        is_group = prod.isin(group_vals)
        is_perf = perf.isin(perf_vals)

        amt_perf = pd.to_numeric(df[perf_amount_col], errors='coerce').fillna(0)
        amt_nonperf = pd.to_numeric(df[nonperf_amount_col], errors='coerce').fillna(0)

        df['_rev_main_perf'] = amt_perf.where(is_main & is_perf, 0)
        df['_rev_main_nonperf'] = amt_nonperf.where(is_main & (~is_perf), 0)
        df['_rev_group_perf'] = amt_perf.where(is_group & is_perf, 0)
        df['_rev_group_nonperf'] = amt_nonperf.where(is_group & (~is_perf), 0)

        out = (
            df.dropna(subset=['_year', '_month'])
            .groupby(['_year', '_month', '_team'], dropna=False)[
                ['_rev_main_perf', '_rev_main_nonperf', '_rev_group_perf', '_rev_group_nonperf']
            ]
            .sum()
            .reset_index()
        )

        out = out.rename(
            columns={
                '_year': '年份',
                '_month': '月份',
                '_team': '办公室',
                '_rev_main_perf': '计业绩产品收入',
                '_rev_main_nonperf': '不计业绩产品收入',
                '_rev_group_perf': '计业绩团品收入',
                '_rev_group_nonperf': '不计业绩团品收入',
            }
        )
        return out

    def _execute_profit_cost(self, df: pd.DataFrame, config: Dict) -> pd.DataFrame:
        df = df.copy()

        def req(col_key: str) -> str:
            v = (config or {}).get(col_key)
            v = '' if v is None else str(v).strip()
            if not v:
                raise ValueError(f"成本节点缺少配置：{col_key}")
            if v not in df.columns:
                raise ValueError(f"成本节点找不到列 '{v}'（{col_key}）。现有列: {list(df.columns)}")
            return v

        team_col = req('team_col')
        date_col = req('date_col')
        product_col = req('product_type_col')
        perf_col = req('perf_flag_col')
        qty_col = req('signed_qty_col')

        # 可选：状态过滤
        if bool((config or {}).get('filter_by_status')):
            status_col = str((config or {}).get('status_col') or '').strip()
            allowed = (config or {}).get('allowed_status_values') or []
            allowed = [str(x).strip() for x in (allowed if isinstance(allowed, list) else [allowed]) if str(x).strip()]
            if status_col and status_col in df.columns and allowed:
                df = df[df[status_col].astype(str).isin(set(allowed))].copy()

        dt = pd.to_datetime(df[date_col], errors='coerce')
        df['_year'] = dt.dt.year
        df['_month'] = dt.dt.month
        df['_team'] = df[team_col].astype(str).replace({'nan': '', 'None': ''}).fillna('')
        df['_team'] = df['_team'].where(df['_team'].astype(str).str.len() > 0, '未知团队')

        main_vals = (config or {}).get('main_product_values') or []
        group_vals = (config or {}).get('group_product_values') or []
        perf_vals = (config or {}).get('perf_values') or []
        main_vals = set(map(str, main_vals if isinstance(main_vals, list) else [main_vals]))
        group_vals = set(map(str, group_vals if isinstance(group_vals, list) else [group_vals]))
        perf_vals = set(map(str, perf_vals if isinstance(perf_vals, list) else [perf_vals]))

        prod = df[product_col].astype(str)
        perf = df[perf_col].astype(str)
        is_main = prod.isin(main_vals)
        is_group = prod.isin(group_vals)
        is_perf = perf.isin(perf_vals)

        qty = pd.to_numeric(df[qty_col], errors='coerce').fillna(0)
        unit_cost = float((config or {}).get('main_unit_cost') or 0)

        df['_cost_main_perf'] = (qty.where(is_main & is_perf, 0) * unit_cost)
        df['_cost_main_nonperf'] = (qty.where(is_main & (~is_perf), 0) * unit_cost)

        # 团品成本（可选列）
        g_perf_col = str((config or {}).get('group_cost_perf_col') or '').strip()
        g_nonperf_col = str((config or {}).get('group_cost_nonperf_col') or '').strip()
        if g_perf_col and g_perf_col not in df.columns:
            raise ValueError(f"成本节点找不到列 '{g_perf_col}'（group_cost_perf_col）。现有列: {list(df.columns)}")
        if g_nonperf_col and g_nonperf_col not in df.columns:
            raise ValueError(f"成本节点找不到列 '{g_nonperf_col}'（group_cost_nonperf_col）。现有列: {list(df.columns)}")

        g_perf = pd.to_numeric(df[g_perf_col], errors='coerce').fillna(0) if g_perf_col else 0
        g_nonperf = pd.to_numeric(df[g_nonperf_col], errors='coerce').fillna(0) if g_nonperf_col else 0
        df['_cost_group_perf'] = g_perf.where(is_group & is_perf, 0) if g_perf_col else 0
        df['_cost_group_nonperf'] = g_nonperf.where(is_group & (~is_perf), 0) if g_nonperf_col else 0

        out = (
            df.dropna(subset=['_year', '_month'])
            .groupby(['_year', '_month', '_team'], dropna=False)[
                ['_cost_main_perf', '_cost_main_nonperf', '_cost_group_perf', '_cost_group_nonperf']
            ]
            .sum()
            .reset_index()
        )

        out = out.rename(
            columns={
                '_year': '年份',
                '_month': '月份',
                '_team': '办公室',
                '_cost_main_perf': '计业绩产品成本',
                '_cost_main_nonperf': '不计业绩产品成本',
                '_cost_group_perf': '计业绩团品成本',
                '_cost_group_nonperf': '不计业绩团品成本',
            }
        )
        return out

    def _execute_profit_expense(self, df: pd.DataFrame, config: Dict) -> pd.DataFrame:
        if df is None or not isinstance(df, pd.DataFrame) or df.empty or len(df.columns) == 0:
            return pd.DataFrame(columns=[
                '年份', '月份', '办公室',
                '一线工资', '红包', '任务款',
                '门店房租', '门店水、电、液化气', '门店物业费',
                '其他分摊', '其他费用'
            ])

        df = df.copy()

        def req(col_key: str) -> str:
            v = (config or {}).get(col_key)
            v = '' if v is None else str(v).strip()
            if not v:
                raise ValueError(f"费用节点缺少配置：{col_key}")
            if v not in df.columns:
                raise ValueError(f"费用节点找不到列 '{v}'（{col_key}）。现有列: {list(df.columns)}")
            return v

        team_col = req('team_col')
        date_col = req('date_col')

        def opt_amount(col_key: str) -> pd.Series:
            col = str((config or {}).get(col_key) or '').strip()
            if not col:
                return pd.Series([0] * len(df))
            if col not in df.columns:
                raise ValueError(f"费用节点找不到列 '{col}'（{col_key}）。现有列: {list(df.columns)}")
            return pd.to_numeric(df[col], errors='coerce').fillna(0)

        dt = pd.to_datetime(df[date_col], errors='coerce')
        df['_year'] = dt.dt.year
        df['_month'] = dt.dt.month
        df['_team'] = df[team_col].astype(str).replace({'nan': '', 'None': ''}).fillna('')
        df['_team'] = df['_team'].where(df['_team'].astype(str).str.len() > 0, '未知团队')

        df['_salary'] = opt_amount('salary_col')
        df['_redpacket'] = opt_amount('redpacket_col')
        df['_task'] = opt_amount('task_col')
        df['_rent'] = opt_amount('rent_col')
        df['_utilities'] = opt_amount('utilities_col')
        df['_property'] = opt_amount('property_col')
        df['_alloc'] = opt_amount('alloc_col')
        df['_other'] = opt_amount('other_col')

        out = (
            df.dropna(subset=['_year', '_month'])
            .groupby(['_year', '_month', '_team'], dropna=False)[
                ['_salary', '_redpacket', '_task', '_rent', '_utilities', '_property', '_alloc', '_other']
            ]
            .sum()
            .reset_index()
        )

        out = out.rename(
            columns={
                '_year': '年份',
                '_month': '月份',
                '_team': '办公室',
                '_salary': '一线工资',
                '_redpacket': '红包',
                '_task': '任务款',
                '_rent': '门店房租',
                '_utilities': '门店水、电、液化气',
                '_property': '门店物业费',
                '_alloc': '其他分摊',
                '_other': '其他费用',
            }
        )

        return out

    def _execute_profit_summary(self, input_dfs: List[pd.DataFrame], config: Dict, context: WorkflowContext) -> pd.DataFrame:
        cfg = config or {}

        def _get_df_by_node_id(key: str) -> Optional[pd.DataFrame]:
            node_id = str(cfg.get(key) or '').strip()
            if not node_id:
                return None
            try:
                df0 = context.get_result(node_id)
                return df0.copy() if isinstance(df0, pd.DataFrame) else None
            except Exception:
                return None

        income_df = _get_df_by_node_id('income_node_id')
        cost_df = _get_df_by_node_id('cost_node_id')
        expense_df = _get_df_by_node_id('expense_node_id')

        # 兼容：未配置节点ID时，按输入顺序推断（income, cost, expense）
        inputs = [d for d in (input_dfs or []) if isinstance(d, pd.DataFrame)]
        if income_df is None and len(inputs) >= 1:
            income_df = inputs[0].copy()
        if cost_df is None and len(inputs) >= 2:
            cost_df = inputs[1].copy()
        if expense_df is None and len(inputs) >= 3:
            expense_df = inputs[2].copy()

        key_cols = ['年份', '月份', '办公室']

        def _ensure_keys(df: pd.DataFrame, name: str) -> pd.DataFrame:
            for k in key_cols:
                if k not in df.columns:
                    raise ValueError(f"利润表汇总缺少键列 '{k}'（来自 {name}）。现有列: {list(df.columns)}")
            out = df.copy()
            out['年份'] = pd.to_numeric(out['年份'], errors='coerce')
            out['月份'] = pd.to_numeric(out['月份'], errors='coerce')
            out['办公室'] = out['办公室'].astype(str).replace({'nan': '', 'None': ''}).fillna('')
            return out

        base = None
        if isinstance(income_df, pd.DataFrame):
            base = _ensure_keys(income_df, '收入')
        elif isinstance(cost_df, pd.DataFrame):
            base = _ensure_keys(cost_df, '成本')
        elif isinstance(expense_df, pd.DataFrame):
            base = _ensure_keys(expense_df, '费用')
        else:
            raise ValueError("利润表汇总节点没有可用输入：请连接收入/成本/费用节点，或在配置中指定来源节点")

        def _merge_into(left: pd.DataFrame, right: Optional[pd.DataFrame], name: str) -> pd.DataFrame:
            if not isinstance(right, pd.DataFrame):
                return left
            right2 = _ensure_keys(right, name)
            return pd.merge(left, right2, on=key_cols, how='outer')

        merged = base
        merged = _merge_into(merged, income_df if base is not income_df else None, '收入')
        merged = _merge_into(merged, cost_df if base is not cost_df else None, '成本')
        merged = _merge_into(merged, expense_df if base is not expense_df else None, '费用')

        # 统一数值列为 numeric，缺失填0
        income_cols = ['计业绩产品收入', '不计业绩产品收入', '计业绩团品收入', '不计业绩团品收入']
        cost_cols = ['计业绩产品成本', '不计业绩产品成本', '计业绩团品成本', '不计业绩团品成本']
        expense_cols = ['一线工资', '红包', '任务款', '门店房租', '门店水、电、液化气', '门店物业费', '其他分摊', '其他费用']

        for col in income_cols + cost_cols + expense_cols:
            if col in merged.columns:
                merged[col] = pd.to_numeric(merged[col], errors='coerce').fillna(0)
            else:
                merged[col] = 0

        merged['一、收入'] = merged[income_cols].sum(axis=1)
        merged['二、成本'] = merged[cost_cols].sum(axis=1)
        merged['三、费用'] = merged[expense_cols].sum(axis=1)
        merged['四、利润'] = merged['一、收入'] - merged['二、成本'] - merged['三、费用']

        # 排序输出
        merged = merged.sort_values(['年份', '月份', '办公室'], ascending=[True, True, True])
        out_cols = key_cols + income_cols + cost_cols + expense_cols + ['一、收入', '二、成本', '三、费用', '四、利润']
        # 保留原表中额外字段（如果上游有更多列），但把核心列放前面
        extra_cols = [c for c in merged.columns if c not in out_cols]
        return merged[out_cols + extra_cols]

    # ========== AI/自动化实现 ==========
    def _execute_code(self, input_dfs: List[pd.DataFrame], config: Dict, context: WorkflowContext) -> pd.DataFrame:
        code = config.get('python_code')
        if not code:
            raise ValueError("代码节点内容为空")
            
        local_scope = {
            "inputs": input_dfs,
            "df": input_dfs[0] if input_dfs else None, 
            "pd": pd,
            "config": config or {},
            "result": None
        }
        
        # 注意：在 Python 3 中，list/dict/set comprehension 会在独立作用域里执行；
        # 当 exec 使用不同的 globals/locals 时，comprehension 可能无法访问 locals 中的变量（如 df_tihuo）。
        # 这里使用同一个作用域字典作为 globals/locals，避免出现 NameError。
        exec(code, local_scope, local_scope)
        result = local_scope.get('result')
        if not isinstance(result, pd.DataFrame):
            raise ValueError("代码节点必须将结果DataFrame赋值给 'result' 变量")
        return result

    async def _execute_ai_agent(self, df: pd.DataFrame, config: Dict) -> pd.DataFrame:
        logger.info(f"[AI Agent] ========== 开始执行 AI Agent 节点 ==========")
        logger.info(f"[AI Agent] 收到配置: {config}")
        logger.info(f"[AI Agent] 输入数据行数: {len(df)}, 列: {list(df.columns)}")
        
        prompt_template = config.get('prompt', '')
        target_column = config.get('target_column', 'AI_Result')
        
        logger.info(f"[AI Agent] Prompt模板: {prompt_template}")
        logger.info(f"[AI Agent] 目标列名: {target_column}")
        
        if not prompt_template:
            logger.error("[AI Agent] 错误: Prompt模板为空!")
            raise ValueError("AI节点必须包含Prompt配置")

        limit = min(len(df), 20)
        df_head = df.head(limit).copy()
        logger.info(f"[AI Agent] 将处理 {limit} 行数据")
        
        results = []
        for idx, (index, row) in enumerate(df_head.iterrows()):
            logger.info(f"[AI Agent] 处理第 {idx+1}/{limit} 行...")
            
            # 构建包含行数据的Prompt
            row_prompt = prompt_template
            
            # 替换模板中的 {{列名}} 占位符
            for col in df.columns:
                placeholder = f"{{{{{col}}}}}"
                if placeholder in row_prompt:
                    row_prompt = row_prompt.replace(placeholder, str(row[col]))
            
            # 如果Prompt中没有任何占位符被替换，自动附加当前行的完整数据
            has_placeholder = any(f"{{{{{col}}}}}" in prompt_template for col in df.columns)
            if not has_placeholder:
                row_data_str = "\n".join([f"- {col}: {row[col]}" for col in df.columns])
                row_prompt = f"{prompt_template}\n\n当前数据行:\n{row_data_str}"
            
            logger.info(f"[AI Agent] 实际Prompt (前300字符): {row_prompt[:300]}...")
            
            try:
                logger.info(f"[AI Agent] 开始调用AI...")
                ai_resp = await self._simple_ai_call(row_prompt)
                logger.info(f"[AI Agent] 第 {idx+1} 行AI返回: {ai_resp[:100] if ai_resp else 'None'}...")
                results.append(ai_resp)
            except Exception as e:
                logger.error(f"[AI Agent] 第 {idx+1} 行调用失败: {str(e)}")
                import traceback
                traceback.print_exc()
                results.append(f"Error: {str(e)}")
        
        logger.info(f"[AI Agent] 所有行处理完成，共 {len(results)} 个结果")
        df_head[target_column] = results
        logger.info(f"[AI Agent] ========== AI Agent 节点执行结束 ==========")
        return df_head

    async def _simple_ai_call(self, prompt: str) -> str:
        import httpx
        from config import ARK_API_KEY, ARK_BASE_URL, ARK_MODEL_NAME
        
        logger.info(f"[AI Agent] 调用AI，使用模型: {ARK_MODEL_NAME}")
        logger.debug(f"[AI Agent] Prompt: {prompt[:100]}...")
        
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                resp = await client.post(
                    f"{ARK_BASE_URL}/chat/completions",
                    headers={"Authorization": f"Bearer {ARK_API_KEY}"},
                    json={
                        "model": ARK_MODEL_NAME,
                        "messages": [{"role": "user", "content": prompt}]
                    }
                )
                
                logger.info(f"[AI Agent] API响应状态: {resp.status_code}")
                
                if resp.status_code == 200:
                    result = resp.json()['choices'][0]['message']['content']
                    logger.info(f"[AI Agent] 成功获取响应: {result[:50]}...")
                    return result
                else:
                    error_msg = f"AI调用失败: HTTP {resp.status_code} - {resp.text[:200]}"
                    logger.error(f"[AI Agent] {error_msg}")
                    return error_msg
        except Exception as e:
            logger.error(f"[AI Agent] 调用异常: {str(e)}")
            return f"调用失败: {str(e)}"

    # ========== 输出实现 ==========
    def _save_output(self, df: pd.DataFrame, config: Dict, node_type: str = 'output') -> str:
        filename = config.get('filename', f"output_{uuid4().hex[:8]}")
        
        if node_type == 'output_csv':
            if not filename.endswith('.csv'):
                filename += '.csv'
            output_path = os.path.join(UPLOAD_DIR, filename)
            encoding = config.get('encoding', 'utf-8')
            df.to_csv(output_path, index=False, encoding=encoding)
        else:
            if not filename.endswith('.xlsx'):
                filename += '.xlsx'
            output_path = os.path.join(UPLOAD_DIR, filename)
            df.to_excel(output_path, index=False)
        
        return str(filename)

    # ========== 数据库操作方法 ==========
    async def get_all_workflows(self) -> List[Dict]:
        import aiosqlite
        from database import DATABASE_PATH
        async with aiosqlite.connect(DATABASE_PATH) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute("SELECT id, name, description, created_at, updated_at FROM workflows ORDER BY updated_at DESC")
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]
    
    async def get_workflow(self, workflow_id: str) -> Optional[Dict]:
        import aiosqlite
        from database import DATABASE_PATH
        async with aiosqlite.connect(DATABASE_PATH) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute("SELECT * FROM workflows WHERE id = ?", (workflow_id,))
            row = await cursor.fetchone()
            if row:
                result = dict(row)
                result['config'] = json.loads(result['config'])
                return result
            return None
    
    async def save_workflow(self, workflow_id: str, name: str, description: str, config: Dict):
        import aiosqlite
        from database import DATABASE_PATH
        async with aiosqlite.connect(DATABASE_PATH) as db:
            await db.execute("""
                INSERT OR REPLACE INTO workflows (id, name, description, config, updated_at)
                VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
            """, (workflow_id, name, description, json.dumps(config, ensure_ascii=False)))
            await db.commit()

    async def delete_workflow(self, workflow_id: str) -> bool:
        import aiosqlite
        from database import DATABASE_PATH
        async with aiosqlite.connect(DATABASE_PATH) as db:
            cursor = await db.execute("DELETE FROM execution_history WHERE workflow_id = ?", (workflow_id,))
            await cursor.close()
            cursor = await db.execute("DELETE FROM workflows WHERE id = ?", (workflow_id,))
            deleted = cursor.rowcount > 0
            await cursor.close()
            await db.commit()
            return deleted
    
    async def save_execution_history(self, workflow_id: str, input_files: List, output_file: str, status: str, result_summary: str) -> str:
        import aiosqlite
        from database import DATABASE_PATH
        history_id = str(uuid4())
        async with aiosqlite.connect(DATABASE_PATH) as db:
            await db.execute("""
                INSERT INTO execution_history (id, workflow_id, input_files, output_file, status, result_summary)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (history_id, workflow_id, json.dumps(input_files), output_file, status, result_summary))
            await db.commit()
        return history_id
    
    async def get_execution_history(self, limit: int = 50) -> List[Dict]:
        import aiosqlite
        from database import DATABASE_PATH
        async with aiosqlite.connect(DATABASE_PATH) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute("SELECT * FROM execution_history ORDER BY created_at DESC LIMIT ?", (limit,))
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]

# 单例
workflow_engine = WorkflowEngine()
