const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = process.env.PORT || 3457;
const NOTES_DIR = path.join(__dirname, '../../data/notes');
const PASSWORD = process.env.PASSWORD || 'default-password';
const SETTINGS_DIR = path.join(__dirname, '../../data/settings');
const HISTORY_DIR = path.join(__dirname, '../../data/history');

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
// 使用新的静态文件配置
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
    const isAuthed = req.cookies.authed === 'true';
    if (isAuthed) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
};

// 认证接口
app.post('/api/auth', (req, res) => {
    const { password } = req.body;
    if (password === PASSWORD) {
        // 设置 cookie 过期时间为 30 天
        res.cookie('authed', 'true', {
            httpOnly: true,
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30天的毫秒数
            path: '/',
            secure: process.env.NODE_ENV === 'production', // 生产环境使用 HTTPS
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
            const content = await fs.readFile(filePath, 'utf-8');
            res.send(content);
        } catch (error) {
            if (error.code === 'ENOENT') {
                res.send(''); // 如果文件不存在，返回空内容
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

// 添加认证检查接口
app.get('/api/check-auth', (req, res) => {
    const isAuthed = req.cookies.authed === 'true';
    if (isAuthed) {
        res.json({ success: true });
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
});

// 添加获取设置的接口
app.get('/api/settings', authMiddleware, async (req, res) => {
    try {
        const deviceType = req.headers['user-agent'].includes('Mobile') ? 'mobile' : 'desktop';
        const settingsPath = path.join(SETTINGS_DIR, `${deviceType}.json`);
        
        try {
            const settings = await fs.readFile(settingsPath, 'utf-8');
            res.json(JSON.parse(settings));
        } catch (error) {
            if (error.code === 'ENOENT') {
                // 如果设置文件不存在，返回默认设置
                const defaultSettings = {
                    editorFontSize: deviceType === 'mobile' ? 16 : 14,
                    previewFontSize: deviceType === 'mobile' ? 16 : 14,
                    theme: 'light',
                    codeTheme: 'github',
                    defaultView: 'edit'
                };
                res.json(defaultSettings);
            } else {
                throw error;
            }
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to read settings' });
    }
});

// 添加保存设置的接口
app.post('/api/settings', authMiddleware, async (req, res) => {
    try {
        const deviceType = req.headers['user-agent'].includes('Mobile') ? 'mobile' : 'desktop';
        const settingsPath = path.join(SETTINGS_DIR, `${deviceType}.json`);
        
        await fs.mkdir(SETTINGS_DIR, { recursive: true });
        await fs.writeFile(settingsPath, JSON.stringify(req.body, null, 2));
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to save settings' });
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
        
        // 按修改时间降序排序
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

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 