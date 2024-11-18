let lastSavedContent = '';
let currentPath = '';
let currentSettings = null;
let autoSaveInterval = null;
let justEnteredFromList = false;
let editorInitStartTime = null;

// 添加 URL 处理函数
function handleUrl() {
    const path = window.location.pathname.slice(1);
    if (!path) {
        // 如果是根路径，重定向到今天的日期
        const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
        window.history.replaceState({}, '', `/${today}`);
        currentPath = today;
    } else {
        currentPath = path;
    }
}

// 初始化编辑器
async function initEditor() {
    editorInitStartTime = Date.now();
    console.log('[Editor] 开始初始化编辑器 (0ms)');
    
    handleUrl();
    
    // 1. 先初始化基本配置，这些是同步操作，很快
    initMarkedConfig();
    initCodeHighlight();
    
    // 2. 并行加载设置和笔记
    const loadSettingsPromise = loadSettings();
    const loadNotePromise = loadNote(currentPath);
    
    // 3. 在等待加载时，先初始化事件监听器
    initCoreEventListeners(document.getElementById('editor'));
    
    // 4. 设置视图模式（不依赖设置和笔记内容）
    if (!currentSettings?.viewMode) {
        toggleView('both');
    }
    
    // 5. 等待加载完成
    await Promise.all([loadSettingsPromise, loadNotePromise]);
    
    // 6. 延迟初始化非核心功能
    queueMicrotask(() => {
        startAutoSave();
        initNonCoreFeatures();
    });
    
    return Promise.resolve();
}

// 初始化 marked 配置
function initMarkedConfig() {
    marked.setOptions({
        highlight: function(code, lang) {
            if (lang && hljs.getLanguage(lang)) {
                try {
                    return hljs.highlight(code, { language: lang }).value;
                } catch (err) {
                    console.error('代码高亮错误:', err);
                }
            }
            return code;
        },
        gfm: true,
        breaks: true,
        pedantic: false,
        smartLists: true,
        smartypants: false,
        tables: true
    });
}

// 初始化核心事件监听器
function initCoreEventListeners(editor) {
    // 手动保存快捷键
    editor.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            saveNote(editor.value, true, true);
            return false;
        }
    });
    
    // 实时预览，延迟缓存和保存
    editor.addEventListener('input', () => {
        const content = editor.value;
        // 立即更新预览
        renderPreview(content);
        // 延迟更新本地缓存和保存到服务器
        updateLocalNoteCache(content);
        saveNote(content, false, false);
    });
}

// 初始化非核心功能
function initNonCoreFeatures() {
    console.log('[Editor] 开始初始化非核心功能', getEditorElapsedTime());
    
    // 初始化菜单
    initMenu();
    
    // 检查并应用深色模式
    checkDarkMode();
    
    // 监听系统主题变化
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        if (!localStorage.getItem('theme')) {
            document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
        }
    });
    
    // 添加 Tab 键处理
    const editor = document.getElementById('editor');
    editor.addEventListener('keydown', handleTabKey);
    
    // 添加回车键处理
    editor.addEventListener('keydown', handleEnterKey);
    
    console.log('[Editor] 非核心功能初始化完成', getEditorElapsedTime());
}

// 获取编辑器初始化经过时间
function getEditorElapsedTime() {
    if (!editorInitStartTime) return '';
    const elapsed = Date.now() - editorInitStartTime;
    return `(${elapsed}ms)`;
}

// 渲染预览
function renderPreview(content) {
    const startTime = performance.now();
    const preview = document.getElementById('preview');
    const scrollTop = preview.scrollTop;
    
    // 先渲染基本内容
    const htmlContent = marked.parse(content);
    preview.innerHTML = htmlContent;
    preview.scrollTop = scrollTop;
    
    // 延迟处理代码块
    setTimeout(() => {
        const codeBlocks = preview.querySelectorAll('pre code');
        if (codeBlocks.length > 0) {
            codeBlocks.forEach((block) => {
                if (block.className && block.className.startsWith('language-')) {
                    hljs.highlightElement(block);
                }
                // 延迟添加复制按钮
                setTimeout(() => {
                    addCopyButton(block);
                }, 0);
            });
        }
    }, 0);
}

// 抽取复制按钮逻辑
function addCopyButton(block) {
    const pre = block.parentElement;
    if (!pre.querySelector('.copy-button')) {
        const copyButton = document.createElement('button');
        copyButton.className = 'copy-button';
        copyButton.innerHTML = '复制';
        copyButton.addEventListener('click', () => {
            const code = block.textContent;
            navigator.clipboard.writeText(code).then(() => {
                copyButton.innerHTML = '已复制!';
                setTimeout(() => {
                    copyButton.innerHTML = '复制';
                }, 2000);
            }).catch(err => {
                console.error('复制失败:', err);
                copyButton.innerHTML = '复制失败';
                setTimeout(() => {
                    copyButton.innerHTML = '复制';
                }, 2000);
            });
        });
        pre.appendChild(copyButton);
    }
}

// 添加笔记缓存管理
const NOTE_CACHE_KEY = 'note_cache_';
const NOTE_CACHE_LIST_KEY = 'note_cache_list';
const MAX_NOTE_CACHE = 3;

// 获取缓存列表
function getCacheList() {
    try {
        const list = localStorage.getItem(NOTE_CACHE_LIST_KEY);
        return list ? JSON.parse(list) : [];
    } catch (e) {
        console.error('读取缓存列表失败:', e);
        return [];
    }
}

// 保存缓存列表
function saveCacheList(list) {
    try {
        localStorage.setItem(NOTE_CACHE_LIST_KEY, JSON.stringify(list));
    } catch (e) {
        console.error('保存缓存列表失败:', e);
    }
}

// 更新笔记缓存
function updateNoteCacheList(path) {
    let cacheList = getCacheList();
    
    // 如果已存在，移到最前面
    cacheList = cacheList.filter(p => p !== path);
    cacheList.unshift(path);
    
    // 如果超过最大数量，删除最旧的缓存
    if (cacheList.length > MAX_NOTE_CACHE) {
        const removedPath = cacheList.pop();
        try {
            localStorage.removeItem(NOTE_CACHE_KEY + removedPath);
            console.log(`[Cache] 移除最旧的缓存: ${removedPath}`);
        } catch (e) {
            console.error('删除旧缓存失败:', e);
        }
    }
    
    saveCacheList(cacheList);
    console.log('[Cache] 当前缓存列表:', cacheList);
}

// 修改 loadNote 函数
async function loadNote(path) {
    console.log('[Editor] 开始加载笔记内容', getEditorElapsedTime());
    const editor = document.getElementById('editor');
    
    // 尝试从缓存加载
    const cachedNote = localStorage.getItem(NOTE_CACHE_KEY + path);
    if (cachedNote) {
        try {
            const { content, timestamp } = JSON.parse(cachedNote);
            console.log('[Editor] 使用缓存的笔记内容', getEditorElapsedTime());
            editor.value = content;
            lastSavedContent = content;
            renderPreview(content);
            
            // 更新缓存列表顺序
            updateNoteCacheList(path);
            
            // 在后台更新缓存
            updateNoteCache(path);
            return;
        } catch (e) {
            console.error('解析笔记缓存失败:', e);
        }
    }
    
    // 如果没有缓存，从服务器加载
    const response = await fetch(`/api/note/${path}`);
    const note = await response.text();
    console.log('[Editor] 笔记内容获取完成', getEditorElapsedTime());
    
    // 更新缓存
    try {
        localStorage.setItem(NOTE_CACHE_KEY + path, JSON.stringify({
            content: note,
            timestamp: Date.now()
        }));
        // 更新缓存列表
        updateNoteCacheList(path);
    } catch (e) {
        console.error('保存笔记缓存失败:', e);
    }
    
    editor.value = note;
    lastSavedContent = note;
    console.log('[Editor] 开始首次渲染预览', getEditorElapsedTime());
    renderPreview(note);
    console.log('[Editor] 首次渲染预览完成', getEditorElapsedTime());
}

// 添加后台更新笔记缓存的函数
async function updateNoteCache(path) {
    try {
        const response = await fetch(`/api/note/${path}`);
        const note = await response.text();
        localStorage.setItem(NOTE_CACHE_KEY + path, JSON.stringify({
            content: note,
            timestamp: Date.now()
        }));
        console.log('[Editor] 后台更新记缓存完成');
    } catch (e) {
        console.error('后台更新笔记缓存失败:', e);
    }
}

// 初始化菜单
function initMenu() {
    const menuButton = document.getElementById('menu-button');
    const menuPanel = document.getElementById('menu-panel');
    
    menuButton.addEventListener('click', (e) => {
        e.stopPropagation();
        menuPanel.classList.toggle('hidden');
    });
    
    // 点击外部关闭菜单
    document.addEventListener('click', (e) => {
        // 检查点击是否在历史记录模态框内
        const isHistoryModal = e.target.closest('.history-modal');
        // 如果点击在历史记录模态框内，不关闭菜单
        if (isHistoryModal) {
            return;
        }
        
        // 如果点击不在菜单按钮和菜单面板内，则关闭菜单
        if (!menuButton.contains(e.target) && !menuPanel.contains(e.target)) {
            menuPanel.classList.add('hidden');
        }
    });
    
    // 阻止菜单面板的点击事件冒泡
    menuPanel.addEventListener('click', (e) => {
        e.stopPropagation();
    });
}

// 导到指定日期
async function navigateToDate(dateString) {
    const path = dateString.replace(/-/g, '');
    currentPath = path;
    // 更新URL，但不重新加载页面
    window.history.pushState({}, '', `/${path}`);
    await loadNote(path);
    // 更新日期选择器
    const datePicker = document.getElementById('date-picker');
    datePicker.value = path.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3');
}

// 一天/后一天导航
async function navigateDay(offset) {
    const date = new Date(currentPath.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'));
    date.setDate(date.getDate() + offset);
    const newPath = date.toISOString().split('T')[0].replace(/-/g, '');
    await navigateToDate(newPath);
}

// 切换深色模式
function toggleDarkMode() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    
    // 切换代码高亮主题
    document.getElementById('light-code-theme').disabled = (newTheme === 'dark');
    document.getElementById('dark-code-theme').disabled = (newTheme === 'light');
    
    if (!currentSettings) {
        currentSettings = {};
    }
    currentSettings.theme = newTheme;
    
    // 保存设置
    saveSettings();
    
    // 重新渲染预览以应用新主题
    const editor = document.getElementById('editor');
    renderPreview(editor.value);
}

// 检查深色模式
function checkDarkMode() {
    const theme = currentSettings?.theme || 
                 (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    
    document.documentElement.setAttribute('data-theme', theme);
    
    // 应用对应的代码高亮主题
    document.getElementById('light-code-theme').disabled = (theme === 'dark');
    document.getElementById('dark-code-theme').disabled = (theme === 'light');
    
    if (!currentSettings) {
        currentSettings = {};
    }
    currentSettings.theme = theme;
}

// 切换视图模式
function toggleView(mode) {
    const container = document.getElementById('editor-container');
    container.classList.remove('preview-only', 'edit-only');
    
    if (mode === 'preview') {
        container.classList.add('preview-only');
    } else if (mode === 'edit') {
        container.classList.add('edit-only');
    } else {
        // both 模式下初始化 resizer
        initResizer();
    }
    
    if (!currentSettings) {
        currentSettings = {};
    }
    currentSettings.viewMode = mode;
    saveSettings();
}

// 修改 saveNote 函数
const saveNote = debounce(async (content, isManual = false, createHistory = false) => {
    if (content === lastSavedContent && !isManual) return;
    
    // 保存修改前的内容，以便失败时恢复
    const previousContent = lastSavedContent;
    
    try {
        console.log('Saving note:', { isManual, createHistory });
        
        // 先更新本地缓存
        try {
            localStorage.setItem(NOTE_CACHE_KEY + currentPath, JSON.stringify({
                content,
                timestamp: Date.now()
            }));
            // 更新缓存列表
            updateNoteCacheList(currentPath);
            console.log('[Editor] 笔记本地缓存已更新');
        } catch (e) {
            console.error('更新笔记本地缓存失败:', e);
            throw e;
        }
        
        // 保存到服务器
        const response = await fetch(`/api/note/${currentPath}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain',
                'X-Create-History': createHistory ? 'true' : 'false'
            },
            body: content,
        });
        
        if (response.ok) {
            lastSavedContent = content;
            if (isManual) {
                showNotification('已保存');
            }
        } else {
            throw new Error('Server responded with error');
        }
    } catch (error) {
        console.error('保存失败:', error);
        // 恢复本地缓存到之前的状态
        try {
            localStorage.setItem(NOTE_CACHE_KEY + currentPath, JSON.stringify({
                content: previousContent,
                timestamp: Date.now()
            }));
            console.log('[Editor] 笔记本地缓存已恢复');
        } catch (e) {
            console.error('恢复笔记本地缓存失败:', e);
        }
        showNotification('保存失败', true);
    }
}, 1000);

function debounce(func, wait) {
    let timeout;
    
    function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    }
    
    // 添加立即执行方法
    executedFunction.flush = function() {
        clearTimeout(timeout);
        func.apply(this, arguments);
    };
    
    return executedFunction;
}

// 简化代码高亮初始化函数
function initCodeHighlight() {
    marked.setOptions({
        highlight: function(code, lang) {
            if (lang && hljs.getLanguage(lang)) {
                try {
                    return hljs.highlight(code, { language: lang }).value;
                } catch (err) {
                    console.error('代码高亮错误:', err);
                }
            }
            return code;
        }
    });
}

// 修改加载设置函数
async function loadSettings() {
    console.log('[Editor] 开始加载设置', getEditorElapsedTime());
    try {
        const localSettings = localStorage.getItem('editor_settings');
        if (localSettings) {
            try {
                console.log('[Editor] 使用本地缓存的设置', getEditorElapsedTime());
                const settings = JSON.parse(localSettings);
                currentSettings = settings;
                applySettings(settings);
                
                // 异步同步设置到服务器，不阻塞主流程
                setTimeout(() => {
                    fetch('/api/settings', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: localSettings
                    }).catch(e => console.error('设置同步失败:', e));
                }, 0);
                
                return;
            } catch (e) {
                console.error('解析本地设置失败:', e);
            }
        }

        // 只有在没有本地设置时，才从服务器获取
        const response = await fetch('/api/settings');
        if (response.ok) {
            const serverSettings = await response.json();
            currentSettings = serverSettings;
            localStorage.setItem('editor_settings', JSON.stringify(serverSettings));
            applySettings(serverSettings);
            console.log('[Editor] 从服务器加载设置完成', getEditorElapsedTime());
        }
    } catch (error) {
        console.error('加载设置失败:', error);
    }
}

// 修用设置函数
function applySettings(settings) {
    if (!settings) return;
    
    // 用主题
    document.documentElement.setAttribute('data-theme', settings.theme || 'light');
    
    // 应用字体大小并更新显示值
    if (settings.editorFontSize) {
        document.getElementById('editor').style.fontSize = `${settings.editorFontSize}px`;
        document.getElementById('editor-font-size').value = settings.editorFontSize;
        document.getElementById('editor-font-size-value').textContent = settings.editorFontSize;
    }
    
    if (settings.previewFontSize) {
        document.getElementById('preview').style.fontSize = `${settings.previewFontSize}px`;
        document.getElementById('preview-font-size').value = settings.previewFontSize;
        document.getElementById('preview-font-size-value').textContent = settings.previewFontSize;
    }
    
    // 应用行高并更新显示值
    if (settings.editorLineHeight) {
        document.getElementById('editor').style.lineHeight = settings.editorLineHeight;
        document.getElementById('editor-line-height').value = settings.editorLineHeight;
        document.getElementById('editor-line-height-value').textContent = settings.editorLineHeight;
    }
    
    if (settings.previewLineHeight) {
        document.getElementById('preview').style.lineHeight = settings.previewLineHeight;
        document.getElementById('preview-line-height').value = settings.previewLineHeight;
        document.getElementById('preview-line-height-value').textContent = settings.previewLineHeight;
    }
    
    // 应用视图模式
    if (settings.viewMode) {
        toggleView(settings.viewMode);
    }
    
    // 恢复分割线位置
    if (settings.editorWidth && settings.previewWidth && settings.viewMode === 'both') {
        const editorSection = document.querySelector('.editor-section');
        const previewSection = document.querySelector('.preview-section');
        
        // 直接使用保存的宽度，不再添加额外的计算
        editorSection.style.width = settings.editorWidth;
        previewSection.style.width = settings.previewWidth;
    }
    
    // 用默认代码语言
    if (settings.defaultCodeLanguage) {
        document.getElementById('default-code-language').value = settings.defaultCodeLanguage;
    }
}

// 添加更新字体大小函数
async function updateFontSize(target, size) {
    const element = document.getElementById(target);
    element.style.fontSize = `${size}px`;
    
    if (!currentSettings) {
        currentSettings = {};
    }
    
    currentSettings[`${target}FontSize`] = parseInt(size);
    await saveSettings();
}

// 修改保存设置函数
async function saveSettings() {
    if (!currentSettings) return;
    
    try {
        // 确保 currentSettings 是一个有效的对象
        if (typeof currentSettings !== 'object') {
            throw new Error('Invalid settings format');
        }
        
        // 发送请求到服务器
        const response = await fetch('/api/settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(currentSettings),
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.details || error.error || '保存设置失败');
        }
        
        // 成功后保存到本地
        localStorage.setItem('editor_settings', JSON.stringify(currentSettings));
        
    } catch (error) {
        console.error('保存设置失败:', error);
        showNotification('保存设置失败: ' + error.message, true);
        
        // 即使服务器保存失败，也尝试保存到本地
        try {
            localStorage.setItem('editor_settings', JSON.stringify(currentSettings));
        } catch (localError) {
            console.error('本地保存设置失败:', localError);
        }
    }
}

// 添加更新行高函数
async function updateLineHeight(target, value) {
    const element = document.getElementById(target);
    element.style.lineHeight = value;
    
    if (!currentSettings) {
        currentSettings = {};
    }
    
    currentSettings[`${target}LineHeight`] = parseFloat(value);
    await saveSettings();
}

// 添加自动保存相关函数
function startAutoSave() {
    if (autoSaveInterval) {
        clearInterval(autoSaveInterval);
    }
    autoSaveInterval = setInterval(() => {
        const editor = document.getElementById('editor');
        if (editor.value !== lastSavedContent) {
            saveNote(editor.value, false, true);
        }
    }, 5 * 60 * 1000); // 5分钟
}

// 添加历史记录相关
async function showHistory() {
    try {
        const response = await fetch(`/api/history/${currentPath}`);
        const histories = await response.json();
        
        if (histories.length === 0) {
            showNotification('没有历史记录');
            return;
        }
        
        const modal = createHistoryModal(histories);
        document.body.appendChild(modal);
    } catch (error) {
        console.error('获取历史记录失败:', error);
        showNotification('获取历史记录失败', true);
    }
}

// 修改创建历记录模态框的函数
function createHistoryModal(histories) {
    const modal = document.createElement('div');
    modal.className = 'history-modal';
    
    const content = document.createElement('div');
    content.className = 'history-modal-content';
    
    content.innerHTML = `
        <div class="history-modal-header">
            <h3>历史记录</h3>
            <div class="header-actions">
                <button class="delete-all-btn" onclick="deleteAllHistory()">删除全部</button>
                <button onclick="this.closest('.history-modal').remove()">关闭</button>
            </div>
        </div>
        <div class="history-modal-body">
            ${histories.length === 0 ? '<p>历史录</p>' : 
                histories.map(history => `
                    <div class="history-item">
                        <div class="history-row">
                            <span class="history-time">
                                ${new Date(history.timestamp).toLocaleString()}
                            </span>
                            <div class="history-actions">
                                <button onclick="viewHistoryDetail('${history.timestamp}')">查看详情</button>
                                <button class="delete-btn" onclick="deleteHistory('${history.timestamp}', this)">删除</button>
                            </div>
                        </div>
                    </div>
                `).join('')}
        </div>
    `;
    
    modal.appendChild(content);

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });

    return modal;
}

// 修改查看历史记录详的函数
async function viewHistoryDetail(timestamp) {
    try {
        const response = await fetch(`/api/history/${currentPath}/${timestamp}`);
        const content = await response.text();
        
        const detailModal = document.createElement('div');
        detailModal.className = 'history-modal';
        
        const detailContent = document.createElement('div');
        detailContent.className = 'history-modal-content';
        
        detailContent.innerHTML = `
            <div class="history-modal-header">
                <h3>历史记录详情 - ${new Date(parseInt(timestamp)).toLocaleString()}</h3>
                <div class="header-actions">
                    <button onclick="restoreHistory('${timestamp}')">恢复此版本</button>
                    <button onclick="this.closest('.history-modal').remove()">关</button>
                </div>
            </div>
            <div class="history-modal-body">
                <div class="history-detail-tabs">
                    <button class="tab active" onclick="switchHistoryTab(this, 'preview')">预览</button>
                    <button class="tab" onclick="switchHistoryTab(this, 'source')">源码</button>
                </div>
                <div class="history-detail-content">
                    <div class="tab-content preview active">
                        ${marked.parse(content)}
                    </div>
                    <div class="tab-content source">
                        <pre class="source-content">${escapeHtml(content)}</pre>
                    </div>
                </div>
            </div>
        `;
        
        detailModal.appendChild(detailContent);
        
        // 击背景关闭详情模态框
        detailModal.addEventListener('click', (e) => {
            if (e.target === detailModal) {
                detailModal.remove();
            }
        });
        
        document.body.appendChild(detailModal);
        
        // 应用代码高亮
        detailModal.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightElement(block);
        });
        
    } catch (error) {
        console.error('获取历史记录详情失败:', error);
        showNotification('获取历史记录详情失败', true);
    }
}

// 添加切换历史记录详情标签的函数
function switchHistoryTab(button, type) {
    const tabs = button.closest('.history-detail-tabs').querySelectorAll('.tab');
    const contents = button.closest('.history-modal-body').querySelectorAll('.tab-content');
    
    tabs.forEach(tab => tab.classList.remove('active'));
    contents.forEach(content => content.classList.remove('active'));
    
    button.classList.add('active');
    button.closest('.history-modal-body').querySelector(`.tab-content.${type}`).classList.add('active');
}

// 添加删除历史记录的函数
async function deleteHistory(timestamp, button) {
    if (!confirm('确定要删除这条历史记录吗？此操作不可恢复。')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/history/${currentPath}/${timestamp}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            // 移除对应的历史记录项
            const historyItem = button.closest('.history-item');
            historyItem.remove();
            
            // 检查是否还有其他历史记录
            const remainingItems = document.querySelectorAll('.history-item');
            if (remainingItems.length === 0) {
                document.querySelector('.history-modal').remove();
                showNotification('没有更多历史记录');
            } else {
                showNotification('已删除历史记录');
            }
        } else {
            throw new Error('删除失败');
        }
    } catch (error) {
        console.error('删除历史记录失败:', error);
        showNotification('删除历史记录失败', true);
    }
}

// 添加删所有历史记录的函数
async function deleteAllHistory() {
    if (!confirm('确定要删除所有历史记录吗？此操作不可恢复。')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/history/${currentPath}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            document.querySelector('.history-modal').remove();
            showNotification('已删除所有历史记录');
        } else {
            throw new Error('删除失');
        }
    } catch (error) {
        console.error('删除所有历史记录失败:', error);
        showNotification('删除历史记录失', true);
    }
}

// 添加HTML转义函数
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// 添加通知函数
function showNotification(message, isError = false) {
    const notification = document.createElement('div');
    notification.className = `notification ${isError ? 'error' : 'success'}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => notification.remove(), 300);
    }, 2000);
}

// 在菜单部分添加笔记列表按钮的处理函数
function showNotesList() {
    fetchNotes().then(createNotesModal);
}

// 获取笔记列表
async function fetchNotes() {
    try {
        const response = await fetch('/api/notes');
        return await response.json();
    } catch (error) {
        console.error('获取笔记列表失败:', error);
        showNotification('获取笔记列表失败', true);
        return [];
    }
}

// 修改创建笔记列表模态框的函数
function createNotesModal(notes) {
    const modal = document.createElement('div');
    modal.className = 'history-modal';
    
    const content = document.createElement('div');
    content.className = 'history-modal-content notes-modal-content';
    
    content.innerHTML = `
        <div class="history-modal-header">
            <h3>笔记列表</h3>
            <div class="header-actions">
                <input type="text" id="notes-search" placeholder="搜索笔记..." class="search-input">
                <button onclick="this.closest('.history-modal').remove()">闭</button>
            </div>
        </div>
        <div class="history-modal-body">
            <div class="notes-list">
                ${notes.map(note => `
                    <div class="note-item" data-path="${note.path}">
                        <div class="note-info">
                            <div class="note-title">${formatNotePath(note.path)}</div>
                            <div class="note-meta">
                                最后修改: ${new Date(note.lastModified).toLocaleString()}
                                <span class="note-size">${formatFileSize(note.size)}</span>
                            </div>
                        </div>
                        <div class="note-actions">
                            <button onclick="previewNote('${note.path}')">预览</button>
                            <button onclick="navigateToNote('${note.path}')">打开</button>
                            <button class="delete-btn" onclick="deleteNote('${note.path}', this)">删除</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    modal.appendChild(content);
    
    // 添加索功能
    modal.addEventListener('input', (e) => {
        if (e.target.id === 'notes-search') {
            filterNotes(e.target.value);
        }
    });

    // 点击背景关闭
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });

    document.body.appendChild(modal);
}

// 格式化笔记路径显示
function formatNotePath(path) {
    // 如果是日期格式（YYYYMMDD），转换为更友好的显示
    if (/^\d{8}$/.test(path)) {
        return path.replace(/(\d{4})(\d{2})(\d{2})/, '$1年$2月$3日');
    }
    return path;
}

// 格式化文件大小
function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// 搜索笔记
function filterNotes(query) {
    const noteItems = document.querySelectorAll('.note-item');
    const lowercaseQuery = query.toLowerCase();
    
    noteItems.forEach(item => {
        const title = item.querySelector('.note-title').textContent.toLowerCase();
        if (title.includes(lowercaseQuery)) {
            item.style.display = '';
        } else {
            item.style.display = 'none';
        }
    });
}

// 修改 openNote 函数添加关闭菜单面板的功能
async function openNote(path) {
    try {
        currentPath = path;
        window.history.pushState({}, '', `/${path}`);
        await loadNote(path);
        
        // 关闭所有模态框
        const modals = document.querySelectorAll('.history-modal');
        modals.forEach(modal => modal.remove());
        
        // 关闭菜单面板
        const menuPanel = document.getElementById('menu-panel');
        if (menuPanel) {
            menuPanel.classList.add('hidden');
        }
        
        showNotification('笔记已打开');
    } catch (error) {
        console.error('打开笔记失败:', error);
        showNotification('打开笔记失败', true);
    }
}

// 修改 navigateToNote 函数为内部函数
async function navigateToNote(path) {
    await openNote(path);
}

// 删除笔记
async function deleteNote(path, button) {
    if (!confirm('确定要删除这个笔记吗？此操作不可恢复。')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/note/${path}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            const noteItem = button.closest('.note-item');
            noteItem.remove();
            showNotification('笔记已删除');
            
            // 如果删除的当前笔记，跳转到今天
            if (path === currentPath) {
                const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
                navigateToNote(today);
            }
        } else {
            throw new Error('删除失败');
        }
    } catch (error) {
        console.error('删除笔记失败:', error);
        showNotification('删除笔记失败', true);
    }
}

// 添加行高实时预览数
function updateLineHeightPreview(target, value) {
    const element = document.getElementById(target);
    const valueDisplay = document.getElementById(`${target}-line-height-value`);
    
    // 更新显示值
    valueDisplay.textContent = value;
    
    // 更新实际行高
    element.style.lineHeight = value;
    
    // 延迟保存设置
    debounce(() => {
        if (!currentSettings) {
            currentSettings = {};
        }
        currentSettings[`${target}LineHeight`] = parseFloat(value);
        saveSettings();
    }, 500)();
}

// 添加字体大小实时预览函数
function updateFontSizePreview(target, value) {
    const element = document.getElementById(target);
    const valueDisplay = document.getElementById(`${target}-font-size-value`);
    
    // 更新显示值
    valueDisplay.textContent = value;
    
    // 更新实际字体大小
    element.style.fontSize = `${value}px`;
    
    // 延迟保存设置
    debounce(() => {
        if (!currentSettings) {
            currentSettings = {};
        }
        currentSettings[`${target}FontSize`] = parseInt(value);
        saveSettings();
    }, 500)();
}

// 添加 resizer 初始化函
function initResizer() {
    const resizer = document.getElementById('resizer');
    const editorSection = document.querySelector('.editor-section');
    const previewSection = document.querySelector('.preview-section');
    const container = document.getElementById('editor-container');
    
    let isResizing = false;
    
    resizer.addEventListener('mousedown', startResizing);
    document.addEventListener('mousemove', handleResizing);
    document.addEventListener('mouseup', stopResizing);
    
    function startResizing(e) {
        isResizing = true;
        container.classList.add('resizing');
        resizer.classList.add('active');
    }
    
    function handleResizing(e) {
        if (!isResizing) return;
        
        e.preventDefault();
        
        const containerRect = container.getBoundingClientRect();
        const containerWidth = containerRect.width;
        const mouseX = e.clientX - containerRect.left;
        
        // 获取CSS变量
        const style = getComputedStyle(document.documentElement);
        const minWidth = parseFloat(style.getPropertyValue('--editor-min-width'));
        const maxWidth = parseFloat(style.getPropertyValue('--editor-max-width'));
        const snapThreshold = parseFloat(style.getPropertyValue('--snap-threshold'));
        const resizerWidthHalf = parseFloat(style.getPropertyValue('--resizer-width-half'));
        
        // 计算百分比
        let editorPercent = (mouseX / containerWidth) * 100;
        
        // 限制最小和最大宽度
        editorPercent = Math.max(minWidth, Math.min(maxWidth, editorPercent));
        
        // 中点吸附
        if (Math.abs(editorPercent - 50) < snapThreshold) {
            editorPercent = 50;
        }
        
        // 设置宽度
        editorSection.style.width = `calc(${editorPercent}% - ${resizerWidthHalf}px)`;
        previewSection.style.width = `calc(${100 - editorPercent}% - ${resizerWidthHalf}px)`;
        
        // 保存设置
        if (!currentSettings) {
            currentSettings = {};
        }
        currentSettings.editorWidth = `${editorPercent}%`;
        currentSettings.previewWidth = `${100 - editorPercent}%`;
    }
    
    function stopResizing() {
        if (!isResizing) return;
        
        isResizing = false;
        container.classList.remove('resizing');
        resizer.classList.remove('active');
        
        // 保存分割线位置到设置
        if (!currentSettings) {
            currentSettings = {};
        }
        currentSettings.editorWidth = editorSection.style.width;
        currentSettings.previewWidth = previewSection.style.width;
        saveSettings();
    }
}

// 修改处理 Tab 键的函数
function handleTabKey(e) {
    if (e.key === 'Tab') {
        e.preventDefault();
        
        const editor = this;
        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        const value = editor.value;
        const indent = '  ';
        
        // 检查是否在列表项后面按 Tab
        const currentLine = value.substring(0, start).split('\n').pop();
        const listMatch = currentLine.match(/^([ \t]*)([-+*]|\d+\.) /);
        
        if (listMatch) {
            // 如果是列表项
            const lineStart = value.substring(0, start).lastIndexOf('\n') + 1;
            const lineEnd = value.indexOf('\n', start);
            const fullLine = value.substring(lineStart, lineEnd === -1 ? value.length : lineEnd);
            
            if (e.shiftKey) {
                // Shift + Tab: 如果有缩进，则减少缩进
                if (fullLine.startsWith(indent)) {
                    const unindentedLine = fullLine.slice(2);
                    
                    // 更新编辑器内容
                    const beforeLine = value.substring(0, lineStart);
                    const afterLine = value.substring(lineEnd === -1 ? value.length : lineEnd);
                    editor.value = beforeLine + unindentedLine + afterLine;
                    
                    // 保持光标在原来的相对位置
                    const newCursorPos = start - indent.length;
                    editor.setSelectionRange(newCursorPos, newCursorPos);
                }
            } else {
                // Tab: 增加缩进
                const indentedLine = indent + fullLine;
                
                // 更新编辑器内容
                const beforeLine = value.substring(0, lineStart);
                const afterLine = value.substring(lineEnd === -1 ? value.length : lineEnd);
                editor.value = beforeLine + indentedLine + afterLine;
                
                // 保持光标在原来的相对位置
                const newCursorPos = start + indent.length;
                editor.setSelectionRange(newCursorPos, newCursorPos);
            }
        } else if (start !== end) {
            // 有选中的文本，处理多行缩进
            const selectedText = value.slice(start, end);
            const lines = selectedText.split('\n');
            
            if (e.shiftKey) {
                // Shift + Tab: 减少缩进
                const modifiedLines = lines.map(line => {
                    if (line.startsWith(indent)) return line.slice(2);
                    if (line.startsWith('\t')) return line.slice(1);
                    return line;
                });
                const newText = modifiedLines.join('\n');
                editor.setRangeText(newText, start, end, 'select');
            } else {
                // Tab: 增加缩进
                const modifiedLines = lines.map(line => indent + line);
                const newText = modifiedLines.join('\n');
                editor.setRangeText(newText, start, end, 'select');
            }
        } else {
            // 没有选中的文本，且不是列表项
            if (!e.shiftKey) {
                // 只在普通 Tab 时插入空格
                editor.setRangeText(indent, start, end, 'end');
            }
        }
        
        // 触发 input 事件以更新预览
        const inputEvent = new Event('input');
        editor.dispatchEvent(inputEvent);
    }
}

// 修改处理回车键的函数
function handleEnterKey(e) {
    if (e.key === 'Enter') {
        const editor = this;
        const start = editor.selectionStart;
        const value = editor.value;
        const currentLine = value.substring(0, start).split('\n').pop();
        
        // 检查是否是列表项
        const listMatch = currentLine.match(/^([ \t]*)([-+*]|\d+\.) /);
        
        if (listMatch) {
            // 检查列表项是否为空（只有列表标记）
            const isEmptyListItem = currentLine === listMatch[0];
            
            if (isEmptyListItem) {
                // 如果是空列表项，阻止默认换行并删除列表标记
                e.preventDefault();
                
                // 获取当前行之前的内容和之后的内容
                const beforeCursor = value.substring(0, start - listMatch[0].length);
                const afterCursor = value.substring(start);
                
                // 只删除列表标记，不添加换行符
                editor.value = beforeCursor + afterCursor;
                
                // 设置光标位置
                const newCursorPos = start - listMatch[0].length;
                editor.setSelectionRange(newCursorPos, newCursorPos);
            } else {
                // 如果列表项有内容，添加相同的列表标记
                e.preventDefault();
                const indent = listMatch[1];
                const marker = listMatch[2];
                
                // 如果是数字列表，增加序号
                let newMarker = marker;
                if (/^\d+\.$/.test(marker)) {
                    const num = parseInt(marker) + 1;
                    newMarker = `${num}.`;
                }
                
                const newListItem = `\n${indent}${newMarker} `;
                
                if (document.execCommand) {
                    document.execCommand('insertText', false, newListItem);
                } else {
                    editor.setRangeText(newListItem, start, start, 'end');
                }
            }
            
            // 触发 input 事件以更新预览
            const inputEvent = new Event('input');
            editor.dispatchEvent(inputEvent);
        }
    }
}

// 添加更新默认代码语言的函数
async function updateDefaultCodeLanguage(language) {
    if (!currentSettings) {
        currentSettings = {};
    }
    currentSettings.defaultCodeLanguage = language;
    await saveSettings();
    
    // 重新渲染预览以应新的默认语言
    const editor = document.getElementById('editor');
    renderPreview(editor.value);
}

// 添加预览笔记的函数
async function previewNote(path) {
    try {
        const response = await fetch(`/api/note/${path}`);
        const content = await response.text();
        
        const previewModal = document.createElement('div');
        previewModal.className = 'history-modal';
        
        const previewContent = document.createElement('div');
        previewContent.className = 'history-modal-content';
        
        previewContent.innerHTML = `
            <div class="history-modal-header">
                <h3>笔记预览 - ${formatNotePath(path)}</h3>
                <div class="header-actions">
                    <button onclick="navigateToNote('${path}')">打开编辑</button>
                    <button onclick="this.closest('.history-modal').remove()">关闭</button>
                </div>
            </div>
            <div class="history-modal-body preview-content">
                ${marked.parse(content)}
            </div>
        `;
        
        previewModal.appendChild(previewContent);
        
        // 点击背景关闭
        previewModal.addEventListener('click', (e) => {
            if (e.target === previewModal) {
                previewModal.remove();
            }
        });
        
        document.body.appendChild(previewModal);
        
        // 应用代码高亮
        previewModal.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightElement(block);
        });
        
    } catch (error) {
        console.error('预览笔记失败:', error);
        showNotification('预览笔记失败', true);
    }
}

// 修改 logout 函数，添加清除本地设置
async function logout() {
    try {
        await fetch('/api/logout', { method: 'POST' });
        // 清除本地设置
        localStorage.removeItem('editor_settings');
        window.location.reload();
    } catch (error) {
        console.error('登出失败:', error);
    }
}

// 添加防抖的本地缓存更新
const updateLocalNoteCache = debounce((content) => {
    try {
        localStorage.setItem(NOTE_CACHE_KEY + currentPath, JSON.stringify({
            content,
            timestamp: Date.now()
        }));
        console.log('[Editor] 笔记本地缓存已更新');
    } catch (e) {
        console.error('更新笔记本地缓存失败:', e);
    }
}, 1000);  // 1秒的防抖时间 