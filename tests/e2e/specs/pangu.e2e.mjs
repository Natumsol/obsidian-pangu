import assert from "node:assert/strict";
import { browser } from "@wdio/globals";
import { obsidianPage } from "wdio-obsidian-service";

const pluginId = "obsidian-pangu";
let primaryWindow;
const original =
  "# 折叠标题Title\n\n折叠正文English\n\n## 子标题Subtitle\n\n子正文Text\n\n# 展开标题Title\n\n中文English\n";
const expected =
  "# 折叠标题 Title\n\n折叠正文 English\n\n## 子标题 Subtitle\n\n子正文 Text\n\n# 展开标题 Title\n\n中文 English\n";

function isSimplifiedChinese(locale) {
  return ["zh", "zh-cn", "zh-hans", "zh-sg"].includes(
    locale.toLowerCase().replaceAll("_", "-")
  );
}

function localized(locale, english, chinese) {
  return isSimplifiedChinese(locale) ? chinese : english;
}

async function resetSettings() {
  await browser.executeObsidian(async ({ plugins }) => {
    const plugin = plugins.obsidianPangu;
    Object.assign(plugin.settings, {
      tabWidth: "2",
      embeddedLanguageFormatting: false,
      formatMode: "spacing",
      autoSpacing: false,
    });
    await plugin.saveSettings();
  });
}

async function prepareEditor(text = original) {
  await obsidianPage.openFile("Acceptance.md");
  await browser.executeObsidian(async ({ app }, value) => {
    const leaf = app.workspace
      .getLeavesOfType("markdown")
      .find((candidate) => candidate.view.file?.path === "Acceptance.md");
    app.workspace.setActiveLeaf(leaf, { focus: true });
    await leaf.view.setState({ ...leaf.view.getState(), source: false }, {});
    const editor = leaf.view.editor;
    editor.setValue(value);
    editor.setCursor({ line: 0, ch: 0 });
    editor.focus();
  }, text);
  await browser.waitUntil(async () => {
    return browser.executeObsidian(({ app, obsidian }, value) => {
      const view = app.workspace.getActiveViewOfType(obsidian.MarkdownView);
      return view?.editor.getValue() === value;
    }, text);
  });
}

async function editorState() {
  return browser.executeObsidian(({ app }) => {
    const leaf = app.workspace.getLeavesOfType("markdown").find(
      (candidate) => candidate.view.file?.path === "Acceptance.md"
    );
    const editor = leaf.view.editor;
    return {
      text: editor.getValue(),
      folds: [...editor.getFoldOffsets()].map(
        (offset) => editor.offsetToPos(offset).line
      ),
      cursor: editor.getCursor(),
    };
  });
}

async function findSettingToggle(name) {
  for (const item of await browser.$$(".setting-item")) {
    const label = item.$(".setting-item-name");
    if ((await label.isExisting()) && (await label.getText()) === name) {
      return item.$(".checkbox-container");
    }
  }
}

describe("PanGu in an isolated Obsidian client", function () {
  before(async function () {
    assert.equal(browser.getObsidianVersion().length > 0, true);
    primaryWindow = await browser.getWindowHandle();
    await resetSettings();
  });

  beforeEach(async function () {
    await browser.switchToWindow(primaryWindow);
    await obsidianPage.resetVault();
    await resetSettings();
    await prepareEditor();
  });

  after(async function () {
    await resetSettings();
    await browser.executeObsidian(({ app }) => app.setting.close());
  });

  it("loads the staged plugin and declared compatibility floor", async function () {
    const state = await browser.executeObsidian(({ app, obsidian, plugins }) => ({
      loaded: Boolean(plugins.obsidianPangu),
      command: Boolean(app.commands.commands["obsidian-pangu:pangu-format"]),
      commandName:
        app.commands.commands["obsidian-pangu:pangu-format"]?.name,
      locale: obsidian.moment.locale(),
      minimum: app.plugins.manifests["obsidian-pangu"].minAppVersion,
    }));
    assert.equal(state.loaded, true);
    assert.equal(state.command, true);
    assert.equal(state.minimum, "1.0.3");
    assert.equal(
      state.commandName.endsWith(
        localized(
          state.locale,
          "Add spaces between Chinese and English",
          "为中英文字符间自动加入空格"
        )
      ),
      true
    );
  });

  it("formats through the real shortcut and preserves folds and undo", async function () {
    const before = await browser.executeObsidian(({ app }) => {
      const view = app.workspace.getLeavesOfType("markdown").find(
        (leaf) => leaf.view.file?.path === "Acceptance.md"
      ).view;
      const editor = view.editor;
      editor.setCursor({ line: 0, ch: 0 });
      editor.exec("foldAll");
      editor.setCursor({ line: 8, ch: 0 });
      editor.exec("toggleFold");
      editor.setCursor({ line: 0, ch: 0 });
      editor.focus();
      return {
        folds: [...editor.getFoldOffsets()].map(
          (offset) => editor.offsetToPos(offset).line
        ),
        cursor: editor.getCursor(),
      };
    });
    assert.deepEqual(before.folds, [0, 4]);

    const platform = await obsidianPage.getPlatform();
    await browser.keys([platform.isMacOS ? "Meta" : "Control", "Shift", "s"]);
    await browser.keys("NULL");
    await browser.waitUntil(async () => (await editorState()).text === expected);

    const after = await editorState();
    assert.deepEqual(after.folds, before.folds);
    assert.deepEqual(after.cursor, before.cursor);

    await browser.executeObsidian(({ app, obsidian }) => {
      app.workspace.getActiveViewOfType(obsidian.MarkdownView).editor.undo();
    });
    await browser.waitUntil(async () => (await editorState()).text === original);
  });

  it("adds spacing after real editor input when the setting is enabled", async function () {
    await browser.executeObsidian(async ({ app, obsidian, plugins }) => {
      const plugin = plugins.obsidianPangu;
      plugin.settings.autoSpacing = true;
      await plugin.saveSettings();
      const editor = app.workspace.getActiveViewOfType(
        obsidian.MarkdownView
      ).editor;
      editor.setValue("中文");
      editor.setCursor({ line: 0, ch: 2 });
      editor.focus();
    });
    await browser.keys("A");
    await browser.waitUntil(async () => (await editorState()).text === "中文 A");
  });

  it("persists the automatic spacing toggle through the real settings UI", async function () {
    const initialWindows = await browser.getWindowHandles();
    const locale = await browser.executeObsidian(({ obsidian }) =>
      obsidian.moment.locale()
    );
    const autoSpacingLabel = localized(
      locale,
      "Add spaces as you type",
      "输入时自动补空格"
    );
    let settingsWindow;
    try {
      await browser.executeObsidianCommand("app:open-settings");
      await browser.waitUntil(
        async () => {
          if ((await browser.getWindowHandles()).length > initialWindows.length) {
            return true;
          }
          return browser.$(".modal.mod-settings").isDisplayed();
        },
        { timeoutMsg: "Obsidian settings window did not open" }
      );
      settingsWindow =
        (await browser.getWindowHandles()).find(
          (handle) => !initialWindows.includes(handle)
        ) || primaryWindow;
      await browser.switchToWindow(settingsWindow);
      await browser.$(".modal.mod-settings").waitForDisplayed();

      const navigation = await browser.$$(".vertical-tab-nav-item");
      let pluginTab;
      for (const item of navigation) {
        if ((await item.getText()) === "PanGu") {
          pluginTab = item;
          break;
        }
      }
      assert.ok(pluginTab, "PanGu settings tab must be visible");
      await pluginTab.click();
      await browser.waitUntil(
        async () => Boolean(await findSettingToggle(autoSpacingLabel)),
        { timeoutMsg: "PanGu settings controls did not render" }
      );
      const toggle = await findSettingToggle(autoSpacingLabel);
      assert.ok(toggle, "automatic spacing setting must be visible");
      if ((await toggle.getAttribute("class")).includes("is-enabled")) {
        await toggle.click();
      }
      await toggle.click();
      await browser.switchToWindow(primaryWindow);
      await browser.waitUntil(() =>
        browser.executeObsidian(
          ({ plugins }) => plugins.obsidianPangu.settings.autoSpacing === true
        )
      );

      await obsidianPage.disablePlugin(pluginId);
      await obsidianPage.enablePlugin(pluginId);
      assert.equal(
        await browser.executeObsidian(
          ({ plugins }) => plugins.obsidianPangu.settings.autoSpacing
        ),
        true
      );
    } finally {
      if (
        settingsWindow &&
        settingsWindow !== primaryWindow &&
        (await browser.getWindowHandles()).includes(settingsWindow)
      ) {
        await browser.switchToWindow(settingsWindow);
        await browser.closeWindow();
      }
      await browser.switchToWindow(primaryWindow);
      await browser.executeObsidian(({ app }) => app.setting.close());
    }
  });
});
