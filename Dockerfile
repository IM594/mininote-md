# 使用 Node.js 18 Alpine 作为基础镜像
FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 复制 package.json
COPY package*.json ./

# 使用 npm 安装依赖
RUN npm install --production

# 复制前端和后端代码
COPY frontend ./frontend
COPY backend ./backend

# 创建必要的数据目录
RUN mkdir -p data/notes data/settings data/history && \
    chmod -R 777 data

# 设置环境变量
ENV PORT=3456 \
    NODE_ENV=production \
    PASSWORD=test0000

# 暴露端口
EXPOSE 3456

# 启动应用
CMD ["node", "backend/src/server.js"]