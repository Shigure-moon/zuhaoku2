# 本地开发指南

## 快速开始

### 1. 安装依赖

```bash
cd backend-node
npm install
```

### 2. 配置环境变量

复制 `.env.local` 为 `.env`：

```bash
cp .env.local .env
```

然后编辑 `.env` 文件，填写实际的配置值（特别是数据库密码和支付宝配置）。

### 3. 启动开发服务器

```bash
npm run dev
```

或者使用普通启动（不会自动重启）：

```bash
npm start
```

### 4. 验证服务

打开浏览器访问：http://localhost:8080/health

应该看到：
```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "service": "zuhaoku-backend",
    "message": "租号酷后端服务运行正常",
    "version": "1.0.0",
    "status": "UP",
    "timestamp": ...
  },
  "timestamp": ...
}
```

## 环境变量说明

### 必需配置

- `MYSQL_HOST` - 数据库主机
- `MYSQL_PORT` - 数据库端口
- `MYSQL_DATABASE` - 数据库名称
- `MYSQL_USER` - 数据库用户名
- `MYSQL_PASSWORD` - 数据库密码
- `JWT_SECRET` - JWT 密钥

### 可选配置

- `ALIPAY_*` - 支付宝配置（如果不需要测试支付功能，可以暂时不配置）
- `FRONTEND_URL` - 前端地址（用于 CORS 配置）

## 开发命令

```bash
# 启动开发服务器（自动重启）
npm run dev

# 启动生产服务器
npm start

# 初始化数据库（如果需要）
npm run init-db
```

## 测试 API

### 使用 curl

```bash
# 健康检查
curl http://localhost:8080/health

# 注册用户
curl -X POST http://localhost:8080/api/v1/users/register \
  -H "Content-Type: application/json" \
  -d '{"mobile":"13800000001","password":"123456","nickname":"测试用户"}'

# 登录
curl -X POST http://localhost:8080/api/v1/users/login \
  -H "Content-Type: application/json" \
  -d '{"mobile":"13800000001","password":"123456"}'
```

### 使用 Postman

1. 导入 API 集合（如果有）
2. 设置 Base URL: `http://localhost:8080`
3. 测试各个接口

## 常见问题

### 1. 数据库连接失败

**错误**：`Error: connect ECONNREFUSED`

**解决方案**：
- 检查数据库配置是否正确
- 确认数据库服务是否运行
- 检查网络连接

### 2. 端口被占用

**错误**：`Error: listen EADDRINUSE: address already in use :::8080`

**解决方案**：
```bash
# 查找占用端口的进程
lsof -i :8080

# 或者使用其他端口
PORT=8081 npm run dev
```

### 3. 模块未找到

**错误**：`Cannot find module 'xxx'`

**解决方案**：
```bash
# 重新安装依赖
rm -rf node_modules package-lock.json
npm install
```

### 4. 支付宝配置错误

如果不需要测试支付功能，可以暂时不配置支付宝相关环境变量。相关接口会返回错误，但不影响其他功能。

## 调试技巧

### 1. 查看日志

开发模式下，所有日志都会输出到控制台。

### 2. 使用 Node.js 调试器

```bash
# 启动调试模式
node --inspect server.js

# 然后在 Chrome 中打开 chrome://inspect
```

### 3. 查看数据库连接

在 `api/db.js` 中已配置连接池，会自动输出连接状态。

## 与前端联调

### 1. 启动前端

```bash
cd ../frontend
npm run dev
```

### 2. 配置前端环境变量

在 `frontend/.env.development` 中设置：

```bash
VITE_API_BASE_URL=http://localhost:8080/api/v1
```

### 3. 测试完整流程

1. 前端访问：http://localhost:3000
2. 注册/登录用户
3. 测试各个功能模块

## 项目结构

```
backend-node/
├── api/
│   ├── db.js              # 数据库连接
│   ├── middleware/        # 中间件
│   │   └── auth.js       # 认证中间件
│   └── routes/           # 路由
│       ├── auth.js       # 认证路由
│       ├── user.js       # 用户路由
│       ├── account.js    # 账号路由
│       ├── order.js      # 订单路由
│       ├── payment.js    # 支付路由
│       ├── appeal.js     # 申诉路由
│       ├── game.js       # 游戏路由
│       └── admin.js      # 管理员路由
├── server.js             # 服务器入口
├── package.json          # 依赖配置
├── .env                  # 环境变量（不提交到 Git）
└── .env.local            # 环境变量模板
```

## 注意事项

1. **`.env` 文件不会提交到 Git**（已在 `.gitignore` 中）
2. **修改环境变量后需要重启服务器**
3. **本地开发时，确保数据库可访问**
4. **支付宝回调需要公网地址，本地开发可以使用 ngrok 等工具**

