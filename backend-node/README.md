# 租号酷后端服务（Node.js）

基于 Node.js + Express 的后端服务，完全参考 myblog 的架构实现。

## 技术栈

- **Node.js 18+**
- **Express 4.x**
- **MySQL2** (连接池)
- **Alipay SDK** (支付宝支付)
- **JWT** (身份认证)
- **bcryptjs** (密码加密)

## 快速开始

### 1. 安装依赖

```bash
cd backend-node
npm install
```

### 2. 配置环境变量

创建 `.env` 文件（参考 `env.example`）：

```env
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
ALIPAY_NOTIFY_URL=https://zuhaoku.fun/api/v1/payments/alipay/notify
ALIPAY_RETURN_URL=https://zuhaoku.fun/tenant/orders

# 业务 URL
BACKEND_URL=https://zuhaoku.fun
FRONTEND_URL=https://zuhaoku.fun

# 服务器配置
PORT=8080
NODE_ENV=production
```

### 3. 启动服务

```bash
npm start
```

开发模式（自动重启）：

```bash
npm run dev
```

## API 接口

### 认证相关

- `POST /api/v1/users/register` - 注册
- `POST /api/v1/users/login` - 登录
- `GET /api/v1/users/verify` - 验证 Token
- `GET /api/v1/users/me` - 获取当前用户信息
- `PUT /api/v1/users/me` - 更新用户信息
- `POST /api/v1/users/change-password` - 修改密码

### 账号相关

- `GET /api/v1/accounts` - 获取账号列表
- `GET /api/v1/accounts/:id` - 获取账号详情

### 订单相关

- `POST /api/v1/orders` - 创建订单
- `GET /api/v1/orders/my` - 获取我的订单
- `GET /api/v1/orders/:id` - 获取订单详情

### 支付相关

- `POST /api/v1/payments/alipay/create` - 创建支付宝支付
- `POST /api/v1/payments/alipay/notify` - 支付宝异步通知
- `GET /api/v1/payments/alipay/return` - 支付宝同步返回

### 游戏相关

- `GET /api/v1/games` - 获取游戏列表

### 申诉相关

- `POST /api/v1/appeals` - 创建申诉
- `GET /api/v1/appeals/my` - 获取我的申诉

### 管理员相关

- `GET /api/v1/admin/users` - 获取用户列表
- `GET /api/v1/admin/orders` - 获取订单列表
- `GET /api/v1/admin/appeals` - 获取申诉列表

## 支付宝支付

完全参考 myblog 的实现：

- 支持 PKCS#1 和 PKCS#8 格式私钥
- 优先使用 `ALIPAY_PRIVATE_KEY_PKCS1`
- 自动格式化密钥（处理换行符）
- 每次调用都重新创建 SDK 实例，确保私钥不被污染

## Docker 部署

```bash
docker build -t zuhaoku-backend .
docker run -p 8080:8080 --env-file .env zuhaoku-backend
```

## 健康检查

```bash
curl http://localhost:8080/health
```

## 注意事项

1. **私钥格式**：推荐使用 PKCS#1 格式（`BEGIN RSA PRIVATE KEY`）
2. **环境变量**：所有敏感配置都通过环境变量管理
3. **数据库连接**：使用连接池，自动管理连接
4. **错误处理**：统一的错误响应格式

