// 页面加载时检查认证状态
async function checkAuth() {
    try {
        // 先从本地获取设置并应用主题
        const localSettings = localStorage.getItem('editor_settings');
        if (localSettings) {
            try {
                const settings = JSON.parse(localSettings);
                // 应用主题到 loading 背景
                if (settings.theme) {
                    document.documentElement.setAttribute('data-theme', settings.theme);
                }
            } catch (e) {
                console.error('解析本地设置失败:', e);
            }
        }

        const response = await fetch('/api/check-auth');
        if (response.ok) {
            // 已认证，但先不要隐藏 loading
            document.getElementById('auth-container').classList.add('hidden');
            document.getElementById('editor-container').classList.remove('hidden');
            await initEditor(); // 等待编辑器初始化完成
            
            // 所有初始化完成后，淡出 loading
            const loadingContainer = document.getElementById('loading-container');
            loadingContainer.classList.add('fade-out');
            setTimeout(() => {
                loadingContainer.classList.add('hidden');
            }, 300);
        } else {
            // token 无效，显示登录界面
            document.getElementById('auth-container').classList.remove('hidden');
            document.getElementById('editor-container').classList.add('hidden');
            // 隐藏 loading
            document.getElementById('loading-container').classList.add('hidden');
        }
    } catch (error) {
        console.error('认证检查失败:', error);
        // 发生错误时显示登录界面
        document.getElementById('auth-container').classList.remove('hidden');
        document.getElementById('editor-container').classList.add('hidden');
        // 隐藏 loading
        document.getElementById('loading-container').classList.add('hidden');
    }
}

async function authenticate() {
    const password = document.getElementById('password').value;
    try {
        // 显示 loading
        document.getElementById('loading-container').classList.remove('hidden');
        document.getElementById('loading-container').classList.remove('fade-out');
        
        const response = await fetch('/api/auth', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ password }),
        });

        if (response.ok) {
            document.getElementById('auth-container').classList.add('hidden');
            document.getElementById('editor-container').classList.remove('hidden');
            document.getElementById('password').value = '';
            await initEditor(); // 等待编辑器初始化完成
            
            // 所有初始化完成后，淡出 loading
            const loadingContainer = document.getElementById('loading-container');
            loadingContainer.classList.add('fade-out');
            setTimeout(() => {
                loadingContainer.classList.add('hidden');
            }, 300);
        } else {
            const data = await response.json();
            alert(data.error || '密码错误');
            // 隐藏 loading
            document.getElementById('loading-container').classList.add('hidden');
        }
    } catch (error) {
        console.error('认证失败:', error);
        alert('认证失败，请重试');
        // 隐藏 loading
        document.getElementById('loading-container').classList.add('hidden');
    }
}

// 添加登出函数
async function logout() {
    try {
        await fetch('/api/logout', { method: 'POST' });
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