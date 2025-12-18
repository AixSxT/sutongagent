import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
    Layout, Typography, Button, Upload, message, Input, Card,
    List, Tag, Spin, Modal, Table, Space, Tooltip, Empty,
    Tabs, Drawer, Form, Select, InputNumber, Switch, Divider,
    Collapse, Checkbox
} from 'antd';
import {
    FileExcelOutlined, CloudUploadOutlined, SendOutlined,
    PlayCircleOutlined, SaveOutlined, HistoryOutlined,
    DeleteOutlined, EyeOutlined, DownloadOutlined,
    RobotOutlined, ThunderboltOutlined, DragOutlined,
    SettingOutlined, PlusOutlined, DatabaseOutlined,
    MinusOutlined,
    FilterOutlined, MergeCellsOutlined, CalculatorOutlined,
    GroupOutlined, ExportOutlined, SelectOutlined,
    AppstoreOutlined, BuildOutlined, CheckCircleOutlined,
    FileExcelFilled, ClockCircleOutlined, BranchesOutlined,
    ApiOutlined, CodeOutlined, SwapOutlined, ClearOutlined,
    SortAscendingOutlined, FieldStringOutlined,
    BarChartOutlined, NodeIndexOutlined, ProfileOutlined, ArrowDownOutlined,
    FolderOutlined, SearchOutlined, ToolOutlined, RocketOutlined, FileTextOutlined, TableOutlined, ArrowLeftOutlined,
    ArrowRightOutlined,
    LoadingOutlined, CheckOutlined, CloseOutlined
} from '@ant-design/icons';
import ReactFlow, {
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    addEdge,
    MarkerType,
    Panel as FlowPanel,
    Handle,
    Position,
    updateEdge
} from 'reactflow';
import 'reactflow/dist/style.css';
import { excelApi, aiApi, workflowApi } from './services/api';
import AIAssistantIsland from './components/AIAssistantIsland';
import RaycastHomePage from './components/RaycastHomePage';

const { Header, Content } = Layout;
const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;
const { Panel } = Collapse;

// ============== 完整节点类型配置 ==============
const NODE_TYPES_CONFIG = {
    // === 数据源 ===
    source: {
        color: '#34C759',
        label: 'Excel读取',
        icon: <DatabaseOutlined />,
        description: '读取Excel文件',
        category: 'source'
    },
    source_csv: {
        color: '#30D158',
        label: 'CSV读取',
        icon: <FileTextOutlined />,
        description: '读取CSV/TSV文件',
        category: 'source'
    },
    source_optional: {
        color: '#34C759',
        label: '可选Excel读取',
        icon: <DatabaseOutlined />,
        description: '未配置则输出空表',
        category: 'source'
    },

    // === 数据清洗 ===
    transform: {
        color: '#007AFF',
        label: '数据清洗',
        icon: <FilterOutlined />,
        description: '筛选/计算/重命名',
        category: 'transform'
    },
    type_convert: {
        color: '#0A84FF',
        label: '类型转换',
        icon: <SwapOutlined />,
        description: '转换列数据类型',
        category: 'transform'
    },
    fill_na: {
        color: '#32ADE6',
        label: '缺失值处理',
        icon: <ClearOutlined />,
        description: '处理空值/NA',
        category: 'transform'
    },
    deduplicate: {
        color: '#64D2FF',
        label: '去重',
        icon: <SelectOutlined />,
        description: '删除重复行',
        category: 'transform'
    },
    text_process: {
        color: '#5AC8FA',
        label: '文本处理',
        icon: <FieldStringOutlined />,
        description: '文本清洗与转换',
        category: 'transform'
    },
    date_process: {
        color: '#00C7BE',
        label: '日期处理',
        icon: <ClockCircleOutlined />,
        description: '日期提取与计算',
        category: 'transform'
    },

    // === 数据分析 ===
    group_aggregate: {
        color: '#FF9500',
        label: '分组聚合',
        icon: <GroupOutlined />,
        description: '类似SQL GROUP BY',
        category: 'analytics'
    },
    pivot: {
        color: '#FF9F0A',
        label: '透视表',
        icon: <TableOutlined />,
        description: '创建数据透视表',
        category: 'analytics'
    },
    unpivot: {
        color: '#FFB340',
        label: '逆透视',
        icon: <SwapOutlined />,
        description: '宽表转长表',
        category: 'analytics'
    },

    // === 多表操作 ===
    join: {
        color: '#5856D6',
        label: '多表关联',
        icon: <MergeCellsOutlined />,
        description: '类似SQL Join',
        category: 'multi'
    },
    concat: {
        color: '#AF52DE',
        label: '纵向合并',
        icon: <MergeCellsOutlined />,
        description: '多表上下拼接',
        category: 'multi'
    },
    vlookup: {
        color: '#BF5AF2',
        label: 'VLOOKUP',
        icon: <SearchOutlined />,
        description: '类Excel查找',
        category: 'multi'
    },
    diff: {
        color: '#DA70D6',
        label: '表格对比',
        icon: <BranchesOutlined />,
        description: '比较两表差异',
        category: 'multi'
    },
    reconcile: {
        color: '#E91E63',
        label: '对账核算',
        icon: <CalculatorOutlined />,
        description: '自动汇总对比核算',
        category: 'multi'
    },

    // === 利润表（业务模块） ===
    profit_income: {
        color: '#34C759',
        label: '收入',
        icon: <BarChartOutlined />,
        description: '按团队-月份汇总收入',
        category: 'profit'
    },
    profit_cost: {
        color: '#34C759',
        label: '成本',
        icon: <CalculatorOutlined />,
        description: '按团队-月份汇总成本',
        category: 'profit'
    },
    profit_expense: {
        color: '#34C759',
        label: '其他费用',
        icon: <ToolOutlined />,
        description: '按团队-月份汇总费用',
        category: 'profit'
    },
    profit_summary: {
        color: '#34C759',
        label: '利润表汇总',
        icon: <ExportOutlined />,
        description: '收入-成本-费用=利润',
        category: 'profit'
    },
    profit_table: {
        color: '#34C759',
        label: '利润表',
        icon: <TableOutlined />,
        description: '从单个工作簿多Sheet推导利润表',
        category: 'profit'
    },

    // === AI/自动化 ===
    ai_agent: {
        color: '#FF2D55',
        label: 'AI智能处理',
        icon: <RobotOutlined />,
        description: '大模型批量处理',
        category: 'ai'
    },
    code: {
        color: '#FF3B30',
        label: 'Python脚本',
        icon: <CodeOutlined />,
        description: '自定义Python代码',
        category: 'ai'
    },

    // === 输出 ===
    output: {
        color: '#8E8E93',
        label: '导出Excel',
        icon: <ExportOutlined />,
        description: '保存结果文件',
        category: 'output'
    },
    output_csv: {
        color: '#636366',
        label: '导出CSV',
        icon: <FileTextOutlined />,
        description: '保存为CSV',
        category: 'output'
    }
};

// 节点分类
const NODE_CATEGORIES = {
    preset: { label: '预设', icon: <ThunderboltOutlined />, color: '#AF52DE' },
    custom: { label: '自定义', icon: <ProfileOutlined />, color: '#5AC8FA' },
    profit: { label: '利润表', icon: <BarChartOutlined />, color: '#34C759' },
    source: { label: '数据源', icon: <DatabaseOutlined />, color: '#34C759' },
    transform: { label: '数据清洗', icon: <FilterOutlined />, color: '#007AFF' },
    analytics: { label: '数据分析', icon: <BarChartOutlined />, color: '#FF9500' },
    multi: { label: '多表操作', icon: <NodeIndexOutlined />, color: '#5856D6' },
    ai: { label: 'AI/自动化', icon: <RobotOutlined />, color: '#FF2D55' },
    output: { label: '输出', icon: <ExportOutlined />, color: '#8E8E93' }
};

// Custom Node Component with Execution Status
function CustomNode({ data, selected }) {
    const nodeType = NODE_TYPES_CONFIG[data.type] || { color: '#666', bg: '#eee' };
    const isSource = data.type === 'source' || data.type === 'source_csv';
    const isOutput = data.type === 'output' || data.type === 'output_csv';
    const status = data.executionStatus; // 'pending', 'running', 'success', 'error'

    // 状态指示器样式
    const getStatusIndicator = () => {
        if (!status || status === 'pending') return null;

        const baseStyle = {
            position: 'absolute',
            bottom: -8,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 20,
            height: 20,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            fontWeight: 'bold',
            boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
            cursor: status === 'success' ? 'pointer' : 'default',
            zIndex: 10
        };

        if (status === 'running') {
            return (
                <div style={{ ...baseStyle, background: '#007AFF', border: '2px solid white' }}>
                    <LoadingOutlined style={{ color: 'white', fontSize: 11 }} spin />
                </div>
            );
        }

        if (status === 'success') {
            return (
                <div
                    style={{ ...baseStyle, background: '#34C759', border: '2px solid white' }}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (data.onViewResult) data.onViewResult(data.nodeId);
                    }}
                    title="点击查看执行结果"
                >
                    <CheckOutlined style={{ color: 'white', fontSize: 11 }} />
                </div>
            );
        }

        if (status === 'error') {
            return (
                <div
                    style={{ ...baseStyle, background: '#FF3B30', border: '2px solid white', cursor: data.onViewError ? 'pointer' : 'default' }}
                    title={data.errorMessage || '执行失败'}
                    onClick={(e) => {
                        if (!data.onViewError) return;
                        e.stopPropagation();
                        data.onViewError(data.nodeId);
                    }}
                >
                    <CloseOutlined style={{ color: 'white', fontSize: 11 }} />
                </div>
            );
        }

        return null;
    };

    const showErrorBubble = status === 'error' && data.errorMessage && !data.errorBubbleDismissed;

    return (
        <div style={{
            padding: '10px',
            borderRadius: 14,
            background: 'white',
            minWidth: 160,
            boxShadow: selected ? `0 0 0 2px ${nodeType.color}, 0 8px 20px rgba(0,0,0,0.1)` : '0 4px 12px rgba(0,0,0,0.08)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            transition: 'all 0.2s',
            border: status === 'error' ? '2px solid #FF3B30' : status === 'success' ? '2px solid #34C759' : '1px solid rgba(0,0,0,0.02)',
            position: 'relative',
            paddingBottom: status ? 16 : 10
        }}>
            {!isSource && (
                <Handle type="target" position={Position.Left} style={{
                    background: nodeType.color, width: 12, height: 12, border: '2px solid white', left: -6
                }} />
            )}
            <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: nodeType.color, color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, boxShadow: `0 4px 8px ${nodeType.color}40`
            }}>
                {nodeType.icon || <SettingOutlined />}
            </div>
            <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#1D1D1F' }}>{data.label}</div>
                {data.description && (
                    <div style={{ fontSize: 11, color: '#86868B', marginTop: 2 }}>{data.description}</div>
                )}
            </div>
            {!isOutput && (
                <Handle type="source" position={Position.Right} style={{
                    background: nodeType.color, width: 12, height: 12, border: '2px solid white', right: -6
                }} />
            )}
            {getStatusIndicator()}
            {showErrorBubble && (
                <div
                    className="node-error-bubble"
                    onClick={(e) => {
                        e.stopPropagation();
                        if (data.onViewError) data.onViewError(data.nodeId);
                    }}
                    title="点击查看错误详情"
                >
                    <div className="node-error-bubble-title">
                        <span>错误</span>
                        <span className="node-error-bubble-action">查看</span>
                    </div>
                    <button
                        className="node-error-bubble-close"
                        type="button"
                        title="关闭"
                        onClick={(e) => {
                            e.stopPropagation();
                            if (data.onDismissErrorBubble) data.onDismissErrorBubble(data.nodeId);
                        }}
                    >
                        <CloseOutlined style={{ fontSize: 12 }} />
                    </button>
                    <div className="node-error-bubble-text">{String(data.errorMessage || '')}</div>
                </div>
            )}
        </div>
    );
}

const nodeTypes = { custom: CustomNode };

// Draggable Node
function DraggableNode({ type, config, onDragStart, onAddNode }) {
    const onDragStartInternal = (event) => {
        event.dataTransfer.setData('application/reactflow', JSON.stringify({ type, config }));
        event.dataTransfer.effectAllowed = 'move';
    };

    return (
        <div
            className="draggable-node"
            draggable
            onDragStart={(event) => (onDragStart ? onDragStart(event, type, config) : onDragStartInternal(event))}
            onDoubleClick={() => onAddNode?.(type, config)}
        >
            <div className="draggable-node-icon" style={{ background: config.color, boxShadow: `0 2px 8px ${config.color}40` }}>
                {config.icon}
            </div>
            <div>{config.label}</div>
            <div>{config.description}</div>
        </div>
    );
}

const PRESET_SIGNING_PERFORMANCE_PY = `import pandas as pd

# 约定：inputs[0] = 提货表，inputs[1] = 袁欢导出的表（ERP签收明细）
df_tihuo = inputs[0].copy() if len(inputs) > 0 and inputs[0] is not None else pd.DataFrame()
df_erp = inputs[1].copy() if len(inputs) > 1 and inputs[1] is not None else pd.DataFrame()

# 容错：若用户连线顺序颠倒，简单按列名识别并交换（不改变对比逻辑）
if '商城子订单' in df_erp.columns and '子订单号' in df_tihuo.columns:
    df_tihuo, df_erp = df_erp, df_tihuo

# 运行时可在节点配置里选择团队；为空则不筛选
team_name = ''
try:
    team_name = (config or {}).get('team_name', '')
except Exception:
    team_name = ''
if isinstance(team_name, (list, tuple)):
    team_name = team_name[0] if team_name else ''
team_name = str(team_name).strip()

# 3. 筛选团队（保持原逻辑）
if team_name and '办公室团队' in df_tihuo.columns:
    df_tihuo = df_tihuo[df_tihuo['办公室团队'] == team_name].copy()

# 4. 数据预处理（保持原逻辑）
df_tihuo['顾客提货商品金额'] = pd.to_numeric(df_tihuo['顾客提货商品金额'], errors='coerce').fillna(0)

erp_cols_map = {
    '顾客签收金额': 'ERP签收金额',
    '签收金额': 'ERP签收金额',
    '子订单号': '子订单号',
    '子订单编号': '子订单号',
    '主订单编号': '主订单号_ERP',
    '主订单号': '主订单号_ERP'
}

df_erp = df_erp.rename(columns=erp_cols_map)
df_tihuo = df_tihuo.rename(columns={'商城子订单': '子订单号', '顾客提货商品金额': '提货金额', '商城主订单': '主订单号_提货'})

# 保持原脚本读入 dtype=str 的效果（尽量对齐）
if '子订单号' in df_tihuo.columns:
    df_tihuo['子订单号'] = df_tihuo['子订单号'].astype(str)
if '子订单号' in df_erp.columns:
    df_erp['子订单号'] = df_erp['子订单号'].astype(str)

if 'ERP签收金额' not in df_erp.columns or '子订单号' not in df_erp.columns:
    raise ValueError(f\"ERP表中找不到'签收金额'或'子订单号'列，请检查表头名称。当前ERP列名: {list(df_erp.columns)}\")

df_erp['ERP签收金额'] = pd.to_numeric(df_erp['ERP签收金额'], errors='coerce').fillna(0)

# 5. 提取子集 & 聚合（保持原逻辑）
tihuo_cols = ['子订单号', '主订单号_提货', '订单销售人员', '提货商品', '提货金额', '顾客提货时间']
erp_cols = ['子订单号', '主订单号_ERP', '创建人姓名', '商品名称', 'ERP签收金额', '签收时间']

tihuo_cols = [c for c in tihuo_cols if c in df_tihuo.columns]
erp_cols = [c for c in erp_cols if c in df_erp.columns]

tihuo_sub = df_tihuo[tihuo_cols].copy()
erp_sub = df_erp[erp_cols].copy()

tihuo_first = tihuo_sub.groupby('子订单号').first().reset_index()
tihuo_agg = tihuo_first.copy()
tihuo_agg['提货金额'] = tihuo_sub.groupby('子订单号')['提货金额'].sum().values

erp_first = erp_sub.groupby('子订单号').first().reset_index()
erp_agg = erp_first.copy()
erp_agg['ERP签收金额'] = erp_sub.groupby('子订单号')['ERP签收金额'].sum().values

# 6. 对比（Outer Join - 核心需求）
merged = pd.merge(tihuo_agg, erp_agg, on='子订单号', how='outer', indicator=True)

def get_status(row):
    if row['_merge'] == 'left_only':
        return '只在提货表 (ERP漏单)'
    if row['_merge'] == 'right_only':
        return '只在ERP表 (多记/跨月)'
    t_amt = row.get('提货金额', 0)
    e_amt = row.get('ERP签收金额', 0)
    if pd.isna(t_amt): t_amt = 0
    if pd.isna(e_amt): e_amt = 0
    if abs(t_amt - e_amt) > 0.01:
        return f'金额不一致 (差 {t_amt - e_amt:.2f})'
    return '匹配成功'

merged['对比结果'] = merged.apply(get_status, axis=1)

result = merged
`;

const PRESET_WORKFLOWS = [
    {
        id: 'preset_1',
        name: '1',
        description: 'Excel读取 → 输出',
        config: {
            nodes: [
                { id: 'n1', type: 'source', label: 'Excel读取', config: {} },
                { id: 'n2', type: 'output', label: '输出Excel', config: {} }
            ],
            edges: [{ source: 'n1', target: 'n2' }]
        }
    },
    {
        id: 'preset_2',
        name: '2',
        description: 'Excel读取 → 数据清洗 → 输出',
        config: {
            nodes: [
                { id: 'n1', type: 'source', label: 'Excel读取', config: {} },
                { id: 'n2', type: 'transform', label: '数据清洗', config: {} },
                { id: 'n3', type: 'output', label: '输出Excel', config: {} }
            ],
            edges: [
                { source: 'n1', target: 'n2' },
                { source: 'n2', target: 'n3' }
            ]
        }
    },
    {
        id: 'preset_signing_performance',
        name: '主品签收业绩',
        description: '提货表 vs 袁欢导出的表（Outer Join 对比）',
        config: {
            nodes: [
                { id: 'tihuo', type: 'source', label: '提货表', config: {} },
                { id: 'erp', type: 'source', label: '袁欢导出的表', config: {} },
                { id: 'compare', type: 'code', label: '主品签收业绩', config: { python_code: PRESET_SIGNING_PERFORMANCE_PY, team_name: [] } },
                { id: 'out', type: 'output', label: '输出Excel', config: { filename: '主品签收业绩_对比结果.xlsx' } }
            ],
            edges: [
                { source: 'tihuo', target: 'compare' },
                { source: 'erp', target: 'compare' },
                { source: 'compare', target: 'out' }
            ]
        }
    }
    ,
    {
        id: 'preset_profit_team_month',
        name: '利润表（团队-月份）',
        description: '订单明细(收入/成本) + 费用明细 → 利润汇总 → 输出',
        config: {
            nodes: [
                { id: 'orders', type: 'source', label: '订单明细', config: {} },
                { id: 'income', type: 'profit_income', label: '收入', config: {} },
                { id: 'cost', type: 'profit_cost', label: '成本', config: {} },
                { id: 'fees', type: 'source_optional', label: '费用明细（可选）', config: {} },
                { id: 'expense', type: 'profit_expense', label: '其他费用', config: {} },
                { id: 'summary', type: 'profit_summary', label: '利润表汇总', config: { income_node_id: 'income', cost_node_id: 'cost', expense_node_id: 'expense' } },
                { id: 'out', type: 'output', label: '输出Excel', config: { filename: '团队利润表_结果.xlsx' } }
            ],
            edges: [
                { source: 'orders', target: 'income' },
                { source: 'orders', target: 'cost' },
                { source: 'fees', target: 'expense' },
                { source: 'income', target: 'summary' },
                { source: 'cost', target: 'summary' },
                { source: 'expense', target: 'summary' },
                { source: 'summary', target: 'out' }
            ]
        }
    },
    {
        id: 'preset_profit_accounting',
        name: '利润核算',
        description: '订单明细(收入/成本) + 可选费用 → 利润汇总（团队-月份）→ 输出',
        config: {
            nodes: [
                { id: 'orders', type: 'source', label: '订单明细', config: {} },
                {
                    id: 'income',
                    type: 'profit_income',
                    label: '收入',
                    config: {
                        team_col: '所属团队',
                        date_col: '订单提交时间',
                        product_type_col: '商品类型',
                        perf_flag_col: '是否计入业绩',
                        perf_amount_col: '计入业绩金额',
                        nonperf_amount_col: '回款金额',
                        main_product_values: ['主品'],
                        group_product_values: ['团品'],
                        perf_values: ['计入业绩'],
                        filter_by_status: false
                    }
                },
                {
                    id: 'cost',
                    type: 'profit_cost',
                    label: '成本',
                    config: {
                        team_col: '所属团队',
                        date_col: '订单提交时间',
                        product_type_col: '商品类型',
                        perf_flag_col: '是否计入业绩',
                        signed_qty_col: '顾客确认数量',
                        main_unit_cost: 0,
                        group_cost_perf_col: '',
                        group_cost_nonperf_col: '',
                        main_product_values: ['主品'],
                        group_product_values: ['团品'],
                        perf_values: ['计入业绩'],
                        filter_by_status: false
                    }
                },
                { id: 'fees', type: 'source_optional', label: '费用明细（可选）', config: {} },
                {
                    id: 'expense',
                    type: 'profit_expense',
                    label: '其他费用',
                    config: {
                        team_col: '所属团队',
                        date_col: '日期',
                        salary_col: '',
                        redpacket_col: '',
                        task_col: '',
                        rent_col: '',
                        utilities_col: '',
                        property_col: '',
                        alloc_col: '',
                        other_col: ''
                    }
                },
                { id: 'summary', type: 'profit_summary', label: '利润汇总', config: { income_node_id: 'income', cost_node_id: 'cost', expense_node_id: 'expense' } },
                { id: 'out', type: 'output', label: '输出Excel', config: { filename: '利润核算_结果.xlsx' } }
            ],
            edges: [
                { source: 'orders', target: 'income' },
                { source: 'orders', target: 'cost' },
                { source: 'fees', target: 'expense' },
                { source: 'income', target: 'summary' },
                { source: 'cost', target: 'summary' },
                { source: 'expense', target: 'summary' },
                { source: 'summary', target: 'out' }
            ]
        }
    },
    {
        id: 'preset_profit_table',
        name: '利润表',
        description: '从单个工作簿的来源Sheet自动推导利润表（能算的列自动填，其他留空）',
        config: {
            nodes: [
                {
                    id: 'profit_table',
                    type: 'profit_table',
                    label: '利润表',
                    config: { team_name: '邯郸刘洋', year: 2025, month: 10 }
                },
                { id: 'out', type: 'output', label: '输出Excel', config: { filename: '利润表_结果.xlsx' } }
            ],
            edges: [{ source: 'profit_table', target: 'out' }]
        }
    }
];

function DraggableWorkflow({ workflow, kind, onApplyWorkflow, onDeleteWorkflow }) {
    const onDragStartInternal = (event) => {
        const payload = kind === 'saved'
            ? { kind: 'saved', workflow_id: workflow?.id, name: workflow?.name }
            : { kind: 'preset', id: workflow?.id, name: workflow?.name, config: workflow?.config };

        event.dataTransfer.setData('application/excelflow-workflow', JSON.stringify(payload));
        // 允许画布端按需使用 copy 或 move（避免与 dropEffect 不匹配导致无法放置）
        event.dataTransfer.effectAllowed = 'copyMove';
    };

    return (
        <div
            className="draggable-node"
            draggable
            onDragStart={onDragStartInternal}
            onDoubleClick={() => onApplyWorkflow?.({ kind, workflow })}
            title="拖拽到画布，或双击应用到画布"
            style={{ position: 'relative' }}
        >
            <div style={{ position: 'absolute', right: 8, top: 8, zIndex: 2 }}>
                <Tooltip title="管理">
                    <Button
                        type="text"
                        size="small"
                        icon={<SettingOutlined />}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onDeleteWorkflow?.({ kind, workflow });
                        }}
                    />
                </Tooltip>
            </div>
            <div className="draggable-node-icon" style={{ background: '#AF52DE', boxShadow: `0 2px 8px #AF52DE40` }}>
                <ThunderboltOutlined />
            </div>
            <div>{workflow?.name || '工作流'}</div>
            <div>{workflow?.description || ''}</div>
        </div>
    );
}

// === 节点工具箱组件 ===
// === 文件管理组件 ===
function FileManager({ files, onUpload, onDelete, onPreview }) {
    return (
        <div className="file-manager" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            <div style={{ flexShrink: 0 }}>
                <div className="file-manager-title" style={{ fontSize: 13, fontWeight: 600, color: '#1D1D1F', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CloudUploadOutlined /> 文件资源
                </div>
                <div className="file-upload-card" style={{ background: 'white', borderRadius: 12, padding: 12, border: '1px solid rgba(0,0,0,0.02)', marginBottom: 12 }}>
                    <Upload.Dragger
                        showUploadList={false}
                        customRequest={({ file, onSuccess, onError }) => onUpload({ file }).then(onSuccess).catch(onError)}
                        style={{ border: '1px dashed #E5E5EA', background: '#F5F5F7', borderRadius: 8, padding: '12px 0' }}
                    >
                        <p className="ant-upload-drag-icon" style={{ marginBottom: 4 }}>
                            <CloudUploadOutlined style={{ color: '#007AFF', fontSize: 20 }} />
                        </p>
                        <p className="ant-upload-text" style={{ fontSize: 11, color: '#86868B' }}>点击或拖拽上传</p>
                    </Upload.Dragger>
                </div>
            </div>

            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                <div className="file-list-card" style={{ flex: 1, background: 'white', borderRadius: 12, border: '1px solid rgba(0,0,0,0.02)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px' }}>
                        <List
                            className="file-manager-list"
                            size="small"
                            dataSource={files}
                            split={false}
                            renderItem={item => (
                                (() => {
                                    const fileId = item.file_id || item.id;
                                    return (
                                <List.Item style={{ padding: '6px 0' }}
                                    actions={[
                                        <DeleteOutlined
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onDelete(fileId);
                                            }}
                                            style={{ color: '#C7C7CC', cursor: 'pointer', fontSize: 12 }}
                                        />
                                    ]}
                                >
                                    <List.Item.Meta
                                        avatar={<FileExcelOutlined style={{ color: '#34C759', fontSize: 16, marginTop: 4 }} />}
                                        title={<a onClick={() => onPreview(fileId)} style={{ fontSize: 12, color: '#1D1D1F', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>{item.filename}</a>}
                                    />
                                </List.Item>
                                    );
                                })()
                            )}
                            locale={{ emptyText: <span style={{ fontSize: 11, color: '#ccc' }}>暂无文件</span> }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

// === 节点工具箱组件 ===
function NodeToolbox({ onDragStart, onAddNode, savedWorkflows, onApplyWorkflow, onDeleteWorkflow, hiddenPresetWorkflowIds }) {
    const categoryKeys = Object.keys(NODE_CATEGORIES);
    const customWorkflows = Array.isArray(savedWorkflows) ? savedWorkflows : [];
    const hiddenPresetIds = Array.isArray(hiddenPresetWorkflowIds) ? hiddenPresetWorkflowIds : [];

    return (
        <Collapse
            ghost
            bordered={false}
            defaultActiveKey={categoryKeys}
            expandIconPosition="end"
            expandIcon={({ isActive }) => (
                isActive
                    ? <MinusOutlined style={{ color: '#1D1D1F', fontSize: 14 }} />
                    : <PlusOutlined style={{ color: '#1D1D1F', fontSize: 14 }} />
            )}
            style={{ background: 'transparent' }}
        >
            {Object.entries(NODE_CATEGORIES).map(([catKey, cat]) => (
                <Panel
                    key={catKey}
                    header={
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#1D1D1F', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ color: cat.color, display: 'inline-flex', alignItems: 'center' }}>{cat.icon}</span>
                            <span>{cat.label}</span>
                        </div>
                    }
                    style={{ background: 'transparent' }}
                >
                    {catKey === 'preset' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {PRESET_WORKFLOWS.filter(wf => !hiddenPresetIds.includes(wf.id)).map(wf => (
                                <DraggableWorkflow
                                    key={wf.id}
                                    workflow={wf}
                                    kind="preset"
                                    onApplyWorkflow={onApplyWorkflow}
                                    onDeleteWorkflow={onDeleteWorkflow}
                                />
                            ))}
                        </div>
                    )}

                    {catKey === 'custom' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {customWorkflows.length === 0 ? (
                                <div style={{ fontSize: 12, color: '#86868B', padding: '6px 2px' }}>
                                    暂无自定义工作流
                                </div>
                            ) : (
                                customWorkflows.map(wf => (
                                    <DraggableWorkflow
                                        key={wf.id}
                                        workflow={wf}
                                        kind="saved"
                                        onApplyWorkflow={onApplyWorkflow}
                                        onDeleteWorkflow={onDeleteWorkflow}
                                    />
                                ))
                            )}
                        </div>
                    )}

                    {catKey !== 'preset' && catKey !== 'custom' && (
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            {Object.entries(NODE_TYPES_CONFIG)
                                .filter(([_, cfg]) => cfg.category === catKey)
                                .map(([type, config]) => (
                                    <DraggableNode
                                        key={type}
                                        type={type}
                                        config={config}
                                        onDragStart={onDragStart}
                                        onAddNode={onAddNode}
                                    />
                                ))}
                        </div>
                    )}
                </Panel>
            ))}
        </Collapse>
    );
}

function App() {
    const [currentView, setCurrentView] = useState('canvas'); // 默认显示画布
    const [files, setFiles] = useState([]);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [userInput, setUserInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [executing, setExecuting] = useState(false);
    const [result, setResult] = useState(null);
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [savedWorkflows, setSavedWorkflows] = useState([]);
    const [showPreview, setShowPreview] = useState(false);
    const [previewData, setPreviewData] = useState(null);
    const [previewFileId, setPreviewFileId] = useState(null); // 预览的文件ID
    const [previewSheetName, setPreviewSheetName] = useState(null); // 预览的Sheet名
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [workflowName, setWorkflowName] = useState('');
    const [workflowDescription, setWorkflowDescription] = useState('');
    const [savingWorkflow, setSavingWorkflow] = useState(false);
    const [topToast, setTopToast] = useState({ open: false, text: '' });
    const topToastTimerRef = useRef(null);

    const HIDDEN_PRESET_WORKFLOWS_KEY = 'hidden_preset_workflows_v1';
    const [hiddenPresetWorkflowIds, setHiddenPresetWorkflowIds] = useState(() => {
        try {
            const raw = localStorage.getItem(HIDDEN_PRESET_WORKFLOWS_KEY);
            const parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    });
    const nodeIdCounterRef = useRef(0);

    const genNodeId = useCallback(() => {
        const uuid = globalThis?.crypto?.randomUUID?.();
        if (uuid) return `node_${uuid}`;
        nodeIdCounterRef.current += 1;
        return `node_${Date.now()}_${nodeIdCounterRef.current}`;
    }, []);

    const [selectedNode, setSelectedNode] = useState(null);
    const [showNodeConfig, setShowNodeConfig] = useState(false);
    const [nodeForm] = Form.useForm();
    const nodeFormAutoSaveTimerRef = useRef(null);
    const nodeFormProgrammaticSetRef = useRef(false);
    const [teamSelectOptions, setTeamSelectOptions] = useState([]);
    const [teamSelectLoading, setTeamSelectLoading] = useState(false);
    const teamSelectCacheRef = useRef({ key: '', options: [] });
    const [derivedColumnsByNodeId, setDerivedColumnsByNodeId] = useState({}); // {nodeId: string[]}
    const derivedColumnsSigRef = useRef({}); // {nodeId: sig}
    const derivedColumnsInFlightRef = useRef(new Set()); // Set<nodeId>
    const derivedColumnsErrorSigRef = useRef({}); // {nodeId: sig} avoid toast spam
    const [fileSheets, setFileSheets] = useState({});
    const [configFileId, setConfigFileId] = useState(null); // 当前配置中选择的文件ID
    const [configSheet, setConfigSheet] = useState(null); // 当前配置中选择的Sheet

    // ============ AI对话模式状态 ============

    const [aiDrawerVisible, setAiDrawerVisible] = useState(false);
    const [chatStep, setChatStep] = useState('select'); // select: 选表, chat: 对话
    const [chatSelectedTables, setChatSelectedTables] = useState([]); // 选中的表
    const [chatSessionId, setChatSessionId] = useState(null); // 对话会话ID
    const [chatMessages, setChatMessages] = useState([]); // 对话消息列表
    const [chatInput, setChatInput] = useState(''); // 用户输入
    const [chatLoading, setChatLoading] = useState(false); // 对话加载中
    const [chatStatus, setChatStatus] = useState(''); // clarifying / confirmed

    // ============ AI灵动岛：会话历史（本地） ============
    const ISLAND_CHAT_HISTORY_KEY = 'ai_island_chat_history_v1';
    const ISLAND_CHAT_ACTIVE_KEY = 'ai_island_chat_active_v1';

    const [islandChatThreads, setIslandChatThreads] = useState([]); // [{local_id,title,session_id,messages,selected_tables,chat_status,created_at,updated_at}]
    const [activeIslandThreadId, setActiveIslandThreadId] = useState(null);

    const buildBackendWorkflowConfig = useCallback((overrideNodeId, overrideConfig) => {
        return {
            nodes: nodes.map(n => ({
                id: n.id,
                type: n.data.type,
                label: n.data.label,
                config: (overrideNodeId && n.id === overrideNodeId && overrideConfig) ? overrideConfig : (n.data.config || {})
            })),
            edges: edges.map(e => ({ source: e.source, target: e.target }))
        };
    }, [nodes, edges]);

    const buildBackendFileMapping = useCallback(() => {
        const fileMapping = {};
        nodes.forEach(n => {
            if ((n.data.type === 'source' || n.data.type === 'source_csv') && n.data.config?.file_id) {
                fileMapping[n.data.config.file_id] = n.data.config.file_id;
            }
        });
        return fileMapping;
    }, [nodes]);

    const ensureTeamSelectOptions = useCallback(async (fileId, sheetName) => {
        if (!fileId || !sheetName) {
            setTeamSelectOptions([]);
            return;
        }
        const key = `${fileId}::${sheetName}`;
        if (teamSelectCacheRef.current.key === key && (teamSelectCacheRef.current.options || []).length > 0) {
            setTeamSelectOptions(teamSelectCacheRef.current.options);
            return;
        }
        setTeamSelectLoading(true);
        try {
            const resp = await excelApi.previewSheet(fileId, sheetName, 5000);
            const rows = Array.isArray(resp?.data) ? resp.data : [];
            const teams = Array.from(new Set(
                rows
                    .map(r => (r && r['办公室团队'] != null ? String(r['办公室团队']).trim() : ''))
                    .filter(Boolean)
            )).sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'));
            teamSelectCacheRef.current = { key, options: teams };
            setTeamSelectOptions(teams);
        } catch {
            setTeamSelectOptions([]);
        } finally {
            setTeamSelectLoading(false);
        }
    }, []);

    const ensureDerivedColumnsForNode = useCallback(async (nodeId) => {
        if (!nodeId) return;
        const id = String(nodeId);
        const node = nodes.find(n => n.id === id);
        if (!node) return;
        const nodeType = node?.data?.type;
        // source 节点的列元数据来自上传解析，不需要预览推导
        if (nodeType === 'source' || nodeType === 'source_csv') return;
        // AI 节点预览被后端禁止；避免自动触发
        if (nodeType === 'ai_agent') return;

        const shouldOverride = showNodeConfig && selectedNode?.id === id;
        const overrideConfig = (() => {
            if (!shouldOverride) return null;
            const values = nodeForm.getFieldsValue();
            const { _label, ...cfg } = values || {};
            return cfg;
        })();

        const incomingSources = edges
            .filter(e => e?.target === id)
            .map(e => String(e.source))
            .sort()
            .join(',');

        const sig = `${nodeType}::${incomingSources}::${JSON.stringify(overrideConfig || node.data.config || {})}`;
        if (derivedColumnsByNodeId?.[id] && derivedColumnsSigRef.current?.[id] === sig) return;
        if (derivedColumnsInFlightRef.current.has(id)) return;

        derivedColumnsInFlightRef.current.add(id);
        try {
            const workflowConfig = buildBackendWorkflowConfig(shouldOverride ? id : null, shouldOverride ? overrideConfig : null);
            const fileMapping = buildBackendFileMapping();
            const resp = await workflowApi.previewNode(workflowConfig, fileMapping, id, 600, 1);
            const cols = resp?.preview?.columns;
            if (resp?.success && Array.isArray(cols)) {
                derivedColumnsSigRef.current = { ...(derivedColumnsSigRef.current || {}), [id]: sig };
                setDerivedColumnsByNodeId(prev => ({ ...(prev || {}), [id]: cols }));
            } else {
                const lastErrSig = derivedColumnsErrorSigRef.current?.[id];
                if (lastErrSig !== sig) {
                    derivedColumnsErrorSigRef.current = { ...(derivedColumnsErrorSigRef.current || {}), [id]: sig };
                    message.warning('无法获取“处理结果”的列信息，请先确保上游数据源已配置，然后点击该节点的“预览(样本)”。');
                }
            }
        } catch (e) {
            const lastErrSig = derivedColumnsErrorSigRef.current?.[id];
            if (lastErrSig !== sig) {
                derivedColumnsErrorSigRef.current = { ...(derivedColumnsErrorSigRef.current || {}), [id]: sig };
                message.warning('无法获取“处理结果”的列信息，请先确保上游数据源已配置，然后点击该节点的“预览(样本)”。');
            }
        } finally {
            derivedColumnsInFlightRef.current.delete(id);
        }
    }, [nodes, edges, showNodeConfig, selectedNode, nodeForm, buildBackendWorkflowConfig, buildBackendFileMapping, derivedColumnsByNodeId]);

    // 当配置面板打开时，若选择了“处理结果”作为输入源，自动推导其输出列用于下拉框展示
    useEffect(() => {
        if (!showNodeConfig || !selectedNode) return;
        const fields = ['input_source', 'left_source', 'right_source', 'main_source', 'lookup_source', 'detail_source', 'summary_source'];
        const ids = fields.map(f => nodeForm.getFieldValue(f)).filter(Boolean);
        ids.forEach(id => ensureDerivedColumnsForNode(id));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showNodeConfig, selectedNode?.id]);

    const chatAbortControllerRef = useRef(null);

    const abortChatRequest = () => {
        try {
            chatAbortControllerRef.current?.abort?.();
        } catch { }
        chatAbortControllerRef.current = null;
    };

    const createChatAbortSignal = () => {
        abortChatRequest();
        const controller = new AbortController();
        chatAbortControllerRef.current = controller;
        return controller.signal;
    };

    const isCanceledRequest = (error) => {
        return error?.code === 'ERR_CANCELED' || error?.name === 'CanceledError' || error?.message === 'canceled';
    };

    const createIslandThreadId = () => {
        if (globalThis?.crypto?.randomUUID) return globalThis.crypto.randomUUID();
        return `thread_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    };

    const buildIslandThreadTitle = (msgs) => {
        const list = Array.isArray(msgs) ? msgs : [];
        const firstUser = list.find(m => m?.role === 'user' && typeof m?.content === 'string' && m.content.trim());
        const text = (firstUser?.content || '').trim();
        if (!text) return '新对话';
        return text.length > 18 ? `${text.slice(0, 18)}…` : text;
    };

    const getIslandGreetingMessage = () => ({
        role: 'assistant',
        content: [
            '你好！我是小助手。',
            '你可以先选择要分析的 Sheet（可选），然后直接告诉我你想查询/分析什么。',
            '也可以直接问我：你可以干什么？'
        ].join('\n')
    });

    const upsertIslandThread = (prev, nextThread) => {
        const threads = Array.isArray(prev) ? [...prev] : [];
        const idx = threads.findIndex(t => t?.local_id === nextThread.local_id);
        if (idx >= 0) threads[idx] = { ...threads[idx], ...nextThread };
        else threads.unshift(nextThread);
        threads.sort((a, b) => (b?.updated_at || 0) - (a?.updated_at || 0));
        return threads.slice(0, 30);
    };

    const loadIslandThread = (thread) => {
        if (!thread?.local_id) return;
        abortChatRequest();
        setActiveIslandThreadId(thread.local_id);
        setChatSessionId(thread.session_id || null);
        setChatMessages(Array.isArray(thread.messages) ? thread.messages : []);
        setChatSelectedTables(Array.isArray(thread.selected_tables) ? thread.selected_tables : []);
        setChatStatus(thread.chat_status || '');
        setChatLoading(false);
    };

    // 启动时：读取本地历史，并恢复上次会话（如果存在）
    useEffect(() => {
        try {
            const raw = localStorage.getItem(ISLAND_CHAT_HISTORY_KEY);
            const stored = raw ? JSON.parse(raw) : [];
            const threads = Array.isArray(stored) ? stored : [];
            setIslandChatThreads(threads);

            const activeId = localStorage.getItem(ISLAND_CHAT_ACTIVE_KEY);
            const activeThread = threads.find(t => t?.local_id === activeId);
            if (activeThread) {
                loadIslandThread(activeThread);
                return;
            }

            setChatSessionId(null);
            setChatStatus('');
            setChatMessages([getIslandGreetingMessage()]);
            setActiveIslandThreadId(createIslandThreadId());
        } catch (e) {
            console.warn('[AI-Island] load chat history failed:', e);
            setChatSessionId(null);
            setChatStatus('');
            setChatMessages([getIslandGreetingMessage()]);
            setActiveIslandThreadId(createIslandThreadId());
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // 同步：把当前会话快照写入历史（作为“可切换的会话”）
    useEffect(() => {
        if (!activeIslandThreadId) return;
        const now = Date.now();
        setIslandChatThreads(prev => {
            const existing = (Array.isArray(prev) ? prev : []).find(t => t?.local_id === activeIslandThreadId);
            const createdAt = existing?.created_at || now;
            return upsertIslandThread(prev, {
                local_id: activeIslandThreadId,
                title: buildIslandThreadTitle(chatMessages),
                session_id: chatSessionId || null,
                messages: Array.isArray(chatMessages) ? chatMessages : [],
                selected_tables: Array.isArray(chatSelectedTables) ? chatSelectedTables : [],
                chat_status: chatStatus || '',
                created_at: createdAt,
                updated_at: now
            });
        });
    }, [activeIslandThreadId, chatMessages, chatSelectedTables, chatSessionId, chatStatus]);

    // 持久化历史 + 当前会话指针
    useEffect(() => {
        try {
            localStorage.setItem(ISLAND_CHAT_HISTORY_KEY, JSON.stringify(islandChatThreads));
        } catch (e) {
            console.warn('[AI-Island] persist chat history failed:', e);
        }
    }, [islandChatThreads]);

    useEffect(() => {
        if (!activeIslandThreadId) return;
        try {
            localStorage.setItem(ISLAND_CHAT_ACTIVE_KEY, activeIslandThreadId);
        } catch (e) {
            console.warn('[AI-Island] persist active chat failed:', e);
        }
    }, [activeIslandThreadId]);

    // ============ 执行状态可视化 ============
    const [nodeExecutionStatus, setNodeExecutionStatus] = useState({}); // {nodeId: 'pending'|'running'|'success'|'error'}
    const [nodeResults, setNodeResults] = useState({}); // {nodeId: {columns, data, total_rows}}
    const [showNodeResultModal, setShowNodeResultModal] = useState(false);
    const [viewingNodeResult, setViewingNodeResult] = useState(null); // {nodeId, columns, data}
    const [nodePreviewLoading, setNodePreviewLoading] = useState(false);
    const [showNodePreviewModal, setShowNodePreviewModal] = useState(false);
    const [viewingNodePreview, setViewingNodePreview] = useState(null); // {nodeId, nodeName, columns, data, totalRows, stats}
    const [showNodeErrorDrawer, setShowNodeErrorDrawer] = useState(false);
    const [viewingNodeErrorId, setViewingNodeErrorId] = useState(null);
    const [lastExecutionLogs, setLastExecutionLogs] = useState([]);
    const [aiErrorSuggestLoading, setAiErrorSuggestLoading] = useState(false);
    const [aiErrorSuggestText, setAiErrorSuggestText] = useState('');
    const lastAutoOpenedErrorRef = useRef({ key: '', nodeId: '' });

    const summarizeErrorZh = useCallback((errorText, tracebackText = '') => {
        const raw = String(errorText || '');
        const tb = String(tracebackText || '');
        const text = `${raw}\n${tb}`.trim();
        if (!text) return '';

        // pandas query 相关
        if (/UndefinedVariableError|not defined/i.test(text)) {
            return "筛选条件里有未定义的值/变量：字符串要加引号（例如 `办公室团队 == '邯郸刘洋'`），列名建议用反引号包裹（例如 `` `办公室团队` ``）。";
        }
        if (/SyntaxError|invalid syntax|EOF while parsing/i.test(text)) {
            return "筛选条件语法错误：请使用 pandas query 语法，例如 `办公室团队 == '邯郸刘洋' and 门店id > 0`。";
        }

        // 缺列/列名不匹配
        const keyError = text.match(/KeyError:\s*['\"]?([^'\"\n]+)['\"]?/i);
        if (keyError?.[1]) {
            return `找不到列：${keyError[1]}。请检查：1) 是否选对 Sheet；2) 列名是否有空格/全角；3) 是否在“列重命名”里改过列名；4) 上游是否真的输出了该列。`;
        }
        if (/not in index|not found in axis|not in columns|找不到关联列|找不到金额列/i.test(text)) {
            return "找不到列或列名不一致：请检查两张表的列名是否完全一致（含空格/大小写/全角），必要时先用“列重命名”统一列名。";
        }

        // Sheet/文件相关
        const sheetNotFound = text.match(/Worksheet named ['\"]([^'\"]+)['\"] not found/i);
        if (sheetNotFound?.[1]) {
            return `找不到工作表（Sheet）：${sheetNotFound[1]}。请回到“Excel读取”节点确认 Sheet 名称选择正确。`;
        }
        if (/找不到文件|FileNotFoundError/i.test(text)) {
            return "找不到文件：请确认已上传文件，并在“Excel读取/CSV读取”节点选择了正确的文件。";
        }

        // 节点输入不足
        if (/需要两个输入|至少两个输入|needs two inputs/i.test(text)) {
            return "该节点需要两个上游输入：请确认有两条连线接入，并在“数据来源”里选择了对应输入。";
        }

        // 对账类常见
        if (/对账核算|reconcile/i.test(text) && /关联键|join_keys|detail_keys|summary_keys/i.test(text)) {
            return "对账核算关联键配置有问题：同名模式请用 join_keys；左右列名不同请开启“左右键不同名”，并保证两边键列数/顺序一致。";
        }

        return '';
    }, []);

    const openErrorDrawerForNode = useCallback((nodeId, cacheKey = '') => {
        if (!nodeId) return;
        const key = String(cacheKey || '');
        const last = lastAutoOpenedErrorRef.current || {};
        if (last.key === key && last.nodeId === nodeId) return;
        lastAutoOpenedErrorRef.current = { key, nodeId };
        setAiErrorSuggestText('');
        setViewingNodeErrorId(nodeId);
        setShowNodeErrorDrawer(true);
    }, []);

    const reactFlowWrapper = useRef(null);
    const [reactFlowInstance, setReactFlowInstance] = useState(null);
    const [showNodeLibrary, setShowNodeLibrary] = useState(false); // 控制组件库 Modal


    // 辅助函数：当从组件库拖拽节点时，存储节点信息（React Flow 识别的关键）
    const onDragStartHandler = useCallback((event, nodeType, nodeConfig) => {
        event.dataTransfer.setData('application/reactflow', JSON.stringify({ type: nodeType, config: nodeConfig }));
        event.dataTransfer.effectAllowed = 'move';
        console.log('Drag started for:', nodeType);
    }, []);

    const getFileId = (file) => file?.file_id || file?.id;

    const normalizeFiles = (list) => (Array.isArray(list) ? list.map(f => ({
        ...f,
        file_id: getFileId(f)
    })) : []);

    // 获取文件的Sheet列表
    const loadFileSheets = async (fileId) => {
        if (fileSheets[fileId]) return fileSheets[fileId];
        const file = files.find(f => getFileId(f) === fileId);
        if (file && file.sheets) {
            let sheets = file.sheets;
            if (typeof sheets === 'string') {
                try { sheets = JSON.parse(sheets); } catch { sheets = []; }
            }
            if (!Array.isArray(sheets)) sheets = [];
            setFileSheets(prev => ({ ...prev, [fileId]: sheets }));
            return sheets;
        }
        return [];
    };

    // 获取当前选中文件的Sheet选项
    const getSheetOptions = (fileId) => {
        if (!fileId) return [];
        const file = files.find(f => getFileId(f) === fileId);
        if (file && file.sheets) {
            let sheets = file.sheets;
            if (typeof sheets === 'string') {
                try { sheets = JSON.parse(sheets); } catch { return []; }
            }
            if (Array.isArray(sheets)) {
                return sheets.map(s => ({ label: `${s.name} (${s.row_count}行)`, value: s.name }));
            }
        }
        return [];
    };

    // 获取指定文件+Sheet的列名
    const getColumnOptions = (fileId, sheetName) => {
        if (!fileId) return [];
        const file = files.find(f => getFileId(f) === fileId);
        if (file && file.sheets) {
            let sheets = file.sheets;
            if (typeof sheets === 'string') {
                try { sheets = JSON.parse(sheets); } catch { return []; }
            }
            if (Array.isArray(sheets)) {
                const sheet = sheets.find(s => s.name === sheetName) || sheets[0];
                if (sheet && sheet.columns) {
                    return sheet.columns.map(c => ({ label: c, value: c }));
                }
            }
        }
        return [];
    };

    // 获取当前节点可用的列（从上游source节点获取）
    const getAvailableColumns = () => {
        if (!selectedNode) return [];
        const allColumns = [];

        // 找到所有连接到当前节点的上游source节点
        const findUpstreamSources = (nodeId, visited = new Set()) => {
            if (visited.has(nodeId)) return;
            visited.add(nodeId);

            for (const edge of edges) {
                if (edge.target === nodeId) {
                    const sourceNode = nodes.find(n => n.id === edge.source);
                    if (sourceNode) {
                        if (sourceNode.data.type === 'source' || sourceNode.data.type === 'source_csv') {
                            const fileId = sourceNode.data.config?.file_id;
                            const sheetName = sourceNode.data.config?.sheet_name;
                            const cols = getColumnOptions(fileId, sheetName);
                            cols.forEach(c => {
                                if (!allColumns.find(ac => ac.value === c.value)) {
                                    allColumns.push(c);
                                }
                            });
                        }
                        // 继续向上游查找
                        findUpstreamSources(sourceNode.id, visited);
                    }
                }
            }
        };

        findUpstreamSources(selectedNode.id);
        return allColumns;
    };

    // 获取上游文件节点的所有Sheet选项（用于下游节点选择）
    const getUpstreamSheets = () => {
        console.log('[DEBUG] getUpstreamSheets called, selectedNode:', selectedNode?.id, 'edges:', edges.length);
        if (!selectedNode) return [];
        const allSheets = [];

        // 找到连接到当前节点的上游source节点
        for (const edge of edges) {
            console.log('[DEBUG] checking edge:', edge.source, ' -> ', edge.target);
            if (edge.target === selectedNode.id) {
                const sourceNode = nodes.find(n => n.id === edge.source);
                console.log('[DEBUG] found upstream node:', sourceNode?.data?.type, 'config:', sourceNode?.data?.config);
                if (sourceNode && (sourceNode.data.type === 'source' || sourceNode.data.type === 'source_csv')) {
                    const fileId = sourceNode.data.config?.file_id;
                    console.log('[DEBUG] source fileId:', fileId);
                    const file = files.find(f => f.file_id === fileId);
                    console.log('[DEBUG] found file:', file?.filename, 'sheets:', file?.sheets);
                    if (file && file.sheets) {
                        // file.sheets 可能是字符串或已经是数组
                        let sheets = file.sheets;
                        if (typeof sheets === 'string') {
                            try { sheets = JSON.parse(sheets); } catch (e) { sheets = []; }
                        }
                        console.log('[DEBUG] sheets is array:', Array.isArray(sheets), 'count:', sheets?.length);
                        if (Array.isArray(sheets)) {
                            sheets.forEach(s => {
                                allSheets.push({
                                    label: `${file.filename} → ${s.name} (${s.row_count}行)`,
                                    value: `${fileId}::${s.name}`,
                                    fileId: fileId,
                                    sheetName: s.name,
                                    columns: s.columns || []
                                });
                            });
                        }
                    }
                }
            }
        }
        console.log('[DEBUG] returning sheets:', allSheets.length);
        return allSheets;
    };

    // 获取选中Sheet的列选项
    const getSelectedSheetColumns = (sheetValue) => {
        if (!sheetValue) return [];
        const sheets = getUpstreamSheets();
        const sheet = sheets.find(s => s.value === sheetValue);
        return sheet ? sheet.columns.map(c => ({ label: c, value: c })) : [];
    };

    // 连线更新（拖拽断开/重连）
    const onEdgeUpdate = useCallback((oldEdge, newConnection) => setEdges((els) => updateEdge(oldEdge, newConnection, els)), [setEdges]);
    const onEdgeUpdateEnd = useCallback((_, edge) => setEdges((els) => els.filter((e) => e.id !== edge.id)), [setEdges]);

    const onConnect = useCallback(
        (params) => setEdges((eds) => addEdge({
            ...params, markerEnd: { type: MarkerType.ArrowClosed },
            style: { strokeWidth: 2, stroke: '#C7C7CC' }, type: 'default', animated: true
        }, eds)),
        [setEdges]
    );

    const onDragOver = useCallback((event) => {
        event.preventDefault();
        // 工作流从“库”拖到画布应为 copy；普通节点保持 move
        const types = Array.from(event.dataTransfer?.types || []);
        const isWorkflow = types.includes('application/excelflow-workflow');
        event.dataTransfer.dropEffect = isWorkflow ? 'copy' : 'move';
        console.log('[DragDrop] onDragOver triggered');
    }, []);

    const onDrop = useCallback(async (event) => {
        event.preventDefault();
        console.log('[DragDrop] onDrop triggered');
        console.log('[DragDrop] reactFlowWrapper.current:', reactFlowWrapper.current);
        console.log('[DragDrop] reactFlowInstance:', reactFlowInstance);

        if (!reactFlowWrapper.current) {
            console.error('[DragDrop] ERROR: reactFlowWrapper.current is null!');
            return;
        }
        if (!reactFlowInstance) {
            console.error('[DragDrop] ERROR: reactFlowInstance is null!');
            return;
        }

        const workflowRaw = event.dataTransfer.getData('application/excelflow-workflow');
        if (workflowRaw) {
            try {
                const payload = JSON.parse(workflowRaw);

                const applyWorkflowConfig = (workflowConfig) => {
                    const { nodes: flowNodes, edges: flowEdges } = workflowToReactFlow(workflowConfig);
                    if (!Array.isArray(flowNodes) || flowNodes.length === 0) {
                        message.warning('工作流为空或格式不正确');
                        return;
                    }
                    setNodes(flowNodes);
                    setEdges(Array.isArray(flowEdges) ? flowEdges : []);
                    setResult(null);

                    requestAnimationFrame(() => {
                        try {
                            reactFlowInstance?.fitView?.({ padding: 0.2, duration: 300 });
                        } catch (e) {
                            console.warn('[DragDrop] fitView failed:', e);
                        }
                    });
                };

                if (payload?.kind === 'preset' && payload?.config) {
                    applyWorkflowConfig(payload.config);
                    message.success(`已加载预设工作流：${payload.name || payload.id || ''}`.trim());
                    return;
                }

                if (payload?.kind === 'saved' && payload?.workflow_id) {
                    const workflowData = await workflowApi.get(payload.workflow_id);
                    applyWorkflowConfig(workflowData?.config);
                    message.success(`已加载自定义工作流：${payload.name || payload.workflow_id}`);
                    return;
                }

                message.warning('无法识别的工作流拖拽数据');
                return;
            } catch (e) {
                console.error('[DragDrop] workflow drop failed:', e);
                message.error('工作流加载失败：数据解析错误');
                return;
            }
        }

        const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
        console.log('[DragDrop] reactFlowBounds:', reactFlowBounds);

        const rawData = event.dataTransfer.getData('application/reactflow');
        console.log('[DragDrop] rawData:', rawData);

        if (!rawData) {
            console.error('[DragDrop] ERROR: No data in dataTransfer!');
            return;
        }

        let data;
        try {
            data = JSON.parse(rawData);
        } catch {
            const fallbackConfig = NODE_TYPES_CONFIG[rawData];
            if (!fallbackConfig) {
                console.error('[DragDrop] ERROR: Unknown node type:', rawData);
                return;
            }
            data = { type: rawData, config: fallbackConfig };
        }
        console.log('[DragDrop] Parsed data:', data);

        const position = reactFlowInstance.project({
            x: event.clientX - reactFlowBounds.left,
            y: event.clientY - reactFlowBounds.top,
        });
        console.log('[DragDrop] Calculated position:', position);

        const newNode = {
            id: genNodeId(),
            type: 'custom',
            position,
            data: { type: data.type, label: data.config.label, description: '点击配置', config: {} },
        };
        console.log('[DragDrop] Creating new node:', newNode);

        setNodes((nds) => nds.concat(newNode));
        setSelectedNode(newNode);
        try {
            nodeFormProgrammaticSetRef.current = true;
            nodeForm.resetFields();
            nodeForm.setFieldsValue({ _label: newNode.data.label });
        } finally {
            nodeFormProgrammaticSetRef.current = false;
        }
        setConfigFileId(null);
        setConfigSheet(null);
        setShowNodeConfig(true);
        console.log('[DragDrop] Node created successfully');
    }, [reactFlowInstance, setNodes, setEdges, setResult, genNodeId, nodeForm]);

    const addNodeFromLibrary = useCallback((type, config) => {
        if (!reactFlowWrapper.current) {
            message.warning('画布未就绪：找不到画布容器');
            return;
        }
        if (!reactFlowInstance) {
            message.warning('画布未就绪：ReactFlow 尚未初始化');
            return;
        }

        const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
        const position = reactFlowInstance.project({
            x: reactFlowBounds.width / 2,
            y: reactFlowBounds.height / 2,
        });

        const newNode = {
            id: genNodeId(),
            type: 'custom',
            position,
            data: { type, label: config.label, description: '点击配置', config: {} },
        };

        setNodes((nds) => nds.concat(newNode));
        setSelectedNode(newNode);
        try {
            nodeFormProgrammaticSetRef.current = true;
            nodeForm.resetFields();
            nodeForm.setFieldsValue({ _label: newNode.data.label });
        } finally {
            nodeFormProgrammaticSetRef.current = false;
        }
        setConfigFileId(null);
        setConfigSheet(null);
        setShowNodeConfig(true);
    }, [reactFlowInstance, setNodes, setSelectedNode, setShowNodeConfig, setConfigFileId, setConfigSheet, genNodeId, nodeForm]);

    const onNodeClick = useCallback((event, node) => {
        setSelectedNode(node);
        const config = node.data.config || {};
        // 将节点Label也放入表单进行编辑
        if (nodeFormAutoSaveTimerRef.current) clearTimeout(nodeFormAutoSaveTimerRef.current);
        try {
            nodeFormProgrammaticSetRef.current = true;
            nodeForm.resetFields();
            const type = node?.data?.type;
            const renamePairs = (type === 'transform' && config?.rename_map && typeof config.rename_map === 'object' && !Array.isArray(config.rename_map))
                ? Object.entries(config.rename_map).map(([from, to]) => ({ from, to }))
                : undefined;
            nodeForm.setFieldsValue({ ...config, ...(renamePairs ? { rename_pairs: renamePairs } : {}), _label: node.data.label });
        } finally {
            nodeFormProgrammaticSetRef.current = false;
        }
        setConfigFileId(config.file_id || null);
        setConfigSheet(config.sheet_name || null);
        setShowNodeConfig(true);
    }, [nodeForm]);

    const saveNodeConfig = () => {
        const values = nodeForm.getFieldsValue();
        // 提取Label
        const { _label, ...config } = values;

        setNodes((nds) => nds.map((node) => {
            if (node.id === selectedNode.id) {
                return {
                    ...node,
                    data: {
                        ...node.data,
                        label: _label || node.data.label, // 更新Label
                        config: config,
                        description: getNodeDescription(node.data.type, config)
                    }
                };
            }
            return node;
        }));
        setShowNodeConfig(false);
        message.success('配置已更新');
    };

    const getNodeDescription = (type, config) => {
        switch (type) {
            case 'source':
            case 'source_csv':
                const file = files.find(f => getFileId(f) === config.file_id);
                return file ? `${file.filename.slice(0, 10)}...` : '未选择文件';
            case 'source_optional':
                const optFile = files.find(f => getFileId(f) === config.file_id);
                return optFile ? `${optFile.filename.slice(0, 10)}...` : '未配置（空表）';
            case 'transform': return config.filter_code || '数据处理';
            case 'join': return config.how ? `${config.how} join` : '配置关联';
            case 'group_aggregate': return config.group_by?.join(', ') || '分组聚合';
            case 'fill_na': return config.strategy || '缺失值处理';
            case 'deduplicate': return '去重';
            case 'pivot': return '透视表';
            case 'code': return 'Python脚本';
            case 'ai_agent': return config.target_column || 'AI处理';
            case 'profit_income': return '收入汇总';
            case 'profit_cost': return '成本汇总';
            case 'profit_expense': return '费用汇总';
            case 'profit_summary': return '利润汇总';
            case 'profit_table': {
                const f2 = files.find(f => getFileId(f) === config.file_id);
                return f2 ? `${f2.filename.slice(0, 10)}...` : '未选择文件';
            }
            case 'output':
            case 'output_csv': return config.filename || '输出文件';
            default: return '已配置';
        }
    };

    const applyNodeConfigSilentlyForNode = (nodeId, allValues) => {
        if (!nodeId) return;
        const { _label, ...config } = allValues || {};

        setNodes((nds) => nds.map((node) => {
            if (node.id !== nodeId) return node;
            return {
                ...node,
                data: {
                    ...node.data,
                    label: _label || node.data.label,
                    config,
                    description: getNodeDescription(node.data.type, config)
                }
            };
        }));
    };

    const handleNodeFormValuesChange = (_changedValues, allValues) => {
        if (nodeFormProgrammaticSetRef.current) return;
        if (!showNodeConfig) return;
        const nodeId = selectedNode?.id;
        if (!nodeId) return;
        const nodeType = selectedNode?.data?.type;

        let nextAllValues = allValues;
        if (nodeType === 'transform') {
            const pairs = Array.isArray(allValues?.rename_pairs) ? allValues.rename_pairs : [];
            const renameMap = {};
            for (const item of pairs) {
                const from = String(item?.from ?? '').trim();
                const to = String(item?.to ?? '').trim();
                if (!from || !to) continue;
                if (from === to) continue;
                renameMap[from] = to;
            }

            nextAllValues = { ...(allValues || {}), rename_map: renameMap };

            const currentMap = allValues?.rename_map && typeof allValues.rename_map === 'object' ? allValues.rename_map : {};
            const same = JSON.stringify(currentMap) === JSON.stringify(renameMap);
            if (!same) {
                try {
                    nodeFormProgrammaticSetRef.current = true;
                    nodeForm.setFieldValue('rename_map', renameMap);
                } finally {
                    nodeFormProgrammaticSetRef.current = false;
                }
            }
        }

        if (nodeFormAutoSaveTimerRef.current) clearTimeout(nodeFormAutoSaveTimerRef.current);
        nodeFormAutoSaveTimerRef.current = setTimeout(() => {
            applyNodeConfigSilentlyForNode(nodeId, nextAllValues);
        }, 350);
    };

    const deleteSelectedNode = () => {
        if (selectedNode) {
            setNodes((nds) => nds.filter((node) => node.id !== selectedNode.id));
            setEdges((eds) => eds.filter((edge) => edge.source !== selectedNode.id && edge.target !== selectedNode.id));
            setShowNodeConfig(false);
            setSelectedNode(null);
        }
    };

    useEffect(() => {
        const init = async () => {
            try {
                const fileData = await excelApi.getFiles();
                setFiles(normalizeFiles(fileData.files));
                const workflowData = await workflowApi.getList();
                setSavedWorkflows(workflowData.workflows || []);
            } catch (error) {
                console.error('初始化失败:', error);
            }
        };
        init();
    }, []);

    useEffect(() => {
        return () => {
            if (topToastTimerRef.current) clearTimeout(topToastTimerRef.current);
            if (nodeFormAutoSaveTimerRef.current) clearTimeout(nodeFormAutoSaveTimerRef.current);
        };
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem(HIDDEN_PRESET_WORKFLOWS_KEY, JSON.stringify(hiddenPresetWorkflowIds || []));
        } catch { }
    }, [hiddenPresetWorkflowIds]);

    const showTopGlassToast = useCallback((text) => {
        if (topToastTimerRef.current) clearTimeout(topToastTimerRef.current);
        setTopToast({ open: true, text: String(text || '') });
        topToastTimerRef.current = setTimeout(() => {
            setTopToast({ open: false, text: '' });
        }, 3000);
    }, []);

    const handleUpload = async ({ file }) => {
        setLoading(true);
        try {
            const result = await excelApi.upload(file);
            message.success('上传成功');
            const data = await excelApi.getFiles();
            setFiles(normalizeFiles(data.files));
            setSelectedFiles(prev => [...prev, result.file_id]);
        } catch (error) {
            message.error('上传失败');
        } finally {
            setLoading(false);
        }
        return false;
    };

    const deleteFile = async (fileId) => {
        try {
            await excelApi.deleteFile(fileId);
            const data = await excelApi.getFiles();
            setFiles(normalizeFiles(data.files));
            setSelectedFiles(prev => prev.filter(id => id !== fileId));
            message.success('文件已删除');
        } catch (error) {
            console.error('Delete file failed:', error);
            message.error('删除文件失败: ' + (error.response?.data?.detail || error.message));
        }
    };

    const handlePreview = async (fileId, sheetName) => {
        try {
            const data = await excelApi.previewSheet(fileId, sheetName, 20);
            setPreviewData({
                columns: data.columns.map(col => ({
                    title: col,
                    dataIndex: col,
                    key: col,
                    width: 150,
                    ellipsis: true, // 防止自动换行
                    render: (text) => (
                        <Tooltip title={text} placement="topLeft">
                            <span style={{ display: 'block', maxWidth: '100%', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                                {text}
                            </span>
                        </Tooltip>
                    )
                })),
                dataSource: data.data.map((row, idx) => ({ key: idx, ...row })),
                total: data.total_rows
            });
            setPreviewFileId(fileId);
            setPreviewSheetName(sheetName);
            setShowPreview(true);
        } catch (error) {
            message.error('预览失败');
        }
    };

    const handleGenerate = async () => {
        if (!userInput.trim()) return message.warning('请输入描述');
        if (selectedFiles.length === 0) return message.warning('请选择文件');
        setGenerating(true);
        try {
            const result = await aiApi.generateWorkflow(userInput, selectedFiles);
            if (result.success && result.workflow) {
                const flowNodes = (result.workflow.nodes || []).map((node, index) => ({
                    id: node.id,
                    type: 'custom',
                    position: { x: 100 + (index % 3) * 280, y: 100 + Math.floor(index / 3) * 180 },
                    data: { type: node.type, label: node.label || NODE_TYPES_CONFIG[node.type]?.label || node.type, description: 'AI生成', config: node.config }
                }));
                const flowEdges = (result.workflow.edges || []).map((edge, index) => ({
                    id: `e${index}`, source: edge.source, target: edge.target,
                    type: 'smoothstep', style: { strokeWidth: 2, stroke: '#C7C7CC' },
                    markerEnd: { type: MarkerType.ArrowClosed }
                }));
                setNodes(flowNodes);
                setEdges(flowEdges);
                message.success('已生成工作流');
            }
        } catch (error) {
            message.error('生成失败');
        } finally {
            setGenerating(false);
        }
    };

    const handleExecute = async () => {
        if (nodes.length === 0) return;
        setExecuting(true);
        const runKey = `execute:${Date.now()}`;

        // 重置执行状态
        setNodeExecutionStatus({});
        setNodeResults({});
        setLastExecutionLogs([]);
        setShowNodeErrorDrawer(false);
        setViewingNodeErrorId(null);
        setAiErrorSuggestText('');

        // 设置所有节点为pending状态
        const initialStatus = {};
        nodes.forEach(n => { initialStatus[n.id] = 'pending'; });
        setNodeExecutionStatus(initialStatus);

        // 更新节点显示状态
        setNodes(nds => nds.map(n => ({
            ...n,
            data: { ...n.data, executionStatus: 'pending', errorMessage: undefined, errorBubbleDismissed: false, nodeId: n.id, onViewResult: handleViewNodeResult, onViewError: handleViewNodeError, onDismissErrorBubble: handleDismissNodeErrorBubble }
        })));

        try {
            const applyExecutionPayload = (payload) => {
                if (!payload || typeof payload !== 'object') return;

                if (Array.isArray(payload.logs)) setLastExecutionLogs(payload.logs);

                // 更新节点状态
                if (payload.node_status) {
                    setNodeExecutionStatus(payload.node_status);
                    setNodes(nds => nds.map(n => ({
                        ...n,
                        data: {
                            ...n.data,
                            executionStatus: payload.node_status[n.id] || 'pending',
                            errorMessage: payload.node_results?.[n.id]?.error,
                            errorBubbleDismissed: false,
                            nodeId: n.id,
                            onViewResult: handleViewNodeResult,
                            onViewError: handleViewNodeError,
                            onDismissErrorBubble: handleDismissNodeErrorBubble
                        }
                    })));
                }

                // 存储节点结果
                if (payload.node_results) {
                    setNodeResults(payload.node_results);
                }

                // 更新边的样式
                setEdges(eds => eds.map(e => {
                    const sourceStatus = payload.node_status?.[e.source];
                    const targetStatus = payload.node_status?.[e.target];
                    if (sourceStatus === 'success' && (targetStatus === 'success' || targetStatus === 'pending')) {
                        return { ...e, style: { ...e.style, stroke: '#34C759', strokeWidth: 3 } };
                    } else if (sourceStatus === 'error' || targetStatus === 'error') {
                        return { ...e, style: { ...e.style, stroke: '#FF3B30', strokeWidth: 2 } };
                    }
                    return e;
                }));

                const errorNodeId = Object.entries(payload.node_status || {}).find(([, s]) => s === 'error')?.[0];
                if (errorNodeId) {
                    // 异步打开，避免与 setState 同步批处理冲突导致内容为空
                    setTimeout(() => openErrorDrawerForNode(errorNodeId, runKey), 0);
                }
            };

            const config = {
                nodes: nodes.map(n => ({ id: n.id, type: n.data.type, label: n.data.label, config: n.data.config || {} })),
                edges: edges.map(e => ({ source: e.source, target: e.target }))
            };
            const fileMapping = {};
            nodes.forEach(n => {
                if ((n.data.type === 'source' || n.data.type === 'source_csv') && n.data.config?.file_id) {
                    fileMapping[n.data.config.file_id] = n.data.config.file_id;
                }
            });

            const result = await workflowApi.execute(config, fileMapping);

            applyExecutionPayload(result);

            if (result.success) {
                setResult({
                    columns: result.preview.columns.map(col => ({ title: col, dataIndex: col, key: col, width: 150 })),
                    dataSource: result.preview.data.map((row, idx) => ({ key: idx, ...row })),
                    total: result.preview.total_rows,
                    outputFile: result.output_file
                });
                message.success('执行完成！点击节点下方绿色图标查看结果');
            } else {
                message.error('执行失败: ' + (result.error || '未知错误'));
            }
        } catch (e) {
            const detail = e?.response?.data?.detail;
            if (detail && typeof detail === 'object') {
                // 失败时也要更新 node_status/node_results/logs，避免状态“滞后一轮”
                if (Array.isArray(detail.logs)) setLastExecutionLogs(detail.logs);
                if (detail.node_results) setNodeResults(detail.node_results);
                if (detail.node_status) setNodeExecutionStatus(detail.node_status);
                setNodes(nds => nds.map(n => ({
                    ...n,
                    data: {
                        ...n.data,
                        executionStatus: detail.node_status?.[n.id] || n.data.executionStatus || 'pending',
                        errorMessage: detail.node_results?.[n.id]?.error,
                        errorBubbleDismissed: false,
                        nodeId: n.id,
                        onViewResult: handleViewNodeResult,
                        onViewError: handleViewNodeError,
                        onDismissErrorBubble: handleDismissNodeErrorBubble
                    }
                })));
                setEdges(eds => eds.map(ed => {
                    const sourceStatus = detail.node_status?.[ed.source];
                    const targetStatus = detail.node_status?.[ed.target];
                    if (sourceStatus === 'success' && (targetStatus === 'success' || targetStatus === 'pending')) {
                        return { ...ed, style: { ...ed.style, stroke: '#34C759', strokeWidth: 3 } };
                    } else if (sourceStatus === 'error' || targetStatus === 'error') {
                        return { ...ed, style: { ...ed.style, stroke: '#FF3B30', strokeWidth: 2 } };
                    }
                    return ed;
                }));

                message.error('执行失败: ' + (detail.error || '未知错误'));
                const errorNodeId = Object.entries(detail.node_status || {}).find(([, s]) => s === 'error')?.[0];
                if (errorNodeId) setTimeout(() => openErrorDrawerForNode(errorNodeId, runKey), 0);
            } else {
                message.error('执行出错: ' + (e?.response?.data?.detail || e.message || '未知错误'));
            }
        } finally {
            setExecuting(false);
        }
    };

    const handlePreviewNode = useCallback(async (nodeId) => {
        if (!nodeId) return;
        setNodePreviewLoading(true);
        const runKey = `preview:${nodeId}:${Date.now()}`;
        try {
            const shouldOverrideConfig = showNodeConfig && selectedNode?.id === nodeId;
            const overrideConfig = (() => {
                if (!shouldOverrideConfig) return null;
                const values = nodeForm.getFieldsValue();
                const { _label, ...cfg } = values || {};
                return cfg;
            })();

            const workflowConfig = {
                nodes: nodes.map(n => ({
                    id: n.id,
                    type: n.data.type,
                    label: n.data.label,
                    config: (n.id === nodeId && overrideConfig) ? overrideConfig : (n.data.config || {})
                })),
                edges: edges.map(e => ({ source: e.source, target: e.target }))
            };

            const fileMapping = {};
            nodes.forEach(n => {
                if ((n.data.type === 'source' || n.data.type === 'source_csv') && n.data.config?.file_id) {
                    fileMapping[n.data.config.file_id] = n.data.config.file_id;
                }
            });

            const resp = await workflowApi.previewNode(workflowConfig, fileMapping, nodeId, 600, 50);
            if (resp?.success) {
                setViewingNodePreview({
                    nodeId,
                    nodeName: nodes.find(n => n.id === nodeId)?.data?.label || nodeId,
                    columns: resp.preview?.columns || [],
                    data: resp.preview?.data || [],
                    totalRows: resp.preview?.total_rows || 0,
                    stats: resp.stats || {}
                });
                setShowNodePreviewModal(true);
            } else {
                message.error('预览失败: ' + (resp?.error || '未知错误'));
                const errorNodeId = Object.entries(resp?.node_status || {}).find(([, s]) => s === 'error')?.[0];
                if (errorNodeId) setTimeout(() => openErrorDrawerForNode(errorNodeId, runKey), 0);
            }
        } catch (e) {
            const detail = e?.response?.data?.detail;
            if (detail && typeof detail === 'object') {
                message.error('预览失败: ' + (detail.error || '未知错误'));
                const errorNodeId = Object.entries(detail.node_status || {}).find(([, s]) => s === 'error')?.[0];
                if (errorNodeId) setTimeout(() => openErrorDrawerForNode(errorNodeId, runKey), 0);
            } else {
                message.error('预览出错: ' + (e?.response?.data?.detail || e.message || '未知错误'));
            }
        } finally {
            setNodePreviewLoading(false);
        }
    }, [nodes, edges, showNodeConfig, selectedNode, nodeForm, openErrorDrawerForNode]);

    const buildWorkflowConfigForSave = useCallback(() => {
        const sanitizeNodeData = (data) => {
            const safe = data && typeof data === 'object' ? data : {};
            return {
                type: safe.type,
                label: safe.label,
                description: safe.description,
                config: safe.config || {}
            };
        };

        const safeNodes = (Array.isArray(nodes) ? nodes : []).map((n) => ({
            id: n.id,
            type: n.type || 'custom',
            position: n.position,
            data: sanitizeNodeData(n.data)
        }));

        const safeEdges = (Array.isArray(edges) ? edges : []).map((e) => ({
            id: e.id,
            source: e.source,
            target: e.target,
            type: e.type,
            animated: e.animated,
            style: e.style,
            markerEnd: e.markerEnd
        }));

        return { nodes: safeNodes, edges: safeEdges };
    }, [nodes, edges]);

    const handleCanvasSaveClick = useCallback(() => {
        if (!nodes || nodes.length === 0) {
            showTopGlassToast('暂无可用工作流，请先绘制出想要的工作流');
            return;
        }
        setShowSaveModal(true);
    }, [nodes, showTopGlassToast]);

    const handleConfirmSaveWorkflow = useCallback(async () => {
        const name = String(workflowName || '').trim();
        if (!name) {
            message.warning('请输入自定义名称');
            return;
        }

        setSavingWorkflow(true);
        try {
            const config = buildWorkflowConfigForSave();
            await workflowApi.save(name, String(workflowDescription || ''), config);

            const workflowData = await workflowApi.getList();
            setSavedWorkflows(workflowData.workflows || []);

            message.success('工作流已保存');
            setShowSaveModal(false);
            setWorkflowName('');
            setWorkflowDescription('');
        } catch (e) {
            message.error('保存失败: ' + (e?.response?.data?.detail || e.message || '未知错误'));
        } finally {
            setSavingWorkflow(false);
        }
    }, [workflowName, workflowDescription, buildWorkflowConfigForSave]);

    const applyWorkflowToCanvas = useCallback((workflowConfig) => {
        const { nodes: flowNodes, edges: flowEdges } = workflowToReactFlow(workflowConfig);
        if (!Array.isArray(flowNodes) || flowNodes.length === 0) {
            message.warning('工作流为空或格式不正确');
            return;
        }
        setNodes(flowNodes);
        setEdges(Array.isArray(flowEdges) ? flowEdges : []);
        setResult(null);
        requestAnimationFrame(() => {
            try {
                reactFlowInstance?.fitView?.({ padding: 0.2, duration: 300 });
            } catch (e) {
                console.warn('[Workflow] fitView failed:', e);
            }
        });
    }, [reactFlowInstance]);

    const handleApplyWorkflowFromLibrary = useCallback(async ({ kind, workflow }) => {
        try {
            if (kind === 'preset') {
                applyWorkflowToCanvas(workflow?.config);
                message.success(`已加载预设工作流：${workflow?.name || workflow?.id || ''}`.trim());
                return;
            }
            if (kind === 'saved') {
                const workflowData = await workflowApi.get(workflow?.id);
                applyWorkflowToCanvas(workflowData?.config);
                message.success(`已加载自定义工作流：${workflow?.name || workflow?.id}`);
            }
        } catch (e) {
            console.error('[Workflow] apply failed:', e);
            message.error('工作流加载失败: ' + (e?.response?.data?.detail || e.message || '未知错误'));
        }
    }, [applyWorkflowToCanvas]);

    const handleDeleteWorkflowFromLibrary = useCallback(({ kind, workflow }) => {
        const id = workflow?.id;
        const name = workflow?.name || id || '';

        if (kind === 'preset') {
            Modal.confirm({
                title: '删除预设工作流',
                content: `确认从节点库隐藏预设“${name}”？（不会影响已放到画布上的工作流）`,
                okText: '删除',
                okButtonProps: { danger: true },
                cancelText: '取消',
                onOk: () => {
                    if (!id) return;
                    setHiddenPresetWorkflowIds((prev) => {
                        const next = Array.isArray(prev) ? [...prev] : [];
                        if (!next.includes(id)) next.push(id);
                        return next;
                    });
                }
            });
            return;
        }

        if (kind === 'saved') {
            Modal.confirm({
                title: '删除自定义工作流',
                content: `确认删除自定义工作流“${name}”？此操作不可恢复。`,
                okText: '删除',
                okButtonProps: { danger: true },
                cancelText: '取消',
                onOk: async () => {
                    try {
                        if (!id) return;
                        await workflowApi.delete(id);
                        const workflowData = await workflowApi.getList();
                        setSavedWorkflows(workflowData.workflows || []);
                        message.success('已删除');
                    } catch (e) {
                        message.error('删除失败: ' + (e?.response?.data?.detail || e.message || '未知错误'));
                    }
                }
            });
        }
    }, []);

    const buildNodeErrorSuggestions = useCallback((node, errorText) => {
        const nodeType = node?.data?.type;
        const msg = String(errorText || '');
        const suggestions = [];

        if (nodeType === 'source' || nodeType === 'source_csv') {
            suggestions.push('检查是否已选择文件；如果是 Excel，请确认已选择正确的 Sheet。');
            suggestions.push('在左侧“文件资源”里先预览，确认表头/列名是否符合预期。');
            if (/file_id|文件|not found|找不到/i.test(msg)) suggestions.push('如果提示找不到文件/文件为空，请重新选择文件并保存节点配置。');
            if (/sheet|worksheet|工作表/i.test(msg)) suggestions.push('如果提示 Sheet 相关错误，请重新从下拉选择正确的 Sheet。');
        }

        if (nodeType === 'output' || nodeType === 'output_csv') {
            suggestions.push('检查文件名/输出格式配置是否有效，避免包含非法字符。');
        }

        if (nodeType === 'code') {
            suggestions.push('Python 节点只能使用上游输入的 DataFrame：`inputs[0]`、`inputs[1]`…，产出请赋值给 `result`。');
            suggestions.push('如果是列名/变量名错误，请先 `print(df.columns)`（或在日志中输出列名）再调整。');
        }

        if (nodeType === 'reconcile') {
            suggestions.push('对账核算需要两个输入：明细表（左）+ 汇总表（右），请确认有两条连线接入该节点。');
            suggestions.push('确认已配置关联维度（join_keys）以及两边的金额列（明细金额列/汇总金额列）。');
            suggestions.push('如果 join_keys 在汇总表不唯一（同一门店多行），会导致重复/放大：先在汇总表按 join_keys 聚合或去重，再对账。');
        }

        if (/sheet|worksheet|工作表/i.test(msg) || msg.includes('Sheet') || msg.includes('工作表')) {
            suggestions.push('重新选择 Sheet；如不确定，可先选第一个 Sheet 验证是否能跑通。');
        }

        if (/keyerror|找不到|not in|不存在|columns/i.test(msg)) {
            suggestions.push('检查列名是否与节点配置一致（注意全角/半角、空格、大小写）。');
            suggestions.push('如果是对账/关联类节点，确认两边的关联键在两张表中都存在且类型一致。');
        }

        if (/nameerror|not defined/i.test(msg)) {
            suggestions.push('这是代码节点变量作用域/变量名问题：确认你引用的是 `inputs[...]` 或你自己在脚本里定义过的变量。');
        }

        if (suggestions.length === 0) {
            suggestions.push('打开错误抽屉查看日志，定位到具体报错节点与报错行。');
            suggestions.push('检查该节点配置是否为空/未选择必要参数，然后再次执行。');
        }

        return suggestions;
    }, []);

    const handleDismissNodeErrorBubble = useCallback((nodeId) => {
        if (!nodeId) return;
        setNodes((nds) => nds.map((n) => {
            if (n.id !== nodeId) return n;
            return { ...n, data: { ...n.data, errorBubbleDismissed: true } };
        }));
    }, [setNodes]);

    const handleViewNodeError = useCallback((nodeId) => {
        const node = nodes.find(n => n.id === nodeId);
        const err = nodeResults?.[nodeId]?.error || node?.data?.errorMessage;
        if (!err) {
            message.info('该节点暂无错误信息');
            return;
        }
        setAiErrorSuggestText('');
        setViewingNodeErrorId(nodeId);
        setShowNodeErrorDrawer(true);
    }, [nodes, nodeResults]);

    // 查看节点执行结果
    const handleViewNodeResult = useCallback((nodeId) => {
        const result = nodeResults[nodeId];
        if (result && result.columns) {
            setViewingNodeResult({
                nodeId,
                nodeName: nodes.find(n => n.id === nodeId)?.data?.label || nodeId,
                columns: result.columns,
                data: result.data,
                totalRows: result.total_rows
            });
            setShowNodeResultModal(true);
        } else {
            message.info('该节点无输出数据');
        }
    }, [nodeResults, nodes]);

    // ============== AI对话功能 ==============



    // 获取可选择的表列表
    const getAvailableTables = () => {
        console.log('[AI-Chat] 获取可选表列表:', files.length);
        const tables = [];
        files.forEach(file => {
            const fileId = getFileId(file);
            if (!fileId) return;
            let sheets = file.sheets;
            if (typeof sheets === 'string') {
                try { sheets = JSON.parse(sheets); } catch { sheets = []; }
            }
            if (Array.isArray(sheets)) {
                sheets.forEach(sheet => {
                    tables.push({
                        key: `${fileId}::${sheet.name}`,
                        file_id: fileId,
                        filename: file.filename,
                        sheet_name: sheet.name,
                        columns: sheet.columns || [],
                        row_count: sheet.row_count || 0
                    });
                });
            }
        });
        console.log('[AI-Chat] 可选表数量:', tables.length);
        return tables;
    };

    const availableTablesForIsland = useMemo(() => getAvailableTables(), [files]);

    const extractJsonCodeBlock = (content) => {
        if (typeof content !== 'string') return null;
        const match = content.match(/```json\\s*([\\s\\S]*?)```/i);
        return match?.[1]?.trim() || null;
    };

    const extractWorkflowFromText = (content) => {
        if (typeof content !== 'string') return null;

        const findWorkflow = (obj) => {
            if (!obj || typeof obj !== 'object') return null;
            if (Array.isArray(obj.nodes)) return obj;
            if (obj.workflow && typeof obj.workflow === 'object' && Array.isArray(obj.workflow.nodes)) return obj.workflow;
            return null;
        };

        const tryParse = (jsonString) => {
            try {
                return findWorkflow(JSON.parse(jsonString));
            } catch {
                return null;
            }
        };

        const fenced = extractJsonCodeBlock(content);
        if (fenced) {
            const parsed = tryParse(fenced);
            if (parsed) return parsed;
        }

        const extractBalancedObject = (text, startIdx) => {
            let depth = 0;
            let inString = false;
            let escape = false;
            for (let i = startIdx; i < text.length; i++) {
                const ch = text[i];
                if (inString) {
                    if (escape) escape = false;
                    else if (ch === '\\\\') escape = true;
                    else if (ch === '"') inString = false;
                    continue;
                }

                if (ch === '"') {
                    inString = true;
                    continue;
                }
                if (ch === '{') depth++;
                if (ch === '}') {
                    depth--;
                    if (depth === 0) return { jsonString: text.slice(startIdx, i + 1), endIdx: i + 1 };
                }
            }
            return null;
        };

        for (let i = 0; i < content.length; i++) {
            if (content[i] !== '{') continue;
            const extracted = extractBalancedObject(content, i);
            if (!extracted?.jsonString) continue;
            if (!extracted.jsonString.includes('"nodes"')) continue;
            const workflow = tryParse(extracted.jsonString);
            if (workflow) return workflow;
            i = extracted.endIdx - 1;
        }

        return null;
    };

    const containsWorkflowJson = (content) => !!extractWorkflowFromText(content);

    const workflowToReactFlow = (workflow) => {
        if (!workflow || typeof workflow !== 'object') return { nodes: [], edges: [] };

        const rawNodes = Array.isArray(workflow.nodes) ? workflow.nodes : [];
        const rawEdges = Array.isArray(workflow.edges) ? workflow.edges : [];

        const ensureFinitePosition = (pos) => {
            const x = Number(pos?.x);
            const y = Number(pos?.y);
            return {
                x: Number.isFinite(x) ? x : 0,
                y: Number.isFinite(y) ? y : 0
            };
        };

        const nodesAlreadyFlow = rawNodes.some(n => n && typeof n === 'object' && 'data' in n);
        const edgesAlreadyFlow = rawEdges.some(e => e && typeof e === 'object' && 'source' in e && 'target' in e && 'id' in e);

        const coerceNodeId = (node, index) => {
            const candidate = node?.id ?? node?.node_id ?? node?.nodeId ?? node?.key ?? node?.name ?? node?.label;
            const value = candidate == null ? '' : String(candidate).trim();
            return value || `ai_node_${index + 1}`;
        };

        const coerceEdgeRef = (edge, key) => {
            const raw = edge?.[key];
            if (raw == null) return null;
            if (typeof raw === 'object') {
                const nested = raw?.id ?? raw?.node_id ?? raw?.nodeId ?? raw?.key ?? raw?.name;
                return nested == null ? null : String(nested).trim();
            }
            return String(raw).trim();
        };

        const coerceEdgeSource = (edge) =>
            coerceEdgeRef(edge, 'source') ?? coerceEdgeRef(edge, 'from') ?? coerceEdgeRef(edge, 'src') ?? coerceEdgeRef(edge, 'source_id') ?? coerceEdgeRef(edge, 'sourceId');
        const coerceEdgeTarget = (edge) =>
            coerceEdgeRef(edge, 'target') ?? coerceEdgeRef(edge, 'to') ?? coerceEdgeRef(edge, 'dst') ?? coerceEdgeRef(edge, 'target_id') ?? coerceEdgeRef(edge, 'targetId');

        let flowNodes = nodesAlreadyFlow
            ? rawNodes.map((n, index) => ({
                ...n,
                id: coerceNodeId(n, index),
                type: n.type || 'custom',
                position: ensureFinitePosition(n?.position)
            }))
            : rawNodes.map((node, index) => ({
                id: coerceNodeId(node, index),
                type: 'custom',
                position: { x: 0, y: 0 },
                data: {
                    type: node.type || node.node_type || node.op || node.operation,
                    label: node.label || node.name || node.title || NODE_TYPES_CONFIG[node.type]?.label || node.type,
                    description: 'AI 对话生成',
                    config: node.config ?? node.params ?? node.parameters ?? node.args
                }
            }));

        const flowEdges = edgesAlreadyFlow
            ? rawEdges.map((e, index) => ({
                ...e,
                id: String(e?.id ?? '').trim() || `e${index}`,
                source: coerceEdgeSource(e),
                target: coerceEdgeTarget(e),
                type: e.type || 'smoothstep',
                style: e.style || { strokeWidth: 2, stroke: '#C7C7CC' },
                markerEnd: e.markerEnd || { type: MarkerType.ArrowClosed }
            }))
            : rawEdges.map((edge, index) => ({
                id: edge.id || `e${index}`,
                source: coerceEdgeSource(edge),
                target: coerceEdgeTarget(edge),
                type: 'smoothstep',
                style: { strokeWidth: 2, stroke: '#C7C7CC' },
                markerEnd: { type: MarkerType.ArrowClosed }
            }));

        const uniqueIdByOriginalId = new Map();
        const usedIds = new Set();
        flowNodes = flowNodes.map((node, index) => {
            const originalId = String(node?.id ?? '');
            let nextId = originalId.trim() || `ai_node_${index + 1}`;
            if (usedIds.has(nextId)) {
                let suffix = 2;
                while (usedIds.has(`${nextId}_${suffix}`)) suffix++;
                nextId = `${nextId}_${suffix}`;
            }
            usedIds.add(nextId);
            if (!uniqueIdByOriginalId.has(originalId)) uniqueIdByOriginalId.set(originalId, nextId);
            return { ...node, id: nextId };
        });

        const remapNodeRef = (ref) => {
            const key = String(ref ?? '').trim();
            return uniqueIdByOriginalId.get(key) ?? (key || null);
        };
        const remappedEdges = flowEdges.map(e => ({
            ...e,
            source: remapNodeRef(e?.source),
            target: remapNodeRef(e?.target)
        }));

        const nodeIdSet = new Set(flowNodes.map(n => n.id));
        const filteredEdges = remappedEdges.filter(e => e?.source && e?.target && nodeIdSet.has(e.source) && nodeIdSet.has(e.target));

        flowNodes = calculateWorkflowLayout(flowNodes, filteredEdges);
        return { nodes: flowNodes, edges: filteredEdges };
    };

    const normalizeFileMatchKey = (value) => {
        return String(value || '')
            .trim()
            .toLowerCase()
            .replace(/[\\/]/g, '/')
            .split('/')
            .pop()
            .replace(/\s+/g, '')
            .replace(/[-_]/g, '')
            .replace(/\.(xlsx|xls|csv|tsv)$/i, '');
    };

    const scoreStringMatch = (candidate, query) => {
        if (!candidate || !query) return 0;
        if (candidate === query) return 100;
        if (candidate.includes(query)) return 80;
        if (query.includes(candidate)) return 70;

        const candidateTokens = candidate.split(/[^a-z0-9]+/i).filter(Boolean);
        const queryTokens = query.split(/[^a-z0-9]+/i).filter(Boolean);
        if (!candidateTokens.length || !queryTokens.length) return 0;

        const set = new Set(candidateTokens);
        const overlap = queryTokens.filter(t => set.has(t)).length;
        return Math.round((overlap / Math.max(candidateTokens.length, queryTokens.length)) * 60);
    };

    const resolveFileId = (filenameOrPath) => {
        if (!filenameOrPath) return null;
        const raw = String(filenameOrPath);

        const uuidMatch = raw.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
        if (uuidMatch) return uuidMatch[0];

        const query = normalizeFileMatchKey(raw);
        if (!query) return null;

        let best = { score: 0, file: null };
        for (const file of files) {
            const fileId = getFileId(file);
            const fileName = file?.filename || file?.name || '';
            if (!fileId || !fileName) continue;

            const candidate = normalizeFileMatchKey(fileName);
            const score = scoreStringMatch(candidate, query);
            if (score > best.score) best = { score, file };
        }

        if (best.score < 50) return null;
        return getFileId(best.file);
    };

    const handleApplyWorkflow = (workflowData) => {
        console.log('[AI-Chat] handleApplyWorkflow input:', workflowData);
        let workflow = null;

        if (typeof workflowData === 'string') {
            workflow = extractWorkflowFromText(workflowData);
        } else if (workflowData && typeof workflowData === 'object') {
            workflow = workflowData.workflow && Array.isArray(workflowData.workflow.nodes)
                ? workflowData.workflow
                : workflowData;
        }

        console.log('[AI-Chat] handleApplyWorkflow extracted workflow:', workflow);
        if (!workflow || !Array.isArray(workflow.nodes)) {
            message.error('No applicable workflow data found.');
            return;
        }

        const normalized = {
            ...workflow,
            edges: Array.isArray(workflow.edges)
                ? workflow.edges
                : (Array.isArray(workflow.connections) ? workflow.connections : []),
            nodes: workflow.nodes.map((node) => {
                const config = node?.config || node?.params || {};
                const nextConfig = { ...config };

                if (!nextConfig.file_id) {
                    const directId = nextConfig.fileId || nextConfig.fileID || node?.file_id || node?.fileId || node?.fileID;
                    if (directId) nextConfig.file_id = directId;
                }

                if (!nextConfig.file_id) {
                    const candidate = nextConfig.file_path || nextConfig.filename || nextConfig.file_name || nextConfig.file || nextConfig.path;
                    if (candidate) {
                        const resolved = resolveFileId(candidate);
                        if (resolved) nextConfig.file_id = resolved;
                    }
                }

                if (!nextConfig.sheet_name) {
                    if (nextConfig.sheet) nextConfig.sheet_name = nextConfig.sheet;
                    if (nextConfig.sheetName) nextConfig.sheet_name = nextConfig.sheetName;
                }

                return {
                    ...node,
                    config: nextConfig
                };
            })
        };

        try {
            const { nodes: flowNodes, edges: flowEdges } = workflowToReactFlow(normalized);

            console.log('[AI-Chat] handleApplyWorkflow mapped flowNodes:', flowNodes);
            if (!Array.isArray(flowNodes) || flowNodes.length === 0) {
                message.warning('Parsed 0 valid nodes from response.');
                return;
            }

            setNodes(flowNodes);
            setEdges(Array.isArray(flowEdges) ? flowEdges : []);

            requestAnimationFrame(() => {
                try {
                    reactFlowInstance?.fitView?.({ padding: 0.2, duration: 300 });
                } catch (e) {
                    console.warn('[AI-Chat] fitView failed:', e);
                }
            });
            message.success('Workflow applied to canvas.');
        } catch (e) {
            console.error('[AI-Chat] handleApplyWorkflow failed:', e);
            message.error('Apply failed: invalid workflow format.');
        }
    };

    // 开始对话（并可选发送第一句话）
    const startChat = async (initialMessage, tableKeysOverride) => {
        const tableKeys = (Array.isArray(tableKeysOverride) && tableKeysOverride.length > 0)
            ? tableKeysOverride
            : chatSelectedTables;

        if (!tableKeys || tableKeys.length === 0) {
            message.warning('请先选择要处理的表（或先上传包含 Sheet 的文件）');
            return null;
        }

        setChatLoading(true);
        const signal = createChatAbortSignal();

        try {
            const selectedFiles = tableKeys.map(key => {
                const [file_id, sheet_name] = key.split('::');
                return { file_id, sheet_name };
            });

            const startResult = await aiApi.chatStart(selectedFiles, { signal });
            setChatSessionId(startResult.session_id);
            setChatMessages([{ role: 'assistant', content: startResult.message }]);
            setChatStatus(startResult.status || '');

            const firstMsg = (typeof initialMessage === 'string' ? initialMessage : '').trim();
            if (!firstMsg) return startResult;

            setChatMessages(prev => [...prev, { role: 'user', content: firstMsg }]);
            const followUp = await aiApi.chatMessage(startResult.session_id, firstMsg, { signal });
            setChatMessages(prev => [...prev, { role: 'assistant', content: followUp.message }]);

            if (containsWorkflowJson(followUp.message)) setChatStatus('workflow_ready');
            else setChatStatus(followUp.status || startResult.status || '');

            return startResult;
        } catch (error) {
            if (isCanceledRequest(error)) return null;
            console.error('[AI-Chat] startChat failed:', error);
            message.error('开始对话失败: ' + (error.response?.data?.detail || error.message));
            return null;
        } finally {
            setChatLoading(false);
        }
    };

    const handleIslandSend = async (content) => {
        const userMsg = (typeof content === 'string' ? content : '').trim();
        if (!userMsg) return;

        if (!chatSessionId) {
            const tables = chatSelectedTables.length > 0 ? chatSelectedTables : getAvailableTables().map(t => t.key);
            if (!tables.length) {
                message.warning('请先在左侧上传要处理的文件');
                return;
            }
            if (tables !== chatSelectedTables) setChatSelectedTables(tables);
            await startChat(userMsg, tables);
            return;
        }

        setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setChatLoading(true);
        const signal = createChatAbortSignal();

        try {
            const result = await aiApi.chatMessage(chatSessionId, userMsg, { signal });
            setChatMessages(prev => [...prev, { role: 'assistant', content: result.message }]);

            if (containsWorkflowJson(result.message)) setChatStatus('workflow_ready');
            else setChatStatus(result.status || '');
        } catch (error) {
            if (isCanceledRequest(error)) return;
            console.error('[AI-Chat] handleIslandSend failed:', error);
            message.error('发送失败: ' + (error.response?.data?.detail || error.message));
        } finally {
            setChatLoading(false);
        }
    };

    const handleIslandNewChat = () => {
        abortChatRequest();
        setChatSessionId(null);
        setChatMessages([getIslandGreetingMessage()]);
        setChatStatus('');
        setChatLoading(false);
        setActiveIslandThreadId(createIslandThreadId());
    };

    const handleIslandSelectThread = (threadId) => {
        if (!threadId || threadId === activeIslandThreadId) return;
        const thread = islandChatThreads.find(t => t?.local_id === threadId);
        if (!thread) return;
        loadIslandThread(thread);
    };

    const handleIslandStop = () => {
        abortChatRequest();
        setChatLoading(false);
    };

    const handleIslandDeleteConversation = (threadId) => {
        if (!threadId) return;

        setIslandChatThreads(prev => (Array.isArray(prev) ? prev.filter(t => t?.local_id !== threadId) : []));

        if (threadId === activeIslandThreadId) {
            handleIslandNewChat();
        }
    };

    // 兼容旧 UI 中的引用（即使当前不渲染）
    const sendChatMessage = handleIslandSend;

    // 确认生成工作流
    const confirmGenerateWorkflow = async () => {
        if (!chatSessionId) return;

        console.log('[AI-Chat] 确认生成工作流');
        setChatLoading(true);
        const signal = createChatAbortSignal();

        try {
            const result = await aiApi.chatGenerate(chatSessionId, { signal });
            console.log('[AI-Chat] 生成结果:', result);

            if (result.workflow) {
                // 转换为ReactFlow格式
                // 转换为ReactFlow格式
                let flowNodes = (result.workflow.nodes || []).map((node, index) => ({
                    id: node.id,
                    type: 'custom',
                    position: { x: 0, y: 0 },
                    data: {
                        type: node.type,
                        label: node.label || NODE_TYPES_CONFIG[node.type]?.label || node.type,
                        description: 'AI生成',
                        config: node.config
                    }
                }));
                const flowEdges = (result.workflow.edges || []).map((edge, index) => ({
                    id: `e${index}`,
                    source: edge.source,
                    target: edge.target,
                    type: 'smoothstep',
                    style: { strokeWidth: 2, stroke: '#C7C7CC' },
                    markerEnd: { type: MarkerType.ArrowClosed }
                }));

                // 应用自动布局
                flowNodes = calculateWorkflowLayout(flowNodes, flowEdges);

                setNodes(flowNodes);
                setEdges(flowEdges);

                // 保持对话开启，允许继续修改
                setChatMessages(prev => [
                    ...prev,
                    {
                        role: 'assistant',
                        content: '🎉 工作流已生成到画布！\n\n您现在可以点击"执行"查看结果，或者继续告诉我需要修改什么（例如："按金额排序"、"过滤小于0的数据"）。'
                    }
                ]);
                setChatStatus('clarifying'); // 重置状态，允许继续对话
                message.success('🎉 工作流已生成！您可以继续对话进行修改。');
            }
        } catch (error) {
            if (isCanceledRequest(error)) return;
            console.error('[AI-Chat] 生成工作流失败:', error);
            message.error('生成失败: ' + (error.response?.data?.detail || error.message));
        } finally {
            setChatLoading(false);
        }
    };

    // ============== 节点配置表单 ==============
    const renderNodeConfigForm = () => {
        if (!selectedNode) return null;
        const type = selectedNode.data.type;
        const isSigningPerformancePreset = selectedNode?.data?.config?.python_code === PRESET_SIGNING_PERFORMANCE_PY;

        // 获取上游节点信息 (用于显示输入数据来源)
        const getUpstreamInfo = () => {
            const upstreamData = [];
            for (const edge of edges) {
                if (edge.target === selectedNode.id) {
                    const sourceNode = nodes.find(n => n.id === edge.source);
                    if (sourceNode) {
                        const sourceType = sourceNode.data.type;
                        const sourceLabel = sourceNode.data.label;
                        const config = sourceNode.data.config || {};

                        if (sourceType === 'source' || sourceType === 'source_csv') {
                            const file = files.find(f => f.file_id === config.file_id);
                            const sheetName = config.sheet_name;
                            if (file && sheetName) {
                                // 获取列信息
                                let sheets = file.sheets;
                                if (typeof sheets === 'string') {
                                    try { sheets = JSON.parse(sheets); } catch { sheets = []; }
                                }
                                const sheet = Array.isArray(sheets) ? sheets.find(s => s.name === sheetName) : null;
                                upstreamData.push({
                                    label: sourceLabel,
                                    file: file.filename,
                                    sheet: sheetName,
                                    columns: sheet?.columns || []
                                });
                            }
                        } else {
                            upstreamData.push({ label: sourceLabel, processed: true });
                        }
                    }
                }
            }
            return upstreamData;
        };

        // 递归获取所有上游节点（包括间接上游）
        const getAllUpstreamNodes = () => {
            const visited = new Set();
            const result = [];

            const traverse = (nodeId) => {
                if (visited.has(nodeId)) return;
                visited.add(nodeId);

                for (const edge of edges) {
                    if (edge.target === nodeId) {
                        const sourceNode = nodes.find(n => n.id === edge.source);
                        if (sourceNode) {
                            const sourceType = sourceNode.data.type;
                            const sourceLabel = sourceNode.data.label;
                            const config = sourceNode.data.config || {};

                            let nodeInfo = {
                                nodeId: sourceNode.id,
                                label: sourceLabel,
                                type: sourceType,
                                isSource: sourceType === 'source' || sourceType === 'source_csv'
                            };

                            // 对于数据源节点，获取文件和列信息
                            if (nodeInfo.isSource) {
                                const file = files.find(f => f.file_id === config.file_id);
                                const sheetName = config.sheet_name;
                                if (file && sheetName) {
                                    let sheets = file.sheets;
                                    if (typeof sheets === 'string') {
                                        try { sheets = JSON.parse(sheets); } catch { sheets = []; }
                                    }
                                    const sheet = Array.isArray(sheets) ? sheets.find(s => s.name === sheetName) : null;
                                    nodeInfo.fileId = config.file_id;
                                    nodeInfo.file = file.filename;
                                    nodeInfo.sheet = sheetName;
                                    nodeInfo.columns = sheet?.columns || [];
                                }
                            } else {
                                // 处理节点：尝试使用预览推导得到的列信息
                                nodeInfo.columns = derivedColumnsByNodeId?.[sourceNode.id] || [];
                            }

                            result.push(nodeInfo);
                            traverse(sourceNode.id);
                        }
                    }
                }
            };

            traverse(selectedNode.id);
            return result;
        };

        const allUpstreamNodes = getAllUpstreamNodes();

        const upstreamInfo = getUpstreamInfo();
        const teamSourceNode = isSigningPerformancePreset
            ? (
                allUpstreamNodes.find(n => n?.isSource && n?.fileId && n?.sheet && Array.isArray(n?.columns) && n.columns.includes('办公室团队'))
                || allUpstreamNodes.find(n => n?.isSource && n?.fileId && n?.sheet)
                || null
            )
            : null;
        const teamSourceReady = Boolean(teamSourceNode?.fileId && teamSourceNode?.sheet && Array.isArray(teamSourceNode?.columns) && teamSourceNode.columns.includes('办公室团队'));
        const teamSelectOptionItems = (teamSelectOptions || []).map(t => ({ label: t, value: t }));

        // 显示上游输入信息（替代原来的Sheet选择器）
        const inputInfo = upstreamInfo.length > 0 ? (
            <div style={{ marginBottom: 16, padding: 10, background: '#e8f5e9', borderRadius: 8, fontSize: 12 }}>
                <div style={{ fontWeight: 600, marginBottom: 6, color: '#2e7d32' }}>📥 数据输入来源：</div>
                {upstreamInfo.map((u, i) => (
                    <div key={i} style={{ marginLeft: 8, marginBottom: 4, color: '#333' }}>
                        • <b>{u.label}</b>
                        {u.file && <span> → {u.file} / {u.sheet}</span>}
                        {u.columns?.length > 0 && (
                            <div style={{ marginLeft: 16, color: '#666', fontSize: 11 }}>
                                列: {u.columns.slice(0, 8).join(', ')}{u.columns.length > 8 ? `... 等${u.columns.length}列` : ''}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        ) : (
            <div style={{ marginBottom: 16, padding: 10, background: '#fff3cd', borderRadius: 8, fontSize: 12, color: '#856404' }}>
                ⚠️ 请先连接上游节点（如"Excel读取"）
            </div>
        );

        // iOS风格输入源选择器样式
        const iosSelectStyle = {
            borderRadius: 12,
            border: 'none',
            background: '#F2F2F7',
            boxShadow: 'none'
        };

        // 渲染上游节点选择器（iOS风格）
        const renderInputSourceSelector = (fieldName, label, placeholder = '选择数据来源') => {
            const options = allUpstreamNodes.map(node => ({
                label: node.isSource
                    ? `${node.label} (${node.file}/${node.sheet})`
                    : `${node.label} (处理结果)`,
                value: node.nodeId,
                columns: node.columns || []
            }));

            return (
                <Form.Item label={label} name={fieldName}>
                    <Select
                        placeholder={placeholder}
                        options={options}
                        style={iosSelectStyle}
                        dropdownStyle={{ borderRadius: 12 }}
                        popupClassName="ios-dropdown"
                        showSearch
                        optionFilterProp="label"
                    />
                </Form.Item>
            );
        };

        // 根据选中的输入源获取列信息
        const getColumnsForSource = (sourceNodeId) => {
            const sourceNode = allUpstreamNodes.find(n => n.nodeId === sourceNodeId);
            if (sourceNode?.columns) {
                return sourceNode.columns.map(c => ({ label: c, value: c }));
            }
            // 如果是处理节点，暂时返回空（后续可添加API获取）
            return [];
        };

        // 获取可用列（优先使用选中的输入源，否则使用第一个上游节点）
        const getAvailableColumns = () => {
            const inputSourceId = nodeForm.getFieldValue('input_source');
            if (inputSourceId) {
                return getColumnsForSource(inputSourceId);
            }
            // 回退到第一个上游节点
            if (upstreamInfo.length > 0 && upstreamInfo[0].columns) {
                return upstreamInfo[0].columns.map(c => ({ label: c, value: c }));
            }
            return [];
        };

        switch (type) {
            // === 数据源 ===
            case 'source':
                const sourceSheetOptions = getSheetOptions(configFileId);
                const selectedSheet = nodeForm.getFieldValue('sheet_name');
                const selectedSheetCols = getColumnOptions(configFileId, selectedSheet);

                return (
                    <>
                        <div style={{ marginBottom: 16, padding: 10, background: '#e8f5e9', borderRadius: 8, fontSize: 12, color: '#2e7d32' }}>
                            💡 此节点从Excel文件中读取<b>一个Sheet</b>作为输出，传递给下游节点
                        </div>

                        <Form.Item label="选择Excel文件" name="file_id" rules={[{ required: true }]}>
                            <Select
                                placeholder="选择要加载的Excel文件"
                                onChange={(val) => {
                                    setConfigFileId(val);
                                    nodeForm.setFieldValue('sheet_name', undefined);
                                }}
                            >
                                {files.filter(f => f.filename.endsWith('.xlsx') || f.filename.endsWith('.xls'))
                                    .map(f => <Option key={f.file_id} value={f.file_id}>{f.filename}</Option>)}
                            </Select>
                        </Form.Item>

                        {sourceSheetOptions.length > 0 && (
                            <Form.Item label="输出Sheet" name="sheet_name" rules={[{ required: true, message: '请选择要输出的Sheet' }]}>
                                <Select placeholder="选择此节点输出的Sheet">
                                    {sourceSheetOptions.map(s => (
                                        <Option key={s.value} value={s.value}>{s.label}</Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        )}

                        {selectedSheet && (
                            <>
                                <Button
                                    type="link"
                                    icon={<EyeOutlined />}
                                    onClick={() => handlePreview(configFileId, selectedSheet)}
                                    style={{ padding: 0, marginBottom: 12 }}
                                >
                                    预览 {selectedSheet} 数据
                                </Button>

                                {selectedSheetCols.length > 0 && (
                                    <div style={{ marginBottom: 16, padding: 10, background: '#f0f9ff', borderRadius: 8, fontSize: 12 }}>
                                        <div style={{ fontWeight: 600, marginBottom: 4 }}><ProfileOutlined /> 此节点将输出 {selectedSheetCols.length} 列：</div>
                                        <div style={{ color: '#666' }}>{selectedSheetCols.map(c => c.value).join(', ')}</div>
                                    </div>
                                )}
                            </>
                        )}

                        <Form.Item label="表头行号" name="header_row" tooltip="默认第1行为表头">
                            <InputNumber min={1} placeholder="1" style={{ width: '100%' }} />
                        </Form.Item>
                    </>
                );

            case 'source_optional': {
                const optSheetOptions = getSheetOptions(configFileId);
                const optSelectedSheet = nodeForm.getFieldValue('sheet_name');
                const optSelectedSheetCols = getColumnOptions(configFileId, optSelectedSheet);

                return (
                    <>
                        <div style={{ marginBottom: 16, padding: 10, background: '#e8f5e9', borderRadius: 8, fontSize: 12, color: '#2e7d32' }}>
                            🟢 可选读取：如果不选择文件，将输出 <b>空表</b>（用于费用表暂缺时仍可跑通利润表）
                        </div>

                        <Form.Item label="选择Excel文件（可选）" name="file_id">
                            <Select
                                placeholder="可不选（输出空表）"
                                allowClear
                                onChange={(val) => {
                                    setConfigFileId(val || null);
                                    nodeForm.setFieldValue('sheet_name', undefined);
                                }}
                            >
                                {files.filter(f => f.filename.endsWith('.xlsx') || f.filename.endsWith('.xls'))
                                    .map(f => <Option key={f.file_id} value={f.file_id}>{f.filename}</Option>)}
                            </Select>
                        </Form.Item>

                        {optSheetOptions.length > 0 && (
                            <Form.Item label="输出Sheet（可选）" name="sheet_name">
                                <Select placeholder="选择此节点输出的Sheet" allowClear>
                                    {optSheetOptions.map(s => (
                                        <Option key={s.value} value={s.value}>{s.label}</Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        )}

                        {optSelectedSheet && configFileId && (
                            <>
                                <Button
                                    type="link"
                                    icon={<EyeOutlined />}
                                    onClick={() => handlePreview(configFileId, optSelectedSheet)}
                                    style={{ padding: 0, marginBottom: 12 }}
                                >
                                    预览 {optSelectedSheet} 数据
                                </Button>

                                {optSelectedSheetCols.length > 0 && (
                                    <div style={{ marginBottom: 16, padding: 10, background: '#f0f9ff', borderRadius: 8, fontSize: 12 }}>
                                        <div style={{ fontWeight: 600, marginBottom: 4 }}><ProfileOutlined /> 此节点将输出 {optSelectedSheetCols.length} 列：</div>
                                        <div style={{ color: '#666' }}>{optSelectedSheetCols.map(c => c.value).join(', ')}</div>
                                    </div>
                                )}
                            </>
                        )}

                        <Form.Item label="表头行号" name="header_row" tooltip="默认第1行为表头">
                            <InputNumber min={1} placeholder="1" style={{ width: '100%' }} />
                        </Form.Item>
                    </>
                );
            }

            case 'source_csv':
                return (
                    <>
                        <Form.Item label="选择文件" name="file_id" rules={[{ required: true }]}>
                            <Select placeholder="选择CSV文件">
                                {files.map(f => <Option key={f.file_id} value={f.file_id}>{f.filename}</Option>)}
                            </Select>
                        </Form.Item>
                        <Form.Item label="分隔符" name="delimiter">
                            <Select defaultValue=",">
                                <Option value=",">逗号 (,)</Option>
                                <Option value="\t">制表符 (Tab)</Option>
                                <Option value=";">分号 (;)</Option>
                            </Select>
                        </Form.Item>
                        <Form.Item label="编码" name="encoding">
                            <Select defaultValue="utf-8">
                                <Option value="utf-8">UTF-8</Option>
                                <Option value="gbk">GBK</Option>
                                <Option value="gb2312">GB2312</Option>
                            </Select>
                        </Form.Item>
                    </>
                );

            // === 数据清洗 ===
            case 'transform':
                // 动态获取列（基于选中的输入源或连线）
                const transformSourceId = nodeForm.getFieldValue('input_source');
                const transformCols = transformSourceId
                    ? getColumnsForSource(transformSourceId)
                    : (upstreamInfo.length > 0 && upstreamInfo[0].columns ? upstreamInfo[0].columns.map(c => ({ label: c, value: c })) : []);

                return (
                    <>
                        {inputInfo}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                            <Tooltip title={upstreamInfo.length > 0 ? '预览：仅执行到该节点（上游最多600行），返回50行抽样' : '请先连接上游数据源'}>
                                <Button
                                    icon={<EyeOutlined />}
                                    onClick={() => handlePreviewNode(selectedNode.id)}
                                    loading={nodePreviewLoading}
                                    disabled={upstreamInfo.length === 0}
                                >
                                    预览(样本)
                                </Button>
                            </Tooltip>
                            <Text type="secondary" style={{ fontSize: 12 }}>上游取600行，展示50行</Text>
                        </div>

                        {/* 输入来源选择 - iOS风格 */}
                        {allUpstreamNodes.length > 0 && (
                            <>
                                <Divider orientation="left">数据来源</Divider>
                                {renderInputSourceSelector('input_source', '输入表', '选择要处理的数据')}
                            </>
                        )}

                        <Divider orientation="left">筛选</Divider>
                        <Form.Item label="筛选条件" name="filter_code" tooltip="Pandas query语法">
                            <Input placeholder="age > 18 and city == 'Beijing'" />
                        </Form.Item>

                        <Divider orientation="left">列操作</Divider>
                        <Form.Item label="保留列" name="selected_columns">
                            <Select mode="multiple" placeholder="留空保留全部" options={transformCols} />
                        </Form.Item>
                        <Form.Item label="删除列" name="drop_columns">
                            <Select mode="multiple" placeholder="选择要删除的列" options={transformCols} />
                        </Form.Item>

                        <Divider orientation="left">列重命名</Divider>
                        <Form.List name="rename_pairs">
                            {(fields, { add, remove }) => (
                                <>
                                    {fields.map(({ key, name, ...restField }) => (
                                        <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                                            <Form.Item {...restField} name={[name, 'from']} noStyle>
                                                <Select placeholder="原列名" style={{ width: 140 }} options={transformCols} showSearch allowClear />
                                            </Form.Item>
                                            <ArrowRightOutlined style={{ color: '#999' }} />
                                            <Form.Item {...restField} name={[name, 'to']} noStyle>
                                                <Input placeholder="新列名" style={{ width: 160 }} />
                                            </Form.Item>
                                            <DeleteOutlined onClick={() => remove(name)} style={{ color: '#ff4d4f' }} />
                                        </Space>
                                    ))}
                                    <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>添加重命名</Button>
                                    <div style={{ marginTop: 6, fontSize: 12, color: '#888' }}>留空则不重命名；重命名在筛选/计算之后、输出之前执行。</div>
                                </>
                            )}
                        </Form.List>

                        <Divider orientation="left">计算列</Divider>
                        <Form.List name="calculations">
                            {(fields, { add, remove }) => (
                                <>
                                    {fields.map(({ key, name, ...restField }) => (
                                        <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                                            <Form.Item {...restField} name={[name, 'target']} noStyle>
                                                <Input placeholder="新列名" style={{ width: 80 }} />
                                            </Form.Item>
                                            <span>=</span>
                                            <Form.Item {...restField} name={[name, 'formula']} noStyle>
                                                <Input placeholder="公式: A + B" style={{ width: 140 }} />
                                            </Form.Item>
                                            <DeleteOutlined onClick={() => remove(name)} style={{ color: '#ff4d4f' }} />
                                        </Space>
                                    ))}
                                    <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>添加计算</Button>
                                </>
                            )}
                        </Form.List>

                        <Divider orientation="left">排序</Divider>
                        <Form.Item label="排序列" name="sort_by">
                            <Select placeholder="选择列" options={transformCols} allowClear />
                        </Form.Item>
                        <Form.Item label="排序方式" name="sort_order">
                            <Select>
                                <Option value="asc">升序</Option>
                                <Option value="desc">降序</Option>
                            </Select>
                        </Form.Item>
                    </>
                );

            case 'type_convert':
                const typeConvertCols = getAvailableColumns();
                return (
                    <>
                        {inputInfo}

                        {/* 输入来源选择 - iOS风格 */}
                        {allUpstreamNodes.length > 0 && (
                            <>
                                <Divider orientation="left">数据来源</Divider>
                                {renderInputSourceSelector('input_source', '输入表', '选择要处理的数据')}
                            </>
                        )}

                        <Form.List name="conversions">
                            {(fields, { add, remove }) => (
                                <>
                                    {fields.map(({ key, name, ...restField }) => (
                                        <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                                            <Form.Item {...restField} name={[name, 'column']} noStyle>
                                                <Select placeholder="选择列" style={{ width: 120 }} options={typeConvertCols} showSearch />
                                            </Form.Item>
                                            <Form.Item {...restField} name={[name, 'dtype']} noStyle>
                                                <Select placeholder="类型" style={{ width: 100 }}>
                                                    <Option value="int">整数</Option>
                                                    <Option value="float">小数</Option>
                                                    <Option value="str">文本</Option>
                                                    <Option value="datetime">日期</Option>
                                                    <Option value="bool">布尔</Option>
                                                </Select>
                                            </Form.Item>
                                            <DeleteOutlined onClick={() => remove(name)} style={{ color: '#ff4d4f' }} />
                                        </Space>
                                    ))}
                                    <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>添加转换</Button>
                                </>
                            )}
                        </Form.List>
                    </>
                );

            case 'fill_na':
                const fillNaCols = getAvailableColumns();
                return (
                    <>
                        {inputInfo}

                        {/* 输入来源选择 - iOS风格 */}
                        {allUpstreamNodes.length > 0 && (
                            <>
                                <Divider orientation="left">数据来源</Divider>
                                {renderInputSourceSelector('input_source', '输入表', '选择要处理的数据')}
                            </>
                        )}

                        <Form.Item label="处理策略" name="strategy">
                            <Select>
                                <Option value="drop">删除空值行</Option>
                                <Option value="fill_value">填充固定值</Option>
                                <Option value="ffill">前向填充</Option>
                                <Option value="bfill">后向填充</Option>
                                <Option value="mean">均值填充</Option>
                                <Option value="median">中位数填充</Option>
                            </Select>
                        </Form.Item>
                        <Form.Item label="填充值" name="fill_value">
                            <Input placeholder="仅填充固定值时有效" />
                        </Form.Item>
                        <Form.Item label="应用列" name="columns">
                            <Select mode="multiple" placeholder="留空=全部列" options={fillNaCols} />
                        </Form.Item>
                    </>
                );

            case 'deduplicate':
                const dedupCols = getAvailableColumns();
                return (
                    <>
                        {inputInfo}

                        {/* 输入来源选择 - iOS风格 */}
                        {allUpstreamNodes.length > 0 && (
                            <>
                                <Divider orientation="left">数据来源</Divider>
                                {renderInputSourceSelector('input_source', '输入表', '选择要处理的数据')}
                            </>
                        )}

                        <Form.Item label="判重列" name="subset">
                            <Select mode="multiple" placeholder="留空=所有列" options={dedupCols} />
                        </Form.Item>
                        <Form.Item label="保留方式" name="keep">
                            <Select defaultValue="first">
                                <Option value="first">保留第一条</Option>
                                <Option value="last">保留最后一条</Option>
                                <Option value="false">全部删除</Option>
                            </Select>
                        </Form.Item>
                    </>
                );

            case 'text_process':
                const textCols = getAvailableColumns();
                return (
                    <>
                        {inputInfo}

                        {/* 输入来源选择 - iOS风格 */}
                        {allUpstreamNodes.length > 0 && (
                            <>
                                <Divider orientation="left">数据来源</Divider>
                                {renderInputSourceSelector('input_source', '输入表', '选择要处理的数据')}
                            </>
                        )}

                        <Form.Item label="目标列" name="column">
                            <Select placeholder="选择要处理的列" options={textCols} showSearch />
                        </Form.Item>
                        <Form.Item label="操作" name="operation">
                            <Select>
                                <Option value="trim">去除空格</Option>
                                <Option value="lower">转小写</Option>
                                <Option value="upper">转大写</Option>
                                <Option value="replace">替换文本</Option>
                                <Option value="extract">正则提取</Option>
                            </Select>
                        </Form.Item>
                        <Form.Item label="查找文本" name="pattern">
                            <Input placeholder="用于替换或提取" />
                        </Form.Item>
                        <Form.Item label="替换为" name="replacement">
                            <Input placeholder="替换后的文本" />
                        </Form.Item>
                    </>
                );

            case 'date_process':
                const dateCols = getAvailableColumns();
                return (
                    <>
                        {inputInfo}

                        {/* 输入来源选择 - iOS风格 */}
                        {allUpstreamNodes.length > 0 && (
                            <>
                                <Divider orientation="left">数据来源</Divider>
                                {renderInputSourceSelector('input_source', '输入表', '选择要处理的数据')}
                            </>
                        )}

                        <Form.Item label="日期列" name="column">
                            <Select placeholder="选择日期列" options={dateCols} showSearch />
                        </Form.Item>
                        <Form.Item label="提取部分" name="extract">
                            <Select mode="multiple">
                                <Option value="year">年</Option>
                                <Option value="month">月</Option>
                                <Option value="day">日</Option>
                                <Option value="weekday">周几</Option>
                                <Option value="quarter">季度</Option>
                            </Select>
                        </Form.Item>
                        <Form.Item label="日期偏移" name="offset">
                            <Input placeholder="如: +7d, -1M" />
                        </Form.Item>
                    </>
                );

            // === 数据分析 ===
            case 'group_aggregate':
                const groupCols = getAvailableColumns();
                return (
                    <>
                        {inputInfo}

                        {/* 输入来源选择 - iOS风格 */}
                        {allUpstreamNodes.length > 0 && (
                            <>
                                <Divider orientation="left">数据来源</Divider>
                                {renderInputSourceSelector('input_source', '输入表', '选择要处理的数据')}
                            </>
                        )}

                        {groupCols.length > 0 && (
                            <div style={{ marginBottom: 16, padding: 10, background: '#f0f9ff', borderRadius: 8, fontSize: 12 }}>
                                <div style={{ fontWeight: 600, marginBottom: 4 }}><ProfileOutlined /> 可用列：</div>
                                <div style={{ color: '#666' }}>{groupCols.map(c => c.value).join(', ')}</div>
                            </div>
                        )}
                        <Divider orientation="left">分组</Divider>
                        <Form.Item label="分组列" name="group_by">
                            <Select mode="multiple" placeholder="分组的列" options={groupCols} />
                        </Form.Item>
                        <Divider orientation="left">聚合计算</Divider>
                        <Form.List name="aggregations">
                            {(fields, { add, remove }) => (
                                <>
                                    {fields.map(({ key, name, ...restField }) => (
                                        <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                                            <Form.Item {...restField} name={[name, 'column']} noStyle>
                                                <Select placeholder="选择列" style={{ width: 100 }} options={groupCols} showSearch />
                                            </Form.Item>
                                            <Form.Item {...restField} name={[name, 'func']} noStyle>
                                                <Select placeholder="函数" style={{ width: 80 }}>
                                                    <Option value="sum">求和</Option>
                                                    <Option value="mean">平均</Option>
                                                    <Option value="count">计数</Option>
                                                    <Option value="min">最小</Option>
                                                    <Option value="max">最大</Option>
                                                </Select>
                                            </Form.Item>
                                            <Form.Item {...restField} name={[name, 'alias']} noStyle>
                                                <Input placeholder="别名" style={{ width: 80 }} />
                                            </Form.Item>
                                            <DeleteOutlined onClick={() => remove(name)} style={{ color: '#ff4d4f' }} />
                                        </Space>
                                    ))}
                                    <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>添加聚合</Button>
                                </>
                            )}
                        </Form.List>
                    </>
                );

            case 'pivot':
                const pivotCols = getAvailableColumns();
                return (
                    <>
                        {inputInfo}
                        <Form.Item label="行标签" name="index">
                            <Select mode="multiple" placeholder="作为行的列" options={pivotCols} />
                        </Form.Item>
                        <Form.Item label="列标签" name="columns">
                            <Select placeholder="作为列的字段" options={pivotCols} showSearch />
                        </Form.Item>
                        <Form.Item label="值字段" name="values">
                            <Select placeholder="聚合的值" options={pivotCols} showSearch />
                        </Form.Item>
                        <Form.Item label="聚合函数" name="aggfunc">
                            <Select defaultValue="sum">
                                <Option value="sum">求和</Option>
                                <Option value="mean">平均</Option>
                                <Option value="count">计数</Option>
                            </Select>
                        </Form.Item>
                    </>
                );

            // === 多表操作 ===
            case 'join':
                // 动态获取列（基于选中的输入源或连线）
                const leftSourceId = nodeForm.getFieldValue('left_source');
                const rightSourceId = nodeForm.getFieldValue('right_source');
                const joinLeftCols = leftSourceId
                    ? getColumnsForSource(leftSourceId)
                    : (upstreamInfo.length > 0 && upstreamInfo[0].columns ? upstreamInfo[0].columns.map(c => ({ label: c, value: c })) : []);
                const joinRightCols = rightSourceId
                    ? getColumnsForSource(rightSourceId)
                    : (upstreamInfo.length > 1 && upstreamInfo[1].columns ? upstreamInfo[1].columns.map(c => ({ label: c, value: c })) : []);

                return (
                    <>
                        {inputInfo}

                        {/* 输入来源选择 - iOS风格 */}
                        {allUpstreamNodes.length > 1 && (
                            <>
                                <Divider orientation="left">数据来源</Divider>
                                {renderInputSourceSelector('left_source', '左表来源', '选择左表数据')}
                                {renderInputSourceSelector('right_source', '右表来源', '选择右表数据')}
                            </>
                        )}

                        <Divider orientation="left">合并参数</Divider>
                        <Form.Item label="合并方式" name="how">
                            <Select>
                                <Option value="inner">内连接 (Inner)</Option>
                                <Option value="left">左连接 (Left)</Option>
                                <Option value="right">右连接 (Right)</Option>
                                <Option value="outer">全连接 (Outer)</Option>
                            </Select>
                        </Form.Item>
                        <Divider orientation="left">关联字段</Divider>
                        <Form.Item label="左表关联键" name="left_on">
                            <Select mode="multiple" placeholder="选择左表列" options={joinLeftCols} />
                        </Form.Item>
                        <Form.Item label="右表关联键" name="right_on">
                            <Select mode="multiple" placeholder="选择右表列" options={joinRightCols} />
                        </Form.Item>
                    </>
                );

            case 'concat':
                return (
                    <>
                        {inputInfo}
                        <Form.Item label="合并方式" name="join">
                            <Select defaultValue="outer">
                                <Option value="outer">保留所有列</Option>
                                <Option value="inner">只保留共同列</Option>
                            </Select>
                        </Form.Item>
                        <Form.Item label="重置索引" name="ignore_index" valuePropName="checked">
                            <Switch />
                        </Form.Item>
                    </>
                );

            case 'vlookup':
                // 动态获取列（基于选中的输入源或连线）
                const vlookupMainSourceId = nodeForm.getFieldValue('main_source');
                const vlookupLookupSourceId = nodeForm.getFieldValue('lookup_source');
                const vlookupMainCols = vlookupMainSourceId
                    ? getColumnsForSource(vlookupMainSourceId)
                    : (upstreamInfo.length > 0 && upstreamInfo[0].columns ? upstreamInfo[0].columns.map(c => ({ label: c, value: c })) : []);
                const vlookupLookupCols = vlookupLookupSourceId
                    ? getColumnsForSource(vlookupLookupSourceId)
                    : (upstreamInfo.length > 1 && upstreamInfo[1].columns ? upstreamInfo[1].columns.map(c => ({ label: c, value: c })) : []);

                return (
                    <>
                        {inputInfo}

                        {/* 输入来源选择 - iOS风格 */}
                        {allUpstreamNodes.length > 1 && (
                            <>
                                <Divider orientation="left">数据来源</Divider>
                                {renderInputSourceSelector('main_source', '主表来源', '选择主表数据')}
                                {renderInputSourceSelector('lookup_source', '查找表来源', '选择查找表数据')}
                            </>
                        )}

                        <Divider orientation="left">关联配置</Divider>
                        <Form.Item label="主表关联列" name="left_key">
                            <Select placeholder="选择主表列" options={vlookupMainCols} showSearch />
                        </Form.Item>
                        <Form.Item label="查找表关联列" name="right_key">
                            <Select placeholder="选择查找表列" options={vlookupLookupCols} showSearch />
                        </Form.Item>
                        <Divider orientation="left">输出列</Divider>
                        <Form.Item label="返回列" name="columns_to_get">
                            <Select mode="multiple" placeholder="要从查找表获取的列" options={vlookupLookupCols} />
                        </Form.Item>
                    </>
                );

            case 'reconcile':
                // 动态获取列（基于选中的输入源或连线）
                const reconcileDetailSourceId = nodeForm.getFieldValue('detail_source');
                const reconcileSummarySourceId = nodeForm.getFieldValue('summary_source');
                const reconcileUseKeyMapping = Boolean(nodeForm.getFieldValue('use_key_mapping'));
                const reconcileDetailCols = reconcileDetailSourceId
                    ? getColumnsForSource(reconcileDetailSourceId)
                    : (upstreamInfo.length > 0 && upstreamInfo[0].columns ? upstreamInfo[0].columns.map(c => ({ label: c, value: c })) : []);
                const reconcileSummaryCols = reconcileSummarySourceId
                    ? getColumnsForSource(reconcileSummarySourceId)
                    : (upstreamInfo.length > 1 && upstreamInfo[1].columns ? upstreamInfo[1].columns.map(c => ({ label: c, value: c })) : []);
                // 公共列（取交集）
                const reconcileCommonCols = reconcileDetailCols.filter(c =>
                    reconcileSummaryCols.some(sc => sc.value === c.value)
                );

                return (
                    <>
                        {inputInfo}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                            <Tooltip title={upstreamInfo.length >= 2 ? '预览：仅执行到该节点（上游最多600行），返回差异统计+50行抽样' : '对账核算需要两个输入：请先连接两张表'}>
                                <Button
                                    icon={<EyeOutlined />}
                                    onClick={() => handlePreviewNode(selectedNode.id)}
                                    loading={nodePreviewLoading}
                                    disabled={upstreamInfo.length < 2}
                                >
                                    预览(样本)
                                </Button>
                            </Tooltip>
                            <Text type="secondary" style={{ fontSize: 12 }}>上游取600行，展示50行</Text>
                        </div>
                        <div style={{ marginBottom: 16, padding: 10, background: '#fff3cd', borderRadius: 8, fontSize: 12 }}>
                            📊 对账核算：自动汇总明细表的金额，与汇总表对比，输出差异记录
                        </div>

                        {/* 输入来源选择 - iOS风格 */}
                        {allUpstreamNodes.length > 1 && (
                            <>
                                <Divider orientation="left">数据来源</Divider>
                                {renderInputSourceSelector('detail_source', '明细表来源', '选择明细表数据')}
                                {renderInputSourceSelector('summary_source', '汇总表来源', '选择汇总表数据')}
                            </>
                        )}

                        <Divider orientation="left">关联与维度</Divider>
                        <Form.Item
                            label="左右键不同名"
                            name="use_key_mapping"
                            valuePropName="checked"
                            tooltip="开启后可分别选择明细表/汇总表的关联键（用于列名不一致的情况，如：商城子订单 vs 子订单号）"
                        >
                            <Switch />
                        </Form.Item>
                        {!reconcileUseKeyMapping && (
                            <Form.Item label="关联键（支持多列）" name="join_keys" tooltip="按此键分组汇总对比（两边列名必须一致），如：市场id+门店id">
                                <Select mode="multiple" placeholder="选择关联维度" options={reconcileCommonCols.length > 0 ? reconcileCommonCols : reconcileDetailCols} />
                            </Form.Item>
                        )}
                        {reconcileUseKeyMapping && (
                            <>
                                <Form.Item label="明细表关联键（支持多列）" name="detail_keys" tooltip="明细表用于分组汇总的键列">
                                    <Select mode="multiple" placeholder="选择明细表关联键" options={reconcileDetailCols} />
                                </Form.Item>
                                <Form.Item label="汇总表关联键（支持多列）" name="summary_keys" tooltip="汇总表用于分组汇总的键列（列数需与明细一致）">
                                    <Select mode="multiple" placeholder="选择汇总表关联键" options={reconcileSummaryCols} />
                                </Form.Item>
                                <div style={{ marginTop: -8, marginBottom: 8, fontSize: 12, color: '#888' }}>提示：两边关联键的列数和顺序需一致（例如：明细[商城子订单] → 汇总[子订单号]）。</div>
                            </>
                        )}
                        <Divider orientation="left">金额列配置</Divider>
                        <Form.Item label="明细表金额列" name="left_column" rules={[{ required: true }]}>
                            <Select placeholder="选择明细表金额列" options={reconcileDetailCols} showSearch />
                        </Form.Item>
                        <Form.Item label="汇总表金额列" name="right_column" rules={[{ required: true }]}>
                            <Select placeholder="选择汇总表金额列" options={reconcileSummaryCols} showSearch />
                        </Form.Item>
                        <Divider orientation="left">输出设置</Divider>
                        <Form.Item label="输出模式" name="output_mode">
                            <Select defaultValue="diff_only">
                                <Option value="diff_only">仅输出差异记录</Option>
                                <Option value="all">输出全部（标记差异）</Option>
                            </Select>
                        </Form.Item>
                        <Form.Item label="容差值" name="tolerance" tooltip="差额在此范围内视为相等">
                            <InputNumber min={0} step={0.01} placeholder="0" style={{ width: '100%' }} />
                        </Form.Item>
                    </>
                );

            // === AI/自动化 ===
            case 'code':
                return (
                    <>
                        {inputInfo}
                        <div style={{ marginBottom: 8, color: '#f59e0b', fontSize: 12 }}>
                            ⚠️ 变量: inputs(列表), df(第一个输入), pd(pandas), 结果赋给result
                        </div>
                        {isSigningPerformancePreset && (
                            <>
                                <Divider orientation="left">团队筛选</Divider>
                                <Form.Item
                                    label="办公室团队"
                                    name="team_name"
                                    tooltip="留空不过滤；选择/输入后仅输出该团队"
                                    validateStatus={teamSourceReady ? undefined : 'warning'}
                                    help={teamSourceReady ? null : '未找到办公室团队（请先连接提货表数据源，并确认包含“办公室团队”列）'}
                                >
                                    <Select
                                        mode="tags"
                                        placeholder="例如：邯郸刘洋"
                                        style={iosSelectStyle}
                                        dropdownStyle={{ borderRadius: 12 }}
                                        popupClassName="ios-dropdown"
                                        tokenSeparators={[',', '，']}
                                        maxTagCount={1}
                                        options={teamSelectOptionItems}
                                        loading={teamSelectLoading}
                                        notFoundContent={teamSelectLoading ? <Spin size="small" /> : null}
                                        onDropdownVisibleChange={(open) => {
                                            if (open && teamSourceReady) ensureTeamSelectOptions(teamSourceNode?.fileId, teamSourceNode?.sheet);
                                        }}
                                        disabled={!teamSourceReady}
                                    />
                                </Form.Item>
                            </>
                        )}
                        <Form.Item label="Python代码" name="python_code">
                            <Input.TextArea rows={12} style={{ fontFamily: 'monospace', fontSize: 13, background: '#1e1e1e', color: '#d4d4d4' }}
                                placeholder={`# 示例:\ndf['total'] = df['a'] + df['b']\nresult = df`} />
                        </Form.Item>
                    </>
                );

            // === 利润表（业务模块）===
            case 'profit_table': {
                return (
                    <>
                        <div style={{ marginBottom: 16, padding: 10, background: '#e8f5e9', borderRadius: 8, fontSize: 12, color: '#2e7d32' }}>
                            ✅ 选择一个工作簿后，系统会从其中的多个来源 Sheet（订单明细/直播间/退货/资金日报/分摊费用/工资表/财务系统/富友流水/房租/市场定额…）
                            自动推导一张<strong>利润表</strong>：能算的列自动填充，其它列留空。
                        </div>

                        <Form.Item label="选择Excel文件" name="file_id" rules={[{ required: true, message: '请选择Excel文件' }]}>
                            <Select placeholder="选择包含来源Sheet的工作簿">
                                {files
                                    .filter(f => (f.filename || '').toLowerCase().endsWith('.xlsx') || (f.filename || '').toLowerCase().endsWith('.xls'))
                                    .map(f => <Option key={getFileId(f)} value={getFileId(f)}>{f.filename}</Option>)}
                            </Select>
                        </Form.Item>

                        <Divider orientation="left">可选筛选</Divider>
                        <Form.Item label="团队（可选）" name="team_name" tooltip="留空将自动从来源表推断（通常取出现次数最多的团队）">
                            <Input placeholder="例如：邯郸刘洋" />
                        </Form.Item>
                        <Form.Item label="市场（可选）" name="market_name" tooltip="留空默认取团队前2个字，如：邯郸">
                            <Input placeholder="例如：邯郸" />
                        </Form.Item>
                        <Form.Item label="办公室（可选）" name="office_name" tooltip="留空默认用团队去掉市场前缀，如：刘洋">
                            <Input placeholder="例如：刘洋" />
                        </Form.Item>
                        <Form.Item label="年份（可选）" name="year" tooltip="留空将从日期列推断">
                            <InputNumber min={2000} max={2100} style={{ width: '100%' }} placeholder="例如：2025" />
                        </Form.Item>
                        <Form.Item label="月份（可选）" name="month" tooltip="留空将从日期列推断">
                            <InputNumber min={1} max={12} style={{ width: '100%' }} placeholder="例如：10" />
                        </Form.Item>
                    </>
                );
            }

            case 'profit_income': {
                const cols = getAvailableColumns();
                return (
                    <>
                        {inputInfo}
                        <div style={{ marginBottom: 16, padding: 10, background: '#e8f5e9', borderRadius: 8, fontSize: 12, color: '#2e7d32' }}>
                            📊 将订单明细按 <b>团队(办公室)+年份+月份</b> 汇总为 4 个收入口径：主品/团品 × 计业绩/不计业绩
                        </div>

                        <Divider orientation="left">维度与时间</Divider>
                        <Form.Item label="团队列（办公室）" name="team_col" initialValue="所属团队" rules={[{ required: true }]}>
                            <Select placeholder="选择团队列" options={cols} showSearch />
                        </Form.Item>
                        <Form.Item label="日期列" name="date_col" initialValue="订单提交时间" rules={[{ required: true }]}>
                            <Select placeholder="选择日期列" options={cols} showSearch />
                        </Form.Item>

                        <Divider orientation="left">分类口径</Divider>
                        <Form.Item label="商品类型列" name="product_type_col" initialValue="商品类型" rules={[{ required: true }]}>
                            <Select placeholder="选择商品类型列" options={cols} showSearch />
                        </Form.Item>
                        <Form.Item label="主品取值" name="main_product_values" initialValue={['主品', '门店自有品']}>
                            <Select mode="tags" placeholder="如：主品、门店自有品" tokenSeparators={[',', '，']} />
                        </Form.Item>
                        <Form.Item label="团品取值" name="group_product_values" initialValue={['团品']}>
                            <Select mode="tags" placeholder="如：团品" tokenSeparators={[',', '，']} />
                        </Form.Item>
                        <Form.Item label="业绩标记列" name="perf_flag_col" initialValue="是否计入业绩" rules={[{ required: true }]}>
                            <Select placeholder="选择业绩标记列" options={cols} showSearch />
                        </Form.Item>
                        <Form.Item label="计业绩取值" name="perf_values" initialValue={['计入业绩']}>
                            <Select mode="tags" placeholder="如：计入业绩" tokenSeparators={[',', '，']} />
                        </Form.Item>

                        <Divider orientation="left">金额口径</Divider>
                        <Form.Item label="计业绩金额列" name="perf_amount_col" initialValue="计入业绩金额" rules={[{ required: true }]}>
                            <Select placeholder="选择计业绩金额列" options={cols} showSearch />
                        </Form.Item>
                        <Form.Item label="不计业绩金额列" name="nonperf_amount_col" initialValue="回款金额" rules={[{ required: true }]}>
                            <Select placeholder="选择不计业绩金额列" options={cols} showSearch />
                        </Form.Item>

                        <Divider orientation="left">可选过滤</Divider>
                        <Form.Item label="订单状态列" name="status_col" initialValue="订单状态">
                            <Select placeholder="选择订单状态列（可选）" options={cols} showSearch allowClear />
                        </Form.Item>
                        <Form.Item label="仅统计指定状态" name="filter_by_status" valuePropName="checked" initialValue={false}>
                            <Switch />
                        </Form.Item>
                        <Form.Item noStyle shouldUpdate={(p, n) => p.filter_by_status !== n.filter_by_status}>
                            {({ getFieldValue }) =>
                                getFieldValue('filter_by_status') ? (
                                    <Form.Item label="允许状态" name="allowed_status_values" initialValue={['已完成']}>
                                        <Select mode="tags" placeholder="如：已完成" tokenSeparators={[',', '，']} />
                                    </Form.Item>
                                ) : null
                            }
                        </Form.Item>
                    </>
                );
            }

            case 'profit_cost': {
                const cols = getAvailableColumns();
                return (
                    <>
                        {inputInfo}
                        <div style={{ marginBottom: 16, padding: 10, background: '#e8f5e9', borderRadius: 8, fontSize: 12, color: '#2e7d32' }}>
                            🧮 将订单明细按 <b>团队(办公室)+年份+月份</b> 汇总成本：主品成本 = 签收数量 × 主品成本单价；团品成本可选从列读取（否则为 0）
                        </div>

                        <Divider orientation="left">维度与时间</Divider>
                        <Form.Item label="团队列（办公室）" name="team_col" initialValue="所属团队" rules={[{ required: true }]}>
                            <Select placeholder="选择团队列" options={cols} showSearch />
                        </Form.Item>
                        <Form.Item label="日期列" name="date_col" initialValue="订单提交时间" rules={[{ required: true }]}>
                            <Select placeholder="选择日期列" options={cols} showSearch />
                        </Form.Item>

                        <Divider orientation="left">分类口径</Divider>
                        <Form.Item label="商品类型列" name="product_type_col" initialValue="商品类型" rules={[{ required: true }]}>
                            <Select placeholder="选择商品类型列" options={cols} showSearch />
                        </Form.Item>
                        <Form.Item label="主品取值" name="main_product_values" initialValue={['主品', '门店自有品']}>
                            <Select mode="tags" placeholder="如：主品、门店自有品" tokenSeparators={[',', '，']} />
                        </Form.Item>
                        <Form.Item label="团品取值" name="group_product_values" initialValue={['团品']}>
                            <Select mode="tags" placeholder="如：团品" tokenSeparators={[',', '，']} />
                        </Form.Item>
                        <Form.Item label="业绩标记列" name="perf_flag_col" initialValue="是否计入业绩" rules={[{ required: true }]}>
                            <Select placeholder="选择业绩标记列" options={cols} showSearch />
                        </Form.Item>
                        <Form.Item label="计业绩取值" name="perf_values" initialValue={['计入业绩']}>
                            <Select mode="tags" placeholder="如：计入业绩" tokenSeparators={[',', '，']} />
                        </Form.Item>

                        <Divider orientation="left">主品成本</Divider>
                        <Form.Item label="签收数量列" name="signed_qty_col" initialValue="顾客确认数量" rules={[{ required: true }]}>
                            <Select placeholder="选择签收数量列" options={cols} showSearch />
                        </Form.Item>
                        <Form.Item label="主品成本单价" name="main_unit_cost" initialValue={0} rules={[{ required: true }]}>
                            <InputNumber min={0} step={0.01} style={{ width: '100%' }} />
                        </Form.Item>

                        <Divider orientation="left">团品成本（可选）</Divider>
                        <Form.Item label="团品计业绩成本列" name="group_cost_perf_col">
                            <Select placeholder="选择列（可选）" options={cols} showSearch allowClear />
                        </Form.Item>
                        <Form.Item label="团品不计业绩成本列" name="group_cost_nonperf_col">
                            <Select placeholder="选择列（可选）" options={cols} showSearch allowClear />
                        </Form.Item>

                        <Divider orientation="left">可选过滤</Divider>
                        <Form.Item label="订单状态列" name="status_col" initialValue="订单状态">
                            <Select placeholder="选择订单状态列（可选）" options={cols} showSearch allowClear />
                        </Form.Item>
                        <Form.Item label="仅统计指定状态" name="filter_by_status" valuePropName="checked" initialValue={false}>
                            <Switch />
                        </Form.Item>
                        <Form.Item noStyle shouldUpdate={(p, n) => p.filter_by_status !== n.filter_by_status}>
                            {({ getFieldValue }) =>
                                getFieldValue('filter_by_status') ? (
                                    <Form.Item label="允许状态" name="allowed_status_values" initialValue={['已完成']}>
                                        <Select mode="tags" placeholder="如：已完成" tokenSeparators={[',', '，']} />
                                    </Form.Item>
                                ) : null
                            }
                        </Form.Item>
                    </>
                );
            }

            case 'profit_expense': {
                const cols = getAvailableColumns();
                return (
                    <>
                        {inputInfo}
                        <div style={{ marginBottom: 16, padding: 10, background: '#e8f5e9', borderRadius: 8, fontSize: 12, color: '#2e7d32' }}>
                            🧾 将费用明细按 <b>团队(办公室)+年份+月份</b> 汇总（支持把费用列映射到模板科目：工资/红包/任务款/房租/水电/物业/分摊/其他）
                        </div>

                        <Divider orientation="left">维度与时间</Divider>
                        <Form.Item label="团队列（办公室）" name="team_col" initialValue="所属团队" rules={[{ required: true }]}>
                            <Select placeholder="选择团队列" options={cols} showSearch />
                        </Form.Item>
                        <Form.Item label="日期列" name="date_col" initialValue="日期" rules={[{ required: true }]}>
                            <Select placeholder="选择日期列" options={cols} showSearch />
                        </Form.Item>

                        <Divider orientation="left">费用列映射（可选，未选则按 0）</Divider>
                        <Form.Item label="一线工资列" name="salary_col">
                            <Select placeholder="选择列（可选）" options={cols} showSearch allowClear />
                        </Form.Item>
                        <Form.Item label="红包列" name="redpacket_col">
                            <Select placeholder="选择列（可选）" options={cols} showSearch allowClear />
                        </Form.Item>
                        <Form.Item label="任务款列" name="task_col">
                            <Select placeholder="选择列（可选）" options={cols} showSearch allowClear />
                        </Form.Item>
                        <Form.Item label="门店房租列" name="rent_col">
                            <Select placeholder="选择列（可选）" options={cols} showSearch allowClear />
                        </Form.Item>
                        <Form.Item label="门店水电列" name="utilities_col">
                            <Select placeholder="选择列（可选）" options={cols} showSearch allowClear />
                        </Form.Item>
                        <Form.Item label="门店物业费列" name="property_col">
                            <Select placeholder="选择列（可选）" options={cols} showSearch allowClear />
                        </Form.Item>
                        <Form.Item label="总部分摊/分摊列" name="alloc_col">
                            <Select placeholder="选择列（可选）" options={cols} showSearch allowClear />
                        </Form.Item>
                        <Form.Item label="其他费用列" name="other_col">
                            <Select placeholder="选择列（可选）" options={cols} showSearch allowClear />
                        </Form.Item>
                    </>
                );
            }

            case 'profit_summary': {
                const upstreamCandidates = allUpstreamNodes.map(n => ({
                    label: n.isSource ? `${n.label} (${n.file || ''}/${n.sheet || ''})` : `${n.label} (处理结果)`,
                    value: n.nodeId
                }));

                return (
                    <>
                        {inputInfo}
                        <div style={{ marginBottom: 16, padding: 10, background: '#e8f5e9', borderRadius: 8, fontSize: 12, color: '#2e7d32' }}>
                            ✅ 将 <b>收入</b>、<b>成本</b>、<b>其他费用</b> 三张汇总表按 <b>年份+月份+办公室(团队)</b> 合并，并计算：一、收入 / 二、成本 / 三、费用 / 四、利润
                        </div>

                        <Divider orientation="left">输入选择</Divider>
                        <Form.Item label="收入来源节点" name="income_node_id" rules={[{ required: true, message: '请选择收入来源节点' }]}>
                            <Select placeholder="选择上游的“收入”节点" options={upstreamCandidates} showSearch />
                        </Form.Item>
                        <Form.Item label="成本来源节点" name="cost_node_id" rules={[{ required: true, message: '请选择成本来源节点' }]}>
                            <Select placeholder="选择上游的“成本”节点" options={upstreamCandidates} showSearch />
                        </Form.Item>
                        <Form.Item label="费用来源节点（可选）" name="expense_node_id">
                            <Select placeholder="选择上游的“其他费用”节点（可选）" options={upstreamCandidates} allowClear showSearch />
                        </Form.Item>

                        <Divider orientation="left">说明</Divider>
                        <div style={{ fontSize: 12, color: '#666' }}>
                            汇总节点默认用列名 <code>年份</code>/<code>月份</code>/<code>办公室</code> 作为关联键；缺失的数值列按 0 处理。
                        </div>
                    </>
                );
            }

            case 'ai_agent':
                return (
                    <>
                        {inputInfo}
                        <Form.Item label="结果列名" name="target_column">
                            <Input placeholder="AI处理结果" />
                        </Form.Item>
                        <Form.Item label="提示词模板" name="prompt" tooltip="用{{列名}}引用数据">
                            <Input.TextArea rows={6} placeholder="请分析{{content}}的情感，只返回'正面'或'负面'" />
                        </Form.Item>
                        <div style={{ fontSize: 12, color: '#888' }}>* AI处理较慢，建议先用小数据测试</div>
                    </>
                );

            // === 输出 ===
            case 'output':
                return (
                    <>
                        {inputInfo}
                        <Form.Item label="输出文件名" name="filename">
                            <Input placeholder="result.xlsx" />
                        </Form.Item>
                    </>
                );

            case 'output_csv':
                return (
                    <>
                        {inputInfo}
                        <Form.Item label="输出文件名" name="filename">
                            <Input placeholder="result.csv" />
                        </Form.Item>
                        <Form.Item label="编码" name="encoding">
                            <Select defaultValue="utf-8">
                                <Option value="utf-8">UTF-8</Option>
                                <Option value="gbk">GBK</Option>
                            </Select>
                        </Form.Item>
                    </>
                );

            default:
                return <div style={{ padding: 10, color: '#999' }}>暂无配置项</div>;
        }
    };

    const navItems = [
        { key: 'canvas', label: '画布', icon: <AppstoreOutlined /> },
        { key: 'search', label: '搜索', icon: <SearchOutlined /> },
        { key: 'tools', label: '常用工具', icon: <ToolOutlined /> },
        { key: 'logistics', label: '物流', icon: <RocketOutlined /> },
    ];

    // ============== 主界面 ==============
    return (
        <Layout className="app-container">
            <Header className="app-header">
                {navItems.map((item) => (
                    <div
                        key={item.key}
                        className={`nav-item ${currentView === item.key ? 'active' : ''}`}
                        onClick={() => setCurrentView(item.key)}
                    >
                        <span style={{ fontSize: 16 }}>{item.icon}</span>
                        <span>{item.label}</span>
                    </div>
                ))}
            </Header>

            <Content className="app-content">
                {/* 画布视图 (Canvas) */}
                {/* 画布视图 (Canvas) - 还原为原始全屏布局，并应用 Light/iOS 风格 */}
                <div style={{ display: currentView === 'canvas' ? 'flex' : 'none', width: '100%', height: '100%', gap: 24, padding: 24, boxSizing: 'border-box', minHeight: 0 }}>
                    <div className="left-panel" style={{ minHeight: 0 }}>
                        {/* 文件资源区域 - Light/iOS 风格 */}
                        <div className="ios-card file-manager-section" style={{ flex: '0 0 45%', overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0, marginTop: 0, padding: 0 }}>
                            <FileManager
                                files={files}
                                onUpload={handleUpload}
                                onDelete={deleteFile}
                                onPreview={(fid) => {
                                    const f = files.find(x => getFileId(x) === fid);
                                    if (f && f.sheets) {
                                        const sheets = typeof f.sheets === 'string' ? JSON.parse(f.sheets) : f.sheets;
                                        if (sheets.length > 0) handlePreview(fid, sheets[0].name);
                                    }
                                }}
                            />
                        </div>

                        {/* 节点库 - 直接展示（不再使用 Modal），并按分类可折叠 */}
                        <div className="ios-card" style={{ flex: '1 1 auto', overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0, padding: 0 }}>
                            <div style={{ padding: '14px 16px 0', fontSize: 13, fontWeight: 700, color: '#1D1D1F', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <AppstoreOutlined style={{ color: '#007AFF' }} />
                                节点库
                            </div>
                            <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px 12px', minHeight: 0 }}>
                                <NodeToolbox
                                    onDragStart={onDragStartHandler}
                                    onAddNode={addNodeFromLibrary}
                                    savedWorkflows={savedWorkflows}
                                    onApplyWorkflow={handleApplyWorkflowFromLibrary}
                                    onDeleteWorkflow={handleDeleteWorkflowFromLibrary}
                                    hiddenPresetWorkflowIds={hiddenPresetWorkflowIds}
                                />
                            </div>
                        </div>
                    </div>

                    {/* 画布容器 - 恢复 flex: 1 占据剩余空间 */}
                    <div className="canvas-container">
                        {/* Canvas 左上角：保存 */}
                        <div style={{ position: 'absolute', top: 16, left: 16, zIndex: 10 }}>
                            <Button
                                icon={<SaveOutlined />}
                                onClick={handleCanvasSaveClick}
                                style={{ backgroundColor: '#AF52DE', borderColor: '#AF52DE', color: 'white' }}
                            >
                                保存
                            </Button>
                        </div>

                        {/* Canvas 顶部按钮保持不变 */}
                        <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 10 }}>
                            <Space>
                                <Button icon={<DeleteOutlined />} onClick={() => setNodes([])} style={{ backgroundColor: '#FF4D4F', borderColor: '#FF4D4F', color: 'white' }}>清空</Button>
                                <Button type="primary" icon={<PlayCircleOutlined />} onClick={handleExecute} loading={executing}>执行</Button>
                            </Space>
                        </div>

                        {/* ReactFlow 容器 */}
                        <div style={{ width: '100%', height: '100%', padding: '30px', boxSizing: 'border-box' }}>
                            <div ref={reactFlowWrapper} style={{ width: '100%', height: '100%' }}>
                                <ReactFlow
                                    nodes={nodes} edges={edges} onNodesChange={onNodesChange}
                                    onEdgesChange={onEdgesChange} onConnect={onConnect}
                                    onEdgeUpdate={onEdgeUpdate} onEdgeUpdateEnd={onEdgeUpdateEnd}
                                    onNodeClick={onNodeClick} nodeTypes={nodeTypes}
                                    snapToGrid={true}
                                    snapGrid={[15, 15]}
                                    minZoom={0.1}
                                    maxZoom={1.5}
                                    fitView
                                    fitViewOptions={{ padding: 0.2 }}
                                    onInit={setReactFlowInstance}
                                    onDrop={onDrop} onDragOver={onDragOver}
                                    style={{ width: '100%', height: '100%' }}
                                    defaultEdgeOptions={{
                                        type: 'smoothstep',
                                        animated: true,
                                        style: { stroke: '#b1b1b7', strokeWidth: 2 },
                                        markerEnd: { type: MarkerType.ArrowClosed }
                                    }}
                                >
                                    <Background variant="dots" color="#e5e5ea" gap={15} size={1} />
                                    <Controls showInteractive={false} />
                                    {nodes.length === 0 && (
                                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', color: '#86868B' }}>
                                            <AppstoreOutlined style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }} />
                                            <p>请使用 AI 助手开始对话，或从左侧"节点库"拖拽节点</p>
                                        </div>
                                    )}
                                </ReactFlow>
                            </div>
                        </div>

                        {result && (
                            <div className="result-floating-panel">
                                <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontWeight: 600 }}>运行结果 ({result.total} 条)</span>
                                    <Space>
                                        <Button type="text" size="small" icon={<DownloadOutlined />} href={workflowApi.getDownloadUrl(result.outputFile)}>下载</Button>
                                        <Button type="text" size="small" onClick={() => setResult(null)}>关闭</Button>
                                    </Space>
                                </div>
                                <div style={{ flex: 1, overflow: 'auto' }}>
                                    <Table dataSource={result.dataSource} columns={result.columns} pagination={false} size="small" sticky />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Search View */}
                {currentView === 'search' && (
                    <div style={{ flex: 1, width: '100%', height: '100%', overflow: 'auto' }}>
                        <RaycastHomePage />
                    </div>
                )}

                {/* Tools View */}
                {currentView === 'tools' && (
                    <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#888' }}>
                        <div style={{ textAlign: 'center' }}>
                            <ToolOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                            <h2>常用工具箱</h2>
                        </div>
                    </div>
                )}

                {/* Logistics View */}
                {currentView === 'logistics' && (
                    <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#888' }}>
                        <div style={{ textAlign: 'center' }}>
                            <RocketOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                            <h2>物流中心</h2>
                        </div>
                    </div>
                )}
            </Content>

            {topToast.open && (
                <div className="glass-top-toast">{topToast.text}</div>
            )}

            <Drawer
                title="配置节点"
                placement="right"
                width={400}
                onClose={() => setShowNodeConfig(false)}
                open={showNodeConfig}
                mask={false}
                rootClassName="node-config-drawer-glass"
                extra={<Button type="primary" size="small" onClick={saveNodeConfig}>保存</Button>}>
                <Form form={nodeForm} layout="vertical" className="node-config-form" onValuesChange={handleNodeFormValuesChange}>
                    <Form.Item label="节点名称" name="_label" style={{ marginBottom: 24 }}>
                        <Input placeholder="输入节点名称" />
                    </Form.Item>
                    {renderNodeConfigForm()}
                </Form>
                <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid #F2F2F7' }}>
                    <Button block danger icon={<DeleteOutlined />} onClick={deleteSelectedNode}>删除节点</Button>
                </div>
            </Drawer>

            <Drawer
                title="错误详情"
                placement="right"
                width={420}
                onClose={() => setShowNodeErrorDrawer(false)}
                open={showNodeErrorDrawer}
                mask={false}
                rootClassName="node-config-drawer-glass"
            >
                {(() => {
                    const node = nodes.find(n => n.id === viewingNodeErrorId);
                    const nodeType = node?.data?.type;
                    const nodeTypeLabel = NODE_TYPES_CONFIG[nodeType]?.label || nodeType || '';
                    const errObj = nodeResults?.[viewingNodeErrorId] || {};
                    const err = errObj?.error || node?.data?.errorMessage || '';
                    const tracebackText = errObj?.traceback || '';
                    const suggestions = buildNodeErrorSuggestions(node, err);

                    const handleAskAI = async () => {
                        if (aiErrorSuggestLoading) return;
                        setAiErrorSuggestLoading(true);
                        try {
                            const workflowConfig = {
                                nodes: (nodes || []).map(n => ({ id: n.id, type: n.data.type, label: n.data.label, config: n.data.config || {} })),
                                edges: (edges || []).map(e => ({ source: e.source, target: e.target }))
                            };
                            const resp = await aiApi.errorSuggest({
                                node_id: viewingNodeErrorId,
                                node_type: nodeType,
                                node_label: node?.data?.label,
                                node_config: node?.data?.config || {},
                                error: String(err || ''),
                                traceback: tracebackText || undefined,
                                logs: Array.isArray(lastExecutionLogs) ? lastExecutionLogs : [],
                                workflow_config: workflowConfig
                            });
                            setAiErrorSuggestText(String(resp?.suggestion || ''));
                        } catch (e) {
                            message.error('AI 建议获取失败: ' + (e?.response?.data?.detail || e.message || '未知错误'));
                        } finally {
                            setAiErrorSuggestLoading(false);
                        }
                    };

                    return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <div style={{ fontSize: 13, color: 'rgba(29,29,31,0.65)', fontWeight: 600 }}>节点</div>
                                <div style={{ fontSize: 16, fontWeight: 800, color: 'rgba(29,29,31,0.92)' }}>
                                    {node?.data?.label || viewingNodeErrorId || '-'}
                                </div>
                                {nodeTypeLabel && (
                                    <div style={{ fontSize: 12, color: 'rgba(29,29,31,0.55)' }}>{nodeTypeLabel}</div>
                                )}
                            </div>

                            <div>
                                {(() => {
                                    const zh = summarizeErrorZh(err, tracebackText);
                                    if (!zh) return null;
                                    return (
                                        <div style={{
                                            marginBottom: 10,
                                            padding: '10px 12px',
                                            borderRadius: 14,
                                            background: 'rgba(52,199,89,0.10)',
                                            border: '1px solid rgba(52,199,89,0.25)',
                                            color: 'rgba(29,29,31,0.88)',
                                            fontSize: 13,
                                            lineHeight: 1.45
                                        }}>
                                            <div style={{ fontWeight: 800, marginBottom: 6 }}>一眼看懂（中文解释）</div>
                                            <div>{zh}</div>
                                        </div>
                                    );
                                })()}
                                <div style={{ fontSize: 13, color: 'rgba(29,29,31,0.65)', fontWeight: 700, marginBottom: 8 }}>错误原因</div>
                                <pre style={{
                                    margin: 0,
                                    padding: '12px 12px',
                                    borderRadius: 14,
                                    background: 'rgba(255,255,255,0.55)',
                                    border: '1px solid rgba(0,0,0,0.08)',
                                    backdropFilter: 'blur(12px) saturate(140%)',
                                    WebkitBackdropFilter: 'blur(12px) saturate(140%)',
                                    color: 'rgba(29,29,31,0.9)',
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word',
                                    userSelect: 'text'
                                }}>{String(err || '')}</pre>
                                {tracebackText && (
                                    <Collapse style={{ marginTop: 10, background: 'transparent' }}>
                                        <Panel header="Python 异常栈（Traceback）" key="tb">
                                            <pre style={{
                                                margin: 0,
                                                padding: '10px 10px',
                                                borderRadius: 14,
                                                background: 'rgba(255,255,255,0.55)',
                                                border: '1px solid rgba(0,0,0,0.08)',
                                                backdropFilter: 'blur(12px) saturate(140%)',
                                                WebkitBackdropFilter: 'blur(12px) saturate(140%)',
                                                color: 'rgba(29,29,31,0.86)',
                                                whiteSpace: 'pre-wrap',
                                                wordBreak: 'break-word',
                                                userSelect: 'text'
                                            }}>{String(tracebackText)}</pre>
                                        </Panel>
                                    </Collapse>
                                )}
                            </div>

                            <div>
                                <div style={{ fontSize: 13, color: 'rgba(29,29,31,0.65)', fontWeight: 700, marginBottom: 8 }}>解决方式</div>
                                <div style={{
                                    padding: '12px 12px',
                                    borderRadius: 14,
                                    background: 'rgba(255,255,255,0.55)',
                                    border: '1px solid rgba(0,0,0,0.08)',
                                    backdropFilter: 'blur(12px) saturate(140%)',
                                    WebkitBackdropFilter: 'blur(12px) saturate(140%)',
                                    color: 'rgba(29,29,31,0.9)',
                                    userSelect: 'text'
                                }}>
                                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                                        {suggestions.map((s, idx) => (
                                            <li key={idx} style={{ marginBottom: 6, lineHeight: 1.45 }}>{s}</li>
                                        ))}
                                    </ul>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                                    <Button size="small" type="primary" loading={aiErrorSuggestLoading} onClick={handleAskAI} style={{ background: '#007AFF', borderColor: '#007AFF' }}>
                                        AI 生成更具体建议
                                    </Button>
                                </div>
                                {aiErrorSuggestText && (
                                    <pre style={{
                                        marginTop: 10,
                                        marginBottom: 0,
                                        padding: '12px 12px',
                                        borderRadius: 14,
                                        background: 'rgba(255,255,255,0.55)',
                                        border: '1px solid rgba(0,0,0,0.08)',
                                        backdropFilter: 'blur(12px) saturate(140%)',
                                        WebkitBackdropFilter: 'blur(12px) saturate(140%)',
                                        color: 'rgba(29,29,31,0.9)',
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-word',
                                        userSelect: 'text'
                                    }}>{aiErrorSuggestText}</pre>
                                )}
                            </div>

                            {Array.isArray(lastExecutionLogs) && lastExecutionLogs.length > 0 && (
                                <div>
                                    <div style={{ fontSize: 13, color: 'rgba(29,29,31,0.65)', fontWeight: 700, marginBottom: 8 }}>执行日志</div>
                                    <pre style={{
                                        margin: 0,
                                        maxHeight: 260,
                                        overflow: 'auto',
                                        padding: '12px 12px',
                                        borderRadius: 14,
                                        background: 'rgba(255,255,255,0.55)',
                                        border: '1px solid rgba(0,0,0,0.08)',
                                        backdropFilter: 'blur(12px) saturate(140%)',
                                        WebkitBackdropFilter: 'blur(12px) saturate(140%)',
                                        color: 'rgba(29,29,31,0.86)',
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-word',
                                        userSelect: 'text'
                                    }}>{lastExecutionLogs.join('\n')}</pre>
                                </div>
                            )}
                        </div>
                    );
                })()}
            </Drawer>

            <Modal
                open={showSaveModal}
                onCancel={() => {
                    if (savingWorkflow) return;
                    setShowSaveModal(false);
                }}
                title={
                    <span style={{ color: 'rgba(255,255,255,0.92)', fontWeight: 700 }}>保存工作流</span>
                }
                centered
                width={640}
                rootClassName="workflow-save-modal"
                okText="保存"
                cancelText="取消"
                okButtonProps={{ loading: savingWorkflow, style: { backgroundColor: '#AF52DE', borderColor: '#AF52DE' } }}
                onOk={handleConfirmSaveWorkflow}
            >
                {(() => {
                    let previewText = '';
                    try {
                        previewText = JSON.stringify(buildWorkflowConfigForSave(), null, 2);
                    } catch {
                        previewText = '';
                    }

                    return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: 600 }}>自定义名称：</div>
                            <Input
                                value={workflowName}
                                onChange={(e) => setWorkflowName(e.target.value)}
                                placeholder="例如：月度报表清洗"
                                autoFocus
                            />

                            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: 600 }}>描述：</div>
                            <Input.TextArea
                                value={workflowDescription}
                                onChange={(e) => setWorkflowDescription(e.target.value)}
                                placeholder="简要描述这个工作流做什么"
                                autoSize={{ minRows: 3, maxRows: 5 }}
                            />

                            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: 600 }}>下面为组件预览：</div>
                            <pre className="workflow-preview-code">{`\"\"\"\n${previewText}\n\"\"\"`}</pre>
                        </div>
                    );
                })()}
            </Modal>

            <Modal open={showPreview} onCancel={() => setShowPreview(false)} footer={null} width={1100} title="预览数据" centered styles={{ body: { padding: 0 } }}>
                {previewFileId && (() => {
                    const f = files.find(x => getFileId(x) === previewFileId);
                    if (f && f.sheets) {
                        const sheets = typeof f.sheets === 'string' ? JSON.parse(f.sheets) : f.sheets;
                        return (
                            <div style={{ padding: '0 16px' }}>
                                <Tabs
                                    activeKey={previewSheetName}
                                    onChange={(key) => handlePreview(previewFileId, key)}
                                    items={sheets.map(s => ({ label: s.name, key: s.name }))}
                                />
                            </div>
                        );
                    }
                    return null;
                })()}
                {previewData && (
                    <Table
                        dataSource={previewData.dataSource}
                        columns={previewData.columns}
                        scroll={{ x: 'max-content', y: 600 }}
                        size="small"
                        bordered
                        pagination={false}
                        sticky
                    />
                )}
            </Modal>

            {/* 节点预览（样本执行）Modal */}
            <Modal
                open={showNodePreviewModal}
                onCancel={() => setShowNodePreviewModal(false)}
                footer={null}
                width={1200}
                title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 24, height: 24, background: '#007AFF', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <EyeOutlined style={{ color: 'white', fontSize: 12 }} />
                        </div>
                        <span>节点预览(样本): {viewingNodePreview?.nodeName}</span>
                        <Tag color="blue">上游样本 {viewingNodePreview?.stats?.source_rows ?? 600} 行</Tag>
                        <Tag color="blue">展示 {viewingNodePreview?.stats?.display_rows ?? 50} 行</Tag>
                        <Tag>{viewingNodePreview?.totalRows || 0} 行(节点输出)</Tag>
                    </div>
                }
                centered
                styles={{ body: { padding: 0 } }}
            >
                {viewingNodePreview && (
                    <>
                        <div style={{ padding: '10px 16px', background: '#fafafa', borderBottom: '1px solid #f0f0f0' }}>
                            <Space size={[8, 8]} wrap>
                                {typeof viewingNodePreview?.stats?.diff_count === 'number' && (
                                    <Tag color="red">差异 {viewingNodePreview.stats.diff_count}</Tag>
                                )}
                                {typeof viewingNodePreview?.stats?.match_count === 'number' && (
                                    <Tag color="green">一致 {viewingNodePreview.stats.match_count}</Tag>
                                )}
                                {typeof viewingNodePreview?.stats?.max_abs_diff === 'number' && (
                                    <Tag color="volcano">最大差异 {Number(viewingNodePreview.stats.max_abs_diff).toFixed(2)}</Tag>
                                )}
                                {typeof viewingNodePreview?.stats?.sum_abs_diff === 'number' && (
                                    <Tag color="orange">差异总量 {Number(viewingNodePreview.stats.sum_abs_diff).toFixed(2)}</Tag>
                                )}
                            </Space>
                            {viewingNodePreview?.stats?.note && (
                                <div style={{ marginTop: 6, fontSize: 12, color: '#888' }}>{viewingNodePreview.stats.note}</div>
                            )}
                        </div>
                        <Table
                            dataSource={viewingNodePreview.data?.map((row, idx) => ({ key: idx, ...row })) || []}
                            columns={viewingNodePreview.columns?.map(col => ({
                                title: col,
                                dataIndex: col,
                                key: col,
                                width: 150,
                                ellipsis: true,
                                render: (text) => (
                                    <Tooltip title={text} placement="topLeft">
                                        <span style={{ display: 'block', maxWidth: '100%', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                                            {text}
                                        </span>
                                    </Tooltip>
                                )
                            })) || []}
                            scroll={{ x: 'max-content', y: 500 }}
                            size="small"
                            bordered
                            pagination={false}
                            sticky
                        />
                    </>
                )}
            </Modal>

            {/* 节点执行结果预览Modal */}
            <Modal
                open={showNodeResultModal}
                onCancel={() => setShowNodeResultModal(false)}
                footer={null}
                width={1200}
                title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 24, height: 24, background: '#34C759', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <CheckOutlined style={{ color: 'white', fontSize: 12 }} />
                        </div>
                        <span>节点执行结果: {viewingNodeResult?.nodeName}</span>
                        <Tag color="green">{viewingNodeResult?.totalRows || 0} 行</Tag>
                    </div>
                }
                centered
                styles={{ body: { padding: 0 } }}
            >
                {viewingNodeResult && (
                    <Table
                        dataSource={viewingNodeResult.data?.map((row, idx) => ({ key: idx, ...row })) || []}
                        columns={viewingNodeResult.columns?.map(col => ({
                            title: col,
                            dataIndex: col,
                            key: col,
                            width: 150,
                            ellipsis: true,
                            render: (text) => (
                                <Tooltip title={text} placement="topLeft">
                                    <span style={{ display: 'block', maxWidth: '100%', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                                        {text}
                                    </span>
                                </Tooltip>
                            )
                        })) || []}
                        scroll={{ x: 'max-content', y: 500 }}
                        size="small"
                        bordered
                        pagination={{ pageSize: 100, showSizeChanger: true, showTotal: (total) => `共 ${total} 条` }}
                        sticky
                    />
                )}
            </Modal>
            <AIAssistantIsland
                messages={chatMessages}
                loading={chatLoading}
                onSend={handleIslandSend}
                onApplyWorkflow={handleApplyWorkflow}
                onNewChat={handleIslandNewChat}
                onStop={handleIslandStop}
                autoExpandOnFirstLoad={true}
                availableTables={availableTablesForIsland}
                selectedTableKeys={chatSelectedTables}
                onChangeSelectedTableKeys={setChatSelectedTables}
                conversations={(islandChatThreads || [])
                    .filter(t => Array.isArray(t?.messages) && t.messages.length > 0)
                    .map(t => ({ id: t.local_id, title: t.title, updatedAt: t.updated_at }))}
                activeConversationId={activeIslandThreadId}
                onSelectConversation={handleIslandSelectThread}
                onDeleteConversation={handleIslandDeleteConversation}
            />

            {false && (<Drawer
                title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <RobotOutlined style={{ color: '#FF2D55', fontSize: 20 }} />
                        <span style={{ fontWeight: 600 }}>AI 数据助手</span>
                    </div>
                }
                placement="left"
                closable={false}
                extra={
                    <Space>
                        {chatStep === 'chat' && (
                            <Tooltip title="创建新会话">
                                <Button
                                    type="text"
                                    icon={<PlusOutlined style={{ fontSize: 18, color: '#1D1D1F' }} />}
                                    onClick={() => {
                                        setChatStep('select');
                                        setChatSessionId(null);
                                        setChatMessages([]);
                                        setChatStatus('');
                                        setChatSelectedTables([]);
                                    }}
                                />
                            </Tooltip>
                        )}
                        <Button
                            type="text"
                            icon={<ArrowLeftOutlined style={{ fontSize: 18, color: '#1D1D1F' }} />}
                            onClick={() => setAiDrawerVisible(false)}
                        />
                    </Space>
                }
                open={aiDrawerVisible}
                width={420}
                mask={true}
                styles={{
                    mask: { background: 'rgba(0,0,0,0.2)' },
                    header: { borderBottom: '1px solid #f0f0f0' },
                    body: { padding: 0 }
                }}
            >
                {chatStep === 'select' ? (
                    <div style={{ padding: 24 }}>
                        <div style={{ marginBottom: 24, textAlign: 'center' }}>
                            <div style={{ width: 64, height: 64, background: '#F2F2F7', borderRadius: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                                <DatabaseOutlined style={{ fontSize: 32, color: '#007AFF' }} />
                            </div>
                            <Title level={4} style={{ margin: 0 }}>选择数据来源</Title>
                            <Text type="secondary">请选择需要分析的表格Sheet</Text>
                        </div>

                        <div style={{ marginBottom: 24 }}>
                            <div style={{ marginBottom: 8, fontWeight: 500 }}>已上传文件中的表格:</div>
                            {getAvailableTables().length > 0 ? (
                                <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                                    {getAvailableTables().map(t => {
                                        const isSelected = chatSelectedTables.includes(t.key);
                                        const fullName = `${t.filename} - ${t.sheet_name}`;
                                        const truncateMiddle = (str, len = 20) => {
                                            if (!str || str.length <= len) return str;
                                            return str.substring(0, Math.ceil(len / 2)) + '...' + str.substring(str.length - Math.floor(len / 2)); // 简单中间省略
                                        };

                                        return (
                                            <div
                                                key={t.key}
                                                onClick={() => {
                                                    if (isSelected) setChatSelectedTables(prev => prev.filter(k => k !== t.key));
                                                    else setChatSelectedTables(prev => [...prev, t.key]);
                                                }}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    padding: '12px',
                                                    marginBottom: 8,
                                                    background: isSelected ? '#F0F9FF' : '#F9F9FA',
                                                    borderRadius: 10,
                                                    border: isSelected ? '1px solid #007AFF' : '1px solid transparent',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden', flex: 1 }}>
                                                    <Checkbox checked={isSelected} style={{ pointerEvents: 'none' }} />
                                                    <Tooltip title={fullName} placement="topLeft" mouseEnterDelay={0.5}>
                                                        <span style={{ fontSize: 13, color: '#1D1D1F', fontFamily: 'menlo, monospace' }}>
                                                            {truncateMiddle(fullName, 24)}
                                                        </span>
                                                    </Tooltip>
                                                </div>
                                                <Tooltip title="预览表格">
                                                    <Button
                                                        type="text"
                                                        size="small"
                                                        icon={<EyeOutlined style={{ color: '#007AFF' }} />}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            // 查找file_id (t.file_id应存在于getAvailableTables中)
                                                            // 假设getAvailableTables返回包含file_id的对象
                                                            handlePreview(t.file_id || t.key.split('-')[1], t.sheet_name);
                                                        }}
                                                        style={{ marginLeft: 8 }}
                                                    />
                                                </Tooltip>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无可用表格，请先上传文件" />
                            )}
                        </div>

                        <Button
                            type="primary"
                            block
                            size="large"
                            onClick={startChat}
                            disabled={chatSelectedTables.length === 0}
                            style={{
                                borderRadius: 8,
                                height: 44,
                                background: chatSelectedTables.length === 0 ? '#F2F2F7' : '#007AFF',
                                borderColor: chatSelectedTables.length === 0 ? '#F2F2F7' : '#007AFF',
                                color: chatSelectedTables.length === 0 ? '#C7C7CC' : 'white'
                            }}
                        >
                            开始对话
                        </Button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                        {/* Selected Sheets Preview in Chat Mode */}
                        <div style={{ padding: '8px 16px', borderBottom: '1px solid #f0f0f0', background: '#fff', display: 'flex', gap: 8, overflowX: 'auto' }}>
                            {chatSelectedTables.map(key => {
                                const t = getAvailableTables().find(k => k.key === key);
                                return (
                                    <Tag key={key} style={{ flexShrink: 0, background: '#F2F2F7', border: 'none', borderRadius: 4 }}>
                                        {t ? `${t.filename}-${t.sheet_name}` : key}
                                    </Tag>
                                )
                            })}
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
                            {chatMessages.length === 0 && (
                                <div style={{ textAlign: 'center', color: '#86868B', marginTop: 60 }}>
                                    <RobotOutlined style={{ fontSize: 40, marginBottom: 16, color: '#E5E5EA' }} />
                                    <p>你好！我是 AI 数据助手。<br />请告诉我你想如何分析这些数据。</p>
                                </div>
                            )}
                            {chatMessages.map((msg, idx) => {
                                let displayContent = msg.content;
                                let workflow = null;

                                if (msg.role === 'assistant') {
                                    const jsonMatch = msg.content.match(/```json\n([\s\S]*?)\n```/);
                                    if (jsonMatch) {
                                        try {
                                            const parsed = JSON.parse(jsonMatch[1]);
                                            if (parsed.nodes && parsed.edges) {
                                                workflow = parsed;
                                                displayContent = displayContent.replace(jsonMatch[0], '').trim();
                                                if (!displayContent) displayContent = "已为您生成新的工作流设计方案，请查看下方";
                                            }
                                        } catch (e) {
                                            try {
                                                const parsed = JSON.parse(jsonMatch[0]);
                                                if (parsed.nodes && parsed.edges) {
                                                    workflow = parsed;
                                                    displayContent = displayContent.replace(jsonMatch[0], '').trim();
                                                    if (!displayContent) displayContent = "已为您生成新的工作流设计方案，请查看下方";
                                                }
                                            } catch (e2) { }
                                        }
                                    }
                                }

                                return (
                                    <div key={idx} style={{ marginBottom: 16, display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                                        <div style={{ maxWidth: '90%' }}>
                                            <div style={{
                                                padding: '12px 16px',
                                                borderRadius: 12,
                                                background: msg.role === 'user' ? '#007AFF' : '#F2F2F7',
                                                color: msg.role === 'user' ? 'white' : '#1D1D1F',
                                                borderTopRightRadius: msg.role === 'user' ? 2 : 12,
                                                borderTopLeftRadius: msg.role === 'user' ? 12 : 2,
                                                whiteSpace: 'pre-wrap',
                                                fontSize: 14,
                                                lineHeight: 1.5
                                            }}>
                                                {displayContent}
                                            </div>
                                            {workflow && (
                                                <div style={{ marginTop: 8, padding: 12, background: 'white', borderRadius: 12, border: '1px solid #E5E5EA', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                                                        <div style={{ width: 24, height: 24, background: '#5856D6', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            <ThunderboltOutlined style={{ color: 'white', fontSize: 14 }} />
                                                        </div>
                                                        <span style={{ fontWeight: 600, fontSize: 13 }}>工作流方案</span>
                                                        <Tag color="purple" style={{ margin: 0 }}>{workflow.nodes.length} 节点</Tag>
                                                    </div>
                                                    <Button type="primary" size="small" block
                                                        style={{ background: '#5856D6', borderColor: '#5856D6' }}
                                                        onClick={() => {
                                                            try {
                                                                let flowNodes = workflow.nodes.map(n => ({
                                                                    id: n.id, type: 'custom', position: { x: 0, y: 0 },
                                                                    data: { label: n.label, config: n.config, type: n.type, description: 'AI对话生成' }
                                                                }));
                                                                const flowEdges = workflow.edges.map((e, idx) => ({
                                                                    id: `e${idx}`, source: e.source, target: e.target,
                                                                    type: 'default', animated: true, // 使用平滑曲线
                                                                    style: { strokeWidth: 2, stroke: '#C7C7CC' },
                                                                    markerEnd: { type: MarkerType.ArrowClosed }
                                                                }));
                                                                flowNodes = calculateWorkflowLayout(flowNodes, flowEdges);
                                                                setNodes(flowNodes); setEdges(flowEdges);
                                                                setAiDrawerVisible(false); // Applied, close drawer
                                                                message.success('已应用AI生成的工作流！');
                                                            } catch (err) { console.error("Apply workflow failed:", err); message.error('应用失败'); }
                                                        }}>
                                                        应用此方案
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                            {chatLoading && (<div style={{ textAlign: 'center', padding: 20 }}><Spin tip="AI正在思考..." /></div>)}
                        </div>

                        <div style={{ padding: 16, borderTop: '1px solid #f0f0f0', background: 'white' }}>
                            {/* 始终显示生成按钮（只要有会话） */}
                            {chatSessionId && chatMessages.length > 0 && (
                                <Button
                                    type="primary"
                                    block
                                    onClick={confirmGenerateWorkflow}
                                    loading={chatLoading}
                                    icon={<CheckCircleOutlined />}
                                    style={{
                                        marginBottom: 12,
                                        background: chatStatus === 'confirmed' ? '#34C759' : '#007AFF',
                                        borderColor: chatStatus === 'confirmed' ? '#34C759' : '#007AFF'
                                    }}
                                >
                                    {chatStatus === 'confirmed' ? '✓ 确认生成工作流' : '立即生成工作流'}
                                </Button>
                            )}
                            <div style={{ display: 'flex', gap: 10 }}>
                                <Input
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    onPressEnter={sendChatMessage}
                                    placeholder="输入您的需求..."
                                    disabled={chatLoading}
                                    style={{ borderRadius: 20 }}
                                />
                                <Button
                                    type="primary"
                                    shape="circle"
                                    icon={<SendOutlined />}
                                    onClick={sendChatMessage}
                                    loading={chatLoading}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </Drawer>)}
        </Layout>
    );
}


// 自动布局算法 (简单分层)
const calculateWorkflowLayout = (nodes, edges) => {
    const nodeMap = {};
    nodes.forEach(n => nodeMap[n.id] = n);

    // 1. 构建邻接表和入度
    const adj = {};
    const inDegree = {};
    nodes.forEach(n => {
        adj[n.id] = [];
        inDegree[n.id] = 0;
    });

    edges.forEach(e => {
        if (nodeMap[e.source] && nodeMap[e.target]) {
            if (!adj[e.source]) adj[e.source] = [];
            adj[e.source].push(e.target);
            inDegree[e.target] = (inDegree[e.target] || 0) + 1;
        }
    });

    // 2. 拓扑排序计算层级
    const levels = {};
    const queue = [];

    nodes.forEach(n => {
        levels[n.id] = 0;
        if (inDegree[n.id] === 0) {
            queue.push(n.id);
        }
    });

    while (queue.length > 0) {
        const u = queue.shift();
        const neighbors = adj[u] || [];

        neighbors.forEach(v => {
            levels[v] = Math.max(levels[v] || 0, (levels[u] || 0) + 1);
            inDegree[v]--;
            if (inDegree[v] === 0) {
                queue.push(v);
            }
        });
    }

    // 3. 计算坐标
    const nodesByLevel = {};
    nodes.forEach(n => {
        const lvl = levels[n.id] || 0;
        if (!nodesByLevel[lvl]) nodesByLevel[lvl] = [];
        nodesByLevel[lvl].push(n.id);
    });

    return nodes.map(n => {
        const level = levels[n.id] || 0;
        const nodesInLevel = nodesByLevel[level] || [];
        const index = nodesInLevel.indexOf(n.id);

        // 布局参数
        const xSpacing = 300;
        const ySpacing = 120;
        const startX = 100;

        // 让每一层垂直居中
        const levelHeight = nodesInLevel.length * ySpacing;
        const startY = 100 + (index * ySpacing) - (levelHeight / 2) + 300; // +300为了避免太靠上

        return {
            ...n,
            position: {
                x: startX + level * xSpacing,
                y: startY
            }
        };
    });
};

export default App;
