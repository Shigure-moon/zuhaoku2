# 本地前端开发指南

## 快速启动

### 1. 安装依赖（如果还没安装）

```bash
cd frontend
npm install
```

### 2. 配置环境变量

已创建 `.env.development` 文件，配置如下：

```bash
# API 基础 URL（指向云端后端）
VITE_API_BASE_URL=https://zuhaoku.fun/api/v1

# 应用标题
VITE_APP_TITLE=租号酷
```

如果需要修改后端地址，编辑 `.env.development` 文件。

### 3. 启动开发服务器

```bash
npm run dev
```

### 4. 访问应用

打开浏览器访问：http://localhost:3000

## 环境变量说明

### 开发环境（`.env.development`）

- `VITE_API_BASE_URL`: 后端 API 地址
  - 使用云端后端：`https://zuhaoku.fun/api/v1`
  - 使用本地后端：`http://localhost:8080/api/v1`

- `VITE_APP_TITLE`: 应用标题

### 切换后端

#### 使用云端后端（当前配置）

```bash
# .env.development
VITE_API_BASE_URL=https://zuhaoku.fun/api/v1
```

#### 使用本地后端

1. 修改 `.env.development`：
   ```bash
   VITE_API_BASE_URL=http://localhost:8080/api/v1
   ```

2. 或者使用 Vite 代理（修改 `vite.config.ts`）：
   ```typescript
   server: {
     port: 3000,
     proxy: {
       '/api': {
         target: 'http://localhost:8080',
         changeOrigin: true,
       },
     },
   },
   ```
   然后设置：
   ```bash
   VITE_API_BASE_URL=/api/v1
   ```

## 常见问题

### 1. CORS 错误

如果使用云端后端，确保：
- 后端已配置允许 `http://localhost:3000` 访问
- 后端 CORS 配置包含 `*` 或包含 `http://localhost:3000`

### 2. 接口请求失败

检查：
1. 后端服务是否正常运行
2. `VITE_API_BASE_URL` 是否正确
3. 浏览器控制台的网络请求

### 3. 热更新不工作

1. 保存文件后等待几秒
2. 检查浏览器控制台是否有错误
3. 重启开发服务器

### 4. 端口被占用

修改 `vite.config.ts` 中的端口：

```typescript
server: {
  port: 3001, // 改为其他端口
}
```

## 开发命令

```bash
# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产构建
npm run preview

# 代码检查
npm run lint

# 代码格式化
npm run format
```

## 项目结构

```
frontend/
├── src/
│   ├── api/          # API 接口定义
│   ├── assets/       # 静态资源（图片、字体等）
│   ├── components/   # 可复用组件
│   ├── router/       # 路由配置
│   ├── stores/       # Pinia 状态管理
│   ├── types/        # TypeScript 类型定义
│   ├── utils/        # 工具函数
│   └── views/        # 页面组件
├── public/           # 公共静态资源
├── .env.development  # 开发环境变量（不提交到 Git）
└── vite.config.ts    # Vite 配置
```

## 注意事项

1. **`.env.development` 文件不会提交到 Git**（已在 `.gitignore` 中）
2. **修改环境变量后需要重启开发服务器**
3. **使用云端后端时，确保网络连接正常**
4. **本地开发时，后端 CORS 配置需要允许 `http://localhost:3000`**

