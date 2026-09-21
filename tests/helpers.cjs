const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

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
      setTimeout,
      clearTimeout,
      require: (name) =>
        overrides[name] ||
        (name.startsWith("./")
          ? loadSource(name.slice(2), overrides)
          : require(name.replace("prettier/esm/", "prettier/"))),
    },
    { filename: `${file}.js` }
  );
  return module.exports;
}

class PluginStub {
  app = { workspace: { onLayoutReady() {}, on() {}, iterateAllLeaves() {} } };
  registerEvent() {}
  register() {}
}

function makeEditor(
  value,
  selections = [{ anchor: { line: 0, ch: 0 }, head: { line: 0, ch: 0 } }]
) {
  const editor = {
    value,
    selections,
    history: [],
    transactions: [],
    replacements: [],
    resets: 0,
    getValue() {
      return this.value;
    },
    getLine(line) {
      return this.value.split(/\r\n|\n|\r/)[line];
    },
    getCursor() {
      return this.selections[0].head;
    },
    getRange(from, to) {
      return this.value.slice(this.posToOffset(from), this.posToOffset(to));
    },
    listSelections() {
      return this.selections;
    },
    setSelections(selections) {
      this.selections = selections;
    },
    setCursor(pos) {
      this.selections = [{ anchor: pos, head: pos }];
    },
    getScrollInfo() {
      return { left: 4, top: 123 };
    },
    scrollTo(left, top) {
      this.scroll = { left, top };
    },
    hasFocus() {
      return true;
    },
    posToOffset(pos) {
      let offset = 0;
      const lines = this.value.split(/(?<=\n)/);
      for (let i = 0; i < pos.line; i++) offset += lines[i].length;
      return offset + pos.ch;
    },
    offsetToPos(offset) {
      const prefix = this.value.slice(0, offset).split(/\r\n|\n|\r/);
      return { line: prefix.length - 1, ch: prefix.at(-1).length };
    },
    setValue(text) {
      this.resets++;
      this.history = [];
      this.value = text;
    },
    replaceRange(text, from, to = from) {
      const start = this.posToOffset(from),
        end = this.posToOffset(to);
      this.replacements.push({ start, end, text });
      this.value = this.value.slice(0, start) + text + this.value.slice(end);
    },
    transaction(tx) {
      this.history.push(this.value);
      this.transactions.push(tx);
      [...tx.changes]
        .reverse()
        .forEach((c) => this.replaceRange(c.text, c.from, c.to));
      if (tx.selections)
        this.selections = tx.selections.map((s) => ({
          anchor: s.from,
          head: s.to || s.from,
        }));
    },
    undo() {
      this.value = this.history.pop();
    },
  };
  return editor;
}
module.exports = { loadSource, PluginStub, makeEditor };
