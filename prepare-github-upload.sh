#!/bin/bash

# 准备上传到 GitHub 的脚本
# 只保留服务器运行必需的文件

echo "🧹 开始清理项目，准备上传到 GitHub..."

# 1. 删除 Spring Boot 旧代码（已迁移到 Node.js）
if [ -d "backend" ]; then
    echo "删除 backend/ (Spring Boot 旧代码)..."
    rm -rf backend/
fi

# 2. 删除开发文档（服务器运行不需要）
if [ -d "docs" ]; then
    echo "删除 docs/ (开发文档)..."
    rm -rf docs/
fi

# 3. 删除支付宝密钥目录（敏感信息，不应上传）
if [ -d "alipay-keys" ]; then
    echo "删除 alipay-keys/ (密钥文件)..."
    rm -rf alipay-keys/
fi

# 4. 删除日志文件
if [ -f "log" ]; then
    echo "删除 log (日志文件)..."
    rm -f log
fi

# 5. 删除临时检查清单文件
if [ -f ".github-upload-checklist.md" ]; then
    echo "删除 .github-upload-checklist.md..."
    rm -f .github-upload-checklist.md
fi

# 6. 复制数据库初始化脚本（如果存在）
if [ -f "backend/scripts/init.sql" ]; then
    echo "复制数据库初始化脚本到 backend-node/scripts/db/..."
    mkdir -p backend-node/scripts/db
    cp backend/scripts/init.sql backend-node/scripts/db/init.sql 2>/dev/null || true
    cp backend/scripts/add-risk-control-tables.sql backend-node/scripts/db/add-risk-control-tables.sql 2>/dev/null || true
fi

# 7. 确保 public 文件夹在前端项目中（图片资源）
if [ -d "public" ] && [ ! -d "frontend/public" ]; then
    echo "复制 public 文件夹到 frontend/public/..."
    mkdir -p frontend/public
    cp -r public/* frontend/public/ 2>/dev/null || true
fi

# 8. 删除根目录的 public 文件夹（已复制到 frontend）
if [ -d "public" ]; then
    echo "删除根目录的 public/ (已复制到 frontend/public/)..."
    rm -rf public/
fi

# 9. 删除其他不必要的文档（保留必要的部署文档）
echo "保留必要的部署文档..."

echo ""
echo "✅ 清理完成！"
echo ""
echo "📋 保留的文件结构："
echo "  - backend-node/ (Node.js 后端)"
echo "  - frontend/ (Vue 前端)"
echo "  - Dockerfile, docker-compose.yml, zeabur.yaml"
echo "  - env.example, ENV_CONFIG.md"
echo "  - README.md, ZEABUR_*.md"
echo "  - .gitignore"
echo ""
echo "⚠️  请检查 .gitignore 确保敏感文件不会被上传"
echo "⚠️  确认后执行: git add . && git commit -m '清理项目，只保留服务器必需文件' && git push"
