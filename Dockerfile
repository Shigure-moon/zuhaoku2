# Node.js 后端 Dockerfile（完全参考 myblog 的实现）
FROM node:20-alpine

# 设置工作目录
WORKDIR /app

# 安装系统依赖
RUN apk add --no-cache tzdata curl

# 设置时区
ENV TZ=Asia/Shanghai

# 复制 package.json 和 package-lock.json
COPY backend-node/package*.json ./

# 安装依赖
RUN npm ci --only=production

# 复制应用代码
COPY backend-node/ ./

# 使用基础镜像中已存在的 node 用户（UID/GID 1000）
# node:18-alpine 镜像已经包含了 node 用户
RUN chown -R node:node /app

# 切换到非 root 用户
USER node

# 暴露端口
EXPOSE 8080

# 健康检查
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD curl --fail http://localhost:8080/health || exit 1

# 启动应用
CMD ["node", "server.js"]
