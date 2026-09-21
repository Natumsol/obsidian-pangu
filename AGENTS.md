# Repository guide

Obsidian Pangu 为 Markdown 正文补充中英文间距，同时保护笔记语义和原有结构。

## Project map

- `src/main.ts`：插件生命周期、编辑器命令、设置加载与保存。
- `src/util.ts`：格式化、公式与标签保护、列表布局保留。
- `tests/regressions.test.cjs`：格式化回归测试及 Obsidian 宿主模拟。
- `README.md`：用户可见行为和开发说明。
- `dist/`：构建产物，已被 Git 忽略。

## Behavior constraints

- 行内公式 `$...$` 和块级公式 `$$...$$` 保留原文，包括分隔符、下标和内部空白；不提供公式格式化开关。
- 标签不得被空格拆开，覆盖中英文、嵌套标签、emoji 及组合字符。
- 列表保留原有 Tab、空格、符号、编号及换行；正文间距处理不得改写代码、公式或链接目标。
- 编辑器入口不得通过 `.trim()` 丢弃文档首行缩进。
- 设置应在重载后保持，并传递给格式化器。

## Validation

- 修复 Bug 时先加入能复现问题的回归测试，再修改实现。
- `npm test`：运行回归测试，需要 Node.js 18 或更新版本。
- `npm run build`：构建到 `dist/`。
- Rollup 的 TypeScript 插件显式包含 `src/**/*.ts`，避免旧插件的默认扩展通配模式在新安装的匹配依赖下漏掉源码。
- 完整类型检查为 `./node_modules/.bin/tsc --noEmit`。此前本机遇到父目录全局类型冲突及缺失的 CodeMirror 声明，复查时应根据实际输出判断。
- `./node_modules/.bin/tsc --noEmit --types node --skipLibCheck` 仅用于限定范围的源码检查，不得将其通过表述为完整类型检查通过。
- 宿主模拟测试不等于真实 Obsidian 验证；明确区分测试、构建、产物检查与应用内验证。

## Release

- 发布前同步 `package.json`、`manifest.json` 和 `HISTORY.md`；标签使用不带 `v` 的版本号。
- 推送版本标签会触发 `.github/workflows/releases.yml`，在 Node.js 22 下安装依赖、运行测试、检查版本并构建。
- 发布必须包含 `main.js`、`manifest.json` 和 `obsidian-pangu-<version>.zip`；压缩包内为 `obsidian-pangu/main.js` 与 `obsidian-pangu/manifest.json`。
- 等待发布任务成功并核对下载产物后，再宣布发布完成、回复或关闭对应 Issue。

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
