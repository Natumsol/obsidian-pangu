import { App, Modal, Notice, Plugin, PluginSettingTab, Setting, MarkdownView } from 'obsidian';
import { spacing } from 'pangu';

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
    cm.setValue(spacing(cm.getValue().trim()));
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

class SampleModal extends Modal {
  constructor(app: App) {
    super(app);
  }

  onOpen() {
    let { contentEl } = this;
    contentEl.setText('Woah!');
  }

  onClose() {
    let { contentEl } = this;
    contentEl.empty();
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
