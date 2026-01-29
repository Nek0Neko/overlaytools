#!/bin/bash
# Apex Legends Overlay Tools - 打包脚本
# Pack script for creating release distribution

set -e

# 配置
VERSION=$(cat htdocs/version.json 2>/dev/null | grep -o '"version"[[:space:]]*:[[:space:]]*"[^"]*"' | cut -d'"' -f4 || echo "1.0.0")
RELEASE_DIR="release"
RELEASE_NAME="overlaytools-${VERSION}"

echo "=========================================="
echo "  Apex Legends Overlay Tools 打包脚本"
echo "  版本: ${VERSION}"
echo "=========================================="

# 清理旧的发布目录
echo ""
echo "[1/4] 清理旧文件..."
rm -rf "${RELEASE_DIR}"
mkdir -p "${RELEASE_DIR}/${RELEASE_NAME}/htdocs"

# 构建 Vue 管理面板
echo ""
echo "[2/4] 构建 Vue 管理面板..."
if [ -d "htdocs/admin" ]; then
    cd htdocs/admin
    if [ ! -d "node_modules" ]; then
        echo "  - 安装依赖..."
        npm install --silent
    fi
    echo "  - 执行构建..."
    npm run build --silent
    cd ../..
    echo "  - 构建完成"
else
    echo "  - 跳过（htdocs/admin 目录不存在）"
fi

# 复制文件
echo ""
echo "[3/4] 复制文件..."

# 复制主程序（如果存在）
if [ -f "Release/apexliveapi_proxy.exe" ]; then
    cp "Release/apexliveapi_proxy.exe" "${RELEASE_DIR}/${RELEASE_NAME}/"
    echo "  - apexliveapi_proxy.exe"
elif [ -f "x64/Release/apexliveapi_proxy.exe" ]; then
    cp "x64/Release/apexliveapi_proxy.exe" "${RELEASE_DIR}/${RELEASE_NAME}/"
    echo "  - apexliveapi_proxy.exe (x64)"
else
    echo "  - [警告] apexliveapi_proxy.exe 未找到，请先编译 C++ 项目"
fi

# 复制 htdocs 文件
echo "  - htdocs 文件..."

# 复制根目录文件
cp htdocs/*.html "${RELEASE_DIR}/${RELEASE_NAME}/htdocs/" 2>/dev/null || true
cp htdocs/*.js "${RELEASE_DIR}/${RELEASE_NAME}/htdocs/" 2>/dev/null || true
cp htdocs/*.css "${RELEASE_DIR}/${RELEASE_NAME}/htdocs/" 2>/dev/null || true
cp htdocs/*.json "${RELEASE_DIR}/${RELEASE_NAME}/htdocs/" 2>/dev/null || true

# 复制目录
if [ -d "htdocs/dist" ]; then
    cp -r htdocs/dist "${RELEASE_DIR}/${RELEASE_NAME}/htdocs/"
    echo "    - dist/ (Vue 管理面板)"
fi

if [ -d "htdocs/overlays" ]; then
    cp -r htdocs/overlays "${RELEASE_DIR}/${RELEASE_NAME}/htdocs/"
    echo "    - overlays/"
fi

if [ -d "htdocs/custom-overlays" ]; then
    cp -r htdocs/custom-overlays "${RELEASE_DIR}/${RELEASE_NAME}/htdocs/"
    echo "    - custom-overlays/"
fi

if [ -d "htdocs/samples" ]; then
    cp -r htdocs/samples "${RELEASE_DIR}/${RELEASE_NAME}/htdocs/"
    echo "    - samples/"
fi

# 复制文档
cp LICENSE "${RELEASE_DIR}/${RELEASE_NAME}/" 2>/dev/null || true
cp README.md "${RELEASE_DIR}/${RELEASE_NAME}/" 2>/dev/null || true
echo "  - LICENSE, README.md"

# 创建压缩包
echo ""
echo "[4/4] 创建压缩包..."
cd "${RELEASE_DIR}"
if command -v zip &> /dev/null; then
    zip -r "${RELEASE_NAME}.zip" "${RELEASE_NAME}" -q
    echo "  - 已创建: ${RELEASE_DIR}/${RELEASE_NAME}.zip"
else
    tar -czf "${RELEASE_NAME}.tar.gz" "${RELEASE_NAME}"
    echo "  - 已创建: ${RELEASE_DIR}/${RELEASE_NAME}.tar.gz"
fi
cd ..

# 完成
echo ""
echo "=========================================="
echo "  打包完成！"
echo "  输出目录: ${RELEASE_DIR}/${RELEASE_NAME}/"
echo "=========================================="

# 显示文件列表
echo ""
echo "文件列表:"
find "${RELEASE_DIR}/${RELEASE_NAME}" -type f | head -30
FILE_COUNT=$(find "${RELEASE_DIR}/${RELEASE_NAME}" -type f | wc -l)
if [ "$FILE_COUNT" -gt 30 ]; then
    echo "  ... 共 ${FILE_COUNT} 个文件"
fi
