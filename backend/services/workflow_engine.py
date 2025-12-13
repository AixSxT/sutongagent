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
                        node_results[node_id] = {
                            "columns": result_df.columns.tolist(),
                            "data": result_df.fillna("").to_dict(orient="records"),  # 返回全部数据
                            "total_rows": len(result_df)
                        }
                        
                        if node_type in ['output', 'output_csv']:
                            output_file = self._save_output(result_df, node_config, node_type)
                            final_preview = {
                                "columns": result_df.columns.tolist(),
                                "data": result_df.head(100).fillna("").to_dict(orient="records"),
                                "total_rows": len(result_df)
                            }
                    else:
                        node_status[node_id] = 'success'  # 无输出但成功
                        
                except Exception as node_error:
                    node_status[node_id] = 'error'
                    node_results[node_id] = {"error": str(node_error)}
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

    async def _execute_node_by_type(self, node_type: str, config: Dict, input_dfs: List[pd.DataFrame], context: WorkflowContext, file_mapping: Dict) -> Optional[pd.DataFrame]:
        """根据节点类型执行具体逻辑"""
        
        # ========== 数据源 ==========
        if node_type == 'source':
            return self._execute_source(config, file_mapping)
            
        elif node_type == 'source_csv':
            return self._execute_source_csv(config, file_mapping)
        
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
            df = df.query(filter_expr)
        
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
        if not join_keys:
            # 旧版格式兼容
            detail_key = config.get('detail_key')
            if detail_key:
                join_keys = [detail_key] if isinstance(detail_key, str) else detail_key
        
        left_column = config.get('left_column') or config.get('detail_amount')
        right_column = config.get('right_column') or config.get('summary_amount')
        output_mode = config.get('output_mode', 'diff_only')
        tolerance = float(config.get('tolerance', 0))
        
        if not join_keys:
            raise ValueError("对账核算必须指定关联键 (join_keys 或 detail_key)")
        if not left_column:
            raise ValueError("对账核算必须指定明细表金额列 (left_column 或 detail_amount)")
        if not right_column:
            raise ValueError("对账核算必须指定汇总表金额列 (right_column 或 summary_amount)")
        
        # 确保join_keys是列表
        if isinstance(join_keys, str):
            join_keys = [join_keys]
        
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
        detail_grouped = detail_df.groupby(join_keys)[left_column].sum().reset_index()
        detail_grouped = detail_grouped.rename(columns={left_column: '明细汇总金额'})
        logger.debug(f"[Reconcile] 明细汇总后: {len(detail_grouped)} 行")
        
        # 2. 准备汇总表（只取关联键+金额列）
        summary_cols = join_keys + [right_column]
        summary_renamed = summary_df[summary_cols].copy()
        summary_renamed = summary_renamed.rename(columns={right_column: '汇总表金额'})
        
        # 3. 统一关联键类型为字符串
        for key in join_keys:
            detail_grouped[key] = detail_grouped[key].astype(str)
            summary_renamed[key] = summary_renamed[key].astype(str)
        
        # 4. 合并对比
        merged = pd.merge(
            detail_grouped, 
            summary_renamed, 
            on=join_keys, 
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

    # ========== AI/自动化实现 ==========
    def _execute_code(self, input_dfs: List[pd.DataFrame], config: Dict, context: WorkflowContext) -> pd.DataFrame:
        code = config.get('python_code')
        if not code:
            raise ValueError("代码节点内容为空")
            
        local_scope = {
            "inputs": input_dfs,
            "df": input_dfs[0] if input_dfs else None, 
            "pd": pd,
            "result": None
        }
        
        exec(code, {}, local_scope)
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
