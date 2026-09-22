import { App, MarkdownView, Plugin, PluginSettingTab, Setting } from "obsidian";
import type { Editor, SettingDefinitionItem } from "obsidian";
import { DEFAULT_SETTINGS, format, IPanGuSetting } from "./util";
import { applyEdits, textEdits } from "./editing";
import { bindAutomaticSpacing } from "./automatic-spacing";
import { createTranslator } from "./i18n";
import type { Translator } from "./i18n";

export default class Pangu extends Plugin {
  settings: IPanGuSetting = DEFAULT_SETTINGS;
  private automaticBindings = new Map<MarkdownView, () => void>();
  private stopped = false;

  format(editor: Editor): void {
    const before = editor.getValue();
    // Obsidian unfolds edited ranges for ordinary user transactions. Its
    // programmatic "set" origin preserves mapped folds without resetting text.
    applyEdits(editor, textEdits(before, format(before, this.settings)), "set");
  }

  async onload() {
    const t = createTranslator();
    this.addCommand({
      id: "pangu-format",
      name: t("commandFormat"),
      editorCallback: (editor) => this.format(editor),
      hotkeys: [
        { modifiers: ["Mod", "Shift"], key: "s" },
        { modifiers: ["Ctrl", "Shift"], key: "s" },
      ],
    });
    await this.loadSettings();
    this.addSettingTab(new PanguSettingTab(this.app, this, t));
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
  private t: Translator;

  constructor(app: App, plugin: Pangu, t: Translator) {
    super(app, plugin);
    this.plugin = plugin;
    this.t = t;
  }

  // Obsidian 1.13+ uses these searchable, automatically persisted controls.
  getSettingDefinitions(): SettingDefinitionItem<keyof IPanGuSetting>[] {
    return [
      {
        name: this.t("quickStartName"),
        desc: this.t("quickStartDesc"),
      },
      {
        name: this.t("formatModeName"),
        desc: this.t("formatModeDesc"),
        control: {
          type: "dropdown",
          key: "formatMode",
          defaultValue: DEFAULT_SETTINGS.formatMode,
          options: {
            spacing: this.t("formatModeSpacing"),
            markdown: this.t("formatModeMarkdown"),
          },
        },
      },
      {
        name: this.t("tabWidthName"),
        desc: this.t("tabWidthDesc"),
        control: {
          type: "dropdown",
          key: "tabWidth",
          defaultValue: DEFAULT_SETTINGS.tabWidth,
          options: { "2": this.t("tabWidth2"), "4": this.t("tabWidth4") },
        },
      },
      {
        name: this.t("embeddedCodeName"),
        desc: this.t("embeddedCodeDesc"),
        control: {
          type: "toggle",
          key: "embeddedLanguageFormatting",
          defaultValue: DEFAULT_SETTINGS.embeddedLanguageFormatting,
        },
      },
      {
        name: this.t("autoSpacingName"),
        desc: this.t("autoSpacingDesc"),
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
      .setName(this.t("quickStartName"))
      .setDesc(this.t("quickStartDesc"));

    new Setting(containerEl)
      .setName(this.t("formatModeName"))
      .setDesc(this.t("formatModeDesc"))
      .addDropdown((dropdown) => {
        dropdown
          .addOption("spacing", this.t("formatModeSpacing"))
          .addOption("markdown", this.t("formatModeMarkdown"))
          .setValue(this.plugin.settings.formatMode || "spacing")
          .onChange(async (value) => {
            this.plugin.settings.formatMode =
              value === "markdown" ? "markdown" : "spacing";
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName(this.t("tabWidthName"))
      .setDesc(this.t("tabWidthDesc"))
      .addDropdown((dropdown) => {
        dropdown
          .addOption("2", this.t("tabWidth2"))
          .addOption("4", this.t("tabWidth4"))
          .setValue(this.plugin.settings.tabWidth)
          .onChange(async (value) => {
            this.plugin.settings.tabWidth = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName(this.t("embeddedCodeName"))
      .setDesc(this.t("embeddedCodeDesc"))
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.embeddedLanguageFormatting)
          .onChange(async (value) => {
            this.plugin.settings.embeddedLanguageFormatting = value;
            await this.plugin.saveSettings();
          })
      );
    new Setting(containerEl)
      .setName(this.t("autoSpacingName"))
      .setDesc(this.t("autoSpacingDesc"))
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
