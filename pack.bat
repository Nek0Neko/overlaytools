@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

:: Apex Legends Overlay Tools - 打包脚本 (Windows)
:: Pack script for creating release distribution

echo ==========================================
echo   Apex Legends Overlay Tools 打包脚本
echo ==========================================

:: 配置
set RELEASE_DIR=release
set RELEASE_NAME=overlaytools

:: 清理旧的发布目录
echo.
echo [1/4] 清理旧文件...
if exist "%RELEASE_DIR%" rmdir /s /q "%RELEASE_DIR%"
mkdir "%RELEASE_DIR%\%RELEASE_NAME%\htdocs"

:: 构建 Vue 管理面板
echo.
echo [2/4] 构建 Vue 管理面板...
if exist "htdocs\admin" (
    cd htdocs\admin
    if not exist "node_modules" (
        echo   - 安装依赖...
        call npm install --silent
    )
    echo   - 执行构建...
    call npm run build
    cd ..\..
    echo   - 构建完成
) else (
    echo   - 跳过（htdocs\admin 目录不存在）
)

:: 复制文件
echo.
echo [3/4] 复制文件...

:: 复制主程序
if exist "Release\apexliveapi_proxy.exe" (
    copy "Release\apexliveapi_proxy.exe" "%RELEASE_DIR%\%RELEASE_NAME%\" >nul
    echo   - apexliveapi_proxy.exe
) else if exist "x64\Release\apexliveapi_proxy.exe" (
    copy "x64\Release\apexliveapi_proxy.exe" "%RELEASE_DIR%\%RELEASE_NAME%\" >nul
    echo   - apexliveapi_proxy.exe ^(x64^)
) else (
    echo   - [警告] apexliveapi_proxy.exe 未找到，请先编译 C++ 项目
)

:: 复制 htdocs 文件
echo   - htdocs 文件...
copy htdocs\*.html "%RELEASE_DIR%\%RELEASE_NAME%\htdocs\" >nul 2>&1
copy htdocs\*.js "%RELEASE_DIR%\%RELEASE_NAME%\htdocs\" >nul 2>&1
copy htdocs\*.css "%RELEASE_DIR%\%RELEASE_NAME%\htdocs\" >nul 2>&1
copy htdocs\*.json "%RELEASE_DIR%\%RELEASE_NAME%\htdocs\" >nul 2>&1

:: 复制目录
if exist "htdocs\dist" (
    xcopy /e /i /q "htdocs\dist" "%RELEASE_DIR%\%RELEASE_NAME%\htdocs\dist\" >nul
    echo     - dist\ ^(Vue 管理面板^)
)

if exist "htdocs\overlays" (
    xcopy /e /i /q "htdocs\overlays" "%RELEASE_DIR%\%RELEASE_NAME%\htdocs\overlays\" >nul
    echo     - overlays\
)

if exist "htdocs\custom-overlays" (
    xcopy /e /i /q "htdocs\custom-overlays" "%RELEASE_DIR%\%RELEASE_NAME%\htdocs\custom-overlays\" >nul
    echo     - custom-overlays\
)

if exist "htdocs\samples" (
    xcopy /e /i /q "htdocs\samples" "%RELEASE_DIR%\%RELEASE_NAME%\htdocs\samples\" >nul
    echo     - samples\
)

:: 复制文档
if exist "LICENSE" copy "LICENSE" "%RELEASE_DIR%\%RELEASE_NAME%\" >nul
if exist "README.md" copy "README.md" "%RELEASE_DIR%\%RELEASE_NAME%\" >nul
echo   - LICENSE, README.md

:: 创建压缩包
echo.
echo [4/4] 创建压缩包...
cd "%RELEASE_DIR%"

:: 尝试使用 PowerShell 压缩
powershell -Command "Compress-Archive -Path '%RELEASE_NAME%' -DestinationPath '%RELEASE_NAME%.zip' -Force" 2>nul
if exist "%RELEASE_NAME%.zip" (
    echo   - 已创建: %RELEASE_DIR%\%RELEASE_NAME%.zip
) else (
    echo   - [提示] 无法创建 zip 文件，请手动压缩 %RELEASE_DIR%\%RELEASE_NAME% 目录
)
cd ..

:: 完成
echo.
echo ==========================================
echo   打包完成！
echo   输出目录: %RELEASE_DIR%\%RELEASE_NAME%\
echo ==========================================
echo.

pause
