import { App, MarkdownView, Plugin, PluginSettingTab, Setting } from "obsidian";
import type { Editor, SettingDefinitionItem } from "obsidian";
import { DEFAULT_SETTINGS, format, IPanGuSetting } from "./util";
import { applyEdits, textEdits } from "./editing";
import { bindAutomaticSpacing } from "./automatic-spacing";

export default class Pangu extends Plugin {
  settings: IPanGuSetting = DEFAULT_SETTINGS;
  private automaticBindings = new Map<MarkdownView, () => void>();
  private stopped = false;

  format(editor: Editor): void {
    const before = editor.getValue();
    applyEdits(editor, textEdits(before, format(before, this.settings)));
  }

  async onload() {
    this.addCommand({
      id: "pangu-format",
      name: "为中英文字符间自动加入空格",
      editorCallback: (editor) => this.format(editor),
    });
    await this.loadSettings();
    this.addSettingTab(new PanguSettingTab(this.app, this));
    const syncEditors = () => {
      if (this.stopped) return;
      const views = new Set<MarkdownView>();
      this.app.workspace.iterateAllLeaves((leaf) => {
        if (!(leaf.view instanceof MarkdownView)) return;
        const view = leaf.view;
        views.add(view);
        if (!this.automaticBindings.has(view)) {
          this.automaticBindings.set(
            view,
            bindAutomaticSpacing(view, () => this.settings.autoSpacing === true)
          );
        }
      });
      for (const [view, dispose] of this.automaticBindings) {
        if (!views.has(view)) {
          dispose();
          this.automaticBindings.delete(view);
        }
      }
    };
    this.register(() => {
      this.stopped = true;
      this.automaticBindings.forEach((dispose) => dispose());
      this.automaticBindings.clear();
    });
    this.registerEvent(this.app.workspace.on("layout-change", syncEditors));
    this.app.workspace.onLayoutReady(syncEditors);
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
      {
        name: "输入时自动补空格",
        desc: "默认关闭；仅在输入确认后补充附近的中英文间距，不处理粘贴、删除或撤销。超过 10,000 UTF-16 单元的笔记请手动格式化",
        control: {
          type: "toggle",
          key: "autoSpacing",
          defaultValue: DEFAULT_SETTINGS.autoSpacing,
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
    new Setting(containerEl)
      .setName("输入时自动补空格")
      .setDesc(
        "默认关闭；仅在输入确认后补充附近的中英文间距，不处理粘贴、删除或撤销。超过 10,000 UTF-16 单元的笔记请手动格式化"
      )
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.autoSpacing === true)
          .onChange(async (value) => {
            this.plugin.settings.autoSpacing = value;
            await this.plugin.saveSettings();
          })
      );
  }
}
