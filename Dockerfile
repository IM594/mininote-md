FROM node:18-alpine

WORKDIR /app

# 复制所需文件
COPY backend/package*.json ./backend/
COPY scripts ./scripts
COPY frontend ./frontend

# 安装依赖并下载前端资源
RUN cd backend && npm install && cd .. && \
    node scripts/download-deps.js && \
    mkdir -p data/notes data/settings data/history && \
    chmod -R 777 data

# 复制后端代码
COPY backend ./backend

# 设置默认密码（可以通过环境变量覆盖）
ENV PASSWORD=default-password
ENV PORT=3457
ENV NODE_ENV=production

# 暴露端口
EXPOSE 3457

# 启动应用
CMD ["node", "backend/src/server.js"]