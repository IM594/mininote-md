# Mini Note MD

一个极简的 Markdown 随手记应用。

## 快速开始

### 环境要求
- Node.js 18.0+
- npm

### 部署步骤
```bash
git clone https://github.com/IM594/mininote-md.git
cd mininote-md
npm install  # 安装依赖
npm start    # 启动服务
npm run dev  # 开发模式启动（支持热重载）
```

访问 `http://localhost:3456` 即可使用，默认密码为 `test0000`。

### 环境变量
- `PORT`: 服务端口号，默认 3456
- `PASSWORD`: 登录密码，默认 test0000
- `JWT_SECRET`: JWT 密钥，建议在生产环境中设置
- `NODE_ENV`: 环境模式，production/development

## 主要功能

### 🔐 安全认证
- JWT token 认证
- HttpOnly Cookie 存储
- 30天自动过期
- 安全登出机制

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

## 安全说明

- 使用 JWT 进行身份验证
- Token 存储在 HttpOnly Cookie 中
- 所有 API 请求都需要有效 token
- 支持安全的登出机制
- 建议在生产环境中：
  1. 使用强密钥(JWT_SECRET)
  2. 启用 HTTPS
  3. 定期轮换密钥
  4. 设置合适的密码

## 待办事项

- [ ] Docker 部署支持
- [ ] 国际化支持

## 技术栈

- 前端: 原生 JavaScript + Marked.js + Highlight.js
- 后端: Node.js + Express + JWT
- 数据存储: 文件系统