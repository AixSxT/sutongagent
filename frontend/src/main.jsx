import React from 'react'
import ReactDOM from 'react-dom/client'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <ConfigProvider
            locale={zhCN}
            theme={{
                token: {
                    colorPrimary: '#007AFF', // iOS Blue
                    borderRadius: 12,
                    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
                    colorBgContainer: '#ffffff',
                },
                components: {
                    Button: {
                        borderRadius: 20,
                        controlHeight: 40,
                        boxShadow: 'none',
                    },
                    Input: {
                        borderRadius: 12,
                        colorBgContainer: '#F2F2F7',
                        activeBorderColor: '#007AFF',
                    },
                    Select: {
                        borderRadius: 12,
                        colorBgContainer: '#F2F2F7',
                    },
                    Card: {
                        borderRadiusLG: 18,
                        boxShadowTertiary: '0 2px 8px rgba(0,0,0,0.04)',
                    }
                }
            }}
        >
            <App />
        </ConfigProvider>
    </React.StrictMode>,
)
