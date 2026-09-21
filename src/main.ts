import { App, MarkdownView, Plugin, PluginSettingTab, Setting } from "obsidian";
import type { SettingDefinitionItem } from "obsidian";
import type { Editor as CodeMirrorEditor } from "codemirror";
import { DEFAULT_SETTINGS, format, IPanGuSetting } from "./util";

export default class Pangu extends Plugin {
  settings: IPanGuSetting = DEFAULT_SETTINGS;

  format(cm: CodeMirrorEditor): void {
    let cursor = cm.getCursor();
    let cursorContent = cm.getRange({ ...cursor, ch: 0 }, cursor);
    const { top } = cm.getScrollInfo();

    cursorContent = format(cursorContent, this.settings);
    let content = cm.getValue();
    content = format(content, this.settings);

    cm.setValue(content);
    cm.scrollTo(null, top);

    // 保持光标格式化后不变
    const newDocLine = cm.getLine(cursor.line);
    const match = newDocLine?.indexOf(cursorContent) ?? -1;
    if (match >= 0) {
      cursor = {
        ...cursor,
        ch: match + cursorContent.length,
      };
    }

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
    });
    await this.loadSettings();
    this.addSettingTab(new PanguSettingTab(this.app, this));
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

  // Obsidian 1.13+ uses these searchable, automatically persisted controls.
  getSettingDefinitions(): SettingDefinitionItem<keyof IPanGuSetting>[] {
    return [
      {
        name: "快速开始",
        desc: "在命令面板中运行「为中英文字符间自动加入空格」，或前往「设置 - 快捷键」自行绑定快捷键。",
      },
      {
        name: "格式化模式",
        desc: "默认只补空格，保留空行和 Markdown 布局；完整排版会规范化其他 Markdown 布局。两种模式都保护公式原文",
        control: {
          type: "dropdown",
          key: "formatMode",
          defaultValue: DEFAULT_SETTINGS.formatMode,
          options: {
            spacing: "只补空格（保留布局）",
            markdown: "完整 Markdown 排版",
          },
        },
      },
      {
        name: "缩进宽度",
        desc: "仅完整排版模式生效；列表始终保留原有的 Tab 和空格缩进",
        control: {
          type: "dropdown",
          key: "tabWidth",
          defaultValue: DEFAULT_SETTINGS.tabWidth,
          options: { "2": "2个空格", "4": "4个空格" },
        },
      },
      {
        name: "格式化内嵌代码",
        desc: "仅完整排版模式生效；只补空格模式不修改代码。行内代码始终保留原文",
        control: {
          type: "toggle",
          key: "embeddedLanguageFormatting",
          defaultValue: DEFAULT_SETTINGS.embeddedLanguageFormatting,
        },
      },
    ];
  }

  // Older Obsidian versions still render the imperative settings page.
  display(): void {
    let { containerEl } = this;
    containerEl.empty();
    new Setting(containerEl)
      .setName("快速开始")
      .setDesc(
        "在命令面板中运行「为中英文字符间自动加入空格」，或前往「设置 - 快捷键」自行绑定快捷键。"
      );

    new Setting(containerEl)
      .setName("格式化模式")
      .setDesc(
        "默认只补空格，保留空行和 Markdown 布局；完整排版会规范化其他 Markdown 布局。两种模式都保护公式原文"
      )
      .addDropdown((dropdown) => {
        dropdown
          .addOption("spacing", "只补空格（保留布局）")
          .addOption("markdown", "完整 Markdown 排版")
          .setValue(this.plugin.settings.formatMode || "spacing")
          .onChange(async (value) => {
            this.plugin.settings.formatMode =
              value === "markdown" ? "markdown" : "spacing";
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("缩进宽度")
      .setDesc("仅完整排版模式生效；列表始终保留原有的 Tab 和空格缩进")
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
      .setDesc(
        "仅完整排版模式生效；只补空格模式不修改代码。行内代码始终保留原文"
      )
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
