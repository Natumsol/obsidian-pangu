## PanGu for Obsidian

A small plugin aims to add space between Chinese Characters and English Alphabet, and it is a boon for typographically compulsive people. For Example:

```diff
- 大多数人在20到30岁就已经过完自己的一生；一过了这个年龄段，他们就变成自己的影子。
+ 大多数人在 20 到 30 岁就已经过完自己的一生；一过了这个年龄段，他们就变成自己的影子。
```

## Formatting behavior

Obsidian tags such as `#中文English` and `#中文👩🏽‍💻English` are preserved while
ordinary prose receives Chinese/English spacing. Both inline math (`$...$`) and
display math (`$$...$$`, on one or multiple lines) are always preserved, including
subscripts, delimiters, and whitespace within formulas (also directly inside
`$$` delimiters). Code spans and fenced code blocks are not treated as math or tags.

Lists retain their original tabs, spaces, markers, numbering, and line breaks,
including nested task lists and lists inside blockquotes. Only prose inside lists
receives Chinese/English spacing; formulas and code remain untouched. Indented
code blocks also keep their original indentation.

The default **spacing-only** mode preserves Markdown layout: leading, internal,
and trailing blank lines, whitespace on blank lines, line endings, and whether
the document ends in a newline. It only adds spacing to prose and never formats
code blocks. Existing installations without a saved mode use this default too.

Inline code and inline math receive exterior spaces when directly adjacent to
letters or numbers (for example, `这是一个$c^2$公式` becomes `这是一个 $c^2$ 公式`).
Their delimiters and internal content remain literal; existing whitespace and
adjacent punctuation are not changed. Display math does not receive this spacing.

Choose **完整 Markdown 排版** in the **格式化模式** setting to retain the previous
full-formatting behavior, including normalization of blank lines outside lists
and a final newline. The indentation and embedded-code settings apply only in
this mode. Lists, formulas, and inline code remain protected in both modes;
formula protection cannot be disabled. All settings are saved across restarts.
On Obsidian 1.13 and later, these controls also appear in settings search; older
versions keep the existing settings page.

## Development

Install dependencies with Yarn Classic 1.22.22: `yarn install --frozen-lockfile`.
The Obsidian API dependency uses a fixed registry version, not a changing GitHub
branch archive; commit `yarn.lock` whenever dependencies change.

Run `npm test` (Node.js 18 or later) for formatter and settings regression tests,
and `npm run build` to generate the plugin in `dist/`.

## Usage

Run **为中英文字符间自动加入空格** from the command palette. No shortcut is assigned
by default; bind your preferred shortcut in Obsidian's hotkey settings. Existing
user-assigned shortcuts are not removed.

## Manual installation

Download `main.js` and `manifest.json` from the same version on the
[GitHub releases page](https://github.com/natumsol/obsidian-pangu/releases).
Place both files in `<vault>/.obsidian/plugins/obsidian-pangu/`, then reload
Obsidian and enable PanGu. When updating, keep your existing `data.json` settings.

New releases upload only supported plugin files rather than an additional ZIP.
GitHub publication does not guarantee availability in the community directory;
the listing must also pass Obsidian's checks.

### Thanks

Thanks to [pangu.vim](https://github.com/hotoo/pangu.vim), [writing4cn](https://marketplace.visualstudio.com/items?itemName=twocucao.writing4cn) and [pangu-markdown-vscode ](https://github.com/zhuyuanxiang/pangu-markdown-vscode)
