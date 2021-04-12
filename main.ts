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
    let cursor = cm.getCursor();
    let cursorContent = cm.getRange({ ...cursor, ch: 0 }, cursor);

    cursorContent = formatUtil.formatContent(cursorContent);

    let content = cm.getValue().trim();
    content = content + '\n\n';
    content = formatUtil.formatContent(content);

    cm.setValue(content);

    // 保持光标格式化后不变
    const newDocLine = cm.getLine(cursor.line);
    try {
      cursor = { ...cursor, ch: newDocLine.indexOf(cursorContent) + cursorContent.length };
    } catch (error) {}

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

    this.registerCodeMirror((cm: { addKeyMap: (arg0: { 'Ctrl-S': (cm: any) => void, 'Cmd-S': (cm: any) => void }) => any }) => {
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

    new Setting(containerEl).setName('自动格式化').addToggle((toggle: { setValue: (arg0: boolean) => void, onChange: (arg0: (value: any) => Promise<void>) => void }) => {
      toggle.setValue(this.plugin.settings.autoSpacing);
      toggle.onChange(async (value: boolean) => {
        this.plugin.settings.autoSpacing = value;
        await this.plugin.saveSettings();
        new Notice('按 CMD + R 或 F5 重新载入后生效。');
      });
    });
  }
}
