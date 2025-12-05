# 前端部署指南

## Zeabur 部署

### 1. 在 Zeabur 中创建前端服务

1. 登录 Zeabur 控制台
2. 选择你的项目
3. 点击 "New Service"
4. 选择 "GitHub" 并连接仓库
5. 选择 `frontend` 目录作为根目录
6. Zeabur 会自动检测 `frontend/zeabur.yaml` 配置

### 2. 配置环境变量

在 Zeabur 前端服务的环境变量中设置：

```bash
# API 基础地址（后端服务的 URL）
VITE_API_BASE_URL=https://your-backend-domain.zeabur.app/api/v1

# 或者如果使用自定义域名
VITE_API_BASE_URL=https://api.zuhaoku.fun/api/v1
```

### 3. 配置自定义域名

1. 在 Zeabur 前端服务中点击 "Domains"
2. 添加自定义域名，例如：`https://zuhaoku.fun`
3. Zeabur 会自动配置 SSL 证书

### 4. 验证部署

访问前端域名，应该能看到登录页面。

## 本地开发

### 启动前端开发服务器

```bash
cd frontend
npm install
npm run dev
```

前端将在 `http://localhost:3000` 启动（如果端口被占用，会自动使用下一个可用端口）。

### 环境变量配置

创建 `frontend/.env.development`：

```bash
VITE_API_BASE_URL=http://localhost:8080/api/v1
```

## 构建和预览

### 构建生产版本

```bash
cd frontend
npm run build
```

构建产物在 `frontend/dist/` 目录。

### 预览生产构建

```bash
npm run preview
```

## 注意事项

1. **API 地址配置**：确保 `VITE_API_BASE_URL` 指向正确的后端地址
2. **CORS 配置**：确保后端已配置 CORS，允许前端域名访问
3. **路由模式**：前端使用 History 模式，需要 Nginx 配置 `try_files`
4. **静态资源**：确保 Nginx 正确配置静态资源缓存

## 故障排查

### 前端无法访问后端 API

1. 检查 `VITE_API_BASE_URL` 环境变量是否正确
2. 检查后端服务是否正常运行
3. 检查浏览器控制台的网络请求
4. 检查后端 CORS 配置

### 路由刷新 404

确保 Nginx 配置了 `try_files $uri $uri/ /index.html;`

### 静态资源加载失败

检查 Nginx 配置中的静态资源路径是否正确。

