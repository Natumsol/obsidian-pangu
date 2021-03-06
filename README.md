## Obsidian Pangu Plugin

A small plugin aims to add space between Chinese Characters and English Alphabet, powered by [pangu.js](https://github.com/vinta/pangu.js).

For Example:

```diff
- 大多数人在20到30岁就已经过完自己的一生；一过了这个年龄段，他们就变成自己的影子。
+ 大多数人在 20 到 30 岁就已经过完自己的一生；一过了这个年龄段，他们就变成自己的影子。  
```
### How to use

- Clone this repo.
- `npm i` or `yarn` to install dependencies
- `npm run dev` to start compilation in watch mode.

### Manually installing the plugin

- Copy over `main.js`, `styles.css`, `manifest.json` to your vault `VaultFolder/.obsidian/plugins/your-plugin-id/`.

