import { App, Modal, Notice, Plugin, PluginSettingTab, Setting, MarkdownView } from 'obsidian';
import formatUtil from './formatUtil';

interface MyPluginSettings {
  autoSpacing: boolean;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
  autoSpacing: true,
};

export default class MyPlugin extends Plugin {
  settings: MyPluginSettings;

  format(cm: CodeMirror.Editor): void {
    const cursor = cm.getCursor();
    let content = cm.getValue().trim();

    content = content + "\n\n";

    // 替换所有的全角数字为半角数字
    content = formatUtil.replaceFullNumbers(content);

    // 替换所有的全角英文和@标点 为 半角的英文和@标点
    content = formatUtil.replaceFullChars(content);

    // 删除多余的内容（回车）
    content = formatUtil.condenseContent(content);

    // 每行操作
    content = content.split("\n").map((line) => {
      // 中文内部使用全角标点
      line = formatUtil.replacePunctuations(line);

      // 删除多余的空格
      line = formatUtil.deleteSpaces(line);

      // 插入必要的空格
      line = formatUtil.insertSpace(line);

      // 将有编号列表的“1. ”改成 “1.  ”
      line = line.replace(/^(\s*)(\d\.)\s+(\S)/, '$1$2  $3');

      // 将无编号列表的“* ”改成 “-   ”
      // 将无编号列表的“- ”改成 “-   ”
      line = line.replace(/^(\s*)[-\*]\s+(\S)/, '$1-   $2');

      return line;
    }).join("\n");

    // 结束文档整理前再删除最后一个回车
    content = content.replace(/(\n){2,}$/g, '$1');
    content = content.replace(/(\r\n){2,}$/g, '$1');

    cm.setValue(content);
    cm.setCursor(cursor);
  }


  async onload() {
    await this.loadSettings();

    this.addCommand({
      id: 'pangu-format',
      name: '为中英文字符间自动加入空格',
      callback: () => {
        const activeLeafView = this.app.workspace.activeLeaf.view;
        if (activeLeafView instanceof MarkdownView) {
          this.format(activeLeafView.sourceMode.cmEditor);
        }
      },
    });

    this.registerCodeMirror(cm => {
      this.settings.autoSpacing &&
        cm.addKeyMap({
          'Ctrl-S': this.format,
          'Cmd-S': this.format,
        });
    });

    this.addSettingTab(new SampleSettingTab(this.app, this));
  }

  onunload() {
    console.log('unloading plugin');
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}

class SampleSettingTab extends PluginSettingTab {
  plugin: MyPlugin;

  constructor(app: App, plugin: MyPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    let { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl).setName('自动格式化').addToggle(toggle => {
      toggle.setValue(this.plugin.settings.autoSpacing);
      toggle.onChange(async value => {
        this.plugin.settings.autoSpacing = value;
        await this.plugin.saveSettings();
        new Notice('按 CMD + R 或 F5 重新载入后生效。');
      });
    });
  }
}
