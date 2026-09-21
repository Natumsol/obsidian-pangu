// @ts-ignore
import prettier from "prettier/esm/standalone";
// @ts-ignore
import markdownParser from "prettier/esm/parser-markdown";

export interface IPanGuSetting {
  tabWidth: string;
  embeddedLanguageFormatting: boolean;
}

export const DEFAULT_SETTINGS: IPanGuSetting = {
  tabWidth: "2",
  embeddedLanguageFormatting: true,
};

function parseOptions(options: IPanGuSetting): any {
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
  const tags: string[] = [];
  const processedContent = content.replace(
    /#[\p{L}\p{M}\p{N}_\/-]+/gu,
    (tag, offset: number) => {
      if (excluded.some(([start, end]) => offset >= start && offset < end))
        return tag;
      let escapes = 0;
      for (let i = offset - 1; i >= 0 && content[i] === "\\"; i--) escapes++;
      if (escapes % 2) return tag;
      const token = `${prefix}${tags.length}X`;
      tags.push(tag);
      return `#${token}`;
    }
  );

  const protectedParser = {
    ...parser,
    parse(text: string, parsers: unknown, parserOptions: unknown) {
      const tree = parser.parse(text, parsers, parserOptions);
      visit(tree, (node) => {
        if (node.type !== "math" && node.type !== "inlineMath") return;
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
  const formatted = prettier.format(processedContent, {
    parser: "pangu-markdown",
    plugins: [
      markdownParser,
      { parsers: { "pangu-markdown": protectedParser } },
    ],
    ...parseOptions(options),
  });

  return formatted.replace(
    new RegExp(`#${prefix}(\\d+)X`, "g"),
    (_match: string, index: string) => tags[+index]
  );
}

interface MarkdownNode {
  type: string;
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
  callback: (node: MarkdownNode) => void
): void {
  callback(node);
  node.children?.forEach((child) => visit(child, callback));
}
