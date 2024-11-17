# Mini Note MD

一个极简的 Markdown 随手记应用，支持 Docker 一键部署。支持实时预览、历史记录、深色模式等功能。

## 功能特点

### 📝 编辑器
- 实时预览 Markdown 内容
- 支持分屏/仅编辑/仅预览三种模式
- 自定义字体大小和行高
- Tab 键智能缩进
- 多级列表自动缩进
- 支持快捷键操作
- 自动保存（每5分钟）
- 手动保存 (Ctrl/Cmd + S)

### 🎨 Markdown 支持
- 完整的 Markdown 语法支持
- 代码语法高亮
- 支持设置默认代码语言
- 代码块一键复制
- 支持多种编程语言
- 表格支持
- 图片支持
- 数学公式支持

### 📅 笔记管理
- 基于日期组织笔记
- 笔记列表查看
- 笔记搜索功能
- 笔记预览/编辑/删除
- 快速导航到前一天/后一天

### ⏱️ 历史记录
- 自动保存历史版本
- 查看/预览历史版本
- 恢复历史版本
- 删除单个历史记录
- 清空所有历史记录
- 历史记录自动清理（保留30天）

### 🎯 界面与主题
- 深色/浅色主题自动切换
- 响应式设计
- 移动端适配
- 可调节分屏比例
- 自定义字体大小
- 自定义行高

### 🔐 安全特性
- 密码保护
- JWT token 认证
- HttpOnly Cookie
- 30天自动过期
- 安全登出机制

## 快速开始

### 环境要求
- Node.js 18.0+
- npm 或 Docker

### 部署方式

#### 方式一：本地部署
1. 克隆仓库
   ```bash
   git clone https://github.com/IM594/mininote-md.git
   cd mininote-md
   npm install
   npm start    # 启动服务
   npm run dev  # 开发模式启动（支持热重载）
   ```

2. 访问 `http://localhost:3456`，默认密码为 `test0000`

#### 方式二：Docker 部署
1. 直接运行
   ```bash
   docker run -d \
     -p 3456:3456 \
     -v /path/to/data:/app/data \
     -e PASSWORD=your-secure-password \
     -e SALT=your-secure-salt \
     -e NODE_ENV=production \
     im594/mininote-md:latest
   ```

2. 使用 docker-compose
   ```yaml
   version: '3'
   services:
     note-app:
       image: im594/mininote-md:latest
       ports:
         - "3456:3456"
       volumes:
         - ./data:/app/data
       environment:
         - PASSWORD=your-secure-password
         - SALT=your-secure-salt
         - NODE_ENV=production
       restart: unless-stopped
   ```
   
   运行：`docker-compose up -d`

### 环境变量
- `PORT`: 服务端口号，默认 3456
- `PASSWORD`: 登录密码，默认 test0000
- `SALT`: 用于生成 JWT 密钥的盐值
- `NODE_ENV`: 环境模式，production/development

## 使用说明

### 快捷键
- `Ctrl/Cmd + S`: 手动保存笔记
- `Tab`: 增加缩进
- `Shift + Tab`: 减少缩进
- 列表自动缩进：在列表项中按 Tab 增加层级，Shift + Tab 减少层级
- 空列表项回车：自动移除列表标记

### 笔记管理
- 点击右上角菜单按钮打开功能面板
- 可以查看笔记列表、历史记录
- 支持按标题搜索笔记
- 可以预览、编辑或删除笔记

### 编辑器设置
- 可调整编辑器和预览区域的字体大小
- 可调整编辑器和预览区域的行高
- 可设置默认代码语言
- 可调整分屏比例（拖动分隔线）

### 数据存储
- 笔记保存在 `data/notes` 目录
- 历史记录保存在 `data/history` 目录
- 用户设置保存在 `data/settings` 目录

## 待办事项

- [x] Docker 部署支持
- [x] 深色模式支持
- [x] 历史记录管理
- [x] 笔记列表搜索
- [ ] 国际化支持
- [ ] 笔记导出功能

## 技术栈

- 前端: 原生 JavaScript + Marked.js + Highlight.js
- 后端: Node.js + Express + JWT
- 数据存储: 文件系统
- 容器化: Docker

## 贡献

欢迎提交 Issue 和 Pull Request。

## 许可

MIT License