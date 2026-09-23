const { test } = require("node:test");
const assert = require("node:assert/strict");
const { loadSource, PluginStub, makeEditor } = require("./helpers.cjs");

const obsidian = {
  Plugin: PluginStub,
  PluginSettingTab: class {},
  requireApiVersion: () => true,
  moment: { locale: () => "zh-cn" },
};
const Pangu = loadSource("main", { obsidian }).default;

test("#4: formatting applies only local changes in one undoable transaction", () => {
  const source = "# 标题\n\n正文English\n\n## 子标题\n\n内容Text";
  const editor = makeEditor(source, [
    { anchor: { line: 2, ch: 9 }, head: { line: 2, ch: 2 } },
  ]);
  new Pangu().format(editor);
  assert.equal(
    editor.resets,
    0,
    "must not reset the document and its fold state"
  );
  assert.equal(
    editor.value,
    "# 标题\n\n正文 English\n\n## 子标题\n\n内容 Text"
  );
  assert.equal(editor.transactions.length, 1);
  assert.ok(
    editor.replacements.every((c) => c.start === c.end && c.text === " ")
  );
  assert.deepEqual(JSON.parse(JSON.stringify(editor.selections)), [
    { anchor: { line: 2, ch: 10 }, head: { line: 2, ch: 3 } },
  ]);
  assert.deepEqual(editor.scroll, { left: 4, top: 123 });
  editor.undo();
  assert.equal(editor.value, source);
});

test("#4: already formatted notes do not mutate editor state", () => {
  const editor = makeEditor("# 标题\n\n正文 English");
  new Pangu().format(editor);
  assert.equal(editor.resets, 0);
  assert.equal(editor.transactions.length, 0);
});

test("#4: manual formatting uses a programmatic transaction to retain folds", () => {
  const editor = makeEditor("# 标题Title\n\n正文English\n\n## 子标题\n\n内容Text");
  const folds = new Set([0, 4]);
  const transaction = editor.transaction;
  editor.transaction = function (tx, origin) {
    // Obsidian 1.13.7 unfolds changed folded ranges unless origin is "set".
    // Local changes alone do not bypass that host transaction filter.
    if (origin !== "set") folds.clear();
    return transaction.call(this, tx);
  };
  new Pangu().format(editor);
  assert.deepEqual([...folds], [0, 4]);
  assert.equal(editor.transactions.length, 1);
  assert.equal(editor.resets, 0);
});

test("#32: automatic spacing is off unless explicitly enabled", () => {
  assert.equal(loadSource("util").DEFAULT_SETTINGS.autoSpacing, false);
});

test("#4: full formatting preserves text, multi-selections and Unicode offsets", () => {
  const source = "# 标题Title\r\n## 副题Text\r\n\r\n\r\n😀正文English";
  const editor = makeEditor(source, [
    { anchor: { line: 4, ch: 11 }, head: { line: 4, ch: 2 } },
    { anchor: { line: 0, ch: 4 }, head: { line: 0, ch: 4 } },
  ]);
  const plugin = new Pangu();
  plugin.settings = { ...plugin.settings, formatMode: "markdown" };
  plugin.format(editor);
  assert.equal(
    editor.value,
    loadSource("util").format(source, plugin.settings)
  );
  assert.equal(editor.resets, 0);
  assert.equal(editor.transactions.length, 1);
  assert.equal(editor.selections.length, 2);
  editor.undo();
  assert.equal(editor.value, source);
});

const { automaticEdits, bindAutomaticSpacing } = loadSource(
  "automatic-spacing",
  { obsidian }
);
const { applyEdits } = loadSource("editing", { obsidian });

test("#32: automatic edits keep their input origin, not the manual set origin", () => {
  const editor = makeEditor("中文a");
  const transaction = editor.transaction;
  editor.transaction = function (tx, origin) {
    assert.equal(origin, "+pangu");
    return transaction.call(this, tx);
  };
  applyEdits(editor, automaticEdits("中文", editor.value, 2));
  assert.equal(editor.value, "中文 a");
});

test("#32: only newly typed boundaries are spaced, not the rest of the note", () => {
  for (const [before, insert, expected] of [
    ["已有English\n中文", "a", "已有English\n中文 a"],
    ["English", "中文", "English 中文"],
    ["中", "a文b", "中 a 文 b"],
  ]) {
    const after = before + insert;
    const editor = makeEditor(after);
    applyEdits(editor, automaticEdits(before, after, before.length));
    assert.equal(editor.value, expected);
  }
  const editor = makeEditor("甲abc乙");
  applyEdits(editor, automaticEdits("甲乙", editor.value, 1));
  assert.equal(editor.value, "甲 abc 乙");
});

test("#32: automatic spacing skips protected and unfinished Markdown", () => {
  for (const before of [
    "`中文",
    "`hello\n中文",
    "``hello`\n中文",
    "$中文",
    "$x=\n中文",
    "$$\n中文",
    "```js\n中文",
    "    中文",
    "#中文",
    "[中文",
    "[[中文",
    "![中文",
    "https://example.com/中文",
    "obsidian://open?vault=中文",
    "---\ntitle: 中文",
    "<span>中文",
    "中文 ",
  ]) {
    const after = before + "a";
    assert.equal(
      automaticEdits(before, after, before.length).length,
      0,
      before
    );
  }
  for (const [before, after, at] of [
    ["中文", "中", 1],
    ["中文", "中文\nEnglish", 2],
    ["中文", "中文.English", 2],
    ["中文 a", "中文a", 2],
    ["x".repeat(10000) + "中", "x".repeat(10000) + "中a", 10001],
  ])
    assert.equal(automaticEdits(before, after, at).length, 0);
});

test("#32: long-note input does not format or diff the whole document", () => {
  const local = loadSource("automatic-spacing", {
    obsidian,
    "fast-diff": () => assert.fail("automatic input must not diff the note"),
    "./util": {
      ...loadSource("util"),
      format: () => assert.fail("automatic input must not format the note"),
    },
  });
  const before = "中文English文\n".repeat(800) + "中文";
  assert.equal(
    local.automaticEdits(before, before + "a", before.length).length,
    1
  );
  assert.equal(
    local.automaticEdits(before + "a", before + "ab", before.length + 1).length,
    0
  );
  const large = "中文English文\n".repeat(15000) + "中文";
  const bounded = loadSource("automatic-spacing", {
    obsidian,
    "./util": {
      proseSpacingPositions: () =>
        assert.fail("must skip parsing large documents or unrelated input"),
    },
  });
  assert.equal(
    bounded.automaticEdits(large, large + "a", large.length).length,
    0
  );
  assert.equal(
    bounded.automaticEdits(before + "a", before + "ab", before.length + 1)
      .length,
    0
  );
});

test("#32: unfinished links, images and HTML stay protected across lines", () => {
  for (const before of [
    "[unfinished\n中文",
    "[[unfinished\n中文",
    "![unfinished\n中文",
    "[outer [inner]\n中文",
    "> [unfinished\n> 中文",
    "- [ ] [unfinished\n  中文",
    "[label](\n中文",
    "![label](path(\n中文",
    "<span\n中文",
    '<span title=">\n中文',
    "[unfinished\r\n中文",
  ]) {
    assert.equal(
      automaticEdits(before, before + "a", before.length).length,
      0,
      before
    );
  }
});

test("#32: completed task markers allow automatic spacing in either direction", () => {
  for (const prefix of [
    "- [ ] ",
    "- [x] ",
    "- [X] ",
    "* [ ] ",
    "+ [x] ",
    "1. [ ] ",
    "> - [ ] ",
    "- parent\n  - [x] ",
  ]) {
    for (const [text, input] of [
      ["中文", "a"],
      ["English", "中文"],
    ]) {
      const before = prefix + text;
      const editor = makeEditor(before + input);
      applyEdits(editor, automaticEdits(before, editor.value, before.length));
      assert.equal(editor.value, before + " " + input);
    }
  }
});

test("#32: balanced or escaped markers do not suppress following prose", () => {
  for (const context of [
    "[label\ncontinued](target)\n",
    "![image\ncontinued](target)\n",
    "[[note]]\n",
    "[outer [inner]]\n",
    "\\[literal\n",
    "\\<literal\n",
    "`[<`\n",
    "```text\n[<\n```\n",
    "$[<$\n",
    "<span\ntitle='value'></span>\n\n",
  ]) {
    const before = context + "中文";
    const editor = makeEditor(before + "a");
    applyEdits(editor, automaticEdits(before, editor.value, before.length));
    assert.equal(editor.value, before + " a", context);
  }
});

test("#32: dollar signs inside finished code do not suppress later prose", () => {
  for (const code of [
    "```sh\necho $HOME\n```",
    "~~~sh\necho $HOME\n~~~",
    "`$HOME`",
    "``a`$HOME``",
    "> ```sh\n> echo $HOME\n> ```",
  ]) {
    const before = code + "\n\n中文";
    const editor = makeEditor(before + "a");
    applyEdits(editor, automaticEdits(before, editor.value, before.length));
    assert.equal(editor.value, before + " a");
  }
});

function inputHarness(initial, enabled = true, ownerWindow = globalThis) {
  const containerEl = new EventTarget();
  containerEl.ownerDocument = { defaultView: ownerWindow };
  const editor = makeEditor(initial);
  editor.setCursor(editor.offsetToPos(initial.length));
  const view = { containerEl, editor, file: { path: "note.md" } };
  const state = { enabled };
  const dispose = bindAutomaticSpacing(view, () => state.enabled);
  const emit = (type, properties = {}) => {
    const event = new Event(type);
    Object.assign(event, properties);
    containerEl.dispatchEvent(event);
  };
  const set = (value) => {
    editor.value = value;
    editor.setCursor(editor.offsetToPos(value.length));
  };
  const type = (value, inputType = "insertText") => {
    emit("beforeinput", { inputType });
    set(value);
    emit("input", { inputType, isComposing: false });
  };
  return { view, editor, state, emit, set, type, dispose };
}
const flush = () => new Promise((resolve) => setTimeout(resolve, 10));

test("#32: a popout editor uses its own window to schedule and cancel input", () => {
  const pending = new Map();
  let nextId = 1;
  const popoutWindow = {
    setTimeout(callback) {
      const id = nextId++;
      pending.set(id, callback);
      return id;
    },
    clearTimeout(id) {
      pending.delete(id);
    },
  };
  const h = inputHarness("中文", true, popoutWindow);
  try {
    h.type("中文a");
    assert.equal(pending.size, 1);
    for (const callback of pending.values()) callback();
    pending.clear();
    assert.equal(h.editor.value, "中文 a");

    h.type("中文 a文");
    assert.equal(pending.size, 1);
    h.emit("blur");
    assert.equal(pending.size, 0);
    assert.equal(h.editor.value, "中文 a文");
  } finally {
    h.dispose();
  }
});

test("#32: input events respect completed tasks and unfinished multiline markup", async () => {
  for (const [before, insert, expected] of [
    ["- [ ] 中文", "a", "- [ ] 中文 a"],
    ["- [x] English", "中文", "- [x] English 中文"],
    ["![unfinished\n中文", "a", "![unfinished\n中文a"],
    ["<span\n中文", "a", "<span\n中文a"],
  ]) {
    const h = inputHarness(before);
    try {
      h.type(before + insert);
      await flush();
      assert.equal(h.editor.value, expected);
    } finally {
      h.dispose();
    }
  }
});

test("#32: committed typing is undoable and obeys the live setting", async () => {
  const h = inputHarness("中文", false);
  h.type("中文a");
  await flush();
  assert.equal(h.editor.value, "中文a");
  h.state.enabled = true;
  h.type("中文a文");
  await flush();
  assert.equal(h.editor.value, "中文a 文");
  h.editor.undo();
  assert.equal(h.editor.value, "中文a文");
  h.dispose();
});

for (const finalInputAfterEnd of [false, true]) {
  test(`#32: IME is untouched until commit (final input after end: ${finalInputAfterEnd})`, async () => {
    const h = inputHarness("English");
    h.emit("compositionstart");
    h.emit("beforeinput", { inputType: "insertCompositionText" });
    h.set("Englishzhong");
    h.emit("input", { inputType: "insertCompositionText", isComposing: true });
    await flush();
    assert.equal(h.editor.transactions.length, 0);
    if (finalInputAfterEnd) h.emit("compositionend", { data: "中" });
    h.emit("beforeinput", {
      inputType: finalInputAfterEnd
        ? "insertFromComposition"
        : "insertCompositionText",
    });
    h.set("English中");
    h.emit("input", {
      inputType: "insertCompositionText",
      isComposing: !finalInputAfterEnd,
    });
    if (!finalInputAfterEnd) h.emit("compositionend", { data: "中" });
    await flush();
    assert.equal(h.editor.value, "English 中");
    assert.equal(h.editor.transactions.length, 1);
    h.dispose();
  });
}

test("#32: paste, delete, undo, selection replacements and IME cancellation are ignored", async () => {
  for (const inputType of [
    "insertFromPaste",
    "insertFromDrop",
    "deleteContentBackward",
    "historyUndo",
    "historyRedo",
  ]) {
    const h = inputHarness("中文");
    h.type("中文a", inputType);
    await flush();
    assert.equal(h.editor.transactions.length, 0, inputType);
    h.dispose();
  }
  const h = inputHarness("中文");
  h.editor.selections = [
    { anchor: { line: 0, ch: 0 }, head: { line: 0, ch: 2 } },
  ];
  h.type("English中");
  await flush();
  assert.equal(h.editor.transactions.length, 0);
  h.emit("compositionstart");
  h.emit("compositionend", { data: "" });
  await flush();
  assert.equal(h.editor.transactions.length, 0);
  h.dispose();
});

test("#32: pending work is discarded on file switch, blur, disable and unload", async () => {
  for (const cancel of [
    (h) => {
      h.view.file = { path: "other.md" };
    },
    (h) => h.emit("blur"),
    (h) => {
      h.state.enabled = false;
    },
    (h) => h.dispose(),
  ]) {
    const h = inputHarness("中文");
    h.type("中文a");
    cancel(h);
    await flush();
    assert.equal(h.editor.transactions.length, 0);
    h.dispose();
  }
  const h = inputHarness("中文");
  h.dispose();
  h.type("中文a");
  await flush();
  assert.equal(h.editor.transactions.length, 0);
});

test("#32: plugin binds each Markdown view once and disposes closed views and unload", async () => {
  class MarkdownView {}
  const first = new MarkdownView();
  const popout = new MarkdownView();
  let leaves = [{ view: first }, { view: {} }];
  let sync, ready, command;
  const cleanup = [];
  const bindings = [];
  const Plugin = loadSource("main", {
    obsidian: { ...obsidian, MarkdownView },
    "./automatic-spacing": {
      bindAutomaticSpacing(view, enabled) {
        const binding = { view, enabled, disposed: 0 };
        bindings.push(binding);
        return () => binding.disposed++;
      },
    },
  }).default;
  const plugin = new Plugin();
  plugin.loadData = async () => ({ autoSpacing: true });
  plugin.addCommand = (value) => {
    command = value;
  };
  plugin.addSettingTab = () => {};
  plugin.register = (fn) => cleanup.push(fn);
  plugin.app.workspace = {
    iterateAllLeaves: (fn) => leaves.forEach(fn),
    on: (name, fn) => {
      assert.equal(name, "layout-change");
      sync = fn;
    },
    onLayoutReady: (fn) => {
      ready = fn;
    },
  };
  await plugin.onload();
  ready();
  sync();
  assert.equal(bindings.length, 1);
  assert.equal(bindings[0].enabled(), true);
  plugin.settings.autoSpacing = false;
  assert.equal(bindings[0].enabled(), false);
  leaves.push({ view: popout });
  sync();
  assert.equal(bindings.length, 2);
  leaves = [{ view: popout }];
  sync();
  assert.equal(bindings[0].disposed, 1);
  const editor = makeEditor("中文English");
  command.editorCallback(editor);
  assert.equal(editor.value, "中文 English");
  cleanup.forEach((fn) => fn());
  assert.equal(bindings[1].disposed, 1);
  ready();
  sync();
  assert.equal(bindings.length, 2);
});

test("#4: diff edits round-trip mixed line endings and Unicode without splitting CRLF", () => {
  const { textEdits } = loadSource("editing", { obsidian });
  let seed = 43;
  const random = (max) => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed % max;
  };
  const tokens = ["\r\n", "\n", "\r", "😀", "中", "a", " ", "$", "`"];
  const sample = () =>
    Array.from(
      { length: random(40) },
      () => tokens[random(tokens.length)]
    ).join("");
  for (let i = 0; i < 300; i++) {
    const before = sample(),
      expected = sample();
    const edits = textEdits(before, expected);
    let after = before;
    for (const edit of [...edits].reverse()) {
      for (const pos of [edit.from, edit.to])
        assert.ok(!(before[pos - 1] === "\r" && before[pos] === "\n"));
      after = after.slice(0, edit.from) + edit.text + after.slice(edit.to);
    }
    assert.equal(after, expected);
  }
});
