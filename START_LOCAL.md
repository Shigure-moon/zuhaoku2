# 本地开发快速启动

## 一键启动命令

### 方式 1：分别启动（推荐）

**终端 1 - 启动后端：**
```bash
cd backend-node
npm run dev
```

**终端 2 - 启动前端：**
```bash
cd frontend
npm run dev
```

### 方式 2：使用脚本（需要安装 concurrently）

```bash
# 安装 concurrently（如果还没安装）
npm install -g concurrently

# 在项目根目录运行
concurrently "cd backend-node && npm run dev" "cd frontend && npm run dev"
```

## 验证服务

### 后端健康检查
```bash
curl http://localhost:8080/health
```

### 前端访问
打开浏览器：http://localhost:3000

## 环境变量检查

### 后端（backend-node/.env）
- ✅ 数据库配置已设置（使用云数据库）
- ⚠️ 支付宝配置（可选，如果需要测试支付功能）

### 前端（frontend/.env.development）
- ✅ API 地址：`VITE_API_BASE_URL=http://localhost:8080/api/v1`

## 常见问题

### 端口被占用
```bash
# 后端使用其他端口
cd backend-node
PORT=8081 npm run dev

# 前端使用其他端口（修改 vite.config.ts）
```

### 数据库连接失败
检查 `backend-node/.env` 中的数据库配置是否正确。

### 前端无法访问后端
1. 确认后端正在运行
2. 检查 `VITE_API_BASE_URL` 是否正确
3. 检查浏览器控制台的错误信息

## 详细文档

- 完整设置指南：`LOCAL_DEV_SETUP.md`
- 后端开发指南：`backend-node/LOCAL_DEV.md`
- 前端开发指南：`frontend/LOCAL_DEV.md`

