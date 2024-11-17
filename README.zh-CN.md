# Mini Note MD

[English](README.md) | [中文](README.zh-CN.md)

一个极简的 Markdown 随手记应用，支持实时预览、历史记录、深色模式等功能。

## 主要功能

### 📝 编辑器
- 实时预览
- 分屏/仅编辑/仅预览三种模式
- 自定义字体大小和行高
- Tab 键智能缩进
- 列表自动缩进
- 快捷键支持
- 自动保存（每5分钟）
- 手动保存（Ctrl/Cmd + S）

### 🎨 Markdown 支持
- 支持 Markdown 语法
- 代码语法高亮
- 默认代码语言设置
- 代码块一键复制
- 多种编程语言支持
- 表格支持
- 图片支持
- 数学公式支持

### 📅 笔记管理
- 基于日期组织笔记
- 笔记列表与搜索
- 笔记预览/编辑/删除
- 前一天/后一天快速导航

### ⏱️ 历史记录
- 自动保存版本
- 查看/预览版本
- 版本恢复
- 删除单个版本
- 清空所有版本
- 自动清理（保留30天）

### 🎯 界面与主题
- 自动深色/浅色主题
- 响应式设计
- 移动端适配
- 可调节分屏比例
- 自定义字体大小
- 自定义行高

### 🔐 安全特性
- 密码保护
- JWT 认证
- HttpOnly Cookie
- 30天令牌过期
- 安全登出

## 快速开始

### 环境要求
- Node.js 18.0+
- npm 或 Docker

### 本地部署
1. 克隆并运行
   ```bash
   git clone https://github.com/IM594/mininote-md.git
   cd mininote-md
   npm install
   npm start    # 生产模式
   npm run dev  # 开发模式（热重载）
   ```

2. 访问 `http://localhost:3456`，默认密码：`test0000`

### Docker 部署
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

### 1Panel 部署
1. 左侧菜单栏点击"容器" -> "镜像" -> "镜像管理"
2. 拉取镜像：`im594/mininote-md:latest`
3. 进入"容器" -> "创建容器"
4. 配置容器：
   - 名称：`mininote-md` 
   - 镜像：`im594/mininote-md:latest`
   - 端口 -> 暴露端口 -> 添加：`3456` `3456`
   - 填写网络和 ipv4 地址
   - 挂载 -> 添加
       - 本机目录 `/data/mininote-md` 
       - 权限：`读写`
       - 容器目录：`/app/data`
   - 重启策略：任意
   - CPU 权重：1024（默认）
   - CPU 限制：任意
   - 内存限制：任意
   - 环境变量：
     ```
     PASSWORD=<你的登录密码>
     SALT=<你的安全盐值>
     NODE_ENV=production
     ```
5. 点击"确认"


### 环境变量
- `PORT`: 服务端口号（默认：3456）
- `PASSWORD`: 登录密码（默认：test0000）
- `SALT`: JWT 密钥盐值
- `NODE_ENV`: production/development

## 使用说明

### 快捷键
- `Ctrl/Cmd + S`: 手动保存
- `Tab`: 增加缩进
- `Shift + Tab`: 减少缩进
- 列表自动缩进：在列表项中按 Tab 增加层级
- 空列表项：回车自动移除列表标记

### 笔记管理
- 点击右上角菜单访问功能
- 查看笔记列表和历史
- 按标题搜索笔记
- 预览、编辑或删除笔记

### 编辑器设置
- 调整编辑器/预览区字体大小
- 调整编辑器/预览区行高
- 设置默认代码语言
- 调整分屏比例（拖动分隔线）

### 数据存储
- 笔记：`data/notes` 目录
- 历史：`data/history` 目录
- 设置：`data/settings` 目录

## 开发计划

- [x] Docker 部署支持
- [x] 深色模式
- [x] 历史记录
- [x] 笔记搜索
- [ ] 国际化支持
- [ ] 笔记导出

## 技术栈

- 前端：原生 JavaScript + Marked.js + Highlight.js
- 后端：Node.js + Express + JWT
- 存储：文件系统
- 容器：Docker

## 贡献

欢迎提交 Issue 和 Pull Request。

## 许可

MIT License 