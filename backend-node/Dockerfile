# 注意：此 Dockerfile 在 backend-node 目录下
# 如果从根目录构建，应该使用根目录的 Dockerfile
# 此文件主要用于本地开发或单独构建后端

FROM node:20-alpine

# 设置工作目录
WORKDIR /app

# 安装系统依赖
RUN apk add --no-cache tzdata curl

# 设置时区
ENV TZ=Asia/Shanghai

# 复制后端 package.json 和 package-lock.json
COPY package*.json ./

# 安装后端依赖
RUN npm ci --only=production

# 复制后端应用代码
COPY . .

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

