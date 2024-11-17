// 页面加载时检查认证状态
async function checkAuth() {
    try {
        const response = await fetch('/api/check-auth');
        if (response.ok) {
            // 已认证，显示编辑器
            document.getElementById('auth-container').classList.add('hidden');
            document.getElementById('editor-container').classList.remove('hidden');
            initEditor();
        }
    } catch (error) {
        console.error('认证检查失败:', error);
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
            initEditor();
        } else {
            alert('密码错误');
        }
    } catch (error) {
        console.error('认证失败:', error);
        alert('认证失败，请重试');
    }
}

// 页面加载时执行认证检查
document.addEventListener('DOMContentLoaded', checkAuth); 