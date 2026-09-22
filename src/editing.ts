import type { Editor, EditorPosition } from "obsidian";
import diff from "fast-diff";

export interface TextEdit {
  from: number;
  to: number;
  text: string;
}

export function textEdits(before: string, after: string): TextEdit[] {
  const edits: TextEdit[] = [];
  let offset = 0;
  let edit: TextEdit | undefined;
  for (const [kind, text] of diff(before, after)) {
    if (kind === diff.EQUAL) {
      if (edit) edits.push(edit);
      edit = undefined;
      offset += text.length;
    } else {
      edit ||= { from: offset, to: offset, text: "" };
      if (kind === diff.DELETE) {
        offset += text.length;
        edit.to = offset;
      } else edit.text += text;
    }
  }
  if (edit) edits.push(edit);
  // Editor positions cannot address the middle of CRLF. Expand such edits
  // to whole line endings and merge overlaps before converting to positions.
  const result: TextEdit[] = [];
  for (let i = 0; i < edits.length; i++) {
    const first = i;
    let from = edits[i].from;
    let to = edits[i].to;
    if (before[from - 1] === "\r" && before[from] === "\n") from--;
    if (before[to - 1] === "\r" && before[to] === "\n") to++;
    while (i + 1 < edits.length && edits[i + 1].from <= to) {
      to = edits[++i].to;
      if (before[to - 1] === "\r" && before[to] === "\n") to++;
    }
    let text = before.slice(from, to);
    for (let j = i; j >= first; j--) {
      const change = edits[j];
      text =
        text.slice(0, change.from - from) +
        change.text +
        text.slice(change.to - from);
    }
    result.push({ from, to, text });
  }
  return result;
}

function positionAt(text: string, offset: number): EditorPosition {
  const lines = text.slice(0, offset).split(/\r\n|\r|\n/);
  return { line: lines.length - 1, ch: lines[lines.length - 1].length };
}

export function applyEdits(
  editor: Editor,
  edits: TextEdit[],
  origin = "+pangu"
): void {
  if (!edits.length) return;
  const before = editor.getValue();
  let after = before;
  for (const edit of [...edits].reverse()) {
    after = after.slice(0, edit.from) + edit.text + after.slice(edit.to);
  }
  const map = (pos: EditorPosition): EditorPosition => {
    const offset = editor.posToOffset(pos);
    let delta = 0;
    for (const edit of edits) {
      if (offset < edit.from) break;
      if (offset <= edit.to)
        return positionAt(after, edit.from + delta + edit.text.length);
      delta += edit.text.length - (edit.to - edit.from);
    }
    return positionAt(after, offset + delta);
  };
  const selections = editor
    .listSelections()
    .map(({ anchor, head }) => ({ anchor: map(anchor), head: map(head) }));
  const changes = edits.map((edit) => ({
    from: editor.offsetToPos(edit.from),
    to: editor.offsetToPos(edit.to),
    text: edit.text,
  }));
  const scroll = editor.getScrollInfo();
  editor.transaction(
    {
      changes,
      selections: selections.map((s) => ({ from: s.anchor, to: s.head })),
    },
    origin
  );
  editor.scrollTo(scroll.left, scroll.top);
}
