# Zeabur 环境变量配置指南

## 当前部署信息

- **前端域名**: `https://zuhaoku.zeabur.app/`
- **后端域名**: `https://zuhaoku.fun` (或 `https://api.zuhaoku.fun`)

## 前端服务环境变量

在 Zeabur 前端服务的环境变量设置中添加：

```bash
# API 基础 URL（指向后端服务）
VITE_API_BASE_URL=https://zuhaoku.fun/api/v1

# 应用标题（可选）
VITE_APP_TITLE=租号酷
```

**重要**：
- 前端使用 `VITE_` 前缀的环境变量
- 这些变量在构建时会被注入到代码中
- 修改后需要重新构建前端服务

## 后端服务环境变量

在 Zeabur 后端服务的环境变量设置中添加：

### 必需配置

```bash
# 服务器配置
PORT=8080
SPRING_PROFILES_ACTIVE=prod

# 业务 URL（必需）
BACKEND_URL=https://zuhaoku.fun
FRONTEND_URL=https://zuhaoku.zeabur.app

# 数据库配置
MYSQL_HOST=mysql2.sqlpub.com
MYSQL_PORT=3307
MYSQL_DATABASE=zuhaoku
MYSQL_USER=shigure2
MYSQL_PASSWORD=你的数据库密码

# JWT 和加密配置
JWT_SECRET=你的JWT密钥（至少32字符）
ENCRYPTION_KEY=你的加密密钥（至少32字符）
ENCRYPTION_MASTER_KEY=你的主加密密钥（至少32字符）

# 支付宝配置
ALIPAY_APP_ID=你的支付宝AppID
ALIPAY_GATEWAY=https://openapi.alipay.com/gateway.do
ALIPAY_PRIVATE_KEY_PKCS1=你的PKCS#1格式私钥（推荐）
# 或者使用 PKCS#8 格式
# ALIPAY_PRIVATE_KEY=你的PKCS#8格式私钥
ALIPAY_PUBLIC_KEY=支付宝公钥（纯Base64，不含BEGIN/END标记）
ALIPAY_NOTIFY_URL=https://zuhaoku.fun/api/v1/payments/alipay/notify
ALIPAY_RETURN_URL=https://zuhaoku.zeabur.app/tenant/orders
```

### 可选配置

```bash
# Redis 配置（如果使用）
REDIS_HOST=你的Redis地址
REDIS_PORT=6379
REDIS_PASSWORD=你的Redis密码

# MinIO 配置（如果使用）
MINIO_ENDPOINT=你的MinIO地址
MINIO_ACCESS_KEY=你的MinIO访问密钥
MINIO_SECRET_KEY=你的MinIO密钥
MINIO_BUCKET=你的存储桶名称
```

## 配置步骤

### 1. 配置前端服务

1. 在 Zeabur 控制台找到前端服务
2. 进入 "Environment Variables" 页面
3. 添加 `VITE_API_BASE_URL=https://zuhaoku.fun/api/v1`
4. 保存后，Zeabur 会自动重新构建和部署

### 2. 配置后端服务

1. 在 Zeabur 控制台找到后端服务
2. 进入 "Environment Variables" 页面
3. 添加所有必需的环境变量（参考上面的列表）
4. 特别注意：
   - `BACKEND_URL` 应该指向你的后端域名
   - `FRONTEND_URL` 应该指向你的前端域名
   - `ALIPAY_NOTIFY_URL` 和 `ALIPAY_RETURN_URL` 需要正确配置

### 3. 验证配置

#### 检查前端

访问 `https://zuhaoku.zeabur.app/`，打开浏览器开发者工具：

1. **Network 标签**：检查 API 请求是否指向正确的后端地址
2. **Console 标签**：检查是否有 CORS 错误或其他错误

#### 检查后端

访问 `https://zuhaoku.fun/health`，应该返回：

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "service": "zhk-user",
    "message": "租号酷后端服务运行正常",
    "version": "1.0.0-SNAPSHOT",
    "status": "UP"
  }
}
```

## 常见问题

### 1. 502 Bad Gateway

**可能原因**：
- 后端服务未启动或崩溃
- 后端服务端口配置错误
- 健康检查失败

**解决方法**：
1. 检查后端服务日志
2. 确认 `PORT=8080` 环境变量已设置
3. 检查后端服务的健康检查配置

### 2. CORS 错误

**可能原因**：
- 前端 `VITE_API_BASE_URL` 配置错误
- 后端 CORS 配置问题

**解决方法**：
1. 确认前端 `VITE_API_BASE_URL` 指向正确的后端地址
2. 后端已配置允许所有来源（`setAllowedOriginPatterns("*")`），通常不会有问题

### 3. API 请求失败

**可能原因**：
- 后端服务未正常运行
- 环境变量配置错误
- 数据库连接失败

**解决方法**：
1. 检查后端服务日志
2. 验证所有必需的环境变量都已正确配置
3. 测试数据库连接

### 4. Tailwind CSS CDN 警告

这个警告通常来自浏览器扩展或开发工具，不影响生产环境。如果确实使用了 CDN，应该：

1. 安装 Tailwind CSS 作为依赖：`npm install -D tailwindcss`
2. 配置 PostCSS 或使用 Tailwind CLI
3. 移除 CDN 引用

## 域名配置建议

### 推荐配置

- **前端**: `https://zuhaoku.fun` 或 `https://www.zuhaoku.fun`
- **后端**: `https://api.zuhaoku.fun`

如果使用这种配置：

```bash
# 前端环境变量
VITE_API_BASE_URL=https://api.zuhaoku.fun/api/v1

# 后端环境变量
BACKEND_URL=https://api.zuhaoku.fun
FRONTEND_URL=https://zuhaoku.fun
ALIPAY_NOTIFY_URL=https://api.zuhaoku.fun/api/v1/payments/alipay/notify
ALIPAY_RETURN_URL=https://zuhaoku.fun/tenant/orders
```

### 当前配置（Zeabur 默认域名）

- **前端**: `https://zuhaoku.zeabur.app`
- **后端**: `https://zuhaoku.fun`

使用这种配置时，确保：
- 前端 `VITE_API_BASE_URL` 指向后端
- 后端 `FRONTEND_URL` 指向前端
- 支付宝回调 URL 使用后端域名

## 安全提示

1. **不要在生产环境使用默认密钥**
2. **定期轮换 JWT_SECRET 和加密密钥**
3. **使用 HTTPS 协议**
4. **不要在代码仓库中提交敏感信息**

