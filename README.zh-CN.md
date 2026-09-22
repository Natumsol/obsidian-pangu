# PanGu for Obsidian

[English](README.md) | 简体中文

PanGu 是一个 Obsidian 排版插件，用于在中文与英文、数字之间自动补充空格，同时保护 Markdown 结构、代码和公式内容。

```diff
- 大多数人在20到30岁就已经过完自己的一生；一过了这个年龄段，他们就变成自己的影子。
+ 大多数人在 20 到 30 岁就已经过完自己的一生；一过了这个年龄段，他们就变成自己的影子。
```

## 功能亮点

- 在中文与英文、数字之间补充空格。
- 支持行内公式与块级公式，不改写公式内部内容。
- 保护标签、链接目标、行内代码、代码块与列表结构。
- 默认只补空格；可选「完整 Markdown 排版」模式。
- 使用局部编辑保留选区与滚动位置，并将一次格式化合并为一次撤销操作。
- 可选输入时自动补空格，兼容中文输入法组合输入。

## 安装

### 从 Obsidian 安装

在 Obsidian 中依次打开「设置」→「第三方插件」→「浏览」，搜索 `PanGu` 并安装。如果插件尚未出现在搜索结果中，可以使用下方的手动安装方式。

PanGu 支持 Obsidian 1.0.3 及以上版本，仅支持桌面端。

### 手动安装

1. 从 [GitHub Releases](https://github.com/natumsol/obsidian-pangu/releases) 下载同一版本的 `main.js` 和 `manifest.json`。
2. 将文件放入 `<仓库>/.obsidian/plugins/obsidian-pangu/`。
3. 重新加载 Obsidian，然后在「第三方插件」中启用 PanGu。

升级插件时请保留已有的 `data.json`，以免丢失设置。

## 使用

打开命令面板并执行「为中英文字符间自动加入空格」，或使用默认快捷键：

- macOS：`Command + Shift + S`
- Windows / Linux：`Ctrl + Shift + S`

为兼容旧版本，macOS 仍保留 `Ctrl + Shift + S`。如有快捷键冲突，可在 Obsidian 的「快捷键」设置中修改；插件不会移除用户自行配置的快捷键。

## 设置

| 设置 | 默认值 | 说明 |
| --- | --- | --- |
| 格式化模式 | 只补空格 | 只处理正文中的中英文、数字边界，不主动重排 Markdown。 |
| 缩进宽度 | `2` | 仅用于「完整 Markdown 排版」模式。 |
| 格式化嵌入语言 | 关闭 | 仅用于「完整 Markdown 排版」模式。 |
| 输入时自动补空格 | 关闭 | 输入新文本时，只处理本次输入触及的中英文、数字边界。 |

公式保护始终生效，不需要单独开关。

## 格式化规则

### 默认「只补空格」

默认模式只修改正文中需要补空格的位置，不主动调整空行、缩进、列表标记或文档末尾换行。实际文件的换行符仍可能受 Obsidian 保存行为影响。

以下内容会保持原样：

- Obsidian 标签，例如 `#中文English`、`#中文👩🏽‍💻English`
- 行内公式 `$...$` 和单行或多行块级公式 `$$...$$`
- 行内代码、围栏代码块和缩进代码块
- Markdown 链接目标
- 列表的标记、编号、缩进与换行

行内代码和行内公式紧邻文字或数字时，会在其外侧补空格，但不会修改内部内容。例如：

```diff
- 这是一个$c^2$公式
+ 这是一个 $c^2$ 公式
```

块级公式不会在外侧额外补空格。英文半角标点 `. , ! ? : ;` 直接连接中文时，也会补充一个空格，例如 `It works.可以` 会变为 `It works. 可以`。

### 「完整 Markdown 排版」

该模式保留旧版完整排版能力，会额外规范列表外的空行并确保文档以换行结尾。「缩进宽度」和「格式化嵌入语言」只在此模式下生效。

无论选择哪种模式，标签、代码、链接目标和公式都会受到保护。

## 输入时自动补空格

开启后，PanGu 会在新输入触及的中英文、数字边界补空格，并等待中文输入法完成组合输入后再处理。该功能始终使用局部补空格逻辑，不会触发完整 Markdown 排版。

为避免干扰编辑，以下操作不会触发自动补空格：

- 粘贴、删除、撤销与重做
- 替换选区或使用多个光标
- 未闭合的 Markdown 结构
- 超过 10,000 个 UTF-16 代码单元的笔记

大型笔记仍可通过命令面板手动格式化。

## 开发

开发环境使用 Node.js 22 和 Yarn Classic 1.22.22：

```bash
yarn install --frozen-lockfile
```

常用命令：

| 命令 | 用途 |
| --- | --- |
| `npm run dev` | 监听源码并持续构建。 |
| `npm run lint` | 运行 ESLint 与 Obsidian API 兼容性检查。 |
| `npm test` | 运行单元与回归测试。 |
| `npm run build` | 构建插件到 `dist/`。 |
| `npm run test:e2e` | 构建并运行真实 Obsidian 桌面端 E2E 测试。 |

E2E 默认使用 Obsidian 1.13.7（installer 1.12.4）。发布前可运行覆盖当前版本与最低支持版本的测试矩阵：

```bash
OBSIDIAN_VERSIONS='1.13.7/1.12.4 1.0.3/earliest' npm run test:e2e
```

Obsidian 下载缓存位于 `.obsidian-cache/`，失败截图与运行日志位于 `e2e-results/`。更多背景和验收要求见 [E2E 工程调研](docs/research/obsidian-e2e.md) 与 [最近一次验收记录](docs/acceptance-2026-09-22.md)。

## 致谢

感谢 [pangu.vim](https://github.com/hotoo/pangu.vim)、[writing4cn](https://marketplace.visualstudio.com/items?itemName=twocucao.writing4cn) 和 [pangu-markdown-vscode](https://github.com/zhuyuanxiang/pangu-markdown-vscode)。
