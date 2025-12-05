#!/bin/bash

echo "📁 重新组织项目结构..."

# 创建新的项目根目录
PROJECT_ROOT="zuhaoku-app"

# 如果已存在，先删除
if [ -d "$PROJECT_ROOT" ]; then
    echo "删除旧的 $PROJECT_ROOT 目录..."
    rm -rf "$PROJECT_ROOT"
fi

# 创建新目录
mkdir -p "$PROJECT_ROOT"

# 复制需要的文件
echo "复制文件到新目录..."
cp -r backend-node "$PROJECT_ROOT/"
cp -r frontend "$PROJECT_ROOT/"
cp Dockerfile "$PROJECT_ROOT/"
cp docker-compose.yml "$PROJECT_ROOT/"
cp zeabur.yaml "$PROJECT_ROOT/"
cp env.example "$PROJECT_ROOT/"
cp README.md "$PROJECT_ROOT/"
cp .gitignore "$PROJECT_ROOT/"

# 删除 Java 相关文件
echo "删除 Java 实现..."
rm -rf backend/
rm -rf "$PROJECT_ROOT/backend-node/node_modules"
rm -rf "$PROJECT_ROOT/frontend/node_modules"
rm -rf "$PROJECT_ROOT/frontend/dist"

echo "✅ 项目重组完成！"
echo "新项目目录: $PROJECT_ROOT"
