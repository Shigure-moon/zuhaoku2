# 本地开发环境设置指南

## 快速开始

### 1. 后端设置

#### 1.1 安装依赖

```bash
cd backend-node
npm install
```

#### 1.2 配置环境变量

```bash
# 复制环境变量模板
cp env.local.example .env

# 编辑 .env 文件，填写实际的配置值
# 特别是数据库密码和支付宝配置（如果需要测试支付）
```

#### 1.3 启动后端服务

```bash
# 开发模式（自动重启）
npm run dev

# 或者生产模式
npm start
```

后端将在 `http://localhost:8080` 启动。

#### 1.4 验证后端

打开浏览器访问：http://localhost:8080/health

应该看到健康检查响应。

### 2. 前端设置

#### 2.1 安装依赖（如果还没安装）

```bash
cd frontend
npm install
```

#### 2.2 配置环境变量

创建或编辑 `frontend/.env.development`：

```bash
# 指向本地后端
VITE_API_BASE_URL=http://localhost:8080/api/v1

# 应用标题
VITE_APP_TITLE=租号酷
```

#### 2.3 启动前端服务

```bash
npm run dev
```

前端将在 `http://localhost:3000` 启动。

### 3. 测试

1. 打开浏览器访问：http://localhost:3000
2. 使用测试账号登录（参考 `TEST_ACCOUNTS.md`）
3. 测试各个功能模块

## 环境变量配置

### 后端环境变量（`.env`）

必需配置：
- `MYSQL_HOST` - 数据库主机
- `MYSQL_PORT` - 数据库端口
- `MYSQL_DATABASE` - 数据库名称
- `MYSQL_USER` - 数据库用户名
- `MYSQL_PASSWORD` - 数据库密码
- `JWT_SECRET` - JWT 密钥

可选配置：
- `ALIPAY_*` - 支付宝配置（如果不需要测试支付功能，可以暂时不配置）

### 前端环境变量（`.env.development`）

- `VITE_API_BASE_URL` - 后端 API 地址（本地：`http://localhost:8080/api/v1`）

## 开发命令

### 后端

```bash
cd backend-node

# 安装依赖
npm install

# 开发模式（自动重启）
npm run dev

# 生产模式
npm start

# 查看日志
# 日志会直接输出到控制台
```

### 前端

```bash
cd frontend

# 安装依赖
npm install

# 开发模式
npm run dev

# 构建生产版本
npm run build

# 预览生产构建
npm run preview
```

## 常见问题

### 1. 后端无法连接数据库

**错误**：`Error: connect ECONNREFUSED`

**解决方案**：
- 检查 `.env` 文件中的数据库配置
- 确认数据库服务可访问
- 检查网络连接

### 2. 前端无法访问后端 API

**错误**：CORS 错误或网络错误

**解决方案**：
1. 确认后端服务正在运行（访问 http://localhost:8080/health）
2. 检查 `VITE_API_BASE_URL` 是否正确
3. 确认后端 CORS 配置允许 `http://localhost:3000`

### 3. 端口被占用

**错误**：`Error: listen EADDRINUSE`

**解决方案**：
```bash
# 查找占用端口的进程
lsof -i :8080  # 后端
lsof -i :3000  # 前端

# 或者使用其他端口
PORT=8081 npm run dev  # 后端
# 前端：修改 vite.config.ts 中的 port
```

### 4. 模块未找到

**错误**：`Cannot find module 'xxx'`

**解决方案**：
```bash
# 重新安装依赖
rm -rf node_modules package-lock.json
npm install
```

## 调试技巧

### 后端调试

1. **查看日志**：所有日志都会输出到控制台
2. **使用 Node.js 调试器**：
   ```bash
   node --inspect server.js
   # 然后在 Chrome 中打开 chrome://inspect
   ```
3. **测试 API**：使用 curl 或 Postman

### 前端调试

1. **浏览器开发者工具**：查看网络请求和错误
2. **Vue DevTools**：安装 Vue DevTools 浏览器扩展
3. **控制台日志**：查看 API 请求和响应

## 测试账号

参考 `TEST_ACCOUNTS.md` 获取测试账号信息。

## 项目结构

```
zuhaoku/
├── backend-node/          # Node.js 后端
│   ├── api/              # API 路由和中间件
│   ├── server.js         # 服务器入口
│   ├── package.json      # 依赖配置
│   ├── .env              # 环境变量（不提交到 Git）
│   └── env.local.example # 环境变量模板
├── frontend/             # Vue.js 前端
│   ├── src/              # 源代码
│   ├── .env.development  # 开发环境变量
│   └── vite.config.ts    # Vite 配置
└── ...
```

## 下一步

1. ✅ 安装依赖
2. ✅ 配置环境变量
3. ✅ 启动后端服务
4. ✅ 启动前端服务
5. ✅ 测试功能

## 注意事项

1. **`.env` 文件不会提交到 Git**（已在 `.gitignore` 中）
2. **修改环境变量后需要重启服务**
3. **本地开发时，确保数据库可访问**
4. **支付宝回调需要公网地址，本地开发可以使用 ngrok 等工具**

