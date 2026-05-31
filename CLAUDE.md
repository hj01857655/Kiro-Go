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

## 5. 前端 admin 面板（web/）已知坑

- **`notify` 必须用 `useNotification()` hook 拿，不是全局变量。** 用法固定两步：
  顶部 `import { useNotification } from './ui/notification'`，组件体内 `const notify = useNotification()`。
  漏了就运行时崩 `ReferenceError: notify is not defined`（点按钮才触发，构建检查不出来）。
  已修过 `AddAccountModal.jsx`、`ImportAccountsModal.jsx`，新组件用 `notify.success/error` 前先确认这两行都在。
- IAM Identity Center tab 的 region 下拉：列表对齐 Kiro IDE 内置 `aws` 商业分区（`extension.js` endpoints 元数据），
  默认 `us-east-1`；排除 `aws-global`（伪区域，OIDC 端点不存在）和 cn/gov/iso 特殊分区。

---

## 6. Kiro IDE 协议笔记（从 extension.js 逆出来的，便于对齐）

- **`clientIdHash` 只是 IDE 本地缓存文件名，跟任何网络请求无关。** 算法：`sha1(JSON.stringify({startUrl}))` 的 hex，
  即对字符串 `{"startUrl":"..."}` 整段做 SHA1。例：`view.awsapps.com/start`→`e909a0580879b06ece1202964fbe9dda95ea4ce3`，
  企业 `d-90660ceab3.awsapps.com/start`→`a96ec6ff09e0c558ceca191cdaa0ff2b0e4e3e35`。
  用途仅是定位 `~/.aws/sso/cache/<clientIdHash>.json`（IDE 按 startUrl 缓存 OIDC client 注册 `{clientId,clientSecret,expiresAt}`）。
  **OAuth 注册 / 设备授权 / 授权码换 token / 刷新 token 全程都不带它**，AWS 只认 clientId/clientSecret/refreshToken 的真实值。
  我们项目把 clientId/secret 直接平铺存进 Account，所以这个 hash 对运行时无用——仅当要"读 IDE 本地缓存文件导入账号"时才需要算它定位文件。
- 固定 startUrl：BuilderId = `https://view.awsapps.com/start`；Amazon 内部 = `https://amzn.awsapps.com/start`。
- **IDE 本地缓存是两个文件配合（实测）**，IdC 账号缺一不可：
  - `kiro-auth-token.json`（按账号）：`{accessToken, refreshToken, expiresAt, clientIdHash, authMethod:"IdC", provider:"Enterprise", region}`。
    注意 `expiresAt` 这里是 access token 的过期（约 8h），`authMethod` 是大写 `"IdC"`，`region` 真实存在别忽略。
  - `<clientIdHash>.json`（按 startUrl 共享）：`{clientId, clientSecret, expiresAt}`，`clientSecret` 是个 JWT，
    payload 里能解出 `initiateLoginUri`（= startUrl）、scopes 等；`expiresAt` 是 client 注册过期（约 90d）。
  - 光有 token 文件无法导入 IdC——`clientIdHash` 是指向 client 文件的外键，clientId/secret 只在那个文件里。
- **"本地缓存"导入 tab 字段映射（前端文件字段优先，缺失才回退下拉/默认）**：
  `region`/`provider`/`authMethod` 一律先取 `kiro-auth-token.json` 里的值，否则会出两个坑——region 永远被后端兜底成
  `us-east-1`、Enterprise 账号被错标成 BuilderId（profileArn 走错分支）。`isSocial` 也先看文件 `authMethod==="social"`
  再看 provider，避免 social 账号被强制要 Client JSON。后端 `apiImportCredentials` 已能标准化（`enterprise/builderid→idc`、
  `google/github→social`）并以"一次成功刷新"为导入前提（本地 accessToken 的 TTL 不可信，盲存会让账号被判过期而废掉）。

---

## 7. 语言

**用中文回复。**
