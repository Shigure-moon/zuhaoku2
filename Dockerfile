# 多阶段构建：同时构建前端和后端
# 阶段1: 构建前端
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# 复制前端 package 文件
COPY frontend/package*.json ./

# 安装前端依赖
RUN npm ci

# 复制前端源代码（排除 node_modules 和 dist）
COPY frontend/ ./
RUN rm -rf node_modules dist 2>/dev/null || true

# 构建前端
RUN npm run build

# 阶段2: 构建后端并包含前端
FROM node:20-alpine

# 设置工作目录
WORKDIR /app

# 安装系统依赖
RUN apk add --no-cache tzdata curl

# 设置时区
ENV TZ=Asia/Shanghai

# 复制后端 package.json 和 package-lock.json
COPY backend-node/package*.json ./

# 安装后端依赖
RUN npm ci --only=production

# 复制后端应用代码
COPY backend-node/ ./

# 从前端构建阶段复制构建产物
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# 使用基础镜像中已存在的 node 用户（UID/GID 1000）
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
