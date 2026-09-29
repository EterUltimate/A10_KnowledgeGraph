@echo off
rem ============================================================
rem A10 知识图谱系统 · 一键启动（双击入口）
rem 默认开发模式；如需其他模式，命令行示例：
rem   start.bat -Mode prod      生产构建并启动
rem   start.bat -Mode docker    Docker 一键起（app + Neo4j）
rem   start.bat -SkipDeps       跳过依赖安装
rem   start.bat -NoBrowser      不自动打开浏览器
rem ============================================================
setlocal
set PS_CMD=pwsh.exe
where %PS_CMD% >nul 2>nul
if errorlevel 1 set PS_CMD=powershell.exe
if exist "%~dp0start.ps1" (
  %PS_CMD% -NoProfile -ExecutionPolicy Bypass -File "%~dp0start.ps1" %*
) else (
  echo [X] 未找到 start.ps1，请在项目根目录运行本脚本。
)
if errorlevel 1 pause
endlocal
