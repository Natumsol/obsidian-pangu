# Obsidian E2E 测试工程化调研

调研日期：2026-09-22。方案已按本文路线落地；本地 macOS POC 已通过，Linux CI 结果以首次远端工作流为准。

## 结论

项目现已采用 **WebdriverIO 9 + `wdio-obsidian-service` + Mocha** 建立真实客户端 E2E，并保留现有 Node 单测。本地 POC 已覆盖固定现代版本和最低支持版本，PR/发布工作流也已接线。该服务是 `jesse-r-s-hines` 维护的第三方项目，不是 Obsidian 官方测试框架。[项目源码](https://github.com/jesse-r-s-hines/wdio-obsidian-service)

维护者已决定从下一版本起将插件最低版本提升到 **1.0.3**，不再支持 0.12.16。该版本正好是当前服务明确支持的最早版本，因此可以把最低版本纳入自动化矩阵；仍须在 POC 中真正下载、启动并执行用例后，才能声称 1.0.3 E2E 通过。[版本门槛源码](https://github.com/jesse-r-s-hines/wdio-obsidian-service/blob/2febf3ce67d77e2d828ec6709a5d5eaafdc109e9/packages/wdio-obsidian-service/src/service.ts#L81-L85)

备选为 `obsidian-launcher` 管理隔离实例，配合 Playwright Electron；若 Electron 启动接管不可用，再采用独立启动 + CDP 连接。备选仍需 POC，不能把现有一次性 CLI/CDP 脚本直接视作稳定测试框架。Playwright 的 Electron 支持标为实验性，CDP 连接也低于其原生连接的完整性。[Electron 文档](https://playwright.dev/docs/api/class-electron)、[CDP 文档](https://playwright.dev/docs/api/class-browsertype#browser-type-connect-over-cdp)

## 当前基础与缺口

- 现有 105 项单测，以及本机 Obsidian 1.13.7 的 222 项格式化、60 项输入检查和折叠、快捷键、设置、生命周期验收，已有明确结果与边界，见[客户端验收报告](../acceptance-2026-09-22.md)。这是现有工作证据，不是本次调研新运行的框架结果。
- 核心 smoke 已从 `/tmp/pangu-acceptance.HYt1nu` 提炼为仓库中的夹具、断言、启动器与可重复命令；更宽的格式化组合、生命周期和弹窗用例仍可按优先级继续迁移。
- 当前已有 PR/push `validate` 工作流、`test:e2e` 入口和发布前 E2E 门禁，继续使用 Node.js 22、Yarn 1.22.22 冻结安装。
- TypeScript 4.9 配置仍只服务插件源码；E2E 使用 `.mjs`，避免把 WDIO/Mocha 全局类型引入插件构建。

## 本地落地验证

2026-09-22 在 macOS / Node.js 22.14.0 上，以 SHA-256 为 `6f083f76e8a541e98d8da62645228140b6abe7e522558420ad42c90acf5bdc2d` 的同一份 `dist/main.js` 验证：

- Obsidian app 1.13.7 / installer 1.12.4：插件加载、真实快捷键、折叠与撤销、真实编辑器输入、设置窗口控件与插件重载持久化共 4 项通过；现代版本连续运行三次通过。
- Obsidian app 1.0.3 / installer 0.14.5：相同 4 项通过；单独运行和发布矩阵运行均通过。
- 双版本以 `maxInstances: 1` 串行运行，发布矩阵共 8 项通过；失败试跑能以非零状态退出并保存截图，随后清理旧证据再运行。
- `yarn install --frozen-lockfile`、105 项单测、lint、build、JavaScript 语法检查、工作流 YAML 解析和 `git diff --check` 通过。Linux Xvfb + herbstluftwm 尚需首次远端 CI 结果确认。

## 已核实的专用工具能力

源码核对基线为 `wdio-obsidian-service` 仓库提交 `2febf3ce67d77e2d828ec6709a5d5eaafdc109e9`。工程固定服务、launcher 和 reporter 3.2.1，以及 WDIO 9.31.1；Node 22 / Yarn 1 冻结安装已在本地通过。[服务依赖](https://github.com/jesse-r-s-hines/wdio-obsidian-service/blob/2febf3ce67d77e2d828ec6709a5d5eaafdc109e9/packages/wdio-obsidian-service/package.json)、[launcher 依赖](https://github.com/jesse-r-s-hines/wdio-obsidian-service/blob/2febf3ce67d77e2d828ec6709a5d5eaafdc109e9/packages/obsidian-launcher/package.json)

| 能力 | 核实结果与影响 |
| --- | --- |
| 版本下载 | 分别控制 app 与 installer；二者决定 Obsidian 逻辑与 Electron/Chromium 运行时，不能只记录 app 版本。 |
| 实例隔离 | 服务默认复制 vault，另建 `--user-data-dir`；测试不应指定日常库或设置 `copy:false`。 |
| 驱动匹配 | 服务按 installer 下载 ChromeDriver，包含旧 Chromium 的兼容处理；减少自维护版本配对工作。 |
| 测试桥接 | 自动安装 helper 插件，提供 `executeObsidian`、命令执行、插件开关等辅助能力；测试环境是「PanGu + 测试 helper」，不是仅启用 PanGu。 |
| 重置 | `resetVault()` 只重置笔记文件，不重置 `.obsidian`、设置或内存状态；隔离状态敏感用例必须重新加载全新 fixture。 |
| 弹出窗口 | helper 处理 `window-open`，向新窗口注入桥接；测试仍需通过 WDIO 切换窗口、确认焦点后输入。 |
| 平台 | 文档提供桌面 Windows/macOS/Linux、Android 真机应用测试路径；桌面 mobile emulation 不是实际移动端，iOS 不受支持。 |

表格依据：[能力与平台说明](https://github.com/jesse-r-s-hines/wdio-obsidian-service/blob/2febf3ce67d77e2d828ec6709a5d5eaafdc109e9/packages/wdio-obsidian-service/README.md)、[隔离配置](https://github.com/jesse-r-s-hines/wdio-obsidian-service/blob/2febf3ce67d77e2d828ec6709a5d5eaafdc109e9/packages/wdio-obsidian-service/src/types.ts)、[驱动与实例实现](https://github.com/jesse-r-s-hines/wdio-obsidian-service/blob/2febf3ce67d77e2d828ec6709a5d5eaafdc109e9/packages/wdio-obsidian-service/src/service.ts)、[重置实现](https://github.com/jesse-r-s-hines/wdio-obsidian-service/blob/2febf3ce67d77e2d828ec6709a5d5eaafdc109e9/packages/wdio-obsidian-service/src/pageobjects/obsidianPage.ts)、[弹出窗口桥接](https://github.com/jesse-r-s-hines/wdio-obsidian-service/blob/2febf3ce67d77e2d828ec6709a5d5eaafdc109e9/packages/wdio-obsidian-service/helper-plugin/main.js)。

### 最低版本策略

原先声明的 0.12.16 存在两层已核实障碍：服务代码拒绝小于 1.0.3 的版本；launcher 的版本数据生成过程排除了下载损坏的 0.12.16，且官方 v0.12.16 Release API 资产列表为空。维护者已决定停止支持该版本，因此无需建立旧版二进制旁路或将它作为 E2E 阻塞项。[失效版本清单](https://github.com/jesse-r-s-hines/wdio-obsidian-service/blob/2febf3ce67d77e2d828ec6709a5d5eaafdc109e9/packages/obsidian-launcher/src/obsidianVersions.ts#L24-L30)、[官方 Release](https://github.com/obsidianmd/obsidian-releases/releases/tag/v0.12.16)

required CI 固定测试一个已验证的现代版本；发布前矩阵额外测试 1.0.3。最低版本 job 不得被静默跳过，也不能用 API 单测代替。若上游无法提供或启动 1.0.3，应将发布标记为阻塞，再由维护者决定是否重新调整兼容承诺。

## 推荐的测试分层

下述为针对 PanGu 的工程建议，不是工具自动提供的保证。

1. **单测**继续覆盖纯格式化、布局/公式/标签保护、文本 diff、API 回退与事件状态机。边界输入主要放在此层，运行快、失败定位准确。
2. **真实宿主集成**可用 bridge 建夹具、读编辑器状态、读取磁盘结果、直接调用已注册命令；明确标记为 app integration。不能绕过输入链路直接调用格式化函数却称为键盘 E2E。
3. **用户路径 E2E**在真正编辑器中通过点击、按键、命令面板/快捷键、设置控件触发功能，检查可见结果、选区、折叠、保存后文件与重启后设置。对外宣布 E2E 通过，至少需要覆盖本次变更关联的用户路径。
4. **人工平台验收**补足中文系统 IME 的候选窗、选字、组合中断、物理快捷键冲突和系统剪贴板。合成 `composition*`/`paste` DOM 事件只能验证事件处理，不能替代操作系统集成。现有用户回复「正常」只对应已验收构建和环境，未来修改输入逻辑后需重验。

最低用例集：

| 套件 | 核心断言 |
| --- | --- |
| command | Source/Live Preview × spacing/markdown；用户调用命令后精确文本、幂等性、落盘内容。 |
| editor-state | 嵌套/部分折叠、反向选区、多光标、滚动、UTF-16 光标位置；单步撤销/重做。 |
| hotkeys | macOS `Mod+Shift+S`、其他桌面的 `Ctrl+Shift+S`；用户自定义覆盖仍有效。 |
| typing | 双向中英文/数字边界、任务项、中间插入、10,000 单元门槛、未闭合 Markdown；粘贴/删除/撤销/替换不触发。 |
| settings | 实际控件修改、磁盘保存、插件和应用重启后保持；默认关闭自动输入、旧配置迁移、设置搜索。 |
| lifecycle | 切文件、失焦、关闭开关、禁用/重启插件时无过期写入；弹出窗口切换与关闭。 |
| render/control | 数学、链接、标签的源码与阅读视图；CRLF/ZWJ 标签同时跑无 PanGu 对照，区分宿主行为和插件回归。 |

选择器与宿主状态探针集中放在 adapter/page object 中。必要的私有折叠读取只能作为测试探针，不能进入生产实现；除了内部 fold offsets，还要用 DOM/截图验证折叠内容确实保持隐藏，避免自证循环。

## 隔离、夹具与可重复性

已落地目录：

```text
tests/e2e/
  wdio.conf.mjs
  fixtures/base-vault/
  specs/pangu.e2e.mjs
scripts/e2e/prepare.mjs
```

- `prepare` 构建并暂存 `dist/main.js`、根 `manifest.json` 为一个完整插件目录；WDIO 的 `plugins` 指向该目录，不假设仓库根已有 `main.js`。记录 bundle SHA-256，确保单测后被验收与最终上传的是同一份产物。
- 每个 worker 独立复制只含合成笔记的 vault/profile。固定主题、语言、字体、窗口大小、编辑模式和插件设置；不复制用户凭据、日常配置或真实笔记。禁止在验收环境使用 launcher `watch`，它会额外自动安装 hot-reload 插件。[launcher 说明](https://github.com/jesse-r-s-hines/wdio-obsidian-service/blob/2febf3ce67d77e2d828ec6709a5d5eaafdc109e9/packages/obsidian-launcher/README.md)
- 普通文本数据用 `resetVault` 提速；设置、workspace、热键、history、生命周期用例用新的 vault/profile，不能靠只还原笔记内容隔离。
- 冻结 WDIO/服务/launcher/runner 版本及 Yarn lock；同时记录 app、installer、OS、架构和下载摘要。required CI 不用动态 `latest` 或 `earliest`；新版本发现放在独立定时任务，验证后提交版本矩阵更新。
- 缓存只含下载的 app/installer/驱动，不缓存上一次写过的测试 vault。key 至少含 OS、架构、app、installer、测试依赖锁摘要；来源/校验失败应失败退出，不复用未知二进制。
- 失败时先保存证据，再退出本次创建的进程和临时路径；不按应用名杀死用户日常 Obsidian，也不删除宽泛目录。

## CI 分阶段落地

### 第一阶段：窄 POC，决定是否正式采用

本地 macOS 已使用 Node 22 和冻结依赖跑通 app 1.13.7 + installer 1.12.4，以及最低版本 app 1.0.3 + installer 0.14.5。现代版本连续运行三次通过，发布矩阵串行通过；Linux 同版本组合由新增 CI 验证。POC 验收标准如下：

- 冷缓存下载与暖缓存均启动成功，并能证明 profile/vault 独立。
- 一个真实快捷键格式化用例，保持嵌套折叠并完成撤销/重做。
- 一个真实输入补空格用例，以及一个设置控件保存并重启保持用例。
- 一个故意错误断言确实令命令和 CI 非零退出，并上传失败截图/文本差异；随后恢复正确断言验证通过。
- 同一测试从干净 fixture 连续运行至少 3 次，记录耗时、失败情况及全部重试，不靠延长 sleep 掩盖不稳定。

### 第二阶段：PR 必需门禁与发布接线

新增 PR/push 的 `validate`：冻结安装 → lint/unit → build → Linux 固定版本 E2E → 汇总。桌面 Electron 用真实有界面进程；Linux 无显示器时启动 Xvfb **和窗口管理器**，尤其不能省略弹出窗口与焦点用例的窗口管理能力。上游示例使用 Xvfb + herbstluftwm，但其中 apt 源删除、Node 24、动态版本、未固定 Action 引用不应照搬。[上游 CI 示例](https://github.com/jesse-r-s-hines/wdio-obsidian-service-sample-plugin/blob/main/.github/workflows/test.yaml)

开始 `maxInstances:1`，稳定后再评估并发。汇总门禁对失败/取消/意外跳过都失败；分支保护设为 required check 需要单独仓库设置授权。发布 tag 工作流复用同一验证步骤，确认 E2E 通过后才能 attest/release，不能仅依赖某次 PR 的历史绿灯。不要把测试失败设为 `continue-on-error`。

### 第三阶段：平台矩阵和升级预警

macOS/Windows 对快捷键、窗口/焦点各跑精简套件；发布前覆盖相关平台和最低支持版本 1.0.3，夜间增加完整格式化/输入集和最新版探测。移动端需要时单独推进 Android 真应用，不以桌面模拟替代；本轮不扩大到移动端落地。

## 不稳定测试与证据规则

- 等待具体状态：编辑器绑定正确文件、焦点到 contenteditable、预期文本已准备、插件设置就绪、保存完成、窗口出现。轮询设总期限；不用固定长 sleep 代替 readiness。
- 每个失败输出请求动作、实际焦点窗口/文件、预期与实际文本、选择范围、fold 状态、设置、应用/installer/OS/架构、bundle SHA、stdout/stderr 与测试日志。截图保存失败前后关键窗口；输出 JSON/JUnit 汇总。可选视频/trace 需先确认候选 reporter/runner 的能力，不能默认 WDIO 自动具有 Playwright trace。
- 默认不重试断言失败。基础设施启动/下载故障可限次重试并保留首次失败；诊断重跑即使变绿，也应标记 flaky、关联 Issue，不能悄悄算成稳定通过。隔离非必需 flaky 用例时给出责任人/期限，不移除交付所需核心覆盖。
- 证据仅包含合成 fixture；失败产物有限保留，禁止上传用户 vault/profile 或环境凭据。fork PR 只用公共稳定版，不需要 Obsidian 账号；不为 beta 测试关闭个人账号 2FA。

## 备选方案与尚未验证项

Playwright Electron 可直接接收可执行路径、参数和环境，并读取窗口/截图；但要核实打包 Obsidian 的 Electron/fuse 兼容性。CDP fallback 能利用已验证的独立实例启动方式，代价是自行管理下载、窗口目标、生命周期、协议差异和错误证据。[Electron API](https://playwright.dev/docs/api/class-electron)、[连接限制](https://playwright.dev/docs/api/class-browsertype#browser-type-connect-over-cdp)

Obsidian 官方 CLI 可保留为本地诊断和人工验收辅助，不能作为唯一跨版本驱动：依赖较新客户端/installer 和运行中的应用；第三方 launcher 文档还提示多个隔离实例会干扰 CLI 连接。[官方 CLI](https://obsidian.md/help/cli)、[launcher CLI 限制](https://github.com/jesse-r-s-hines/wdio-obsidian-service/blob/2febf3ce67d77e2d828ec6709a5d5eaafdc109e9/packages/obsidian-launcher/README.md#obsidian-cli)

待 POC 明确：候选依赖在本仓库 Node 22/Yarn 1 冻结安装的结果；1.0.3 与固定现代版本在 Linux/macOS/Windows 的实际启动和焦点行为；打包产物加载路径；完整 suite 耗时；WebDriver 文本输入、系统粘贴与真实 IME 的覆盖界线；helper 对宿主状态的影响。这些都不能仅凭文档声明为已通过。

## 文档核实方式

本轮先按仓库规则执行 Context7 `library WebdriverIO`，选中 `/websites/jesse-r-s-hines_github_io_wdio-obsidian-service` 后执行 `docs`。Context7 输出仅作入口，关键能力以以上维护者 README/源码及官方文档复核；例如其自动生成的 `setupVault` HTTP 接口描述未作为事实使用，实际 launcher 提供的是 JavaScript API。随后固定依赖、落地隔离测试与 CI，并在独立下载的 Obsidian 客户端中完成本地验证；没有操作用户日常 vault。
