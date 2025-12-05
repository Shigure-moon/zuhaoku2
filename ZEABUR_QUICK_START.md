# Zeabur 快速部署指南

## 前置条件

1. 已注册 Zeabur 账号
2. 已将代码推送到 GitHub
3. 已准备好域名 `zuhaoku.fun`（可选，Zeabur 会提供默认域名）

## 5 分钟快速部署

### 步骤 1：部署后端（2 分钟）

1. 登录 Zeabur → 创建新项目
2. 点击 "New Service" → 选择 GitHub 仓库 `zuhaoku`
3. 确认根目录为项目根目录（自动检测 `Dockerfile`）
4. 在 "Environment Variables" 中添加所有必需的环境变量（参考 `ENV_CONFIG.md`）
5. 等待部署完成

### 步骤 2：部署前端（2 分钟）

1. 在同一项目中，再次点击 "New Service"
2. 选择 GitHub 仓库 `zuhaoku`
3. **重要**：在 "Root Directory" 中选择 `frontend`
4. 在 "Environment Variables" 中设置：
   ```bash
   VITE_API_BASE_URL=https://your-backend-url.zeabur.app/api/v1
   ```
5. 等待部署完成

### 步骤 3：配置域名（1 分钟）

1. **后端域名**（可选）：
   - 在后端服务中点击 "Domains"
   - 添加 `api.zuhaoku.fun`
   
2. **前端域名**：
   - 在前端服务中点击 "Domains"
   - 添加 `zuhaoku.fun`

3. 更新前端环境变量：
   ```bash
   VITE_API_BASE_URL=https://api.zuhaoku.fun/api/v1
   ```

## 必需的环境变量

### 后端（最小配置）

```bash
# 数据库
MYSQL_HOST=mysql2.sqlpub.com
MYSQL_PORT=3307
MYSQL_USER=shigure2
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=zuhaoku

# JWT
JWT_SECRET=your_jwt_secret

# 支付宝（如果使用支付功能）
ALIPAY_APP_ID=your_app_id
ALIPAY_PRIVATE_KEY_PKCS1=your_private_key
ALIPAY_PUBLIC_KEY=your_public_key
ALIPAY_NOTIFY_URL=https://api.zuhaoku.fun/api/v1/payments/alipay/notify
ALIPAY_RETURN_URL=https://zuhaoku.fun/tenant/orders

# URL
BACKEND_URL=https://api.zuhaoku.fun
FRONTEND_URL=https://zuhaoku.fun
```

### 前端（最小配置）

```bash
VITE_API_BASE_URL=https://api.zuhaoku.fun/api/v1
```

## 验证部署

1. 访问 `https://zuhaoku.fun` → 应该看到登录页面
2. 使用测试账号登录（参考 `TEST_ACCOUNTS.md`）
3. 检查功能是否正常

## 常见问题

**Q: 前端无法访问后端 API？**  
A: 检查 `VITE_API_BASE_URL` 是否正确，以及后端 CORS 配置。

**Q: 后端服务启动失败？**  
A: 检查数据库连接和环境变量是否完整。

**Q: 域名无法访问？**  
A: 等待几分钟让 SSL 证书生效，检查 DNS 配置。

## 详细文档

- 完整部署指南：`ZEABUR_DEPLOYMENT.md`
- 环境变量说明：`ENV_CONFIG.md`
- 故障排查：`ZEABUR_TROUBLESHOOTING.md`

