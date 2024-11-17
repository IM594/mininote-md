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

# 创建必要的数据目录并设置权限
RUN mkdir -p /app/data/notes /app/data/settings /app/data/history && \
    chown -R root:root /app && \
    chmod -R 755 /app && \
    chmod -R 777 /app/data && \
    chmod 777 /app/data/notes && \
    chmod 777 /app/data/settings && \
    chmod 777 /app/data/history

# 切换到非 root 用户
USER node

# 设置环境变量
ENV PORT=3456 \
    NODE_ENV=production

# 暴露端口
EXPOSE 3456

# 启动应用
CMD ["node", "backend/src/server.js"]