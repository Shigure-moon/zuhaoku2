# 使用 Node.js 20 作为基础镜像（参考 myblog 的实现）
FROM node:20-alpine

# 设置工作目录
WORKDIR /app

# 安装系统依赖
RUN apk add --no-cache tzdata curl

# 设置时区
ENV TZ=Asia/Shanghai

# 复制 package.json 和 package-lock.json
COPY package.json package-lock.json* ./

# 安装依赖（包括 devDependencies，构建需要）
# 如果没有 package-lock.json，使用 npm install
RUN if [ -f package-lock.json ]; then \
      npm ci --include=dev; \
    else \
      npm install --include=dev; \
    fi

# 复制源代码
COPY . .

# 构建前端应用
RUN npm run build

# 删除 devDependencies（生产环境不需要）
RUN npm prune --production

# 使用基础镜像中已存在的 node 用户（UID/GID 1000）
RUN chown -R node:node /app

# 切换到非 root 用户
USER node

# 暴露端口
EXPOSE 8080

# 健康检查
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD curl --fail http://localhost:8080/health || exit 1

# 启动 Node.js 服务器
CMD ["node", "server.js"]
