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
    content = content.replace(/([`\$])\s*([<\(\[\{])([^\$]*)\s*([`\$])/g, '$1$2$3$4');
    content = content.replace(/([`\$])\s*([^\$]*)([>\)\]\}])\s*([`\$])/g, '$1$2$3$4');

    // 去掉「`) _`」、「`) ^`」增加的空格
    content = content.replace(/\)\s([_\^])/g, ')$1');

    // 去掉 [^footnote,2002] 中的空格
    content = content.replace(/\[\s*\^([^\]\s]*)\s*\]/g, '[^$1]');

    // 将链接的格式中文括号“[]（）”改成英文括号“[]()”，去掉增加的空格
    content = content.replace(/\s*\[\s*([^\]]+)\s*\]\s*[（(]\s*([^\s\)]*)\s*[)）]\s*/g, ' [$1]($2) ');

    // 将图片链接的格式中的多余空格“! []()”去掉，变成“![]()”
    content = content.replace(/!\s*\[\s*([^\]]+)\s*\]\s*[（(]\s*([^\s\)]*)\s*[)）]\s*/g, '![$1]($2) ');

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
    content = content.replace(/^(?<![-|\d.]\s*)\s*([，。、《》？『』「」；∶【】｛｝—！＠￥％…（）])\s*/g, '$1');
    return content;
  },

  insertSpace(content: string): string {
    // 在 “中文English” 之间加入空格 “中文 English”
    // 在 “中文123” 之间加入空格 “中文 123”
    content = content.replace(/([\u4e00-\u9fa5\u3040-\u30FF])([a-zA-Z0-9`])/g, '$1 $2');

    // 在 “English中文” 之间加入空格 “English 中文”
    // 在 “123中文” 之间加入空格 “123 中文”
    content = content.replace(/([a-zA-Z0-9%`])([*]*[\u4e00-\u9fa5\u3040-\u30FF])/g, '$1 $2');

    // 在 「I said:it's a good news」的冒号与英文之间加入空格 「I said: it's a good news」
    content = content.replace(/([:])\s*([a-zA-z])/g, '$1 $2');
    return content;
  },
  replacePunctuations(content: string): string {
    // `, \ . : ; ? !` 改成 `，、。：；？！`
    // 必须在结尾或者有空格的点才被改成句号
    content = content.replace(/([\u4e00-\u9fa5\u3040-\u30FF])\.($|\s*)/g, '$1。');
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

  replaceFullNumbers(content: string): string {
    ' 全角数字。';
    content = content.replace(/０/g, '0');
    content = content.replace(/１/g, '1');
    content = content.replace(/２/g, '2');
    content = content.replace(/３/g, '3');
    content = content.replace(/４/g, '4');
    content = content.replace(/５/g, '5');
    content = content.replace(/６/g, '6');
    content = content.replace(/７/g, '7');
    content = content.replace(/８/g, '8');
    content = content.replace(/９/g, '9');
    return content;
  },

  replaceFullChars(content: string): string {
    ' 全角英文和标点。';
    content = content.replace(/Ａ/g, 'A');
    content = content.replace(/Ｂ/g, 'B');
    content = content.replace(/Ｃ/g, 'C');
    content = content.replace(/Ｄ/g, 'D');
    content = content.replace(/Ｅ/g, 'E');
    content = content.replace(/Ｆ/g, 'F');
    content = content.replace(/Ｇ/g, 'G');
    content = content.replace(/Ｈ/g, 'H');
    content = content.replace(/Ｉ/g, 'I');
    content = content.replace(/Ｊ/g, 'J');
    content = content.replace(/Ｋ/g, 'K');
    content = content.replace(/Ｌ/g, 'L');
    content = content.replace(/Ｍ/g, 'M');
    content = content.replace(/Ｎ/g, 'N');
    content = content.replace(/Ｏ/g, 'O');
    content = content.replace(/Ｐ/g, 'P');
    content = content.replace(/Ｑ/g, 'Q');
    content = content.replace(/Ｒ/g, 'R');
    content = content.replace(/Ｓ/g, 'S');
    content = content.replace(/Ｔ/g, 'T');
    content = content.replace(/Ｕ/g, 'U');
    content = content.replace(/Ｖ/g, 'V');
    content = content.replace(/Ｗ/g, 'W');
    content = content.replace(/Ｘ/g, 'X');
    content = content.replace(/Ｙ/g, 'Y');
    content = content.replace(/Ｚ/g, 'Z');
    content = content.replace(/ａ/g, 'a');
    content = content.replace(/ｂ/g, 'b');
    content = content.replace(/ｃ/g, 'c');
    content = content.replace(/ｄ/g, 'd');
    content = content.replace(/ｅ/g, 'e');
    content = content.replace(/ｆ/g, 'f');
    content = content.replace(/ｇ/g, 'g');
    content = content.replace(/ｈ/g, 'h');
    content = content.replace(/ｉ/g, 'i');
    content = content.replace(/ｊ/g, 'j');
    content = content.replace(/ｋ/g, 'k');
    content = content.replace(/ｌ/g, 'l');
    content = content.replace(/ｍ/g, 'm');
    content = content.replace(/ｎ/g, 'n');
    content = content.replace(/ｏ/g, 'o');
    content = content.replace(/ｐ/g, 'p');
    content = content.replace(/ｑ/g, 'q');
    content = content.replace(/ｒ/g, 'r');
    content = content.replace(/ｓ/g, 's');
    content = content.replace(/ｔ/g, 't');
    content = content.replace(/ｕ/g, 'u');
    content = content.replace(/ｖ/g, 'v');
    content = content.replace(/ｗ/g, 'w');
    content = content.replace(/ｘ/g, 'x');
    content = content.replace(/ｙ/g, 'y');
    content = content.replace(/ｚ/g, 'z');
    return content;
  },

  formatContent(content: string): string {
    // 替换所有的全角数字为半角数字
    content = this.replaceFullNumbers(content);

    // 替换所有的全角英文和@标点 为 半角的英文和@标点
    content = this.replaceFullChars(content);

    // 删除多余的内容（回车）
    content = this.condenseContent(content);

    // 每行操作
    content = content
      .split('\n')
      .map((line: string) => {
        // 中文内部使用全角标点
        // line = formatUtil.replacePunctuations(line);

        // 删除多余的空格
        line = this.deleteSpaces(line);

        // 插入必要的空格
        line = this.insertSpace(line);

        // 将有编号列表的“1. ”改成 “1.  ”
        line = line.replace(/^(\s*)(\d\.)\s+(\S)/, '$1$2  $3');

        // 将无编号列表的“* ”改成 “-   ”
        // 将无编号列表的“- ”改成 “-   ”
        line = line.replace(/^(\s*)[-\*]\s+(\S)/, '$1-   $2');

        return line;
      })
      .join('\n');

    // 结束文档整理前再删除最后一个回车
    content = content.replace(/(\n){2,}$/g, '$1');
    content = content.replace(/(\r\n){2,}$/g, '$1');
    return content;
  },
};
