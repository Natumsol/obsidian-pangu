// @ts-ignore
import prettier from 'prettier/esm/standalone';
// @ts-ignore
import markdownParser from 'prettier/esm/parser-markdown';

export function format(content: string): string {
  return prettier.format(content, {
    parser: 'markdown',
    plugins: [markdownParser]
  });
}