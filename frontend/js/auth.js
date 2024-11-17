// 页面加载时检查认证状态
async function checkAuth() {
    try {
        const response = await fetch('/api/check-auth');
        if (response.ok) {
            // 已认证，显示编辑器
            document.getElementById('auth-container').classList.add('hidden');
            document.getElementById('editor-container').classList.remove('hidden');
            initEditor();
        } else {
            // token 无效，确保显示登录界面
            document.getElementById('auth-container').classList.remove('hidden');
            document.getElementById('editor-container').classList.add('hidden');
        }
    } catch (error) {
        console.error('认证检查失败:', error);
        // 发生错误时显示登录界面
        document.getElementById('auth-container').classList.remove('hidden');
        document.getElementById('editor-container').classList.add('hidden');
    }
}

async function authenticate() {
    const password = document.getElementById('password').value;
    try {
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
            document.getElementById('password').value = ''; // 清空密码输入
            initEditor();
        } else {
            const data = await response.json();
            alert(data.error || '密码错误');
        }
    } catch (error) {
        console.error('认证失败:', error);
        alert('认证失败，请重试');
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