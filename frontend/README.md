# 租号酷前端应用

## 本地开发

### 环境要求

- Node.js >= 18.0.0
- npm >= 9.0.0

### 安装依赖

```bash
npm install
```

### 启动开发服务器

#### 方式一：使用云端后端（推荐）

1. 创建 `.env.development` 文件（已提供）：
   ```bash
   VITE_API_BASE_URL=https://zuhaoku.fun/api/v1
   VITE_APP_TITLE=租号酷
   ```

2. 启动开发服务器：
   ```bash
   npm run dev
   ```

3. 访问：http://localhost:3000

#### 方式二：使用本地后端

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

3. 启动开发服务器：
   ```bash
   npm run dev
   ```

### 构建生产版本

```bash
npm run build
```

构建产物在 `dist/` 目录。

### 预览生产构建

```bash
npm run preview
```

## 环境变量

### 开发环境

创建 `.env.development` 文件：

```bash
# API 基础 URL
VITE_API_BASE_URL=https://zuhaoku.fun/api/v1

# 应用标题
VITE_APP_TITLE=租号酷
```

### 生产环境

在 Zeabur 等平台配置环境变量：

```bash
VITE_API_BASE_URL=https://zuhaoku.fun/api/v1
VITE_APP_TITLE=租号酷
```

## 项目结构

```
frontend/
├── src/
│   ├── api/          # API 接口
│   ├── assets/       # 静态资源
│   ├── components/   # 组件
│   ├── router/       # 路由配置
│   ├── stores/       # 状态管理
│   ├── types/        # TypeScript 类型
│   ├── utils/        # 工具函数
│   └── views/        # 页面组件
├── public/           # 公共资源
├── dist/             # 构建产物
├── Dockerfile        # Docker 构建文件
├── nginx.conf        # Nginx 配置
└── zeabur.yaml       # Zeabur 部署配置
```

## 技术栈

- **Vue 3** - 渐进式 JavaScript 框架
- **TypeScript** - 类型安全的 JavaScript
- **Vite** - 下一代前端构建工具
- **Vue Router** - 官方路由管理器
- **Pinia** - 状态管理
- **Element Plus** - Vue 3 组件库
- **Axios** - HTTP 客户端

## 常见问题

### CORS 错误

如果遇到 CORS 错误，确保：
1. 后端已配置允许前端域名访问
2. `VITE_API_BASE_URL` 配置正确
3. 后端 CORS 配置包含前端域名

### 接口请求失败

1. 检查 `VITE_API_BASE_URL` 是否正确
2. 检查后端服务是否正常运行
3. 查看浏览器控制台和网络请求

### 热更新不工作

1. 确保文件保存在正确的位置
2. 检查 Vite 配置
3. 重启开发服务器
