# GitHub 上传指南

## 📋 清理和上传步骤

### 1. 执行清理脚本
```bash
./prepare-github-upload.sh
```

### 2. 检查 .gitignore
确保以下文件/目录已被忽略：
- `.env*` (环境变量文件)
- `*.pem`, `*.key` (密钥文件)
- `node_modules/` (依赖)
- `dist/`, `target/` (编译输出)
- `*.log` (日志文件)
- `myblog/` (其他项目)

### 3. 初始化 Git 仓库（如果还没有）
```bash
git init
git remote add origin https://github.com/你的用户名/zuhaoku2.git
```

### 4. 清空远程仓库（如果已有内容）
```bash
# 创建一个空分支
git checkout --orphan temp
git add .
git commit -m "Initial commit"
git branch -D main  # 删除旧的 main 分支
git branch -m main  # 重命名当前分支为 main
git push -f origin main  # 强制推送，清空远程仓库
```

### 5. 正常上传（如果远程仓库已清空）
```bash
git add .
git commit -m "feat: 上传服务器必需文件"
git push -u origin main
```

## ✅ 服务器运行必需的文件

### 后端
- `backend-node/` (Node.js 后端代码)
  - `package.json`, `package-lock.json`
  - `server.js`
  - `api/` (所有路由和中间件)
  - `scripts/` (数据库脚本)
  - `Dockerfile`
  - `env.local.example`

### 前端
- `frontend/` (Vue 前端代码)
  - `package.json`, `package-lock.json`
  - `src/` (所有源代码)
  - `public/` (静态资源)
  - `Dockerfile`
  - `nginx.conf`
  - `zeabur.yaml`

### 部署配置
- `Dockerfile` (根目录)
- `docker-compose.yml`
- `zeabur.yaml`
- `.gitignore`

### 文档
- `README.md`
- `ENV_CONFIG.md`
- `ZEABUR_*.md` (部署文档)
- `env.example` (环境变量示例)

## ❌ 不应上传的文件

- `backend/` (Spring Boot 旧代码)
- `docs/` (开发文档)
- `alipay-keys/` (密钥文件)
- `*.env` (环境变量文件)
- `*.log` (日志文件)
- `node_modules/` (依赖)
- `dist/`, `target/` (编译输出)
- `myblog/` (其他项目)

