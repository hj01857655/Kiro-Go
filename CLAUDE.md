# CLAUDE.md — Kiro-Go

Kiro API Proxy：把 Kiro API 请求翻译成 OpenAI / Anthropic(Claude)兼容格式的反向代理。
Go 1.25 服务（module `kiro-go`），含多账号池、OAuth 自动刷新、流式响应、admin 管理面板。

> 本文件是**红线清单**，每个会话自动加载。下面的约束不是建议，是硬规则。

---

## 0. 这是 fork —— 同步 upstream 的铁律

- `origin` = `hj01857655/Kiro-Go`（我们的 fork），`upstream` = `Quorinex/Kiro-Go`。
- **禁止 `git merge upstream/main`。** 本 fork 与 upstream 有**结构性分歧**，直接 merge 会把本地改动顶掉（已经发生过一次，被迫重写）。
- **一律用 cherry-pick 同步**：
  ```bash
  git fetch upstream
  git log upstream/main --oneline -20     # 看 upstream 更新了啥
  git cherry-pick <你认可的commit>          # 只摘要的
  ```
- 凡是碰这几处的 upstream 提交**默认不摘**（摘了必顶）：
  `Account` struct、`ResolveProfileArn` / `getFixedProfileArn` / `supportsProfiles`、usage 解析。
- 不管 merge 还是 cherry-pick，**合完必须 `go test ./...` 全绿**才能合回工作分支。测试是抓"合干净但行为被顶"的唯一哨兵。

### 与 upstream 的核心分歧点（不要被"改回原作者逻辑"）
1. **usage 完整存 `Account.UsageData`（`json.RawMessage`），拒绝把字段平铺到 Account 顶层。**
   `nextDateReset` / `freeTrialExpiry` / `expiresAt` 这些字段上游有两种形态：科学计数法 epoch 数字 **和** ISO-8601 字符串。所以用 `json.RawMessage`，不要用 `json.Number`（ISO 字符串会让它崩，且崩出的 "invalid" 会触发 ban 检测误封账号）。
2. **profileArn 对 `BuilderId` / `Github` / `Google` 用固定 ARN，绝不调 `ListAvailableProfiles`。**
   对齐 Kiro IDE 的 `FixedProfileArns`。Builder ID 调那个接口必然 AWS 403，每次请求白刷 token + 刷 WARN。Builder ID 用 `arn:aws:codewhisperer:us-east-1:638616132270:profile/AAAACCCCXXXX`，social 用 `...699475941385:profile/EHGA3GRVQMUK`。

---

## 1. 安全红线（不能删 / 不能提交）

- **不要提交含个人信息的文件**：`.zeabur/`（个人 project/service ID，已 gitignore）、`/data/`（运行时数据，已 gitignore）。
- **`start.bat` 必须用 `%USERPROFILE%` 解析路径**，不要退化成硬编码用户名(如 `C:\Users\xxx\...`)。当前已合规，保持。
- **以下是已恢复的安全回归点，不要再删**：admin 的 CORS localhost 白名单、登录接口的 2 秒防爆破延迟。
- `host` 默认 `127.0.0.1`（安全）vs `0.0.0.0`（容器暴露）是**未定策略**，不要擅自改。
- 新建网络端点 / 服务若没有鉴权，必须主动提示安全风险。

---

## 2. 改完代码必须验证

```bash
go build ./...
go vet ./proxy/      # 或改动涉及的包
go test ./... -count=1
```
新增功能 / 修 bug 要配测试。涉及 profileArn / usage / 安全的改动，说清楚验证了什么、没验证什么。
清理验证用的临时文件。

---

## 3. Git / 提交

- 只在用户明确要求时提交。push 到分支，**绝不直接 push main**，push 前先确认。
- gh 默认仓库必须是 fork `hj01857655/Kiro-Go`，不是 upstream `Quorinex/Kiro-Go`。
- 当前工作分支：`feature/react-admin`。

---

## 4. 项目结构 & 运行

- `main.go` — 入口；`proxy/` — 核心代理 + Kiro API（profileArn / usage 都在这）；`pool/` — 账号池调度；
  `config/` — 配置 + Account struct + 各类日志落盘；`logger/` — zerolog 封装（公共 API 稳定，见下）；
  `auth/` — OAuth 刷新；`web/` — React + Vite + Tailwind + Radix 的 admin 面板。
- 本地开发：`start.bat`（Windows，用 air 热重载 Go + Vite 起前端 5173）。
- 日志体系：`logger` 包是 zerolog 的薄封装，**公共 API（Debugf/Infof/Warnf/Errorf/Fatalf 等）必须保持稳定**，
  ~45 个调用点不改。ConsoleWriter 用 `NoColor: true`（air/Windows 管道下彩色转义会变乱码）。
- 上游日志规则：所有 `/getUsageLimits`、`ListAvailableModels` 响应完整写 `data/upstream.log`；
  非 200 额外**完整**打印到控制台(不截断、不省略号)。

---

## 5. 语言

**用中文回复。**
