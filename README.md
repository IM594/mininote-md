# Mini Note MD

一个极简的 Markdown 随手记应用。

## 快速开始

### 环境要求
- Node.js 18.0+
- npm

### 部署步骤
```bash
git clone https://github.com/your-username/mini-note-md.git
cd mini-note-md/backend
npm install
npm start
```

访问 `http://localhost:3457` 即可使用，默认密码为 `test0000`。

## 主要功能

### 📝 编辑器
- 实时预览 Markdown 内容
- 支持分屏/仅编辑/仅预览三种模式
- 自定义字体大小和行高
- Tab 键智能缩进
- 多级列表自动缩进

### 🎨 代码
- 代码语法高亮
- 设置默认代码语言
- 代码块一键复制
- 支持多种编程语言

### 📅 笔记管理
- 基于日期组织笔记
- 笔记列表查看
- 笔记预览/删除
- 标题搜索

### ⏱️ 历史记录
- 自动保存历史版本
- 查看/预览历史版本
- 恢复/删除历史版本

### 🎯 其他
- 深色/浅色主题
- 密码保护
- 自动保存
- 快捷键支持
- 移动端适配

## 待办事项

- [ ] Docker 部署支持
- [ ] 国际化支持

## 技术栈

- 前端: 原生 JavaScript + Marked.js + Highlight.js
- 后端: Node.js + Express
- 数据存储: 文件系统