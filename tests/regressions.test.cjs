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
  const Pangu = loadSource("main", {
    obsidian: { Plugin, PluginSettingTab, Setting },
    "./util": util,
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
    getValue: () => "- parent\n  - child",
    setValue: (value) => {
      output = value;
    },
    scrollTo() {},
    getLine: () => output.split("\n")[0],
    setCursor() {},
  });
  assert.equal(
    output,
    format("- parent\n  - child", { ...DEFAULT_SETTINGS, tabWidth: "4" })
  );
  assert.ok(output.includes("    -   child"));
});
