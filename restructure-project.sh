#!/bin/bash

echo "📁 重构项目结构，参考 myblog..."

# 1. 将 backend-node/api 移到根目录 api
if [ -d "backend-node/api" ]; then
    echo "移动 backend-node/api -> api"
    mv backend-node/api .
fi

# 2. 将 backend-node/server.js 移到根目录
if [ -f "backend-node/server.js" ]; then
    echo "移动 backend-node/server.js -> server.js"
    mv backend-node/server.js .
fi

# 3. 将 backend-node/scripts 移到根目录
if [ -d "backend-node/scripts" ]; then
    echo "移动 backend-node/scripts -> scripts"
    mv backend-node/scripts .
fi

# 4. 合并 package.json（后端和前端）
echo "合并 package.json..."

# 5. 将 frontend/src 移到根目录 src
if [ -d "frontend/src" ]; then
    echo "移动 frontend/src -> src"
    mv frontend/src .
fi

# 6. 将 frontend/public 移到根目录 public
if [ -d "frontend/public" ]; then
    echo "移动 frontend/public -> public"
    mv frontend/public .
fi

# 7. 复制前端配置文件到根目录
if [ -f "frontend/vite.config.ts" ]; then
    echo "复制 frontend/vite.config.ts -> vite.config.ts"
    cp frontend/vite.config.ts .
fi

if [ -f "frontend/tsconfig.json" ]; then
    echo "复制 frontend/tsconfig.json -> tsconfig.json"
    cp frontend/tsconfig.json .
fi

if [ -f "frontend/index.html" ]; then
    echo "复制 frontend/index.html -> index.html"
    cp frontend/index.html .
fi

# 8. 删除旧的目录
echo "清理旧目录..."
rm -rf backend-node/
rm -rf frontend/

echo "✅ 项目重构完成！"
