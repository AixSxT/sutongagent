import { useState, useCallback, useEffect, useRef } from 'react';
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
    FilterOutlined, MergeCellsOutlined, CalculatorOutlined,
    GroupOutlined, ExportOutlined, SelectOutlined,
    AppstoreOutlined, BuildOutlined, CheckCircleOutlined,
    FileExcelFilled, ClockCircleOutlined, BranchesOutlined,
    ApiOutlined, CodeOutlined, SwapOutlined, ClearOutlined,
    SortAscendingOutlined, FieldStringOutlined,
    BarChartOutlined, NodeIndexOutlined, ProfileOutlined, ArrowDownOutlined,
    FolderOutlined, SearchOutlined, FileTextOutlined, TableOutlined, ArrowLeftOutlined,
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
                <div style={{ ...baseStyle, background: '#FF3B30', border: '2px solid white' }} title={data.errorMessage || '执行失败'}>
                    <CloseOutlined style={{ color: 'white', fontSize: 11 }} />
                </div>
            );
        }

        return null;
    };

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
        </div>
    );
}

const nodeTypes = { custom: CustomNode };

// Draggable Node
function DraggableNode({ type, config }) {
    const onDragStart = (event) => {
        event.dataTransfer.setData('application/reactflow', JSON.stringify({ type, config }));
        event.dataTransfer.effectAllowed = 'move';
    };

    return (
        <div className="draggable-node" draggable onDragStart={onDragStart}>
            <div className="draggable-node-icon" style={{ background: config.color, boxShadow: `0 2px 8px ${config.color}40` }}>
                {config.icon}
            </div>
            <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{config.label}</div>
                <div style={{ fontSize: 11, color: '#86868B' }}>{config.description}</div>
            </div>
            <PlusOutlined style={{ marginLeft: 'auto', color: '#C7C7CC', fontSize: 12 }} />
        </div>
    );
}

// === 节点工具箱组件 ===
// === 文件管理组件 ===
function FileManager({ files, onUpload, onDelete, onPreview }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            <div style={{ flexShrink: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1D1D1F', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CloudUploadOutlined /> 文件资源
                </div>
                <div style={{ background: 'white', borderRadius: 12, padding: 12, border: '1px solid rgba(0,0,0,0.02)', marginBottom: 12 }}>
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
                <div style={{ flex: 1, background: 'white', borderRadius: 12, border: '1px solid rgba(0,0,0,0.02)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px' }}>
                        <List
                            size="small"
                            dataSource={files}
                            split={false}
                            renderItem={item => (
                                <List.Item style={{ padding: '6px 0' }}
                                    actions={[
                                        <DeleteOutlined
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onDelete(item.file_id);
                                            }}
                                            style={{ color: '#C7C7CC', cursor: 'pointer', fontSize: 12 }}
                                        />
                                    ]}
                                >
                                    <List.Item.Meta
                                        avatar={<FileExcelOutlined style={{ color: '#34C759', fontSize: 16, marginTop: 4 }} />}
                                        title={<a onClick={() => onPreview(item.file_id)} style={{ fontSize: 12, color: '#1D1D1F', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>{item.filename}</a>}
                                    />
                                </List.Item>
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
function NodeToolbox() {
    return (
        <div style={{ paddingRight: 4 }}>
            {Object.entries(NODE_CATEGORIES).map(([catKey, cat]) => (
                <div key={catKey} style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: cat.color, display: 'flex', alignItems: 'center', gap: 6 }}>
                        {cat.icon}
                        {cat.label}
                    </div>
                    <div style={{ display: 'grid', gap: 8 }}>
                        {Object.entries(NODE_TYPES_CONFIG)
                            .filter(([_, cfg]) => cfg.category === catKey)
                            .map(([type, config]) => (
                                <DraggableNode key={type} type={type} config={config} />
                            ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

function App() {
    const [files, setFiles] = useState([]);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [userInput, setUserInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [executing, setExecuting] = useState(false);
    const [result, setResult] = useState(null);
    const [savedWorkflows, setSavedWorkflows] = useState([]);
    const [showPreview, setShowPreview] = useState(false);
    const [previewData, setPreviewData] = useState(null);
    const [previewFileId, setPreviewFileId] = useState(null); // 预览的文件ID
    const [previewSheetName, setPreviewSheetName] = useState(null); // 预览的Sheet名
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [workflowName, setWorkflowName] = useState('');

    const [selectedNode, setSelectedNode] = useState(null);
    const [showNodeConfig, setShowNodeConfig] = useState(false);
    const [nodeForm] = Form.useForm();
    const [fileSheets, setFileSheets] = useState({});
    const [configFileId, setConfigFileId] = useState(null); // 当前配置中选择的文件ID
    const [configSheet, setConfigSheet] = useState(null); // 当前配置中选择的Sheet

    // ============ AI对话模式状态 ============

    const [chatStep, setChatStep] = useState('select'); // select: 选表, chat: 对话
    const [chatSelectedTables, setChatSelectedTables] = useState([]); // 选中的表
    const [chatSessionId, setChatSessionId] = useState(null); // 对话会话ID
    const [chatMessages, setChatMessages] = useState([]); // 对话消息列表
    const [chatInput, setChatInput] = useState(''); // 用户输入
    const [chatLoading, setChatLoading] = useState(false); // 对话加载中
    const [chatStatus, setChatStatus] = useState(''); // clarifying / confirmed

    const [aiDrawerVisible, setAiDrawerVisible] = useState(false); // 控制AI抽屉显示

    // ============ 执行状态可视化 ============
    const [nodeExecutionStatus, setNodeExecutionStatus] = useState({}); // {nodeId: 'pending'|'running'|'success'|'error'}
    const [nodeResults, setNodeResults] = useState({}); // {nodeId: {columns, data, total_rows}}
    const [showNodeResultModal, setShowNodeResultModal] = useState(false);
    const [viewingNodeResult, setViewingNodeResult] = useState(null); // {nodeId, columns, data}

    const reactFlowWrapper = useRef(null);
    const [reactFlowInstance, setReactFlowInstance] = useState(null);
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);

    // 获取文件的Sheet列表
    const loadFileSheets = async (fileId) => {
        if (fileSheets[fileId]) return fileSheets[fileId];
        const file = files.find(f => f.file_id === fileId);
        if (file && file.sheets) {
            const sheets = JSON.parse(file.sheets);
            setFileSheets(prev => ({ ...prev, [fileId]: sheets }));
            return sheets;
        }
        return [];
    };

    // 获取当前选中文件的Sheet选项
    const getSheetOptions = (fileId) => {
        if (!fileId) return [];
        const file = files.find(f => f.file_id === fileId);
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
        const file = files.find(f => f.file_id === fileId);
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
        event.dataTransfer.dropEffect = 'move';
        console.log('[DragDrop] onDragOver triggered');
    }, []);

    const onDrop = useCallback((event) => {
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

        const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
        console.log('[DragDrop] reactFlowBounds:', reactFlowBounds);

        const rawData = event.dataTransfer.getData('application/reactflow');
        console.log('[DragDrop] rawData:', rawData);

        if (!rawData) {
            console.error('[DragDrop] ERROR: No data in dataTransfer!');
            return;
        }

        const data = JSON.parse(rawData);
        console.log('[DragDrop] Parsed data:', data);

        const position = reactFlowInstance.project({
            x: event.clientX - reactFlowBounds.left,
            y: event.clientY - reactFlowBounds.top,
        });
        console.log('[DragDrop] Calculated position:', position);

        const newNode = {
            id: `node_${Date.now()}`,
            type: 'custom',
            position,
            data: { type: data.type, label: data.config.label, description: '点击配置', config: {} },
        };
        console.log('[DragDrop] Creating new node:', newNode);

        setNodes((nds) => nds.concat(newNode));
        setSelectedNode(newNode);
        setConfigFileId(null);
        setConfigSheet(null);
        setShowNodeConfig(true);
        console.log('[DragDrop] Node created successfully');
    }, [reactFlowInstance, setNodes]);

    const onNodeClick = useCallback((event, node) => {
        setSelectedNode(node);
        const config = node.data.config || {};
        // 将节点Label也放入表单进行编辑
        nodeForm.setFieldsValue({ ...config, _label: node.data.label });
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
                const file = files.find(f => f.file_id === config.file_id);
                return file ? `${file.filename.slice(0, 10)}...` : '未选择文件';
            case 'transform': return config.filter_code || '数据处理';
            case 'join': return config.how ? `${config.how} join` : '配置关联';
            case 'group_aggregate': return config.group_by?.join(', ') || '分组聚合';
            case 'fill_na': return config.strategy || '缺失值处理';
            case 'deduplicate': return '去重';
            case 'pivot': return '透视表';
            case 'code': return 'Python脚本';
            case 'ai_agent': return config.target_column || 'AI处理';
            case 'output':
            case 'output_csv': return config.filename || '输出文件';
            default: return '已配置';
        }
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
                setFiles(fileData.files || []);
                const workflowData = await workflowApi.getList();
                setSavedWorkflows(workflowData.workflows || []);
            } catch (error) {
                console.error('初始化失败:', error);
            }
        };
        init();
    }, []);

    const handleUpload = async ({ file }) => {
        setLoading(true);
        try {
            const result = await excelApi.upload(file);
            message.success('上传成功');
            const data = await excelApi.getFiles();
            setFiles(data.files || []);
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
            setFiles(prev => prev.filter(f => f.file_id !== fileId));
            setSelectedFiles(prev => prev.filter(id => id !== fileId));
            message.success('文件已删除');
        } catch (error) {
            console.error('Delete file failed:', error);
            message.error('删除文件失败');
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

        // 重置执行状态
        setNodeExecutionStatus({});
        setNodeResults({});

        // 设置所有节点为pending状态
        const initialStatus = {};
        nodes.forEach(n => { initialStatus[n.id] = 'pending'; });
        setNodeExecutionStatus(initialStatus);

        // 更新节点显示状态
        setNodes(nds => nds.map(n => ({
            ...n,
            data: { ...n.data, executionStatus: 'pending', nodeId: n.id, onViewResult: handleViewNodeResult }
        })));

        try {
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

            // 更新节点状态
            if (result.node_status) {
                setNodeExecutionStatus(result.node_status);
                setNodes(nds => nds.map(n => ({
                    ...n,
                    data: {
                        ...n.data,
                        executionStatus: result.node_status[n.id] || 'pending',
                        errorMessage: result.node_results?.[n.id]?.error,
                        nodeId: n.id,
                        onViewResult: handleViewNodeResult
                    }
                })));
            }

            // 存储节点结果
            if (result.node_results) {
                setNodeResults(result.node_results);
            }

            // 更新边的样式（成功的节点之间的边标绿）
            setEdges(eds => eds.map(e => {
                const sourceStatus = result.node_status?.[e.source];
                const targetStatus = result.node_status?.[e.target];
                if (sourceStatus === 'success' && (targetStatus === 'success' || targetStatus === 'pending')) {
                    return { ...e, style: { ...e.style, stroke: '#34C759', strokeWidth: 3 } };
                } else if (sourceStatus === 'error' || targetStatus === 'error') {
                    return { ...e, style: { ...e.style, stroke: '#FF3B30', strokeWidth: 2 } };
                }
                return e;
            }));

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
            message.error('执行出错: ' + e.message);
        } finally {
            setExecuting(false);
        }
    };

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
            let sheets = file.sheets;
            if (typeof sheets === 'string') {
                try { sheets = JSON.parse(sheets); } catch { sheets = []; }
            }
            if (Array.isArray(sheets)) {
                sheets.forEach(sheet => {
                    tables.push({
                        key: `${file.file_id}::${sheet.name}`,
                        file_id: file.file_id,
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

    // 开始对话（选择表后）
    const startChat = async () => {
        if (chatSelectedTables.length === 0) {
            message.warning('请至少选择一个表');
            return;
        }

        console.log('[AI-Chat] 开始对话，选中表:', chatSelectedTables);
        setChatLoading(true);

        try {
            const selectedFiles = chatSelectedTables.map(key => {
                const [file_id, sheet_name] = key.split('::');
                return { file_id, sheet_name };
            });

            const result = await aiApi.chatStart(selectedFiles);
            console.log('[AI-Chat] 对话开始成功:', result);

            setChatSessionId(result.session_id);
            setChatMessages([{ role: 'assistant', content: result.message }]);
            setChatStatus(result.status);
            setChatStep('chat');
        } catch (error) {
            console.error('[AI-Chat] 开始对话失败:', error);
            message.error('开始对话失败: ' + (error.response?.data?.detail || error.message));
        } finally {
            setChatLoading(false);
        }
    };

    // 发送消息
    const sendChatMessage = async () => {
        if (!chatInput.trim() || !chatSessionId) return;

        const userMsg = chatInput.trim();
        console.log('[AI-Chat] 发送消息:', userMsg);

        setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setChatInput('');
        setChatLoading(true);

        try {
            const result = await aiApi.chatMessage(chatSessionId, userMsg);
            console.log('[AI-Chat] 收到回复:', result);

            setChatMessages(prev => [...prev, { role: 'assistant', content: result.message }]);
            setChatStatus(result.status);
        } catch (error) {
            console.error('[AI-Chat] 发送消息失败:', error);
            message.error('发送失败: ' + (error.response?.data?.detail || error.message));
        } finally {
            setChatLoading(false);
        }
    };

    // 确认生成工作流
    const confirmGenerateWorkflow = async () => {
        if (!chatSessionId) return;

        console.log('[AI-Chat] 确认生成工作流');
        setChatLoading(true);

        try {
            const result = await aiApi.chatGenerate(chatSessionId);
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
                                    nodeInfo.file = file.filename;
                                    nodeInfo.sheet = sheetName;
                                    nodeInfo.columns = sheet?.columns || [];
                                }
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
                        <Form.Item label="关联键（支持多列）" name="join_keys" tooltip="按此键分组汇总对比，如：市场id+门店id">
                            <Select mode="multiple" placeholder="选择关联维度" options={reconcileCommonCols.length > 0 ? reconcileCommonCols : reconcileDetailCols} />
                        </Form.Item>
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
                        <Form.Item label="Python代码" name="python_code">
                            <Input.TextArea rows={12} style={{ fontFamily: 'monospace', fontSize: 13, background: '#1e1e1e', color: '#d4d4d4' }}
                                placeholder={`# 示例:\ndf['total'] = df['a'] + df['b']\nresult = df`} />
                        </Form.Item>
                    </>
                );

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

    // ============== 主界面 ==============
    return (
        <Layout className="app-container">
            <Header className="app-header" style={{ display: 'flex', alignItems: 'center', padding: '0 24px', background: 'white', borderBottom: '1px solid #f0f0f0', position: 'relative' }}>
                <Button
                    type={aiDrawerVisible ? 'primary' : 'text'}
                    icon={<RobotOutlined style={{ fontSize: 18, color: aiDrawerVisible ? 'white' : '#1D1D1F' }} />}
                    onClick={() => setAiDrawerVisible(!aiDrawerVisible)}
                    style={{ width: 40, height: 40, borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                />

                <div className="app-logo" style={{
                    position: 'absolute',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 20,
                    fontWeight: 800,
                    color: '#1D1D1F',
                    letterSpacing: '-0.5px'
                }}>
                    <span>EXCEL</span>
                    <FileExcelFilled style={{ color: '#34C759', fontSize: 22 }} />
                    <span>FLOW</span>
                </div>
            </Header>

            <Content className="app-content">
                <div className="left-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                    <div style={{ flex: 0.3, overflow: 'hidden', marginTop: 16, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                        <FileManager
                            files={files}
                            onUpload={handleUpload}
                            onDelete={deleteFile}
                            onPreview={(fid) => {
                                const f = files.find(x => x.file_id === fid);
                                if (f && f.sheets) {
                                    const sheets = typeof f.sheets === 'string' ? JSON.parse(f.sheets) : f.sheets;
                                    if (sheets.length > 0) handlePreview(fid, sheets[0].name);
                                }
                            }}
                        />
                    </div>

                    <div style={{ flex: 0.7, overflow: 'hidden', marginTop: 16, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#1D1D1F', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                            <AppstoreOutlined /> 节点库
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            <NodeToolbox />
                        </div>
                    </div>
                </div>
                <div className="canvas-container" ref={reactFlowWrapper}>
                    <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 10 }}>
                        <Space>
                            <Button icon={<DeleteOutlined />} onClick={() => setNodes([])} style={{ backgroundColor: '#FF4D4F', borderColor: '#FF4D4F', color: 'white' }}>清空</Button>
                            <Button type="primary" icon={<PlayCircleOutlined />} onClick={handleExecute} loading={executing}>执行</Button>
                        </Space>
                    </div>

                    <ReactFlow
                        nodes={nodes} edges={edges} onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange} onConnect={onConnect}
                        onEdgeUpdate={onEdgeUpdate} onEdgeUpdateEnd={onEdgeUpdateEnd}
                        onNodeClick={onNodeClick} nodeTypes={nodeTypes} fitView
                        onInit={setReactFlowInstance}
                        onDrop={onDrop} onDragOver={onDragOver}
                        defaultEdgeOptions={{ type: 'default', animated: true, style: { strokeWidth: 2, stroke: '#b1b1b7' } }}
                    >
                        <Background color="#E5E5EA" gap={20} size={1} />
                        <Controls showInteractive={false} />
                        {nodes.length === 0 && (
                            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', color: '#86868B' }}>
                                <AppstoreOutlined style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }} />
                                <p>请在左侧"AI助手"中开始对话，或从"节点库"拖拽节点</p>
                            </div>
                        )}
                    </ReactFlow>

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
            </Content>

            <Drawer title="配置节点" placement="right" width={400} onClose={() => setShowNodeConfig(false)} open={showNodeConfig} mask={false}
                extra={<Button type="primary" size="small" onClick={saveNodeConfig}>保存</Button>}>
                <Form form={nodeForm} layout="vertical" className="node-config-form">
                    <Form.Item label="节点名称" name="_label" style={{ marginBottom: 24 }}>
                        <Input placeholder="输入节点名称" />
                    </Form.Item>
                    {renderNodeConfigForm()}
                </Form>
                <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid #F2F2F7' }}>
                    <Button block danger icon={<DeleteOutlined />} onClick={deleteSelectedNode}>删除节点</Button>
                </div>
            </Drawer>

            <Modal open={showPreview} onCancel={() => setShowPreview(false)} footer={null} width={1100} title="预览数据" centered styles={{ body: { padding: 0 } }}>
                {previewFileId && (() => {
                    const f = files.find(x => x.file_id === previewFileId);
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
            <Drawer
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
            </Drawer>
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
        const xSpacing = 350;
        const ySpacing = 150;
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
