# PanGu for Obsidian

English | [简体中文](README.zh-CN.md)

PanGu is an Obsidian formatting plugin that adds spacing between Chinese text and English letters or numbers while preserving Markdown structure, code, and formulas.

```diff
- 大多数人在20到30岁就已经过完自己的一生；一过了这个年龄段，他们就变成自己的影子。
+ 大多数人在 20 到 30 岁就已经过完自己的一生；一过了这个年龄段，他们就变成自己的影子。
```

## Highlights

- Adds spacing between Chinese text and English letters or numbers.
- Supports inline and display math without rewriting formula content.
- Protects tags, link destinations, inline code, code blocks, and list structure.
- Adds spacing only by default, with full Markdown formatting available as an option.
- Preserves selections and scroll position through local editor changes, with each formatting operation grouped into a single undo step.
- Offers optional spacing as you type, including support for Chinese IME composition.

## Installation

### Install from Obsidian

In Obsidian, open **Settings → Community plugins → Browse**, search for `PanGu`, and install it. If the plugin does not appear in the search results yet, use the manual installation steps below.

PanGu requires Obsidian 1.0.3 or later and supports desktop only.

### Manual installation

1. Download `main.js` and `manifest.json` for the same version from [GitHub Releases](https://github.com/natumsol/obsidian-pangu/releases).
2. Place both files in `<vault>/.obsidian/plugins/obsidian-pangu/`.
3. Reload Obsidian, then enable PanGu under **Community plugins**.

Keep your existing `data.json` when updating so that your settings are preserved.

## Usage

Open the command palette and run **为中英文字符间自动加入空格**, or use the default shortcut:

- macOS: `Command + Shift + S`
- Windows / Linux: `Ctrl + Shift + S`

For backward compatibility, `Ctrl + Shift + S` is also retained on macOS. If a shortcut conflicts with another command, change it in Obsidian's **Hotkeys** settings. PanGu does not remove shortcuts assigned by the user.

## Settings

| Setting | Default | Description |
| --- | --- | --- |
| Formatting mode | Spacing only | Handles Chinese/English/number boundaries without reformatting Markdown layout. |
| Indentation width | `2` | Used only by full Markdown formatting. |
| Format embedded languages | Off | Used only by full Markdown formatting. |
| Add spacing as you type | Off | Handles only boundaries touched by newly typed text. |

Formula protection is always enabled and does not require a separate setting.

## Formatting rules

### Default: spacing only

The default mode changes only the prose boundaries that need spacing. It does not intentionally reformat blank lines, indentation, list markers, or the final newline. File line endings may still be affected by Obsidian's own save behavior.

The following content is preserved:

- Obsidian tags such as `#中文English` and `#中文👩🏽‍💻English`
- Inline math `$...$` and single-line or multiline display math `$$...$$`
- Inline code, fenced code blocks, and indented code blocks
- Markdown link destinations
- List markers, numbering, indentation, and line breaks

When inline code or inline math touches text or numbers directly, PanGu adds exterior spacing without changing the content inside. For example:

```diff
- 这是一个$c^2$公式
+ 这是一个 $c^2$ 公式
```

Display math does not receive exterior spacing. PanGu also adds a space when ASCII punctuation (`. , ! ? : ;`) is followed directly by Chinese text, so `It works.可以` becomes `It works. 可以`.

### Full Markdown formatting

This mode retains the previous full-formatting behavior. It additionally normalizes blank lines outside lists and ensures that the document ends with a newline. **Indentation width** and **Format embedded languages** apply only in this mode.

Tags, code, link destinations, and formulas remain protected in both modes.

## Spacing as you type

When enabled, PanGu adds spaces at Chinese/English/number boundaries touched by newly typed text. It waits for Chinese IME composition to finish before processing. This feature always uses local spacing logic and never triggers full Markdown formatting.

To avoid disrupting editing, automatic spacing skips:

- Paste, deletion, undo, and redo
- Selection replacement and multiple cursors
- Unclosed Markdown structures
- Notes longer than 10,000 UTF-16 code units

Large notes can still be formatted manually from the command palette.

## Development

Development uses Node.js 22 and Yarn Classic 1.22.22:

```bash
yarn install --frozen-lockfile
```

Common commands:

| Command | Purpose |
| --- | --- |
| `npm run dev` | Watch the source and rebuild continuously. |
| `npm run lint` | Run ESLint and Obsidian API compatibility checks. |
| `npm test` | Run unit and regression tests. |
| `npm run build` | Build the plugin into `dist/`. |
| `npm run test:e2e` | Build and run the E2E suite in the real Obsidian desktop app. |

By default, E2E tests use Obsidian 1.13.7 with installer 1.12.4. Before a release, run the matrix for both the current and minimum supported versions:

```bash
OBSIDIAN_VERSIONS='1.13.7/1.12.4 1.0.3/earliest' npm run test:e2e
```

Downloaded Obsidian builds are cached in `.obsidian-cache/`. Failure screenshots and runner logs are written to `e2e-results/`. See the [E2E engineering research](docs/research/obsidian-e2e.md) and [latest acceptance report](docs/acceptance-2026-09-22.md) for background and release criteria.

## Acknowledgements

Thanks to [pangu.vim](https://github.com/hotoo/pangu.vim), [writing4cn](https://marketplace.visualstudio.com/items?itemName=twocucao.writing4cn), and [pangu-markdown-vscode](https://github.com/zhuyuanxiang/pangu-markdown-vscode).
