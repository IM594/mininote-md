// 在文件开头添加时间跟踪变量
let loadingStartTime = null;
let pageStartTime = null;

// 添加页面加载时间监控
window.addEventListener('load', () => {
    const timing = performance.timing;
    const pageLoadTime = timing.loadEventStart - timing.navigationStart;
    console.log('[Page] 页面完全加载完成', `(${pageLoadTime}ms)`);
    
    // 输出详细的加载时间分析
    console.log('[Page] DNS查询时间:', timing.domainLookupEnd - timing.domainLookupStart, 'ms');
    console.log('[Page] TCP连接时间:', timing.connectEnd - timing.connectStart, 'ms');
    console.log('[Page] 首字节时间(TTFB):', timing.responseStart - timing.navigationStart, 'ms');
    console.log('[Page] DOM解析时间:', timing.domInteractive - timing.responseEnd, 'ms');
    console.log('[Page] 资源加载时间:', timing.loadEventStart - timing.domContentLoadedEventEnd, 'ms');
});

// 记录页面开始加载的时间
pageStartTime = performance.now();
console.log('[Page] 开始加载页面 (0ms)');

// 添加缓存相关变量
const AUTH_CACHE_KEY = 'auth_cache';
const AUTH_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24小时缓存时间

// 添加一个自动更新认证缓存的函数
function refreshAuthCache() {
    const cache = localStorage.getItem(AUTH_CACHE_KEY);
    if (cache) {
        try {
            const { status } = JSON.parse(cache);
            if (status) {
                updateAuthCache(status);
                console.log('[Auth] 自动更新认证缓存时间');
            }
        } catch (e) {
            console.error('[Auth] 刷新认证缓存失败:', e);
        }
    }
}

// 检查认证缓存
function checkAuthCache() {
    try {
        const cache = localStorage.getItem(AUTH_CACHE_KEY);
        if (cache) {
            const { timestamp, status } = JSON.parse(cache);
            // 检查缓存是否在有效期内
            if (Date.now() - timestamp < AUTH_CACHE_DURATION) {
                console.log('[Auth] 使用缓存的认证状态', getElapsedTime());
                // 如果距离上次更新超过1小时，则刷新缓存时间
                if (Date.now() - timestamp > 60 * 60 * 1000) {
                    refreshAuthCache();
                }
                return status;
            } else {
                console.log('[Auth] 认证缓存已过期', getElapsedTime());
                localStorage.removeItem(AUTH_CACHE_KEY);
            }
        }
    } catch (e) {
        console.error('[Auth] 读取认证缓存失败:', e);
        localStorage.removeItem(AUTH_CACHE_KEY);
    }
    return null;
}

// 更新认证缓存
function updateAuthCache(status) {
    try {
        localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify({
            timestamp: Date.now(),
            status
        }));
        console.log('[Auth] 更新认证缓存', getElapsedTime());
    } catch (e) {
        console.error('[Auth] 更新认证缓存失败:', e);
    }
}

// 清除认证缓存
function clearAuthCache() {
    localStorage.removeItem(AUTH_CACHE_KEY);
    console.log('[Auth] 清除认证缓存');
}

// 页面加载时检查认证状态
async function checkAuth() {
    try {
        console.log('[Page] DOM内容加载完成', `(${Math.round(performance.now() - pageStartTime)}ms)`);
        
        loadingStartTime = Date.now();
        console.log('[Loading] 开始检查认证状态 (0ms)');

        // 先从本地获取设置并应用主题
        console.log('[Loading] 开始读取本地设置', getElapsedTime());
        const localSettings = localStorage.getItem('editor_settings');
        if (localSettings) {
            try {
                const settings = JSON.parse(localSettings);
                console.log('[Loading] 解析本地设置成功', getElapsedTime());
                if (settings.theme) {
                    document.documentElement.setAttribute('data-theme', settings.theme);
                    console.log('[Loading] 应用主题设置完成', getElapsedTime());
                }
            } catch (e) {
                console.error('[Loading] 解析本地设置失败:', e, getElapsedTime());
            }
        } else {
            console.log('[Loading] 没有找到本地设置', getElapsedTime());
        }

        // 检查认证缓存
        const cachedAuth = checkAuthCache();
        if (cachedAuth !== null) {
            console.log('[Loading] 使用缓存的认证状态', getElapsedTime());
            if (cachedAuth) {
                // 先用缓存快速渲染界面
                await initializeEditor();
                
                // 在后台验证 token
                validateTokenInBackground();
                return;
            } else {
                handleAuthFailure();
                return;
            }
        }

        // 如果没有缓存，发送认证请求
        console.log('[Loading] 开始发送认证检查请求', getElapsedTime());
        const response = await fetch('/api/check-auth');
        const data = await response.json();
        console.log('[Loading] 认证检查响应完成', getElapsedTime());

        if (response.ok && data.success) {
            updateAuthCache(true);
            await initializeEditor();
        } else {
            updateAuthCache(false);
            handleAuthFailure();
        }
    } catch (error) {
        console.error('[Loading] 认证检查失败:', error, getElapsedTime());
        clearAuthCache();
        handleAuthFailure();
    }
}

// 添加后台验证 token 的函数
async function validateTokenInBackground() {
    try {
        console.log('[Auth] 开始后台验证 token');
        const response = await fetch('/api/check-auth');
        const data = await response.json();
        
        if (!response.ok || !data.success) {
            console.log('[Auth] 后台验证失败，token 已失效');
            clearAuthCache();
            // 平滑切换到登录界面
            document.getElementById('editor-container').classList.add('fade-out');
            setTimeout(() => {
                document.getElementById('editor-container').classList.add('hidden');
                document.getElementById('auth-container').classList.remove('hidden');
            }, 300);
        } else {
            console.log('[Auth] 后台验证成功，token 有效');
            // 成功验证后刷新缓存时间
            refreshAuthCache();
        }
    } catch (error) {
        console.error('[Auth] 后台验证出错:', error);
    }
}

// 添加 loading 控制相关变量
let loadingTimer = null;
let loadingFinished = false;

// 显示 loading
function showLoading() {
    const loadingContainer = document.getElementById('loading-container');
    loadingContainer.classList.remove('hidden');
    loadingContainer.classList.remove('fade-out');
}

// 隐藏 loading
function hideLoading() {
    loadingFinished = true;
    if (loadingTimer) {
        clearTimeout(loadingTimer);
        loadingTimer = null;
    }
    
    const loadingContainer = document.getElementById('loading-container');
    // 只有当loading已经显示时才执行淡出动画
    if (!loadingContainer.classList.contains('hidden')) {
        loadingContainer.classList.add('fade-out');
        setTimeout(() => {
            loadingContainer.classList.add('hidden');
            console.log('[Loading] 加载界面完全隐藏', getElapsedTime());
            console.log('[Summary] 总加载时间:', Date.now() - loadingStartTime, 'ms');
            loadingStartTime = null;
        }, 300);
    }
}

// 抽取认证成功的处理逻辑
async function initializeEditor() {
    console.log('[Loading] 开始准备编辑器', getElapsedTime());
    document.getElementById('auth-container').classList.add('hidden');
    document.getElementById('editor-container').classList.remove('hidden');
    console.log('[Loading] DOM准备完成，开始初始化编辑器', getElapsedTime());
    
    const editorStartTime = Date.now();
    loadingFinished = false; // 重置状态
    
    // 创建一个 Promise 来跟踪编辑器初始化
    const initPromise = initEditor();
    
    // 设置一个定时器，如果初始化时间超过50ms才显示loading
    loadingTimer = setTimeout(() => {
        if (!loadingFinished) {
            showLoading();
        }
    }, 800);
    
    try {
        // 等待编辑器初始化完成
        await initPromise;
        
        console.log('[Loading] 编辑器初始化完成', getElapsedTime());
        console.log('[Editor] 编辑器初始化耗时:', Date.now() - editorStartTime, 'ms');
        
        // 如果初始化时间小于50ms，直接标记完成并清除定时器
        if (Date.now() - editorStartTime <= 50) {
            loadingFinished = true;
            if (loadingTimer) {
                clearTimeout(loadingTimer);
                loadingTimer = null;
            }
            // 确保 loading 被隐藏
            document.getElementById('loading-container').classList.add('hidden');
        } else {
            // 否则正常隐藏loading
            hideLoading();
        }
    } catch (error) {
        console.error('编辑器初始化失败:', error);
        loadingFinished = true;
        if (loadingTimer) {
            clearTimeout(loadingTimer);
            loadingTimer = null;
        }
        document.getElementById('loading-container').classList.add('hidden');
    }
}

// 抽取认证失败的处理逻辑
function handleAuthFailure() {
    console.log('[Loading] 认证无效，显示登录界面', getElapsedTime());
    document.getElementById('auth-container').classList.remove('hidden');
    document.getElementById('editor-container').classList.add('hidden');
    document.getElementById('loading-container').classList.add('hidden');
    console.log('[Loading] 登录界面准备完成', getElapsedTime());
    loadingStartTime = null;
}

async function handleAuth(event) {
    event.preventDefault();
    
    const password = document.getElementById('password').value;
    const button = document.querySelector('.auth-button');
    const inputGroup = document.querySelector('.auth-input-group');
    
    if (!password) {
        inputGroup.classList.add('error');
        return;
    }
    
    try {
        button.disabled = true;
        button.classList.add('loading');
        inputGroup.classList.remove('error');
        
        loadingStartTime = Date.now();
        loadingFinished = false;
        console.log('[Auth] 开始登录流程 (0ms)');
        
        loadingTimer = setTimeout(() => {
            if (!loadingFinished) {
                showLoading();
            }
        }, 50);
        
        console.log('[Auth] 开始发送登录请求', getElapsedTime());
        const response = await fetch('/api/auth', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ password }),
        });
        console.log('[Auth] 登录请求响应完成', getElapsedTime());

        const data = await response.json();
        if (response.ok && data.success) {
            // 在登录成功后，先验证认证状态
            const authCheck = await fetch('/api/check-auth');
            const authData = await authCheck.json();
            
            if (!authCheck.ok || !authData.success) {
                throw new Error('认证验证失败');
            }
            
            updateAuthCache(true);
            console.log('[Auth] 登录成功，开始准备编辑器', getElapsedTime());
            
            document.getElementById('auth-container').classList.add('hidden');
            document.getElementById('editor-container').classList.remove('hidden');
            document.getElementById('password').value = '';
            
            const editorStartTime = Date.now();
            console.log('[Auth] 开始初始化编辑器', getElapsedTime());
            await initEditor();
            console.log('[Auth] 编辑器初始化完成', getElapsedTime());
            console.log('[Editor] 编辑器初始化耗时:', Date.now() - editorStartTime, 'ms');
            
            hideLoading();
        } else {
            throw new Error(data.error || '密码错误');
        }
    } catch (error) {
        console.error('[Auth] 登录失败:', error);
        inputGroup.classList.add('error');
        document.getElementById('password').focus();
    } finally {
        button.disabled = false;
        button.classList.remove('loading');
        clearTimeout(loadingTimer);
        loadingTimer = null;
        loadingFinished = true;
        document.getElementById('loading-container').classList.add('hidden');
        loadingStartTime = null;
    }
}

// 添加事件监听器，确保页面加载完成后绑定
document.addEventListener('DOMContentLoaded', () => {
    // 自动聚焦密码输入框
    const passwordInput = document.getElementById('password');
    if (passwordInput) {
        passwordInput.focus();
    }
    
    // 监听输入，移除错误状态
    passwordInput.addEventListener('input', () => {
        const inputGroup = document.querySelector('.auth-input-group');
        inputGroup.classList.remove('error');
    });
});

// 添加获取经过时间的辅助函数
function getElapsedTime() {
    if (!loadingStartTime) return '';
    const elapsed = Date.now() - loadingStartTime;
    return `(${elapsed}ms)`;
}

// 添加登出函数
async function logout() {
    try {
        await fetch('/api/logout', { method: 'POST' });
        clearAuthCache(); // 清除认证缓存
        window.location.reload();
    } catch (error) {
        console.error('登出失败:', error);
    }
}

// 添加全局错误处理，处理 401 错误
window.addEventListener('unhandledrejection', event => {
    if (event.reason instanceof Response && event.reason.status === 401) {
        // token 失效，重新加载页面
        window.location.reload();
    }
});

// 页面加载时执行认证检查
document.addEventListener('DOMContentLoaded', checkAuth); 