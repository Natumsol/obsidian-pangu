import { App, MarkdownView, Plugin, PluginSettingTab, Setting } from "obsidian";
import { DEFAULT_SETTINGS, format, IPanGuSetting } from "./util";

export default class Pangu extends Plugin {
  settings: IPanGuSetting = DEFAULT_SETTINGS;

  format(cm: CodeMirror.Editor): void {
    let cursor = cm.getCursor();
    let cursorContent = cm.getRange({ ...cursor, ch: 0 }, cursor);
    const { top } = cm.getScrollInfo();

    cursorContent = format(cursorContent,this.settings);
    let content = cm.getValue().trim();
    content = format(content, this.settings);

    cm.setValue(content);
    cm.scrollTo(null, top);

    // 保持光标格式化后不变
    const newDocLine = cm.getLine(cursor.line);
    try {
      cursor = {
        ...cursor,
        ch: newDocLine.indexOf(cursorContent) + cursorContent.length,
      };
    } catch (error) {}

    cm.setCursor(cursor);
  }

  async onload() {
    this.addCommand({
      id: "pangu-format",
      name: "为中英文字符间自动加入空格",
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
          modifiers: ["Mod", "Shift"],
          key: "s",
        },
        {
          modifiers: ["Ctrl", "Shift"],
          key: "s",
        },
      ],
    });
    await this.loadSettings();
    this.addSettingTab(new PanguSettingTab(this.app, this));
  }

  onunload() {
    console.log("unloading plugin");
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
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
    containerEl.createEl("h2", { text: "Pangu 使用说明" });
    new Setting(containerEl)
      .setName("快速开始")
      .setDesc(
        "默认快捷键为:Mac - Command + Shift + S，Windows -  Shift + Ctrl + S。当然，您可以到「设置 - 快捷键」里进行更改。"
      );

    new Setting(containerEl)
      .setName("缩进宽度")
      .setDesc("指定格式化时，缩进所占空格数")
      .addDropdown((dropdown) => {
        dropdown
          .addOption("2", "2个空格")
          .addOption("4", "4个空格")
          .setValue(this.plugin.settings.tabWidth)
          .onChange(async (value) => {
            this.plugin.settings.tabWidth = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("格式化内嵌代码")
      .setDesc("指定格式化时，是否格式化文档中的内嵌代码")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.embeddedLanguageFormatting)
          .onChange(async (value) => {
            this.plugin.settings.embeddedLanguageFormatting = value;
            await this.plugin.saveSettings();
          })
      );
  }
}
