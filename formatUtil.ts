import Scanner from './model/Scanner';

interface IgnoreBlock {
  start: number | null;
  end: number | null;
}

export default {
  condenseContent(content: string): string {
    // 将 制表符 改成 四个空格
    content = content.replace(/\t/g, '    ');

    // 删除超过2个的回车
    // Unix 的只有 LF，Windows 的需要 CR LF
    content = content.replace(/(\n){3,}/g, '$1$1');
    content = content.replace(/(\r\n){3,}/g, '$1$1');
    return content;
  },
  getIgnoreBlocks(lines: string[], token: string = '```'): IgnoreBlock[] {
    const ignoreBlocks: IgnoreBlock[] = [];
    let block: IgnoreBlock | null = null;
    lines.forEach((line, index) => {
      line = line.trim();
      if (line.startsWith(token)) {
        if (!block) {
          block = { start: index, end: null };
        } else {
          if (line === token) {
            block.end = index;
            ignoreBlocks.push(block);
            block = null;
          }
        }
      }
    });
    return ignoreBlocks;
  },
  deleteSpaces(content: string): string {
    // 去掉「`()[]{}<>'"`」: 前后多余的空格
    content = content.replace(/\s+([\(\)\[\]\{\}<>'":])\s+/g, ' $1 ');

    // 去掉连续括号增加的空格，例如：「` ( [ { <  > } ] ) `」
    content = content.replace(/([<\(\{\[])\s([<\(\{\[])\s/g, '$1$2 ');
    content = content.replace(/([<\(\{\[])\s([<\(\{\[])\s/g, '$1$2 ');
    content = content.replace(/([<\(\{\[])\s([<\(\{\[])\s/g, '$1$2 ');
    content = content.replace(/([<\(\{\[])\s([<\(\{\[])\s/g, '$1$2 ');
    content = content.replace(/\s([>\)\]\}])\s([>\)\]\}])/g, ' $1$2');
    content = content.replace(/\s([>\)\]\}])\s([>\)\]\}])/g, ' $1$2');
    content = content.replace(/\s([>\)\]\}])\s([>\)\]\}])/g, ' $1$2');
    content = content.replace(/\s([>\)\]\}])\s([>\)\]\}])/g, ' $1$2');

    // 去掉 「`$ () $`」, 「`$ [] $`」, 「`$ {} $`」 里面增加的空格
    // 去掉开始 $ 后面增加的空格，结束 $ 前面增加的空格
    // 去掉包裹代码的符号里面增加的空格
    // 去掉开始 ` 后面增加的空格，结束 ` 前面增加的空格
    content = content.replace(
      /([`\$])\s*([<\(\[\{])([^\$]*)\s*([`\$])/g,
      '$1$2$3$4'
    );
    content = content.replace(
      /([`\$])\s*([^\$]*)([>\)\]\}])\s*([`\$])/g,
      '$1$2$3$4'
    );

    // 去掉「`) _`」、「`) ^`」增加的空格
    content = content.replace(/\)\s([_\^])/g, ')$1');

    // 去掉 [^footnote,2002] 中的空格
    content = content.replace(/\[\s*\^([^\]\s]*)\s*\]/g, '[^$1]');

    // 将链接的格式中文括号“[]（）”改成英文括号“[]()”，去掉增加的空格
    content = content.replace(
      /\s*\[\s*([^\]]+)\s*\]\s*[（(]\s*([^\s\)]*)\s*[)）]\s*/g,
      ' [$1]($2) '
    );

    // 将图片链接的格式中的多余空格“! []()”去掉，变成“![]()”
    content = content.replace(
      /!\s*\[\s*([^\]]+)\s*\]\s*[（(]\s*([^\s\)]*)\s*[)）]\s*/g,
      '![$1]($2) '
    );

    // 将网络地址中“ : // ”符号改成“://”
    content = content.replace(/\s*:\s*\/\s*\/\s*/g, '://');

    // 去掉行末空格
    content = content.replace(/(\S*)\s*$/g, '$1');

    // 去掉「123 °」和 「15 %」中的空格
    content = content.replace(/([0-9])\s*([°%])/g, '$1$2');

    // 去掉 2020 - 04 - 20, 08 : 00 : 00 这种日期时间表示的数字内的空格
    content = content.replace(/([0-9])\s*-\s*([0-9])/g, '$1-$2');
    content = content.replace(/([0-9])\s*:\s*([0-9])/g, '$1:$2');

    // 去掉 1 , 234 , 567 这种千分位表示的数字内的空格
    content = content.replace(/([0-9])\s*,\s*([0-9])/g, '$1,$2');

    // 全角標點與其他字符之間不加空格
    // 将无序列表的-后面的空格保留
    // 将有序列表的-后面的空格保留
    content = content.replace(
      /^(?<![-|\d.]\s*)\s*([，。、《》？『』「」；∶【】｛｝—！＠￥％…（）])\s*/g,
      '$1'
    );
    return content;
  },

  insertSpace(content: string): string {
    const interMiddle = (open: string, close: string, groups: string[]) => {
      return  open + ' ' + groups.filter(group => group != undefined).join(' ')
    }
    const rules = [
      {
        type: 'link',
        open: /\]\(/,
        close: /\)/
      },
      {
        type: 'duplex-link',
        open: /!?\[\[/,
        close: /\]\]/
      },
      {
        type: 'inline-code',
        open: /`/,
        close: /`/
      },
      {
        open: /[\u4e00-\u9fa5\u3040-\u30FF]+/,
        close: /^(?:!?\[)?([a-zA-Z0-9]+)([\u4e00-\u9fa5\u3040-\u30FF]*)?/g,
        deal: interMiddle
      },
      {
        open: /[a-zA-Z0-9]+/,
        close: /^(?:!?\[)?([\u4e00-\u9fa5\u3040-\u30FF]+)([a-zA-Z0-9]*)?/g,
        deal: interMiddle
      },
      {
        open: /:\s*/,
        close: /^[a-zA-z]/,
        deal(_: string, close: string) {
          return `: ${close}`
        }
      },
    ]
    const scanner = new Scanner(content, rules)

    return scanner.deal()
  },
  replacePunctuations(content: string): string {
    // `, \ . : ; ? !` 改成 `，、。：；？！`
    // 必须在结尾或者有空格的点才被改成句号
    content = content.replace(
      /([\u4e00-\u9fa5\u3040-\u30FF])\.($|\s*)/g,
      '$1。'
    );
    content = content.replace(/([\u4e00-\u9fa5\u3040-\u30FF]),/g, '$1，');
    content = content.replace(/([\u4e00-\u9fa5\u3040-\u30FF]);/g, '$1；');
    content = content.replace(/([\u4e00-\u9fa5\u3040-\u30FF])!/g, '$1！');
    content = content.replace(/([\u4e00-\u9fa5\u3040-\u30FF])\?/g, '$1？');
    content = content.replace(/([\u4e00-\u9fa5\u3040-\u30FF])\\/g, '$1、');
    content = content.replace(/([\u4e00-\u9fa5\u3040-\u30FF])＼s*\:/g, '$1：');

    // 簡體中文使用直角引號
    content = content.replace(/‘/g, '『');
    content = content.replace(/’/g, '』');
    content = content.replace(/“/g, '「');
    content = content.replace(/”/g, '」');
    // 括号使用半角标点
    // 半角括号的两边都有空格就不在这里处理了，放到行中处理
    content = content.replace(/\s*[（(]\s*/g, ' ( ');
    content = content.replace(/\s*[）)]\s*/g, ' ) ');

    // 英文和数字内部的全角标点 `，。；‘’“”：？！＠＃％＆－＝＋｛｝【】｜＼～`改成半角标点
    content = content.replace(/(\w)\s*，\s*(\w)/g, '$1, $2');
    content = content.replace(/(\w)\s*。\s*(\w)/g, '$1. $2');
    content = content.replace(/(\w)\s*；\s*(\w)/g, '$1; $2');
    content = content.replace(/(\w)\s*‘\s*(\w)/g, "$1 '$2");
    content = content.replace(/(\w)\s*’\s*(\w)/g, "$1' $2");
    content = content.replace(/(\w)\s*“\s*(\w)/g, '$1 "$2');
    content = content.replace(/(\w)\s*”\s*(\w)/g, '$1" $2');
    content = content.replace(/(\w)\s*：\s*(\w)/g, '$1: $2');
    content = content.replace(/(\w)\s*？\s*(\w)/g, '$1? $2');
    content = content.replace(/(\w)\s*！\s*(\w)/g, '$1! $2');
    content = content.replace(/(\w)\s*＠\s*(\w)/g, '$1@$2');
    content = content.replace(/(\w)\s*＃\s*(\w)/g, '$1#$2');
    content = content.replace(/(\w)\s*％\s*(\w)/g, '$1 % $2');
    content = content.replace(/(\w)\s*＆\s*(\w)/g, '$1 & $2');
    content = content.replace(/(\w)\s*－\s*(\w)/g, '$1 - $2');
    content = content.replace(/(\w)\s*＝\s*(\w)/g, '$1 = $2');
    content = content.replace(/(\w)\s*＋\s*(\w)/g, '$1 + $2');
    content = content.replace(/(\w)\s*｛\s*(\w)/g, '$1 {$2');
    content = content.replace(/(\w)\s*｝\s*(\w)/g, '$1} $2');
    content = content.replace(/(\w)\s*[【\[]\s*(\w)/g, '$1 [$2');
    content = content.replace(/(\w)\s*[】\]]\s*(\w)/g, '$1] $2');
    content = content.replace(/(\w)\s*｜\s*(\w)/g, '$1 | $2');
    content = content.replace(/(\w)\s*＼\s*(\w)/g, '$1  $2');
    content = content.replace(/(\w)\s*～\s*(\w)/g, '$1~$2');
    // 连续三个以上的 `。` 改成 `......`
    content = content.replace(/[。]{3,}/g, '……');
    // 截断连续超过一个的 ？和！ 为一个，「！？」也算一个
    content = content.replace(/([！？]+)\1{1,}/g, '$1');
    // 截断连续超过一个的 。，；：、“”『』〖〗《》 为一个
    content = content.replace(/([。，；：、“”『』〖〗《》【】])\1{1,}/g, '$1');
    return content;
  },

  replaceFullNumbersAndChars(content: string): string {
    // 替换全角数字 & 全角英文
    // Ａ -> A
    // ０ -> 0
    return content.replace(/[\uFF10-\uFF19\uFF21-\uFF5A]/g, c =>
      String.fromCharCode(c.charCodeAt(0) - 0xfee0)
    );
  },

  formatContent(content: string): string {
    // 替换所有的全角数字和字母为半角
    content = this.replaceFullNumbersAndChars(content);

    // 删除多余的内容（回车）
    content = this.condenseContent(content);

    // 每行操作
    const lines = content.split('\n');

    const ignoreBlocks: IgnoreBlock[] = this.getIgnoreBlocks(lines);

    content = lines
      .map((line: string, index: number) => {
        // 忽略代码块
        if (
          ignoreBlocks.some(({ start, end }) => {
            return index >= start && index <= end;
          })
        ) {
          return line;
        }

        // 删除多余的空格
        line = this.deleteSpaces(line);

        // 插入必要的空格
        line = this.insertSpace(line);

        // 将有编号列表的“1.  ”改成 “1. ”
        line = line.replace(/^(\s*)(\d\.)\s+(\S)/, '$1$2 $3');

        // 将无编号列表的“* ”改成 “- ”
        // 将无编号列表的“- ”改成 “- ”
        line = line.replace(/^(\s*)[-\*]\s+(\S)/, '$1- $2');

        return line;
      })
      .join('\n');

    // 结束文档整理前再删除最后一个回车
    content = content.replace(/(\n){2,}$/g, '$1');
    content = content.replace(/(\r\n){2,}$/g, '$1');
    return content;
  },
};
