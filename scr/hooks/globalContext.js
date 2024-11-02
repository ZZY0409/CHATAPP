/* eslint-disable no-restricted-globals, no-undef */

// 检查和设置全局变量
let globalContext;

// 确定全局上下文
if (typeof window !== 'undefined') {
    // 浏览器环境
    globalContext = window;
} else if (typeof global !== 'undefined') {
    // Node.js 环境
    globalContext = global;
} else if (typeof self !== 'undefined') {
    // Web Worker 环境
    globalContext = self;
} else {
    // 后备方案，使用 window 对象
    globalContext = window || {};
}

// 确保 process 对象存在
if (!globalContext.process) {
    globalContext.process = {
        env: {
            NODE_ENV: process.env.NODE_ENV || 'development'
        },
        browser: true,
        version: '',
        versions: {},
        platform: 'browser'
    };
}

// 确保全局对象存在
if (!globalContext.global) {
    globalContext.global = globalContext;
}

// 导出全局对象
export default globalContext;

// 设置为全局变量
if (typeof window !== 'undefined') {
    window.global = globalContext;
}