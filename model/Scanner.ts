interface Rule {
  /** 左侧开启规则 */
  open: RegExp;
  /** 右侧关闭标签 */
  close: RegExp;
  /** 对该规则的处理函数 */
  deal?: (open: string, close: string, groups?: string[]) => string;
}

/** 缺省deal处理函数，原样返回 */
const ignore = (open: string, close: string) => {
  return open + close;
};

/**
 * 扫描器，通过规则的匹配进行自定义处理
 */
export default class Scanner {
  /** 原始文本 */
  string: string;
  /** 待处理文本 */
  tail: string;
  /** 当前处理索引 */
  pos: number;
  /** 自定义处理规则 */
  rules: Rule[];
  /** 左侧开标签匹配规则 */
  openTagRe: null | RegExp;
  /** 当前匹配的处理规则 */
  pickupRule: null | number;

  /**
   * 
   * @param string 待处理文本
   * @param rules 处理规则
   */
  constructor(string: string, rules?: Rule[]) {
    this.string = string;
    this.tail = string;
    this.pos = 0;
    this.rules = [];
    this.openTagRe = null;
    this.pickupRule = null;

    if (rules) {
      this.immitRules(rules)
    }
  }
  /**
   * 添加处理规则
   * @param rules 处理规则
   */
  immitRules(rules: Rule[]) {
    this.rules = rules;
    const openTegs = rules.map((rule) => {
      const openTagRe: string = rule.open.toString().slice(1, -1);
      return `(${openTagRe})`;
    });
    this.openTagRe = new RegExp(openTegs.join("|"));
  }
  /**
   * 判断文本是否处理结束
   * @returns true: 文本处理结束
   */
  finish() {
    return this.tail === "";
  }
  /**
   * 返回匹配到的首个开标签左侧的内容
   * @returns string
   */
  scanUtil() {
    const openTagsRe = new RegExp(this.openTagRe);
    // 找到开头的match
    const result = openTagsRe.exec(this.tail);
    var index, match;
    if (result === null) {
      index = -1;
    } else {
      const openTagRe = result.findIndex((value, index) => {
        if (index > 0) {
          return value !== undefined;
        }
      });
      if (openTagRe !== -1) {
        // 当前匹配的规则Index
        this.pickupRule = openTagRe - 1;
      }
      index = result.index;
    }

    switch (index) {
      case -1:
        match = this.tail;
        this.tail = "";
        break;
      case 0:
        match = "";
        break;
      default:
        match = this.tail.substring(0, index);
        this.tail = this.tail.substring(index);
    }

    this.pos += match.length;

    return match;
  }
  /**
   * 针对满足规则的内容进行处理
   * 
   * @returns string
   */
  sacn() {
    const rule = this.rules[this.pickupRule];
    const deal = (open: string, close: string, tail: string, func: typeof rule.deal, groups? : string[]) => {
      this.tail = tail;
      this.pos += (open + close).length;
      return func(open, close, groups);
    };
    let tail = this.tail;

    // 匹配开头
    const open = tail.match(rule.open);
    const openMatch = open[0];
    // result.open = openMatch
    tail = tail.substring(openMatch.length);

    const close = tail.match(rule.close);

    if (!close) return deal(openMatch, "", tail, ignore);

    const closeMatch = tail.substring(0, close.index + close[0].length);
    tail = tail.substring(closeMatch.length);
    return deal(openMatch, closeMatch, tail, rule.deal || ignore, [...open.slice(1), ...close.slice(1)]);
  }

  /**
   * 对满足规则的文本进行处理，
   * 直到文本都处理完后返回新的字符串
   * 
   * @returns string
   */
  deal() {
    let result = "";
    while (!this.finish()) {
      const value = this.scanUtil();
      if (value) {
        result += value;
      } else {
        const match = this.sacn();
        result += match;
      }
    }

    return result;
  }
}
