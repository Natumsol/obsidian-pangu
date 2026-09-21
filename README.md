## Obsidian Pangu Plugin

A small plugin aims to add space between Chinese Characters and English Alphabet, and it is a boon for typographically compulsive people. For Example:

```diff
- 大多数人在20到30岁就已经过完自己的一生；一过了这个年龄段，他们就变成自己的影子。
+ 大多数人在 20 到 30 岁就已经过完自己的一生；一过了这个年龄段，他们就变成自己的影子。
```

## Formatting behavior

Obsidian tags such as `#中文English` are preserved while ordinary prose receives
Chinese/English spacing. Both inline math (`$...$`) and display math (`$$...$$`,
on one or multiple lines) are always preserved, including
subscripts, delimiters, and whitespace within formulas. Code spans and fenced
code blocks are not treated as math or tags.

Lists retain their original tabs, spaces, markers, numbering, and line breaks,
including nested task lists and lists inside blockquotes. Only prose inside lists
receives Chinese/English spacing; formulas and code remain untouched. Indented
code blocks also keep their original indentation.

Other Markdown layout can still be normalized, including blank lines outside
lists. The indentation setting is saved across restarts and applies to other
formatted content; it does not override existing list indentation.

## Development

Run `npm test` (Node.js 18 or later) for formatter and settings regression tests,
and `npm run build` to generate the plugin in `dist/`.

## Manual installation

Download zip archive from [GitHub releases page](https://github.com/natumsol/obsidian-pangu/releases).
Extract the archive into `<vault>/.obsidian/plugins`.

Alternatively, using bash:

```bash
OBSIDIAN_VAULT_DIR=/path/to/your/obsidian/vault
mkdir -p $OBSIDIAN_VAULT_DIR/.obsidian/plugins
unzip ~/Downloads/obsidian-pangu_v1.1.0.zip -d $OBSIDIAN_VAULT_DIR/.obsidian/plugins
```

### Thanks

Thanks to [pangu.vim](https://github.com/hotoo/pangu.vim), [writing4cn](https://marketplace.visualstudio.com/items?itemName=twocucao.writing4cn) and [pangu-markdown-vscode ](https://github.com/zhuyuanxiang/pangu-markdown-vscode)
