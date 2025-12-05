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
# 添加重试机制和更长的超时时间，以应对 npm registry 网络问题
# 设置 npm 配置：增加超时时间和重试次数
RUN npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    if [ -f package-lock.json ]; then \
      npm ci --include=dev --prefer-offline --no-audit || \
      npm install --include=dev --prefer-offline --no-audit; \
    else \
      npm install --include=dev --prefer-offline --no-audit; \
    fi

# 复制源代码
COPY . .

# 构建前端应用（生产环境，使用相对路径）
# 设置 VITE_API_BASE_URL 环境变量，确保构建时使用相对路径
# 同时设置 NODE_ENV=production 确保 Vite 识别为生产模式
# 使用 --mode production 明确指定生产模式构建
ENV VITE_API_BASE_URL=/api/v1
ENV NODE_ENV=production
RUN npm run build -- --mode production

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
