## Obsidian Pangu Plugin

A small plugin aims to add space between Chinese Characters and English Alphabet, For Example:

```diff
- 大多数人在20到30岁就已经过完自己的一生；一过了这个年龄段，他们就变成自己的影子。
+ 大多数人在 20 到 30 岁就已经过完自己的一生；一过了这个年龄段，他们就变成自己的影子。  
```
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