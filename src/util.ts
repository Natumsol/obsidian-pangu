// @ts-ignore
import prettier from "prettier/esm/standalone";
// @ts-ignore
import markdownParser from "prettier/esm/parser-markdown";
import type { Options } from "prettier";

export interface IPanGuSetting {
  tabWidth: string;
  embeddedLanguageFormatting: boolean;
  formatMode?: "spacing" | "markdown";
}

export const DEFAULT_SETTINGS: IPanGuSetting = {
  tabWidth: "2",
  embeddedLanguageFormatting: true,
  formatMode: "spacing",
};

function parseOptions(
  options: IPanGuSetting
): Pick<Options, "tabWidth" | "embeddedLanguageFormatting"> {
  const { tabWidth, embeddedLanguageFormatting } = options;

  return {
    tabWidth: +tabWidth,
    embeddedLanguageFormatting: embeddedLanguageFormatting ? "auto" : "off",
  };
}
export function format(
  content: string,
  options: IPanGuSetting = DEFAULT_SETTINGS
): string {
  const parser = markdownParser.parsers.markdown;
  const ast = parser.parse(content, {}, {});
  const excluded: Array<[number, number]> = [];
  visit(ast, (node) => {
    if (
      [
        "code",
        "inlineCode",
        "math",
        "inlineMath",
        "yaml",
        "toml",
        "html",
        "link",
        "image",
        "definition",
      ].includes(node.type)
    ) {
      excluded.push([node.position.start.offset, node.position.end.offset]);
    }
  });

  // Keep tags as single words so Prettier cannot insert spaces inside them.
  // Choose a prefix absent from the input, including code and frontmatter.
  let prefix = "PANGUTAG";
  while (content.includes(prefix)) prefix += "X";
  const replacements: Array<{ start: number; end: number; value: string }> = [];
  const displayMath: string[] = [];
  // Prettier does not recognize same-line $$ math with delimiter-adjacent
  // spaces. Mask these ranges before parsing so Markdown cannot alter them.
  // Already-recognized math, code, links and metadata remain on their own path.
  const displayPattern = /\$\$/g;
  let match: RegExpExecArray | null;
  let opening = -1;
  while ((match = displayPattern.exec(content)) !== null) {
    const offset = match.index;
    if (opening >= 0 && /[\r\n]/.test(content.slice(opening, offset)))
      opening = -1;
    if (
      isEscaped(content, offset) ||
      content[offset - 1] === "$" ||
      content[offset + 2] === "$"
    )
      continue;
    if (opening < 0) {
      if (!excluded.some(([from, to]) => offset >= from && offset < to))
        opening = offset;
      continue;
    }
    const start = opening;
    const end = offset + 2;
    const token = `$$${prefix}MATH${displayMath.length}X$$`;
    displayMath.push(content.slice(start, end));
    replacements.push({ start, end, value: token });
    excluded.push([start, end]);
    opening = -1;
  }

  visit(ast, (node) => {
    if (isReferenceIdentifier(node)) return false;
    if (node.type !== "inlineCode" && node.type !== "inlineMath") return;
    const { start, end } = node.position;
    if (
      (node.type === "inlineMath" && content.startsWith("$$", start.offset)) ||
      replacements.some(
        (edit) => edit.start < end.offset && edit.end > start.offset
      )
    )
      return;
    if (/[\p{L}\p{N}]$/u.test(content.slice(0, start.offset)))
      replacements.push({ start: start.offset, end: start.offset, value: " " });
    if (/^[\p{L}\p{N}]/u.test(content.slice(end.offset)))
      replacements.push({ start: end.offset, end: end.offset, value: " " });
  });

  const tags: string[] = [];
  // So includes emoji and symbols; marks, modifiers, ZWJ and tag characters
  // keep multi-code-point emoji sequences intact without consuming punctuation.
  const tagPattern =
    /#[\p{L}\p{M}\p{N}\p{So}\p{Emoji_Modifier}\u200d\u{e0020}-\u{e007f}_/-]+/gu;
  while ((match = tagPattern.exec(content)) !== null) {
    const start = match.index;
    if (
      excluded.some(([from, to]) => start >= from && start < to) ||
      isEscaped(content, start)
    )
      continue;
    replacements.push({
      start,
      end: start + match[0].length,
      value: `#${prefix}${tags.length}X`,
    });
    tags.push(match[0]);
  }
  let processedContent = content;
  replacements
    .sort((a, b) => b.start - a.start)
    .forEach(({ start, end, value }) => {
      processedContent =
        processedContent.slice(0, start) + value + processedContent.slice(end);
    });

  const protectedParser = {
    ...parser,
    parse(text: string, parsers: unknown, parserOptions: unknown) {
      const tree = parser.parse(text, parsers, parserOptions);
      // Preserve each complete list container, including its continuation lines,
      // quotes and code blocks. Reindenting a rendered list cannot reliably
      // recover the original mixture of tabs and spaces.
      tree.children.forEach((node: MarkdownNode) => {
        const raw = text.slice(
          node.position.start.offset,
          node.position.end.offset
        );
        if (
          containsList(node) ||
          (node.type === "code" && /^(?: {4}|\t)/.test(raw))
        ) {
          preserveLayout(node, text);
        }
      });
      visit(tree, (node) => {
        if (!["math", "inlineMath", "inlineCode"].includes(node.type)) return;
        // The HTML printer emits literal text. Retain the math's AST position
        // and inline/block context without injecting Markdown code fences.
        // Container prefixes are emitted by the parent list/blockquote.
        const raw = text.slice(
          node.position.start.offset,
          node.position.end.offset
        );
        node.value = raw
          .split("\n")
          .map((line, index) =>
            index === 0
              ? line
              : line.slice((node.position.indent?.[index - 1] || 1) - 1)
          )
          .join("\n");
        node.type = "html";
      });
      return tree;
    },
  };
  const formatted =
    options.formatMode !== "markdown"
      ? spaceProse(
          parser.parse(processedContent, {}, {}),
          processedContent,
          0,
          processedContent.length
        )
      : prettier.format(processedContent, {
          parser: "pangu-markdown",
          plugins: [
            markdownParser,
            { parsers: { "pangu-markdown": protectedParser } },
          ],
          ...parseOptions(options),
        });

  return formatted
    .replace(
      new RegExp(`#${prefix}(\\d+)X`, "g"),
      (_match: string, index: string) => tags[+index]
    )
    .replace(
      new RegExp(`\\$\\$${prefix}MATH(\\d+)X\\$\\$`, "g"),
      (_match: string, index: string) => displayMath[+index]
    );
}

function isEscaped(text: string, offset: number): boolean {
  let escapes = 0;
  for (let i = offset - 1; i >= 0 && text[i] === "\\"; i--) escapes++;
  return escapes % 2 === 1;
}

function containsList(node: MarkdownNode): boolean {
  return node.type === "list" || !!node.children?.some(containsList);
}

function preserveLayout(node: MarkdownNode, text: string): void {
  const lineStart = text.lastIndexOf("\n", node.position.start.offset - 1) + 1;
  const prefix = text.slice(lineStart, node.position.start.offset);
  const start = /^[ \t]*$/.test(prefix)
    ? lineStart
    : node.position.start.offset;
  node.value = spaceProse(node, text, start, node.position.end.offset);
  node.type = "html";
  delete node.children;
}

// Edit source ranges rather than printing the AST: whitespace, Markdown
// markers, line endings, and the presence/absence of a final newline survive.
function spaceProse(
  node: MarkdownNode,
  text: string,
  start: number,
  end: number
): string {
  let raw = text.slice(start, end);
  const edits: Array<{ start: number; end: number; value: string }> = [];
  const collect = (child: MarkdownNode): void => {
    // In shortcut/collapsed references the visible label is also the target
    // identifier. Inserting a space there would break the reference.
    if (isReferenceIdentifier(child)) return;
    if (
      [
        "code",
        "inlineCode",
        "math",
        "inlineMath",
        "html",
        "yaml",
        "toml",
        "definition",
      ].includes(child.type)
    )
      return;
    // Autolinks expose their destination as a text child. Format labels only
    // for explicit Markdown links, never the URL itself.
    if (child.type === "link" && text[child.position.start.offset] !== "[")
      return;
    if (child.type === "text") {
      const from = child.position.start.offset;
      const to = child.position.end.offset;
      // Only prose receives spacing; punctuation, Markdown delimiters and
      // structural whitespace remain byte-for-byte as written.
      const value = text
        .slice(from, to)
        .replace(
          /([\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}])([A-Za-z0-9])/gu,
          "$1 $2"
        )
        .replace(
          /([A-Za-z0-9])([\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}])/gu,
          "$1 $2"
        );
      edits.push({ start: from - start, end: to - start, value });
    }
    child.children?.forEach(collect);
  };
  collect(node);
  edits
    .sort((a, b) => b.start - a.start)
    .forEach((edit) => {
      raw = raw.slice(0, edit.start) + edit.value + raw.slice(edit.end);
    });
  return raw;
}

interface MarkdownNode {
  type: string;
  referenceType?: string;
  value?: string;
  children?: MarkdownNode[];
  position: {
    start: { offset: number };
    end: { offset: number };
    indent?: number[];
  };
}

function visit(
  node: MarkdownNode,
  callback: (node: MarkdownNode) => void | boolean
): void {
  if (callback(node) === false) return;
  node.children?.forEach((child) => visit(child, callback));
}

function isReferenceIdentifier(node: MarkdownNode): boolean {
  return node.type === "linkReference" && node.referenceType !== "full";
}
