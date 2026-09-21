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

test("#34: matrix subscripts and line breaks survive formatting", () => {
  assert.equal(format(matrix), `${matrix}\n`);
});

for (const input of [
  "前$x_1+y_2$后\n",
  "前$x_1  + y_2$后\n",
  "$$x_1  + y_2$$\n",
  "$$\nx_1  + y_2\n\n  z_3 = 4\n$$\n",
  "行内$x_1  + y_2$和$z_3$。\n\n$$\nx_1  + y_2 = z_3\n$$\n\n后续$a_1$。\n",
  "> $$\n>  x_1+y_2\n> $$\n",
  "- item\n\n  $$\n    x_1+y_2\n  $$\n",
  "`$x_1$`\n",
  "```text\n$x_1$ #中文English\n```\n",
  "前$\\text{$&} + x_1$后\n",
  "> > $$\n> > x_1 + y_2\n> > $$\n",
  "- $x_1$中文\n",
]) {
  test(`math protection preserves context: ${JSON.stringify(input)}`, () => {
    assert.equal(format(input), input);
    assert.equal(format(format(input)), input);
  });
}

test("#31: tags remain intact while ordinary prose receives spaces", () => {
  assert.equal(
    format("#中文English标签 #项目/sub项目 #my_tag_x 中文English"),
    "#中文English标签 #项目/sub项目 #my_tag_x 中文 English\n"
  );
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
    formula
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
    addCommand() {}
    addSettingTab(tab) {
      this.tab = tab;
    }
  }
  class PluginSettingTab {
    containerEl = { empty() {}, createEl() {} };
  }
  class Setting {
    setName() {
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
  first.tab.display();
  await controls[0].change("4");
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
  assert.equal(output, "  - parent\n    - child\n");
  assert.deepEqual(receivedWidths, ["4", "4"]);
});
