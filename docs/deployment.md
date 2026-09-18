# 部署与运维指南（Deployment & Operations）

> 覆盖 D-3 环境与密钥管理 / D-5 安装 / 升级 / 备份 / 回滚 / 排障。
> 面向赛题「普通电脑即可运行」的硬性要求，主方案为 **Docker Compose 一键起**；
> 云端演示可选 **Vercel + Neo4j AuraDB**。

## 一、部署拓扑总览

| 方案 | 场景 | 依赖 | 持久化 |
| --- | --- | --- | --- |
| **A. Docker Compose**（推荐） | 评审现场 / 单机演示 / 内网部署 | 仅 Docker 24+ | 容器卷（`neo4j-data` / `app-data`） |
| B. 单容器 Docker | 已有外部 Neo4j / 云端已托管 DB | Docker + 外置 Neo4j | `app-data` 卷 |
| C. 裸 Node（`npm start`） | 开发者本机 / CI | Node ≥ 20.9 | `./data/store` 目录 |
| D. Vercel + Neo4j AuraDB | 公网可访问演示 URL | Vercel 账号 + AuraDB 免费实例 | AuraDB（云） |

四种方案共用同一份代码；仅环境变量不同。所有环境变量含义见 `README.md` 第五节；本文件聚焦部署动作。

## 二、方案 A：Docker Compose 一键起（推荐）

### 前置

- Docker Desktop（Windows/macOS）或 Docker Engine 24+（Linux）
- 至少 4GB 空闲内存（Neo4j 5.x 需要 ~1GB heap）

### 启动

```bash
git clone https://github.com/EterUltimate/A10_KnowledgeGraph.git
cd A10_KnowledgeGraph
# 可选：编辑 .env 填入真实 LLM Key 与强随机 AUTH_SECRET（不填则默认离线演示模式，仍可完整演示）
docker compose up -d --build
```

访问：

- 应用：http://localhost:3000
- Neo4j Browser：http://localhost:7474（bolt://localhost:7687，密码见 `.env` 中 `NEO4J_PASSWORD` 或使用默认 `a10devpassword`）
- 健康检查：http://localhost:3000/api/health

### 运行模式说明

- **默认（离线演示）**：`.env` 不填 `LLM_API_KEY` 即自动启用；抽取用内置《数据结构》37 知识点数据集；问答走教材抽取式。评审零配置可跑通。
- **在线模式**：`.env` 填入 `LLM_API_KEY`（DeepSeek/通义等 OpenAI 兼容 Key）→ `docker compose restart app` → 抽取与问答全部走真实 LLM，代码零改动。
- **Neo4j vs JSON**：默认 `GRAPH_STORE=auto`，容器内 Neo4j 可用即启用；如只想用 JSON 兜底，设 `GRAPH_STORE=json` 并 `docker compose stop neo4j`。

### 停止 / 清理

```bash
docker compose down        # 停止（保留数据卷）
docker compose down -v     # 停止并删除数据卷（重置全部课程/图谱/掌握状态/RAG 语料）
```

## 三、方案 B：单容器（外置 Neo4j）

```bash
docker build -t ghcr.io/eterultimate/a10_knowledgegraph:latest .
docker run -d -p 3000:3000 --name a10-app \
  -e GRAPH_STORE=neo4j \
  -e NEO4J_URI=bolt://host.docker.internal:7687 \
  -e NEO4J_USER=neo4j -e NEO4J_PASSWORD=<your-pw> \
  -e AUTH_SECRET=$(openssl rand -base64 32) \
  -e LLM_API_KEY=<optional-real-key> \
  -v a10-app-data:/data/store \
  ghcr.io/eterultimate/a10_knowledgegraph:latest
```

## 四、方案 C：裸 Node（开发 / CI）

```bash
git clone https://github.com/EterUltimate/A10_KnowledgeGraph.git
cd A10_KnowledgeGraph
npm ci
cp .env.example .env    # 按需编辑，可全不配（离线演示模式）
npm run build
npm run start           # 默认 3000 端口
# 可选健康自检
npm run check
```

## 五、方案 D：Vercel + Neo4j AuraDB（云端演示）

1. **准备 AuraDB**：注册 https://console.neo4j.io/ 免费实例，记录 URI / 用户名 / 密码。
2. **导入仓库到 Vercel**：New Project → Import Git Repository → 选 `EterUltimate/A10_KnowledgeGraph`。
3. **环境变量**（Project Settings → Environment Variables）：
   - `NEO4J_URI` / `NEO4J_USER` / `NEO4J_PASSWORD`（AuraDB 提供的 `neo4j+s://...` URI）
   - `GRAPH_STORE=neo4j`
   - `AUTH_SECRET`（用 `openssl rand -base64 32` 生成）
   - `DEMO_TEACHER_USER` / `DEMO_TEACHER_PASSWORD` / `DEMO_STUDENT_USER` / `DEMO_STUDENT_PASSWORD`
   - 可选 `LLM_API_KEY` / `LLM_BASE_URL` / `LLM_MODEL`
4. **构建命令**：默认 `npm run build`；Start Command `npm run start`；Node Version 22。
5. **注意**：Vercel Serverless 环境文件系统只读，`DATA_DIR` 无法持久化 → **必须走 Neo4j 模式**（图数据、课程注册表、掌握状态都在 AuraDB 中）。JSON 兜底仅适合单机/容器部署。

## 六、环境变量清单（三环境差异）

| 变量 | 默认（.env.example） | 开发（本机） | 演示（Docker Compose） | 生产（Vercel/AuraDB） |
| --- | --- | --- | --- | --- |
| `GRAPH_STORE` | `auto` | `json`（免依赖） | `auto`（compose 内有 Neo4j） | `neo4j`（强制，否则报错） |
| `NEO4J_URI` | `bolt://localhost:7687` | 留空 | 自动 `bolt://neo4j:7687`（compose 内网） | AuraDB `neo4j+s://...` |
| `NEO4J_PASSWORD` | 空 | 空 | `a10devpassword`（默认） | AuraDB 强密码 |
| `LLM_API_KEY` | 空 | 空（离线）| 演示可空、评测填真 Key | 必填（在线模式） |
| `AUTH_SECRET` | 空（自动生成，仅 dev） | 空 | 生产部署务必换 | 必填，`openssl rand -base64 32` |
| `DEMO_*_USER/PASSWORD` | 有默认 | 有默认 | 演示可留默认 | **生产必须换** |
| `MASTERY_STORE` | `auto`（JSON） | `auto` | `auto` | `auto`（Neo4j 未存掌握状态） |
| `RAG_TOP_K` / `RAG_CHUNK_SIZE` | 4 / 800 | 4 / 800 | 可保持 | 大课程可 `6 / 1200` |
| `MAX_FILE_SIZE` | 20MB | 20MB | 20MB | 与反代限制一致 |

密钥管理原则：
- 任何密钥 **不入库**（`.gitignore` 已排除 `.env`，CI 用 GitHub Secrets）
- 生产环境的 `AUTH_SECRET`、`NEO4J_PASSWORD`、`DEMO_*_PASSWORD` 必须替换为强随机值
- Dependabot + gitleaks 在 CI 中防止依赖漏洞与密钥泄漏

## 七、健康检查与监控

- **端点**：`GET /api/health`（无鉴权，只读）
  - `status: "ok"` → 三项自检通过（Neo4j / LLM / 解析器）
  - `status: "unhealthy"` → 解析器故障（硬性），返回 503
  - `checks.llm.status = "skipped（离线演示模式）"` → 未配 Key，属预期
- **容器 healthcheck**：`Dockerfile` 与 `docker-compose.yml` 均配置 30s 间隔
- **日志**：`docker compose logs -f app` 或 `docker logs a10-app`；结构化字段
- **可选接入**：UptimeRobot / Pingdom 监控 `/api/health` 端点

## 八、备份与还原

### 应用数据（JSON 存储 / 掌握状态 / RAG 语料）

```bash
# 备份（容器卷）
docker run --rm -v a10-app-data:/data -v $(pwd):/backup alpine tar czf /backup/app-data-$(date +%F).tar.gz -C /data .
# 还原
docker run --rm -v a10-app-data:/data -v $(pwd):/backup alpine tar xzf /backup/app-data-YYYY-MM-DD.tar.gz -C /data
```

裸 Node：`tar czf app-data.tar.gz data/store/` 与还原同理。

### Neo4j 数据

```bash
# 导出 dump
docker exec a10-neo4j neo4j-admin database dump neo4j --to-path=/tmp
docker cp a10-neo4j:/tmp/neo4j.dump ./neo4j-$(date +%F).dump
# 还原（需先停止 neo4j）
docker compose stop neo4j
docker cp ./neo4j-YYYY-MM-DD.dump a10-neo4j:/tmp/
docker run --rm -v neo4j-data:/data -v $(pwd):/backup neo4j:5-enterprise \
  neo4j-admin database load neo4j --from-path=/backup --overwrite-destination=true
docker compose up -d neo4j
```

推荐 cron 每日凌晨全量 dump + 每周保留一份长期归档。

## 九、升级与回滚

**升级**：

```bash
git pull origin main
docker compose build app     # 重建镜像（依赖变化时）
docker compose up -d app     # 滚动重启应用；Neo4j 保持运行
```

**回滚**（保留上一版 tag）：

```bash
git checkout v1.2.0
docker compose build app && docker compose up -d app
```

数据兼容性：本应用**不做 schema 破坏性变更**（GraphStore 接口稳定）；如升级引入新环境变量，`.env.example` 会标注默认值，容器 compose 已有 fallback。

## 十、常见问题排障

**Q1：`docker compose up` 卡在 `neo4j (health: starting)`**
→ 首次启动 Neo4j 需要 20-30s 初始化。若 60s 后仍 starting：`docker compose logs neo4j` 查看内存不足或权限问题（Linux 需 `chmod 777` 卷或 SELinux 配置）。

**Q2：应用启动即崩，日志 `AUTH_SECRET is missing`**
→ 生产构建会校验：`AUTH_SECRET` 必须设。开发模式（`NODE_ENV!=production`）允许缺省。

**Q3：`/api/health` 返回 503 且 `parser.ok=false`**
→ 极少数 Node 版本 `TextDecoder` 无 gbk 支持。切换到 Node 22 或安装 `text-encoding` polyfill。

**Q4：Vercel 部署 `/api/course/upload` 报文件系统只读**
→ Vercel Serverless 磁盘只读，`DATA_DIR` 无法写。切 `GRAPH_STORE=neo4j` 并配 AuraDB；`MASTERY_STORE` 亦需走 Neo4j（当前版本掌握状态仅 JSON 持久化，云端演示需评估）。

**Q5：JSON 模式下多实例并发写会丢数据吗？**
→ 单机多实例（同 volume）：`mastery-store` 使用进程内写队列 + 跨进程 mkdir 锁，不丢。跨主机多实例共享 NFS 卷：**不推荐**，请切 Neo4j。

**Q6：想清库重来**
→ `docker compose down -v`（删除数据卷）→ `docker compose up -d`。裸 Node：`rm -rf data/store/*` 后重启。

## 十一、CI/CD 流水线（工作流 D-2）

`.github/workflows/` 下四条：

| 文件 | 触发 | 作用 |
| --- | --- | --- |
| `ci.yml` | push / PR to main | lint → typecheck → **vitest 单测+覆盖率** → build → Playwright e2e（chromium/firefox/webkit） |
| `codeql.yml` | push / PR / 周期 | CodeQL SAST（javascript-typescript）——满足 main 分支保护的 code_scanning 规则 |
| `security.yml` | push / PR / 周期 | gitleaks 密钥扫描 + `npm audit` |
| `release.yml` | tag `v*` | 构建 Docker 镜像并推 GHCR（`ghcr.io/EterUltimate/a10_knowledgegraph:<version>`） |

发布新版流程：

```bash
git tag -a v1.0.0 -m "A10 v1.0.0: 商业级可交付"
git push origin v1.0.0
# Actions 面板自动跑 Release 工作流，几分钟后镜像出现在 GHCR
```
