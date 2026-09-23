# Repository guide

Obsidian Pangu 为 Markdown 正文补充中英文间距，同时保护笔记语义和原有结构。

## Project map

- `src/main.ts`：插件生命周期、编辑器命令、设置加载与保存。
- `src/i18n.ts`：命令与设置界面的英文、简体中文翻译及 locale 回退。
- `src/util.ts`：格式化、公式与标签保护、列表布局保留。
- `tests/regressions.test.cjs`：格式化回归测试及 Obsidian 宿主模拟。
- `README.md`：用户可见行为和开发说明。
- `dist/`：构建产物，已被 Git 忽略。

## Behavior constraints

- 默认 `spacing` 模式只补空格，保留原始 Markdown 布局、文首/段间/文末空行、空白行中的空格或 Tab、换行符类型及末尾换行状态。
- `markdown` 模式为可选完整排版；缩进宽度和内嵌代码格式化设置仅在该模式生效。旧设置没有模式字段时使用 `spacing`，模式切换应保存并在重载后保持。
- 行内公式 `$...$` 和块级公式 `$$...$$` 保留原文，包括分隔符、下标和内部空白；不提供公式格式化开关。
- 行内公式与行内代码直接紧邻文字或数字时补外侧空格，不拆开标点、不改动内部内容，也不将该规则应用到块级公式或代码块。
- 引用链接的隐式标识符和链接目标不得因补空格而改变；只处理显式标签中的正文。
- 标签不得被空格拆开，覆盖中英文、嵌套标签、emoji 及组合字符。
- 列表保留原有 Tab、空格、符号、编号及换行；正文间距处理不得改写代码、公式或链接目标。
- 编辑器入口不得通过 `.trim()` 丢弃文档首行缩进。
- 设置应在重载后保持，并传递给格式化器。
- 保留手动格式化的默认快捷键 `Mod+Shift+S` 和 `Ctrl+Shift+S`，允许用户在 Obsidian 快捷键设置中覆盖。维护者已明确接受默认快捷键的市场审核警告，不得仅为消除此警告移除绑定，也不修改用户自定义快捷键。
- 正文中的 ASCII 标点 `. , ! ? : ;` 直接紧邻后续汉字时补一个空格；不改中文标点、链接地址、代码、公式或引用标识符。
- 手动格式化使用公开 Editor 接口和 `transaction()` 进行局部编辑，不调用 `setValue()` 重置文档；保持选区方向和滚动位置。
- 手动格式化事务使用 Obsidian 的程序化更新来源 `set`，避免宿主自动展开被编辑的折叠内容；自动输入仍使用 `+pangu`。局部编辑不等于保留折叠，修改编辑入口后须在真实 Obsidian 中验收嵌套折叠与撤销/重做。
- 输入时补空格默认关闭，只处理当前输入附近的中英文/数字边界，等 IME 提交后再写入；跳过粘贴、删除、撤销、选区替换、多光标及未闭合 Markdown。文件切换、失焦、关闭功能和卸载时不执行过期任务。自动输入不得格式化或 diff 全文；超过 10,000 UTF-16 单元的文档仅支持手动格式化，避免 Markdown 解析阻塞输入。
- 设置页同时维护 `getSettingDefinitions()` 和 `display()`：前者用于 Obsidian 1.13+ 的设置搜索与自动绑定，后者兼容旧版；两者的名称、选项、默认值和保存行为须保持一致。
- 命令与两套设置 UI 共用 `src/i18n.ts` 翻译目录；简体中文 locale 使用中文，其他 locale 回退英文。为兼容最低支持的 Obsidian 1.0.3，语言检测使用公开的 `moment.locale()`，不得改用 1.8.7 才提供的 `getLanguage()`。

## Validation

- 每次 feature 交付或 bugfix 完成前，项目单元测试和 E2E 测试均须通过，并覆盖本次新增或修复的行为。E2E 必须在隔离的真实 Obsidian 中验证用户操作链路；宿主 mock、纯格式化器测试或仅构建成功不能代替 E2E。未运行、失败或因环境限制无法完成时，须明确报告阻塞项，不得宣称交付完成。
- 修复 Bug 时先加入能复现问题的回归测试，再修改实现。
- 开发和发布统一使用 Node.js 22。
- `npm test`：运行格式化、设置、分发和 API 兼容性回归测试。
- `npm run test:e2e`：构建并在隔离的真实 Obsidian 1.13.7 / installer 1.12.4 中运行 WDIO E2E；设置 `OBSIDIAN_VERSIONS='1.13.7/1.12.4 1.0.3/earliest'` 可运行发布矩阵。E2E 串行执行，下载缓存位于 `.obsidian-cache/`，失败证据位于 `e2e-results/`。
- `npm run lint`：运行官方 `obsidianmd/no-unsupported-api` 规则（不是全部市场审核规则）；必须在发布前通过，不得关闭规则掩盖最低版本不匹配。
- `npm run build`：构建到 `dist/`。
- Rollup 的 TypeScript 插件显式包含 `src/**/*.ts`，避免旧插件的默认扩展通配模式在新安装的匹配依赖下漏掉源码。
- 完整类型检查为 `./node_modules/.bin/tsc --noEmit`。此前本机遇到父目录全局类型冲突及缺失的 CodeMirror 声明，复查时应根据实际输出判断。
- `./node_modules/.bin/tsc --noEmit --types node --skipLibCheck` 仅用于限定范围的源码检查，不得将其通过表述为完整类型检查通过。
- 宿主模拟测试不等于真实 Obsidian 验证；明确区分测试、构建、产物检查与应用内验证。

## Release

- 展示名称使用官方登记的 `PanGu`，插件 ID 保持 `obsidian-pangu`；不得为改名新建插件 ID。
- 下一版本起 `minAppVersion` 为 `1.0.3`，不再支持更早版本；最低版本必须覆盖实际 API、目录检查和自动化 E2E 要求。1.13 以下仍须保留传统设置页兼容路径。
- `package.json` 声明 MIT，根目录必须保留完整 `LICENSE`；插件描述以英文句末标点结尾。
- Obsidian API 开发依赖固定到不可变版本，不使用 `master` 压缩包；更新依赖后重新生成 `yarn.lock` 并验证冻结安装，不跳过完整性校验。
- 发布前同步 `package.json`、`manifest.json` 和 `HISTORY.md`；标签使用不带 `v` 的版本号。
- 推送版本标签会触发 `.github/workflows/releases.yml`，在 Node.js 22 下使用 Yarn 1.22.22 冻结安装依赖、运行测试、检查版本并构建。
- Release 先用 `scripts/release-notes.mjs` 精确提取 `HISTORY.md` 的对应版本章节，再通过 `gh release create --notes-file release-notes.md --title "$GITHUB_REF_NAME" --verify-tag` 发布并上传资产；版本章节缺失或为空时必须失败。标题必须包含插件版本。不得恢复只会为直接提交生成比较链接的 `--generate-notes`，也不得恢复已弃用的 `actions/create-release` 或 `actions/upload-release-asset`。
- Release 只上传 `main.js` 和 `manifest.json`；如将来需要样式可上传 `styles.css`，不再上传额外 ZIP。历史 Release 不自动删除或覆盖。
- 发布工作流在构建后、创建 Release 前，通过固定提交 SHA 的 `actions/attest` 为所有发布文件生成来源证明；保留 `contents: write`、`id-token: write` 和 `attestations: write` 权限。新增发布文件时同步证明路径，证明失败不得继续发布。
- 发布后下载产物，逐一运行 `gh attestation verify <文件路径> --repo Natumsol/obsidian-pangu` 核验证明；本地测试通过不代表 GitHub 来源证明已生成。
- 等待发布任务成功并核对下载产物后，再宣布发布完成、回复或关闭对应 Issue。
- GitHub 发布成功不代表市场恢复可见；必须另外检查 Obsidian Community 的目录状态与审核结果。

## Documentation

- 中文技术文档中的引用、强调和术语说明使用「直角引号」。
- 用户询问库、框架、SDK、API、CLI 或云服务用法时，使用 Context7 查询当前文档：先运行 `npx ctx7@latest library <官方名称> "<完整问题>"`，再使用返回的 ID 运行 `npx ctx7@latest docs <libraryId> "<完整问题>"`。
- 用户直接提供 `/org/project` ID 时可跳过 library；版本问题使用查询返回的版本 ID。每个问题最多运行 3 条 Context7 命令，查询不得包含凭据。
- 遇到 Context7 配额错误应告知用户，并建议 `npx ctx7@latest login` 或配置 `CONTEXT7_API_KEY`，不得静默退回记忆作答。
- 普通代码评审、重构、自编脚本和业务逻辑调试不要求 Context7 查询。

## Agent skills

### Issue tracker

需求和缺陷记录在 `Natumsol/obsidian-pangu` 的 GitHub Issues，使用 `gh` 操作。见 [issue-tracker.md](docs/agents/issue-tracker.md)。

### Triage labels

使用五种默认 triage 角色与同名标签的映射。见 [triage-labels.md](docs/agents/triage-labels.md)。

### Domain docs

采用单项目布局：根目录 `CONTEXT.md` 与 `docs/adr/`，按需沉淀。见 [domain.md](docs/agents/domain.md)。
