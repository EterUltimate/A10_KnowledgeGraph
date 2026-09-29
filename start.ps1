# ============================================================
# A10 课程知识图谱系统 · 一键启动脚本（Windows PowerShell 7+）
#
# 用法（在项目根目录或任意位置）：
#   .\start.ps1                # 一键开发模式：自检环境 → 装依赖 → 生成 .env → 启动 → 健康检查 → 打开浏览器
#   .\start.ps1 -Mode prod     # 一键生产模式：npm run build && npm run start
#   .\start.ps1 -Mode docker   # Docker 一键起（app + Neo4j，需已安装 Docker Desktop）
#   .\start.ps1 -SkipDeps      # 跳过依赖安装（node_modules 已就绪时更快）
#   .\start.ps1 -NoBrowser     # 不自动打开浏览器
#
# 零配置可跑：缺 .env 时自动从 .env.example 复制，无 LLM Key / 无 Neo4j
# 会降级为「离线演示模式 + JSON 存储」，全部功能仍可演示。
# 双击入口见同目录 start.bat；日常命令速查见 README「三、快速开始」。
# ============================================================
[CmdletBinding()]
param(
    [ValidateSet('dev', 'prod', 'docker')]
    [string]$Mode = 'dev',
    [int]$Port = 3000,
    [switch]$SkipDeps,
    [switch]$NoBrowser
)

$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path -Parent $PSCommandPath
if (-not (Test-Path (Join-Path $ProjectRoot 'package.json'))) {
    Write-Host "[×] 未在脚本同级目录找到 package.json，请将 start.ps1 / start.bat 保留在项目根目录运行。" -ForegroundColor Red
    Read-Host '按回车退出' | Out-Null
    exit 1
}
Set-Location $ProjectRoot

function Write-Step { param([string]$m) Write-Host "`n==> $m" -ForegroundColor Cyan }
function Write-Ok { param([string]$m) Write-Host "  [ok] $m" -ForegroundColor Green }
function Write-Info { param([string]$m) Write-Host "  ..   $m" -ForegroundColor DarkGray }
function Write-Warn2 { param([string]$m) Write-Host "  [!!] $m" -ForegroundColor Yellow }

function Test-Health {
    param([string]$Url)
    try {
        $res = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5
        if ($res.StatusCode -eq 200) {
            try { return ($res.Content | ConvertFrom-Json) } catch { return $true }
        }
        return $null
    } catch { return $null }
}

function Wait-Healthy {
    param([string]$Url, [int]$TimeoutSec = 120)
    $deadline = (Get-Date).AddSeconds($TimeoutSec)
    while ((Get-Date) -lt $deadline) {
        $h = Test-Health -Url $Url
        if ($h) { return $h }
        Start-Sleep -Seconds 2
    }
    return $null
}

function Open-Browser {
    param([string]$Url)
    if (-not $NoBrowser) {
        Write-Info "打开浏览器 $Url"
        Start-Process $Url | Out-Null
    }
}

function Show-HealthSummary {
    param($Health)
    if ($Health -is [object] -and $Health.checks) {
        $g = $Health.checks.graph
        $l = $Health.checks.llm
        $p = $Health.checks.parser
        Write-Ok "图存储   Neo4j $(if ($g.neo4j) { '已连接' } else { '未连接' })｜生效模式：$($g.mode)"
        Write-Ok "LLM     $(if ($l.configured) { "已配置（$($l.status)）" } else { '未配置 Key → 离线演示模式' })"
        Write-Ok "文档解析 $(if ($p.ok) { '正常' } else { "失败：$($p.error)" })"
    }
}

# ---------- 1. 环境自检 ----------
Write-Step "环境自检"

if ($PSVersionTable.PSVersion.Major -lt 7) {
    Write-Warn2 "当前 PowerShell $($PSVersionTable.PSVersion) 非 7+，脚本仍可运行，但建议升级到 PowerShell 7。"
}

$nodeCmd = Get-Command node.exe -ErrorAction SilentlyContinue
if (-not $nodeCmd) {
    Write-Host "[×] 未检测到 Node.js，请安装 Node.js ≥ 20.9.0（推荐 22/24 LTS）：https://nodejs.org/" -ForegroundColor Red
    Read-Host '按回车退出' | Out-Null
    exit 1
}
$nodeVer = (& node.exe -v).TrimStart('v')
$major = [int]($nodeVer.Split('.')[0])
if ($major -lt 20 -or ($major -eq 20 -and [int]$nodeVer.Split('.')[1] -lt 9)) {
    Write-Host "[×] Node.js v$nodeVer 不满足要求（需 ≥ 20.9.0），请升级后重试。" -ForegroundColor Red
    Read-Host '按回车退出' | Out-Null
    exit 1
}
Write-Ok "Node.js v$nodeVer"

# npm 在 Windows 下是 .cmd，直接用 npm.cmd 避免执行策略/别名问题
$npm = 'npm.cmd'
Write-Ok "npm $((& $npm -v).Trim())"

# ---------- 2. 依赖与配置 ----------
Push-Location $ProjectRoot

if ($Mode -ne 'docker') {
    Write-Step "安装依赖（node_modules）"
    $nmDir = Join-Path $ProjectRoot 'node_modules'
    function Invoke-NpmInstall {
        & $npm install
        if ($LASTEXITCODE -ne 0) { Write-Host '[×] npm install 失败' -ForegroundColor Red; Pop-Location; Read-Host '按回车退出' | Out-Null; exit 1 }
        # 安装成功后把 node_modules 时间戳推进到当前，避免 lock 文件 mtime 较新导致每次启动重复安装
        if (Test-Path $nmDir) { (Get-Item $nmDir).LastWriteTime = Get-Date }
    }
    if ($SkipDeps -and (Test-Path $nmDir)) {
        Write-Info '-SkipDeps 且 node_modules 已存在，跳过安装'
    }
    elseif (-not (Test-Path $nmDir)) {
        Write-Info '首次安装依赖，可能需要几分钟…'
        Invoke-NpmInstall
        Write-Ok '依赖安装完成'
    }
    else {
        # lock 文件比 node_modules 新才重装，避免每次启动都跑 npm install
        if ((Get-Item (Join-Path $ProjectRoot 'package-lock.json')).LastWriteTime -gt (Get-Item $nmDir).LastWriteTime) {
            Write-Info 'package-lock.json 有更新，执行 npm install…'
            Invoke-NpmInstall
        }
        Write-Ok '依赖已是最新'
    }

    Write-Step '环境变量文件（.env）'
    $envFile = Join-Path $ProjectRoot '.env'
    if (-not (Test-Path $envFile)) {
        Copy-Item (Join-Path $ProjectRoot '.env.example') $envFile
        Write-Ok '.env 不存在，已从 .env.example 生成（默认零配置 = 离线演示模式 + JSON 存储）'
        Write-Warn2 '如需在线模式：编辑 .env 填入 LLM_API_KEY；如需 Neo4j：填 NEO4J_PASSWORD 并设置 GRAPH_STORE=neo4j'
    }
    else { Write-Ok '.env 已存在' }
}

$baseUrl = "http://localhost:$Port"
$healthUrl = "$baseUrl/api/health"

# ---------- 3. 已在运行则直接复用 ----------
Write-Step "检查服务状态（$baseUrl）"
$existing = Test-Health -Url $healthUrl
if ($existing) {
    Write-Ok "服务已在运行，直接复用（Ctrl+C 对应窗口可停止）"
    Show-HealthSummary -Health $existing
    Open-Browser -Url $baseUrl
    Pop-Location
    exit 0
}
Write-Info "端口 $Port 上没有运行中的服务，准备启动"

# ---------- 4. 按模式启动 ----------
switch ($Mode) {
    'docker' {
        Write-Step 'Docker 模式启动（app + Neo4j）'
        if (-not (Get-Command docker.exe -ErrorAction SilentlyContinue)) {
            Write-Host '[×] 未检测到 Docker，请安装 Docker Desktop 后重试，或改用 -Mode dev。' -ForegroundColor Red
            Pop-Location; Read-Host '按回车退出' | Out-Null; exit 1
        }
        if (-not (Test-Path (Join-Path $ProjectRoot '.env'))) {
            Copy-Item (Join-Path $ProjectRoot '.env.example') (Join-Path $ProjectRoot '.env')
            Write-Ok '已从 .env.example 生成 .env'
        }
        docker compose up -d --build
        if ($LASTEXITCODE -ne 0) { Write-Host '[×] docker compose 启动失败' -ForegroundColor Red; Pop-Location; Read-Host '按回车退出' | Out-Null; exit 1 }
        $health = Wait-Healthy -Url $healthUrl -TimeoutSec 300
        if (-not $health) {
            Write-Warn2 '等待 300s 服务仍未就绪，请查看日志：docker compose logs -f app'
            Pop-Location; Read-Host '按回车退出' | Out-Null; exit 1
        }
        Write-Ok '容器服务已就绪'
        Show-HealthSummary -Health $health
        Open-Browser -Url $baseUrl
        Write-Info 'Neo4j Browser: http://localhost:7474（bolt://localhost:7687）'
        Write-Info '停止：docker compose down（清空数据：docker compose down -v）'
        Pop-Location
        exit 0
    }

    'prod' {
        Write-Step '生产构建（npm run build）'
        & $npm run build
        if ($LASTEXITCODE -ne 0) { Write-Host '[×] 构建失败' -ForegroundColor Red; Pop-Location; Read-Host '按回车退出' | Out-Null; exit 1 }
        Write-Ok '构建完成'
        Write-Step '启动生产服务（npm run start，Ctrl+C 停止）'
        $job = Start-Process -FilePath $npm -ArgumentList 'run', 'start' -WorkingDirectory $ProjectRoot -PassThru
        $health = Wait-Healthy -Url $healthUrl -TimeoutSec 120
        if ($health) { Show-HealthSummary -Health $health }
        else { Write-Warn2 '等待 120s 健康检查未通过，请查看上方输出' }
        Open-Browser -Url $baseUrl
        $job.WaitForExit()
        Pop-Location
        exit $job.ExitCode
    }

    default {
        Write-Step '启动开发服务器（npm run dev，Ctrl+C 停止）'
        $job = Start-Process -FilePath $npm -ArgumentList 'run', 'dev' -WorkingDirectory $ProjectRoot -PassThru
        $health = Wait-Healthy -Url $healthUrl -TimeoutSec 120
        if ($health) {
            Write-Ok "服务已就绪：$baseUrl"
            Show-HealthSummary -Health $health
            Write-Info '演示账号：教师 teacher / teach123456｜学生 student / study123456'
            Open-Browser -Url $baseUrl
        }
        else {
            Write-Warn2 '等待 120s 服务仍未就绪，请查看上方 next dev 输出定位原因'
        }
        $job.WaitForExit()
        Pop-Location
        exit $job.ExitCode
    }
}
