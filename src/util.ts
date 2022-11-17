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
  return prettier.format(content, {
    parser: "markdown",
    plugins: [markdownParser],
    ...parseOptions(options),
  });
}
