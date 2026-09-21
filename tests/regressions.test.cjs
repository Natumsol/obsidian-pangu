const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

// Load the actual TS sources, substituting only browser ESM entry points and
// Obsidian's host objects; no application logic is duplicated here.
function loadSource(file, overrides = {}) {
  const source = fs.readFileSync(`${__dirname}/../src/${file}.ts`, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2018,
      esModuleInterop: true,
    },
  });
  const module = { exports: {} };
  vm.runInNewContext(
    outputText,
    {
      module,
      exports: module.exports,
      console,
      require: (name) =>
        overrides[name] || require(name.replace("prettier/esm/", "prettier/")),
    },
    { filename: `${file}.js` }
  );
  return module.exports;
}

const util = loadSource("util");
const { format, DEFAULT_SETTINGS } = util;
const matrix = String.raw`$$
\begin{bmatrix}
1 & k_{21} & k_{31} & \cdots & k_{n1} \\
0 & 1 & k_{32} & \cdots & k_{n2} \\
0 & 0 & 1 & \cdots & k_{n3} \\
\end{bmatrix}
$$`;

test("#41/#39/#10: default spacing preserves blank lines and the original EOF", () => {
  const input =
    "\n\n# 标题Title\n## 二级Header\n\n\n### 三级Header\n\n\n正文English";
  const expected =
    "\n\n# 标题 Title\n## 二级 Header\n\n\n### 三级 Header\n\n\n正文 English";
  assert.equal(format(input), expected);
  assert.equal(format(expected), expected);
});

test("spacing mode keeps mixed line endings, blank-line whitespace and literal blocks", () => {
  const input =
    "\r\n# 标题Title\r\n\t \r\n\n正文English  \r\n下一行Text\n\n```js\r\n中文English`code`$x_1$\r\n```\r\n\r\n";
  const expected =
    "\r\n# 标题 Title\r\n\t \r\n\n正文 English  \r\n下一行 Text\n\n```js\r\n中文English`code`$x_1$\r\n```\r\n\r\n";
  assert.equal(format(input), expected);
  assert.equal(format(expected), expected);
  for (const whitespace of ["", "\n", "\r\n\r\n", " \t\n\n\t"]) {
    assert.equal(format(whitespace), whitespace);
  }
});

test("spacing mode preserves reference identifiers, destinations and wiki links", () => {
  const input =
    "[中文English][] [中文`code`后] [中文$x$后][ref]\n\n[中文English]: https://example.com/中文English\n[中文`code`后]: /target\n[ref]: /target\n\n[[中文English]] ![[中文English|标签Text]]";
  const expected =
    "[中文English][] [中文`code`后] [中文 $x$ 后][ref]\n\n[中文English]: https://example.com/中文English\n[中文`code`后]: /target\n[ref]: /target\n\n[[中文English]] ![[中文English|标签Text]]";
  assert.equal(format(input), expected);
  assert.equal(format(expected), expected);
});

test("#37: inline code receives exterior spacing without separating punctuation", () => {
  const input =
    "估计是`Player`类的`run()`方法太慢，`fps`只有`30`。This `demo`, works.\n";
  const expected =
    "估计是 `Player` 类的 `run()` 方法太慢，`fps` 只有 `30`。This `demo`, works.\n";
  assert.equal(format(input), expected);
  assert.equal(format(expected), expected);
});

test("#40: inline math receives exterior spacing while its source stays literal", () => {
  const input = "这是一个$c^2=a^2+b^2$行内公式，$x_1  + y_2$。\n";
  const expected = "这是一个 $c^2=a^2+b^2$ 行内公式，$x_1  + y_2$。\n";
  assert.equal(format(input), expected);
  assert.equal(format(expected), expected);
});

test("inline-looking code inside display math never receives spacing", () => {
  const input = "前$$ 中文`code`English + a_{1} $$后\n";
  for (const formatMode of ["spacing", "markdown"]) {
    const options = { ...DEFAULT_SETTINGS, formatMode };
    assert.equal(format(input, options), input);
    assert.equal(format(format(input, options), options), input);
  }
});

for (const formatMode of ["spacing", "markdown"]) {
  for (const prefix of ["", "- ", "> "]) {
    test(`inline spacing preserves delimiters, whitespace and punctuation (${formatMode}, ${
      prefix || "prose"
    })`, () => {
      const options = { ...DEFAULT_SETTINGS, formatMode };
      const input = `${prefix}中\`\` a \` b  \`\`文，\`x\`。前$x_1  + y_2$后；($z_3$)，English\`code\`123\n`;
      const expected = `${prefix}中 \`\` a \` b  \`\` 文，\`x\`。前 $x_1  + y_2$ 后；($z_3$)，English \`code\` 123\n`;
      assert.equal(format(input, options), expected);
      assert.equal(format(expected, options), expected);
    });
  }
}

test("#34: matrix subscripts and line breaks survive formatting", () => {
  assert.equal(format(matrix), matrix);
});

for (const [input, expected] of [
  ["前$x_1+y_2$后\n", "前 $x_1+y_2$ 后\n"],
  ["前$x_1  + y_2$后\n", "前 $x_1  + y_2$ 后\n"],
  [
    "行内$x_1  + y_2$和$z_3$。\n\n$$\nx_1  + y_2 = z_3\n$$\n\n后续$a_1$。\n",
    "行内 $x_1  + y_2$ 和 $z_3$。\n\n$$\nx_1  + y_2 = z_3\n$$\n\n后续 $a_1$。\n",
  ],
  ["前$\\text{$&} + x_1$后\n", "前 $\\text{$&} + x_1$后\n"],
  ["前$\\text{\\$&} + x_1$后\n", "前 $\\text{\\$&} + x_1$ 后\n"],
  ["- $x_1$中文\n", "- $x_1$ 中文\n"],
]) {
  test(`inline math changes only exterior spacing: ${JSON.stringify(
    input
  )}`, () => {
    assert.equal(format(input), expected);
    assert.equal(format(expected), expected);
  });
}

for (const input of [
  "$$x_1  + y_2$$\n",
  "$$ a_{1} + b_{2} $$\n",
  "$$  a_{1}  + b_{2}  $$\n",
  "前$$ a_{1} + b_{2} $$后\n",
  "> $$ a_{1} + b_{2} $$\n",
  "- $$ 中文English + a_{1} + b_{2} $$\n",
  "$$ a_{1} $$ 和 $$ b_{2} $$\n",
  "$$ \\text{#中文😀English} + a_{1} + b_{2} $$\n",
  "$$ \\text{\\$$} + a_{1} + b_{2} $$\n",
  "\\$$ literal 和 $$ a_{1} + b_{2} $$\n",
  "$$a_1$$ 和 $$ b_{2} + c_{3} $$\n",
  "`$$ a_{1} + b_{2} $$`\n",
  "```text\n$$ a_{1} + b_{2} $$\n```\n",
  "$$\nx_1  + y_2\n\n  z_3 = 4\n$$\n",
  "> $$\n>  x_1+y_2\n> $$\n",
  "- item\n\n  $$\n    x_1+y_2\n  $$\n",
  "`$x_1$`\n",
  "```text\n$x_1$ #中文English\n```\n",
  "> > $$\n> > x_1 + y_2\n> > $$\n",
]) {
  test(`math protection preserves context: ${JSON.stringify(input)}`, () => {
    assert.equal(format(input), input);
    assert.equal(format(format(input)), input);
  });
}

test("#31: tags remain intact while ordinary prose receives spaces", () => {
  assert.equal(
    format("#中文English标签 #项目/sub项目 #my_tag_x 中文English"),
    "#中文English标签 #项目/sub项目 #my_tag_x 中文 English"
  );
});

for (const tag of [
  "#😀中文English",
  "#中文😀English标签",
  "#中文👩🏽‍💻English标签",
  "#中文🇨🇳English标签",
  "#中文❤️English标签",
  "#中文1️⃣English标签",
  "#中文©English标签/子项Test",
]) {
  test(`Unicode tag stays intact: ${tag}`, () => {
    for (const prefix of ["", "- ", "> "]) {
      const input = `${prefix}${tag} 中文English\n`;
      const expected = `${prefix}${tag} 中文 English\n`;
      assert.equal(format(input), expected);
      assert.equal(format(expected), expected);
    }
  });
}

test("emoji tags stop at Markdown and formula delimiters", () => {
  const input = "**#中文😀English** $x_1$ 和 $$ a_{1} + b_{2} $$\n";
  assert.equal(format(input), input);
  assert.equal(format(format(input)), input);
});

test("math placeholders cannot collide with literal text", () => {
  const input = "PANGUTAGMATH0X #中文😀English $$ a_{1} + b_{2} $$\n";
  assert.equal(format(input), input);
  assert.equal(format(format(input)), input);
});

test("tag protection respects Markdown contexts and literal placeholder-like text", () => {
  const input =
    "# Heading标题\n\n`#中文English` [link](https://example.com/#中文English)\n\nPANGUTAG0X #中文English\n";
  const output = format(input);
  assert.ok(output.includes("# Heading 标题"));
  assert.ok(output.includes("`#中文English`"));
  assert.ok(output.includes("https://example.com/#中文English"));
  assert.ok(output.includes("PANGUTAG0X #中文English"));
  assert.equal(format(output), output);
});

test("legacy settings cannot enable math formatting", () => {
  const formula = "前$x_1  + y_2$后\n";
  assert.equal(
    format(formula, { ...DEFAULT_SETTINGS, enableMathFormatting: true }),
    "前 $x_1  + y_2$ 后\n"
  );
});

test("frontmatter, escaped dollar signs, and reference destinations are preserved", () => {
  const input =
    "---\ntags: [中文English]\n---\n\n价格\\$5，标签 #中文English\n\n[ref]: https://example.com/#中文English\n";
  const output = format(input);
  assert.ok(output.includes("tags: [中文English]"));
  assert.ok(output.includes("\\$5"));
  assert.ok(output.includes("#中文English"));
  assert.ok(output.includes("[ref]: https://example.com/#中文English"));
  assert.equal(format(output), output);
});

for (const tabWidth of ["2", "4"]) {
  for (const [name, input, expected] of [
    [
      "#43: four-space nesting",
      "- 父项Parent\n    - 子项Child\n",
      "- 父项 Parent\n    - 子项 Child\n",
    ],
    [
      "#36: tabs and tasks",
      "- [ ] 父项Parent\n\t- [x] 子项Child\n\t\t- [ ] 孙项Leaf\n",
      "- [ ] 父项 Parent\n\t- [x] 子项 Child\n\t\t- [ ] 孙项 Leaf\n",
    ],
    [
      "#20: reported example",
      "- 测试\n- 测试 2\n\t- 测试 3（注意’-‘前有个 tab）\n",
      "- 测试\n- 测试 2\n\t- 测试 3（注意’-‘前有个 tab）\n",
    ],
    [
      "leading indentation and original markers",
      "  + 中文English\n    * 子项Child\n",
      "  + 中文 English\n    * 子项 Child\n",
    ],
    [
      "ordered markers, continuation and hard break",
      "3. 中文English  \n   续行Text\n\n   下一段Next\n4. 后项Last\n",
      "3. 中文 English  \n   续行 Text\n\n   下一段 Next\n4. 后项 Last\n",
    ],
    [
      "quoted list",
      "> - 中文English\n> \t- 子项Child\n",
      "> - 中文 English\n> \t- 子项 Child\n",
    ],
    [
      "code indentation",
      "\t中文English\n\t$x_1$\n",
      "\t中文English\n\t$x_1$\n",
    ],
    [
      "protected content inside lists",
      "- 中文English #中文English `$x_1$` $x_1  + y_2$\n\n  ```text\n  中文English #中文English\n  ```\n\n  $$\n  x_1  + y_2\n  $$\n",
      "- 中文 English #中文English `$x_1$` $x_1  + y_2$\n\n  ```text\n  中文English #中文English\n  ```\n\n  $$\n  x_1  + y_2\n  $$\n",
    ],
  ]) {
    test(`${name} (tabWidth=${tabWidth})`, () => {
      const options = { ...DEFAULT_SETTINGS, tabWidth };
      assert.equal(format(input, options), expected);
      assert.equal(format(expected, options), expected);
    });
  }
}

test("#20: Chinese punctuation stays adjacent to English", () => {
  const input =
    "中文，English。Hello！World？Test：Value；Item（ABC）【DEF】「GHI」\n";
  assert.equal(format(input), input);
  assert.equal(format(`- ${input}`), `- ${input}`);
});

test("list formatting preserves link destinations and formats explicit labels", () => {
  const input =
    "- [中文English](https://example.com/中文English)\n  - <https://example.com/中文English>\n";
  const expected =
    "- [中文 English](https://example.com/中文English)\n  - <https://example.com/中文English>\n";
  assert.equal(format(input), expected);
  assert.equal(format(expected), expected);
});

test("#35: settings survive reload and formatting receives saved tab width", async () => {
  let saved;
  const controls = [];
  class Plugin {
    async loadData() {
      return saved;
    }
    async saveData(value) {
      saved = JSON.parse(JSON.stringify(value));
    }
    addCommand(command) {
      this.command = command;
    }
    addSettingTab(tab) {
      this.tab = tab;
    }
  }
  class PluginSettingTab {
    containerEl = { empty() {}, createEl() {} };
  }
  class Setting {
    setName(name) {
      this.name = name;
      return this;
    }
    setDesc() {
      return this;
    }
    addDropdown(callback) {
      return this.addControl(callback);
    }
    addToggle(callback) {
      return this.addControl(callback);
    }
    addControl(callback) {
      const control = {
        name: this.name,
        addOption() {
          return this;
        },
        setValue(value) {
          this.value = value;
          return this;
        },
        onChange(handler) {
          this.change = handler;
          return this;
        },
      };
      controls.push(control);
      callback(control);
      return this;
    }
  }
  const receivedWidths = [];
  const Pangu = loadSource("main", {
    obsidian: { Plugin, PluginSettingTab, Setting },
    "./util": {
      ...util,
      format(content, options) {
        receivedWidths.push(options?.tabWidth);
        return format(content, options);
      },
    },
  }).default;
  const first = new Pangu();
  await first.onload();
  assert.equal(first.command.hotkeys, undefined);
  first.tab.display();
  await controls.find((control) => control.name === "缩进宽度").change("4");
  const second = new Pangu();
  await second.onload();
  assert.equal(second.settings.tabWidth, "4");
  let output;
  second.format({
    getCursor: () => ({ line: 0, ch: 0 }),
    getRange: () => "",
    getScrollInfo: () => ({ top: 0 }),
    getValue: () => "  - parent\n    - child",
    setValue: (value) => {
      output = value;
    },
    scrollTo() {},
    getLine: () => output.split("\n")[0],
    setCursor() {},
  });
  assert.equal(output, "  - parent\n    - child");
  assert.deepEqual(receivedWidths, ["4", "4"]);
});

test("declarative settings expose all controls and persist through the host binding", async () => {
  let saved = { tabWidth: "4", embeddedLanguageFormatting: false };
  class Plugin {
    async loadData() {
      return saved;
    }
    async saveData(value) {
      saved = JSON.parse(JSON.stringify(value));
    }
    addCommand() {}
    addSettingTab(tab) {
      this.tab = tab;
    }
  }
  // Model the documented 1.13+ default binding; legacy hosts are tested below.
  class PluginSettingTab {
    getControlValue(key) {
      return this.plugin.settings[key];
    }
    async setControlValue(key, value) {
      this.plugin.settings[key] = value;
      await this.plugin.saveData(this.plugin.settings);
    }
  }
  const Pangu = loadSource("main", {
    obsidian: { Plugin, PluginSettingTab },
    "./util": util,
  }).default;
  const first = new Pangu();
  await first.onload();
  const definitions = JSON.parse(
    JSON.stringify(first.tab.getSettingDefinitions())
  );
  assert.equal(definitions[0].name, "快速开始");
  const settings = definitions.filter((definition) => definition.control);
  assert.deepEqual(
    settings.map(({ name, control }) => [name, control.type, control.key]),
    [
      ["格式化模式", "dropdown", "formatMode"],
      ["缩进宽度", "dropdown", "tabWidth"],
      ["格式化内嵌代码", "toggle", "embeddedLanguageFormatting"],
    ]
  );
  assert.deepEqual(settings[0].control.options, {
    spacing: "只补空格（保留布局）",
    markdown: "完整 Markdown 排版",
  });
  assert.deepEqual(settings[1].control.options, { 2: "2个空格", 4: "4个空格" });
  for (const { control, searchable } of settings) {
    assert.notEqual(searchable, false);
    assert.equal(control.defaultValue, DEFAULT_SETTINGS[control.key]);
  }
  assert.equal(first.tab.getControlValue("formatMode"), "spacing");
  for (const [key, value] of Object.entries({
    formatMode: "markdown",
    tabWidth: "2",
    embeddedLanguageFormatting: true,
  })) {
    await first.tab.setControlValue(key, value);
  }
  const second = new Pangu();
  await second.onload();
  assert.equal(second.tab.getControlValue("formatMode"), "markdown");
  assert.equal(second.tab.getControlValue("tabWidth"), "2");
  assert.equal(second.tab.getControlValue("embeddedLanguageFormatting"), true);
});

test("editor uses spacing for old settings and persists the selected formatting mode", async () => {
  let saved = { tabWidth: "4", embeddedLanguageFormatting: false };
  const controls = new Map();
  class Plugin {
    async loadData() {
      return saved;
    }
    async saveData(value) {
      saved = JSON.parse(JSON.stringify(value));
    }
    addCommand() {}
    addSettingTab(tab) {
      this.tab = tab;
    }
  }
  class PluginSettingTab {
    containerEl = { empty() {}, createEl() {} };
  }
  class Setting {
    setName(name) {
      this.name = name;
      return this;
    }
    setDesc() {
      return this;
    }
    addDropdown(callback) {
      return this.addControl(callback);
    }
    addToggle(callback) {
      return this.addControl(callback);
    }
    addControl(callback) {
      const control = {
        options: {},
        addOption(key, label) {
          this.options[key] = label;
          return this;
        },
        setValue(value) {
          this.value = value;
          return this;
        },
        onChange(change) {
          this.change = change;
          return this;
        },
      };
      controls.set(this.name, control);
      callback(control);
      return this;
    }
  }
  const Pangu = loadSource("main", {
    obsidian: { Plugin, PluginSettingTab, Setting },
    "./util": util,
  }).default;
  const input = "\n# 标题Title\n## 副题Title\n\n\n内容`code`中文$x_1  + y_2$后";
  function edit(plugin) {
    let text = input;
    plugin.format({
      getCursor: () => ({ line: 1, ch: 0 }),
      getRange: () => "",
      getScrollInfo: () => ({ top: 12 }),
      getValue: () => text,
      setValue: (value) => {
        text = value;
      },
      scrollTo() {},
      getLine: (line) => text.split("\n")[line],
      setCursor() {},
    });
    return text;
  }
  const first = new Pangu();
  await first.onload();
  first.tab.display();
  const expected =
    "\n# 标题 Title\n## 副题 Title\n\n\n内容 `code` 中文 $x_1  + y_2$ 后";
  assert.equal(edit(first), expected);
  assert.equal(controls.get("格式化模式")?.value, "spacing");
  for (const { name, control } of first.tab.getSettingDefinitions()) {
    if (!control) continue;
    const legacyControl = controls.get(name);
    assert.equal(legacyControl.value, first.settings[control.key]);
    if (control.type === "dropdown") {
      assert.deepEqual(legacyControl.options, { ...control.options });
    }
  }
  await controls.get("格式化模式").change("markdown");
  const second = new Pangu();
  await second.onload();
  second.tab.display();
  assert.equal(controls.get("格式化模式").value, "markdown");
  assert.equal(
    edit(second),
    "# 标题 Title\n\n## 副题 Title\n\n内容 `code` 中文 $x_1  + y_2$ 后\n"
  );
  await controls.get("格式化模式").change("spacing");
  const third = new Pangu();
  await third.onload();
  assert.equal(edit(third), expected);
});
