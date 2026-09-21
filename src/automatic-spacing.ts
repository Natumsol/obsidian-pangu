import type { MarkdownView, Editor } from "obsidian";
import { proseSpacingPositions } from "./util";
import { applyEdits } from "./editing";

// While delimiters are still being typed, Markdown parsers may classify an
// unfinished code span/formula/link as prose. Defer rather than alter it.
function unfinishedMarkup(text: string, end: number): boolean {
  const prefix = text.slice(0, end);
  if (/^---\r?\n/.test(prefix) && !/\n(?:---|\.\.\.)\s*\n/.test(prefix))
    return true;
  const line = prefix
    .slice(prefix.lastIndexOf("\n") + 1)
    .replace(/(`+)[\s\S]*?\1/g, "")
    .replace(/\$[^$]*\$/g, "")
    .replace(/\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\\./g, "");
  if (/[`$<]/.test(line)) return true;
  // Pair delimiters across lines instead of treating every '[' as unfinished:
  // task markers are balanced, while incomplete link/image labels are not.
  // Code and math contents must not affect the surrounding markup state.
  let backticks = 0;
  let math = 0;
  let fence = "";
  let brackets = 0;
  let labelEnd = -2;
  let destination = 0;
  let angle = false;
  let quote = "";
  const tokens = /\\[\s\S]|`+|~{3,}|\$+|[\[\]()<>'"]/g;
  let match: RegExpExecArray | null;
  while ((match = tokens.exec(prefix)) !== null) {
    const run = match[0];
    const lineStart = prefix.lastIndexOf("\n", match.index - 1) + 1;
    const atLineStart = /^(?: {0,3}> ?)* {0,3}$/.test(
      prefix.slice(lineStart, match.index)
    );
    if (fence) {
      if (
        run[0] === fence[0] &&
        run.length >= fence.length &&
        atLineStart &&
        /^[ \t]*(?:\r?\n|$)/.test(prefix.slice(match.index + run.length))
      )
        fence = "";
      continue;
    }
    if (backticks) {
      if (run[0] === "`" && run.length === backticks) backticks = 0;
      continue;
    }
    if (math) {
      if (run[0] === "$" && run.length === math) math = 0;
      continue;
    }
    if (angle) {
      if (quote) {
        if (run === quote) quote = "";
      } else if (run === '"' || run === "'") quote = run;
      else if (run === ">") angle = false;
      continue;
    }
    if (destination) {
      if (run === "(") destination++;
      else if (run === ")") destination--;
      continue;
    }
    if ((run[0] === "`" || run[0] === "~") && run.length >= 3 && atLineStart)
      fence = run;
    else if (run[0] === "`") backticks = run.length;
    else if (run[0] === "$" && run.length <= 2) math = run.length;
    else if (run === "[") brackets++;
    else if (run === "]" && brackets) {
      brackets--;
      labelEnd = match.index;
    } else if (run === "(" && match.index === labelEnd + 1) destination = 1;
    else if (run === "<") angle = true;
  }
  return (
    !!fence ||
    backticks !== 0 ||
    math !== 0 ||
    brackets !== 0 ||
    destination !== 0 ||
    angle
  );
}

export function automaticEdits(before: string, after: string, at: number) {
  const added = after.length - before.length;
  // Parsing very large Markdown paragraphs can itself be quadratic. Keep
  // automatic work bounded; the manual command remains available for all sizes.
  if (added <= 0 || after.length > 10000) return [];
  const end = at + added;
  if (
    after.slice(0, at) !== before.slice(0, at) ||
    after.slice(end) !== before.slice(at)
  )
    return [];
  if (!/^[\p{L}\p{N}\p{M}]+$/u.test(after.slice(at, end))) return [];
  const positions: number[] = [];
  for (let pos = at; pos <= end; pos++) {
    // At most two UTF-16 units are needed to include an astral Han character.
    const left = Array.from(after.slice(Math.max(0, pos - 2), pos)).pop() || "";
    const right = Array.from(after.slice(pos, pos + 2))[0] || "";
    if (
      /^(?:\p{Script=Han}[A-Za-z0-9]|[A-Za-z0-9]\p{Script=Han})$/u.test(
        left + right
      )
    )
      positions.push(pos);
  }
  if (!positions.length || unfinishedMarkup(after, end)) return [];
  return proseSpacingPositions(after, positions).map((pos) => ({
    from: pos,
    to: pos,
    text: " ",
  }));
}

/** DOM listeners are scoped to each Markdown view, including pop-out windows. */
export function bindAutomaticSpacing(
  view: MarkdownView,
  enabled: () => boolean
): () => void {
  type Snapshot = {
    editor: Editor;
    file: MarkdownView["file"];
    value: string;
    at: number;
  };
  let snapshot: Snapshot | undefined;
  let composing = false;
  let finishingComposition = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const cancel = () => {
    clearTimeout(timer);
    timer = undefined;
    snapshot = undefined;
    finishingComposition = false;
  };
  const capture = () => {
    cancel();
    const editor = view.editor;
    if (!enabled() || !editor?.hasFocus()) return;
    const selections = editor.listSelections();
    if (selections.length !== 1) return;
    const { anchor, head } = selections[0];
    if (anchor.line !== head.line || anchor.ch !== head.ch) return;
    snapshot = {
      editor,
      file: view.file,
      value: editor.getValue(),
      at: editor.posToOffset(head),
    };
  };
  const schedule = () => {
    clearTimeout(timer);
    // Wait until the editor has consumed the input/compositionend event.
    timer = setTimeout(() => {
      const previous = snapshot;
      cancel();
      if (
        !previous ||
        composing ||
        !enabled() ||
        previous.editor !== view.editor ||
        previous.file !== view.file
      )
        return;
      const editor = previous.editor;
      if (!editor.hasFocus()) return;
      const after = editor.getValue();
      const selections = editor.listSelections();
      if (selections.length !== 1) return;
      const { anchor, head } = selections[0];
      const end = previous.at + after.length - previous.value.length;
      if (
        editor.posToOffset(anchor) !== end ||
        editor.posToOffset(head) !== end
      )
        return;
      applyEdits(editor, automaticEdits(previous.value, after, previous.at));
    }, 0);
  };
  const listeners: Array<[string, EventListener]> = [
    [
      "beforeinput",
      (event) => {
        if (composing) return;
        const type = (event as InputEvent).inputType;
        if (
          finishingComposition &&
          [
            "insertText",
            "insertFromComposition",
            "insertCompositionText",
          ].includes(type)
        )
          return;
        if (type === "insertText") capture();
        else cancel();
      },
    ],
    [
      "input",
      (event) => {
        const input = event as InputEvent;
        if (composing || input.isComposing) return;
        if (
          [
            "insertText",
            "insertFromComposition",
            "insertCompositionText",
          ].includes(input.inputType)
        )
          schedule();
        else cancel();
      },
    ],
    [
      "compositionstart",
      () => {
        capture();
        composing = true;
      },
    ],
    [
      "compositionend",
      (event) => {
        composing = false;
        if ((event as CompositionEvent).data) {
          finishingComposition = true;
          schedule();
        } else cancel();
      },
    ],
    [
      "blur",
      () => {
        composing = false;
        cancel();
      },
    ],
  ];
  for (const [type, listener] of listeners)
    view.containerEl.addEventListener(type, listener, { capture: true });
  return () => {
    cancel();
    for (const [type, listener] of listeners)
      view.containerEl.removeEventListener(type, listener, { capture: true });
  };
}
