# Zeabur 部署指南（前后端分离）

本指南说明如何在 Zeabur 上部署租号酷的前端和后端服务，使用域名 `zuhaoku.fun`。

## 部署架构

- **前端服务**：Vue.js + Nginx，端口 80
- **后端服务**：Node.js + Express，端口 8080
- **域名**：`zuhaoku.fun`（前端），`api.zuhaoku.fun`（后端，可选）

## 部署步骤

### 1. 部署后端服务

#### 1.1 创建后端服务

1. 登录 Zeabur 控制台
2. 选择你的项目或创建新项目
3. 点击 "New Service"
4. 选择 "GitHub" 并连接 `zuhaoku` 仓库
5. 选择根目录（Zeabur 会自动检测 `zeabur.yaml` 和 `Dockerfile`）

#### 1.2 配置后端环境变量

在 Zeabur 后端服务的环境变量中设置：

```bash
# 数据库配置
MYSQL_HOST=mysql2.sqlpub.com
MYSQL_PORT=3307
MYSQL_USER=shigure2
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=zuhaoku

# JWT 配置
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d

# 支付宝配置
ALIPAY_APP_ID=your_app_id
ALIPAY_PRIVATE_KEY_PKCS1=your_private_key_pkcs1
ALIPAY_PUBLIC_KEY=your_public_key
ALIPAY_GATEWAY=https://openapi.alipay.com/gateway.do
ALIPAY_NOTIFY_URL=https://api.zuhaoku.fun/api/v1/payments/alipay/notify
ALIPAY_RETURN_URL=https://zuhaoku.fun/tenant/orders

# 业务 URL
BACKEND_URL=https://api.zuhaoku.fun
FRONTEND_URL=https://zuhaoku.fun

# 服务器配置
PORT=8080
NODE_ENV=production
```

#### 1.3 配置后端域名（可选）

1. 在 Zeabur 后端服务中点击 "Domains"
2. 添加自定义域名：`api.zuhaoku.fun`
3. Zeabur 会自动配置 SSL 证书

**注意**：如果使用同一域名，后端可以通过路径 `/api` 访问，但推荐使用子域名。

### 2. 部署前端服务

#### 2.1 创建前端服务

1. 在同一个 Zeabur 项目中，再次点击 "New Service"
2. 选择 "GitHub" 并连接 `zuhaoku` 仓库
3. **重要**：在 "Root Directory" 中选择 `frontend` 目录
4. Zeabur 会自动检测 `frontend/zeabur.yaml` 和 `frontend/Dockerfile`

#### 2.2 配置前端环境变量

在 Zeabur 前端服务的环境变量中设置：

```bash
# API 基础地址（指向后端服务）
# 如果后端使用子域名 api.zuhaoku.fun
VITE_API_BASE_URL=https://api.zuhaoku.fun/api/v1

# 或者如果后端和前端使用同一域名（通过路径区分）
# VITE_API_BASE_URL=https://zuhaoku.fun/api/v1

# 应用标题
VITE_APP_TITLE=租号酷
```

#### 2.3 配置前端域名

1. 在 Zeabur 前端服务中点击 "Domains"
2. 添加自定义域名：`zuhaoku.fun`
3. Zeabur 会自动配置 SSL 证书

### 3. 配置 CORS（后端）

后端已配置 CORS，允许所有来源。如果需要限制，可以在 `backend-node/server.js` 中修改：

```javascript
app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://zuhaoku.fun',
  credentials: true
}));
```

### 4. 验证部署

#### 4.1 检查后端服务

```bash
# 健康检查
curl https://api.zuhaoku.fun/health

# 应该返回：
# {"code":200,"message":"操作成功","data":{...},"timestamp":...}
```

#### 4.2 检查前端服务

1. 访问 `https://zuhaoku.fun`
2. 应该能看到登录页面
3. 打开浏览器开发者工具，检查 API 请求是否正常

#### 4.3 测试登录

1. 使用测试账号登录（参考 `TEST_ACCOUNTS.md`）
2. 检查是否能正常访问后端 API

## 域名配置方案

### 方案 1：子域名（推荐）

- 前端：`https://zuhaoku.fun`
- 后端：`https://api.zuhaoku.fun`

**优点**：
- 清晰分离前后端
- 便于独立扩展
- 符合 RESTful API 规范

**配置**：
- 前端 `VITE_API_BASE_URL=https://api.zuhaoku.fun/api/v1`
- 后端 `BACKEND_URL=https://api.zuhaoku.fun`

### 方案 2：同一域名（路径区分）

- 前端：`https://zuhaoku.fun`
- 后端：`https://zuhaoku.fun/api`

**优点**：
- 只需要一个域名
- 避免跨域问题

**配置**：
- 前端 `VITE_API_BASE_URL=https://zuhaoku.fun/api/v1`
- 后端 `BACKEND_URL=https://zuhaoku.fun`
- 需要配置 Nginx 代理（见 `frontend/nginx.conf`）

## 环境变量完整列表

### 后端环境变量

参考 `ENV_CONFIG.md` 获取完整的环境变量列表。

### 前端环境变量

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `VITE_API_BASE_URL` | API 基础地址 | `https://api.zuhaoku.fun/api/v1` |
| `VITE_APP_TITLE` | 应用标题 | `租号酷` |

## 故障排查

### 前端无法访问后端 API

1. **检查环境变量**：确认 `VITE_API_BASE_URL` 正确设置
2. **检查后端服务**：确认后端服务正常运行
3. **检查 CORS**：确认后端 CORS 配置允许前端域名
4. **检查网络**：在浏览器控制台查看网络请求错误

### 后端服务无法启动

1. **检查数据库连接**：确认数据库配置正确
2. **检查环境变量**：确认所有必需的环境变量都已设置
3. **查看日志**：在 Zeabur 控制台查看服务日志

### 域名无法访问

1. **检查 DNS 配置**：确认域名 DNS 已正确配置
2. **检查 SSL 证书**：Zeabur 会自动配置 SSL，等待几分钟
3. **检查服务状态**：确认前后端服务都正常运行

## 更新部署

### 更新后端

1. 推送代码到 GitHub
2. Zeabur 会自动检测并重新构建后端服务
3. 等待部署完成

### 更新前端

1. 推送代码到 GitHub
2. Zeabur 会自动检测并重新构建前端服务
3. 等待部署完成

## 监控和日志

### 查看日志

1. 在 Zeabur 控制台选择服务
2. 点击 "Logs" 查看实时日志

### 健康检查

- 后端：`https://api.zuhaoku.fun/health`
- 前端：`https://zuhaoku.fun/health`

## 性能优化

### 后端优化

- 使用连接池管理数据库连接
- 启用 Gzip 压缩
- 配置适当的资源限制

### 前端优化

- 静态资源缓存（已配置）
- Gzip 压缩（已配置）
- CDN 加速（可选）

## 安全建议

1. **环境变量**：不要在代码中硬编码敏感信息
2. **HTTPS**：确保所有通信使用 HTTPS
3. **CORS**：限制允许的前端域名
4. **Rate Limiting**：考虑添加 API 限流
5. **监控**：设置告警监控服务状态

