import { App, Plugin, PluginSettingTab, Setting, MarkdownView } from 'obsidian';
import { format } from './util';

export default class Pangu extends Plugin {
  format(cm: CodeMirror.Editor): void {
    let cursor = cm.getCursor();
    let cursorContent = cm.getRange({ ...cursor, ch: 0 }, cursor);
    const { top } = cm.getScrollInfo();

    cursorContent = format(cursorContent);
    let content = cm.getValue().trim();
    content = format(content)

    cm.setValue(content);
    cm.scrollTo(null, top);

    // 保持光标格式化后不变
    const newDocLine = cm.getLine(cursor.line);
    try {
      cursor = {
        ...cursor,
        ch: newDocLine.indexOf(cursorContent) + cursorContent.length,
      };
    } catch (error) { }

    cm.setCursor(cursor);
  }

  async onload() {
    this.addCommand({
      id: 'pangu-format',
      name: '为中英文字符间自动加入空格',
      callback: () => {
        const activeLeafView =
          this.app.workspace.getActiveViewOfType(MarkdownView);
        if (activeLeafView) {
          // @ts-ignore
          this.format(activeLeafView?.sourceMode?.cmEditor);
        }
      },
      hotkeys: [
        {
          modifiers: ['Mod', 'Shift'],
          key: 's',
        },
        {
          modifiers: ['Ctrl', 'Shift'],
          key: 's',
        },
      ],
    });

    this.addSettingTab(new PanguSettingTab(this.app, this));
  }

  onunload() {
    console.log('unloading plugin');
  }

  async loadSettings() { }
}

class PanguSettingTab extends PluginSettingTab {
  plugin: Pangu;

  constructor(app: App, plugin: Pangu) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    let { containerEl } = this;
    containerEl.empty();
    containerEl.createEl('h2', { text: 'Pangu 使用说明' });
    new Setting(containerEl)
      .setName('')
      .setDesc(
        '默认快捷键为:Mac - Command + Shift + S，Windows -  Shift + Ctrl + S。当然，您可以到「设置 - 快捷键」里进行更改。'
      );
  }
}
