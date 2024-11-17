# 使用 Node.js 18 Alpine 作为基础镜像
FROM node:18-alpine

# 安装 su-exec 用于权限处理
RUN apk add --no-cache su-exec

# 设置工作目录
WORKDIR /app

# 复制 package.json 并安装依赖
COPY package*.json ./
RUN npm install --production

# 复制前端和后端代码
COPY frontend ./frontend
COPY backend ./backend

# 创建启动脚本
COPY <<'EOF' /docker-entrypoint.sh
#!/bin/sh
mkdir -p /app/data/notes /app/data/settings /app/data/history
chown -R node:node /app/data
exec su-exec node node backend/src/server.js
EOF

RUN chmod +x /docker-entrypoint.sh

# 设置环境变量
ENV PORT=3456 \
    NODE_ENV=production

# 暴露端口
EXPOSE 3456

# 使用启动脚本
ENTRYPOINT ["/docker-entrypoint.sh"]