import { moment } from "obsidian";

const en = {
  commandFormat: "Add spaces between Chinese and English",
  quickStartName: "Quick start",
  quickStartDesc:
    "Default shortcut: Command + Shift + S on Mac, Ctrl + Shift + S on Windows/Linux. You can also run the command from the command palette. Change conflicting shortcuts under Settings → Hotkeys.",
  formatModeName: "Formatting mode",
  formatModeDesc:
    "Spacing only preserves blank lines and Markdown layout. Full formatting also normalizes other Markdown layout. Both modes preserve formula source.",
  formatModeSpacing: "Spacing only (preserve layout)",
  formatModeMarkdown: "Full Markdown formatting",
  tabWidthName: "Indentation width",
  tabWidthDesc:
    "Used only by full formatting. Lists always preserve their existing tabs and space indentation.",
  tabWidth2: "2 spaces",
  tabWidth4: "4 spaces",
  embeddedCodeName: "Format embedded code",
  embeddedCodeDesc:
    "Used only by full formatting. Spacing-only mode does not modify code, and inline code is always preserved.",
  autoSpacingName: "Add spaces as you type",
  autoSpacingDesc:
    "Off by default. Adds nearby Chinese/English spacing only after input is committed; paste, deletion, and undo are ignored. Format notes longer than 10,000 UTF-16 code units manually.",
} as const;

type MessageKey = keyof typeof en;

const zhCN: Record<MessageKey, string> = {
  commandFormat: "为中英文字符间自动加入空格",
  quickStartName: "快速开始",
  quickStartDesc:
    "默认快捷键：Mac 为 Command + Shift + S，Windows/Linux 为 Ctrl + Shift + S。也可从命令面板运行；如有冲突，请在「设置 - 快捷键」中修改。",
  formatModeName: "格式化模式",
  formatModeDesc:
    "默认只补空格，保留空行和 Markdown 布局；完整排版会规范化其他 Markdown 布局。两种模式都保护公式原文",
  formatModeSpacing: "只补空格（保留布局）",
  formatModeMarkdown: "完整 Markdown 排版",
  tabWidthName: "缩进宽度",
  tabWidthDesc: "仅完整排版模式生效；列表始终保留原有的 Tab 和空格缩进",
  tabWidth2: "2个空格",
  tabWidth4: "4个空格",
  embeddedCodeName: "格式化内嵌代码",
  embeddedCodeDesc:
    "仅完整排版模式生效；只补空格模式不修改代码。行内代码始终保留原文",
  autoSpacingName: "输入时自动补空格",
  autoSpacingDesc:
    "默认关闭；仅在输入确认后补充附近的中英文间距，不处理粘贴、删除或撤销。超过 10,000 UTF-16 单元的笔记请手动格式化",
};

export type Translator = (key: MessageKey) => string;

export function createTranslator(locale = moment.locale()): Translator {
  const normalized = locale.toLowerCase().replace(/_/g, "-");
  const messages = ["zh", "zh-cn", "zh-hans", "zh-sg"].includes(normalized)
    ? zhCN
    : en;
  return (key) => messages[key];
}
