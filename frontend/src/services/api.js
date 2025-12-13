/**
 * API服务封装
 */
import axios from 'axios';

const api = axios.create({
    baseURL: '/api',
    timeout: 300000,
});

// Excel相关API
export const excelApi = {
    // 上传文件
    upload: async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await api.post('/excel/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },

    // 获取所有文件
    getFiles: async () => {
        const response = await api.get('/excel/files');
        return response.data;
    },

    // 获取文件信息
    getFile: async (fileId) => {
        const response = await api.get(`/excel/file/${fileId}`);
        return response.data;
    },

    // 预览Sheet
    previewSheet: async (fileId, sheetName, rows = 10) => {
        const response = await api.get(`/excel/file/${fileId}/sheet/${encodeURIComponent(sheetName)}/preview`, {
            params: { rows }
        });
        return response.data;
    },

    // 删除文件
    deleteFile: async (fileId) => {
        const response = await api.delete(`/excel/file/${fileId}`);
        return response.data;
    }
};

// AI相关API
export const aiApi = {
    // 生成工作流（一次性模式）
    generateWorkflow: async (userInput, fileIds) => {
        console.log('[aiApi] generateWorkflow:', { userInput, fileIds });
        const response = await api.post('/ai/generate-workflow', {
            user_input: userInput,
            file_ids: fileIds
        });
        return response.data;
    },

    // 解释工作流
    explainWorkflow: async (workflowConfig) => {
        console.log('[aiApi] explainWorkflow');
        const response = await api.post('/ai/explain-workflow', {
            workflow_config: workflowConfig
        });
        return response.data;
    },

    // ============ AI对话模式 ============

    // 开始对话（选择表后调用）
    chatStart: async (selectedFiles) => {
        console.log('[aiApi] chatStart:', selectedFiles);
        const response = await api.post('/ai/chat/start', {
            selected_files: selectedFiles
        });
        console.log('[aiApi] chatStart result:', response.data);
        return response.data;
    },

    // 发送消息
    chatMessage: async (sessionId, message) => {
        console.log('[aiApi] chatMessage:', { sessionId, message });
        const response = await api.post('/ai/chat/message', {
            session_id: sessionId,
            message: message
        });
        console.log('[aiApi] chatMessage result:', response.data);
        return response.data;
    },

    // 确认生成工作流
    chatGenerate: async (sessionId) => {
        console.log('[aiApi] chatGenerate:', sessionId);
        const response = await api.post('/ai/chat/generate', {
            session_id: sessionId
        });
        console.log('[aiApi] chatGenerate result:', response.data);
        return response.data;
    }
};

// 工作流相关API
export const workflowApi = {
    // 保存工作流
    save: async (name, description, config) => {
        const response = await api.post('/workflow/save', {
            name,
            description,
            config
        });
        return response.data;
    },

    // 获取所有工作流
    getList: async () => {
        const response = await api.get('/workflow/list');
        return response.data;
    },

    // 获取工作流
    get: async (workflowId) => {
        const response = await api.get(`/workflow/${workflowId}`);
        return response.data;
    },

    // 执行工作流
    execute: async (workflowConfig, fileMapping) => {
        const response = await api.post('/workflow/execute', {
            workflow_config: workflowConfig,
            file_mapping: fileMapping
        });
        return response.data;
    },

    // 获取历史记录
    getHistory: async (limit = 50) => {
        const response = await api.get('/workflow/history/list', { params: { limit } });
        return response.data;
    },

    // 下载结果
    getDownloadUrl: (filename) => {
        return `/api/workflow/download/${filename}`;
    }
};

export default api;
