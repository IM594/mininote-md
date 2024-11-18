const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3456;
const NOTES_DIR = path.join(__dirname, '../../data/notes');
const PASSWORD = process.env.PASSWORD || 'test0000';
const SETTINGS_DIR = path.join(__dirname, '../../data/settings');
const HISTORY_DIR = path.join(__dirname, '../../data/history');

// 使用 SALT 生成 JWT_SECRET
const SALT = process.env.SALT || 'your-salt-here';
const JWT_SECRET = process.env.JWT_SECRET || crypto.createHash('sha256')
                        .update(SALT)
                        .digest('hex');

// 为了安全起见,在启动时打印一个模糊的密钥提示
console.log('JWT Secret hash:', JWT_SECRET.substring(0, 8) + '...');

const JWT_EXPIRES = '30d'; // token 有效期30天

// 添加缓存控制中间件
const cacheControl = (duration) => {
    return (req, res, next) => {
        if (process.env.NODE_ENV === 'production') {
            res.set('Cache-Control', `public, max-age=${duration}`);
        } else {
            res.set('Cache-Control', 'no-store');
        }
        next();
    };
};

// 静态资源缓存策略
const staticOptions = {
    // 开启gzip压缩
    setHeaders: (res, path) => {
        // HTML文件不缓存
        if (path.endsWith('.html')) {
            res.set('Cache-Control', 'no-cache');
        }
        // CSS文件缓存1周
        else if (path.endsWith('.css')) {
            res.set('Cache-Control', 'public, max-age=604800');
        }
        // JavaScript文件缓存1周
        else if (path.endsWith('.js')) {
            res.set('Cache-Control', 'public, max-age=604800');
        }
        // 图片缓存1个月
        else if (path.match(/\.(jpg|jpeg|png|gif|ico|svg)$/)) {
            res.set('Cache-Control', 'public, max-age=2592000');
        }
        // 字体文件缓存1年
        else if (path.match(/\.(woff|woff2|ttf|eot)$/)) {
            res.set('Cache-Control', 'public, max-age=31536000');
        }
    },
    // 开启etag
    etag: true,
    // 开启lastModified
    lastModified: true,
    // 开启压缩
    compression: true
};

app.use(express.text());
app.use(express.static(path.join(__dirname, '../../frontend'), staticOptions));
app.use(express.json());
app.use(cookieParser());

// API路由的缓存控制
app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
});

// 认证中间件
const authMiddleware = (req, res, next) => {
    const token = req.cookies.token;
    
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }
    
    try {
        // 验证 token
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        console.error('Token verification failed:', error);
        res.status(401).json({ error: 'Invalid token' });
    }
};

// 认证接口
app.post('/api/auth', (req, res) => {
    const { password } = req.body;
    if (password === PASSWORD) {
        // 生成 JWT token
        const token = jwt.sign(
            { authorized: true },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES }
        );
        
        // 设置 httpOnly cookie
        res.cookie('token', token, {
            httpOnly: true,
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30天
            path: '/',
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
        });
        
        res.json({ success: true });
    } else {
        res.status(401).json({ error: 'Invalid password' });
    }
});

// 读取笔记
app.get('/api/note/:path', authMiddleware, async (req, res) => {
    try {
        const filePath = path.join(NOTES_DIR, `${req.params.path}.md`);
        try {
            const stats = await fs.stat(filePath);
            const content = await fs.readFile(filePath, 'utf-8');
            
            // 添加 Last-Modified 头
            res.set('Last-Modified', stats.mtime.toUTCString());
            res.send(content);
            
        } catch (error) {
            if (error.code === 'ENOENT') {
                // 如果文件不存在，返回空内容和当前时间作为 Last-Modified
                res.set('Last-Modified', new Date().toUTCString());
                res.send('');
            } else {
                throw error;
            }
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to read note' });
    }
});

// 保存笔记
app.post('/api/note/:path', authMiddleware, async (req, res) => {
    try {
        const filePath = path.join(NOTES_DIR, `${req.params.path}.md`);
        
        // 确保笔记目录存在
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        
        // 检查是否需要创建历史记录
        const createHistory = req.headers['x-create-history'] === 'true';
        
        if (createHistory) {
            const historyPath = path.join(HISTORY_DIR, req.params.path);
            await fs.mkdir(historyPath, { recursive: true });
            
            // 保存当前内容到历史记录
            const timestamp = Date.now();
            await fs.writeFile(path.join(historyPath, `${timestamp}.md`), req.body);
            
            // 清理旧的历史记录（保留最近30天的）
            const files = await fs.readdir(historyPath);
            const oldFiles = files
                .map(file => ({
                    name: file,
                    timestamp: parseInt(file.split('.')[0])
                }))
                .filter(file => Date.now() - file.timestamp > 30 * 24 * 60 * 60 * 1000);
                
            for (const file of oldFiles) {
                await fs.unlink(path.join(historyPath, file.name));
            }
        }
        
        // 保存到主文件
        await fs.writeFile(filePath, req.body);
        
        res.json({ success: true });
    } catch (error) {
        console.error('保存失败:', error);
        res.status(500).json({ error: 'Failed to save note' });
    }
});

// 修改根路由处理，添加缓存控制
app.get('/', (req, res) => {
    res.set('Cache-Control', 'no-cache');
    res.sendFile(path.join(__dirname, '../../frontend/index.html'));
});

// 修改日期路由处理，添加缓存控制
app.get('/:path', (req, res) => {
    res.set('Cache-Control', 'no-cache');
    res.sendFile(path.join(__dirname, '../../frontend/index.html'));
});

// 认证检查接口
app.get('/api/check-auth', (req, res) => {
    const token = req.cookies.token;
    
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }
    
    try {
        jwt.verify(token, JWT_SECRET);
        res.json({ success: true });
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

// 添加登出接口
app.post('/api/logout', (req, res) => {
    res.clearCookie('token', {
        httpOnly: true,
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
    });
    res.json({ success: true });
});

// 修改保存设置的接口
app.post('/api/settings', authMiddleware, async (req, res) => {
    try {
        // 确保 SETTINGS_DIR 存在
        await fs.mkdir(SETTINGS_DIR, { recursive: true });
        
        const deviceType = req.headers['user-agent'].includes('Mobile') ? 'mobile' : 'desktop';
        const settingsPath = path.join(SETTINGS_DIR, `${deviceType}.json`);
        
        // 验证请求体是否为有效的 JSON 对象
        if (!req.body || typeof req.body !== 'object') {
            return res.status(400).json({ error: 'Invalid settings format' });
        }
        
        // 写入设置文件
        await fs.writeFile(
            settingsPath, 
            JSON.stringify(req.body, null, 2),
            { encoding: 'utf8', mode: 0o644 }
        );
        
        res.json({ success: true });
    } catch (error) {
        console.error('保存设置失败:', error);
        res.status(500).json({ error: 'Failed to save settings', details: error.message });
    }
});

// 获取历史记录列表
app.get('/api/history/:path', authMiddleware, async (req, res) => {
    try {
        const historyPath = path.join(HISTORY_DIR, req.params.path);
        try {
            const files = await fs.readdir(historyPath);
            const histories = await Promise.all(
                files.map(async file => {
                    const content = await fs.readFile(path.join(historyPath, file), 'utf-8');
                    return {
                        timestamp: parseInt(file.split('.')[0]),
                        content
                    };
                })
            );
            res.json(histories.sort((a, b) => b.timestamp - a.timestamp));
        } catch (error) {
            if (error.code === 'ENOENT') {
                res.json([]);
            } else {
                throw error;
            }
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to read history' });
    }
});

// 在现有路由后添加获取单个历史记录的API
app.get('/api/history/:path/:timestamp', authMiddleware, async (req, res) => {
    try {
        const historyPath = path.join(HISTORY_DIR, req.params.path, `${req.params.timestamp}.md`);
        try {
            const content = await fs.readFile(historyPath, 'utf-8');
            res.send(content);
        } catch (error) {
            if (error.code === 'ENOENT') {
                res.status(404).json({ error: 'History not found' });
            } else {
                throw error;
            }
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to read history' });
    }
});

// 添加删除历史记录的API
app.delete('/api/history/:path/:timestamp', authMiddleware, async (req, res) => {
    try {
        const historyPath = path.join(HISTORY_DIR, req.params.path, `${req.params.timestamp}.md`);
        await fs.unlink(historyPath);
        res.json({ success: true });
    } catch (error) {
        if (error.code === 'ENOENT') {
            res.status(404).json({ error: 'History not found' });
        } else {
            res.status(500).json({ error: 'Failed to delete history' });
        }
    }
});

// 添加删除所有历史记录的API
app.delete('/api/history/:path', authMiddleware, async (req, res) => {
    try {
        const historyPath = path.join(HISTORY_DIR, req.params.path);
        try {
            // 读取目录中的所有文件
            const files = await fs.readdir(historyPath);
            
            // 删除所有文件
            await Promise.all(
                files.map(file => 
                    fs.unlink(path.join(historyPath, file))
                )
            );
            
            // 删除目录
            await fs.rmdir(historyPath);
            
            res.json({ success: true });
        } catch (error) {
            if (error.code === 'ENOENT') {
                // 如果目录不存在，视为成功
                res.json({ success: true });
            } else {
                throw error;
            }
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete all history' });
    }
});

// 添加获取所有笔记的API
app.get('/api/notes', authMiddleware, async (req, res) => {
    try {
        const files = await fs.readdir(NOTES_DIR);
        const notes = await Promise.all(
            files.filter(file => file.endsWith('.md'))
                .map(async file => {
                    const filePath = path.join(NOTES_DIR, file);
                    const stats = await fs.stat(filePath);
                    return {
                        path: file.replace('.md', ''),
                        lastModified: stats.mtime,
                        size: stats.size
                    };
                })
        );
        
        // 按修改时间降序
        notes.sort((a, b) => b.lastModified - a.lastModified);
        res.json(notes);
    } catch (error) {
        res.status(500).json({ error: 'Failed to read notes' });
    }
});

// 添加删除笔记的API
app.delete('/api/note/:path', authMiddleware, async (req, res) => {
    try {
        const filePath = path.join(NOTES_DIR, `${req.params.path}.md`);
        await fs.unlink(filePath);
        
        // 同时删除对应的历史记录
        const historyPath = path.join(HISTORY_DIR, req.params.path);
        try {
            const files = await fs.readdir(historyPath);
            await Promise.all(
                files.map(file => fs.unlink(path.join(historyPath, file)))
            );
            await fs.rmdir(historyPath);
        } catch (error) {
            if (error.code !== 'ENOENT') {
                console.error('删除历史记录失败:', error);
            }
        }
        
        res.json({ success: true });
    } catch (error) {
        if (error.code === 'ENOENT') {
            res.status(404).json({ error: 'Note not found' });
        } else {
            res.status(500).json({ error: 'Failed to delete note' });
        }
    }
});

// 添加一个简单的请求日志中间件
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
    next();
});

// 修改监听配置
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Local access: http://localhost:${PORT}`);
}); 