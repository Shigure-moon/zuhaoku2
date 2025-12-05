#!/bin/bash

# 清空 GitHub 仓库并上传必要文件的完整脚本

set -e

GITHUB_REPO="https://github.com/Shigure-moon/zuhaoku2.git"
BRANCH="main"

echo "🚀 开始清空 GitHub 仓库并上传必要文件..."
echo ""

# 1. 执行清理脚本
echo "📋 步骤 1: 执行清理脚本..."
./prepare-github-upload.sh

# 2. 检查 Git 仓库
echo ""
echo "📋 步骤 2: 检查 Git 仓库..."
if [ ! -d ".git" ]; then
    echo "初始化 Git 仓库..."
    git init
fi

# 3. 检查远程仓库
echo ""
echo "📋 步骤 3: 配置远程仓库..."
if git remote | grep -q "origin"; then
    echo "更新远程仓库地址..."
    git remote set-url origin "$GITHUB_REPO"
else
    echo "添加远程仓库..."
    git remote add origin "$GITHUB_REPO"
fi

# 4. 创建新分支并清空历史
echo ""
echo "📋 步骤 4: 创建新分支（清空历史）..."
git checkout --orphan temp 2>/dev/null || git checkout -b temp

# 5. 添加所有文件
echo ""
echo "📋 步骤 5: 添加文件..."
git add .

# 6. 提交
echo ""
echo "📋 步骤 6: 提交更改..."
git commit -m "feat: 上传服务器必需文件

- Node.js 后端 (backend-node/)
- Vue 前端 (frontend/)
- 部署配置 (Dockerfile, docker-compose.yml, zeabur.yaml)
- 环境变量示例 (env.example)
- 部署文档 (ZEABUR_*.md, ENV_CONFIG.md)
- 图片资源 (frontend/public/)"

# 7. 删除旧分支并重命名
echo ""
echo "📋 步骤 7: 删除旧分支并重命名..."
git branch -D $BRANCH 2>/dev/null || true
git branch -m $BRANCH

# 8. 推送（需要用户手动输入 token）
echo ""
echo "📋 步骤 8: 准备推送到 GitHub..."
echo "⚠️  请使用以下命令手动推送（需要 GitHub token）："
echo ""
echo "git push -f origin $BRANCH"
echo ""
echo "或者使用 token 推送："
echo "git push -f https://你的token@github.com/Shigure-moon/zuhaoku2.git $BRANCH"
echo ""
echo "✅ 本地准备完成！"
echo ""
echo "📋 文件结构："
echo "  ✅ backend-node/ (Node.js 后端)"
echo "  ✅ frontend/ (Vue 前端，包含 public/ 图片资源)"
echo "  ✅ Dockerfile, docker-compose.yml, zeabur.yaml"
echo "  ✅ env.example, ENV_CONFIG.md"
echo "  ✅ README.md, ZEABUR_*.md"
echo "  ✅ .gitignore"
