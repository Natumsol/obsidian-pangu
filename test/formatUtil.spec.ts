import formatUtil from '../formatUtil';
describe('insertSpace test', () => {
  const insertSpace = formatUtil.insertSpace

  test('应该加空格', () => {
    // 正常匹配
    expect(insertSpace('定位wgs84')).toEqual('定位 wgs84');
    expect(insertSpace('wgs84定位')).toEqual('wgs84 定位');
    expect(insertSpace('wgs84定gps')).toEqual('wgs84 定 gps');
    expect(insertSpace('定gps位置')).toEqual('定 gps 位置');
    expect(insertSpace('w定f位g过f的')).toEqual("w 定 f 位 g 过 f 的");
    expect(insertSpace('定f位g过f的f')).toEqual("定 f 位 g 过 f 的 f");
    // 不满足tag 关闭条件
    expect(insertSpace('[[wgs84定位')).toEqual('[[wgs84 定位');
    expect(insertSpace('![wgs84定位')).toEqual('![wgs84 定位');
    expect(insertSpace('放假放假[[wgs84定位')).toEqual('放假放假[[wgs84 定位');

    // 链接描述插入空格
    expect(insertSpace('[描述文本format](链接wgs84)')).toEqual('[描述文本 format](链接wgs84)');
    expect(insertSpace('![format描述文本](链接wgs84)')).toEqual('![format 描述文本](链接wgs84)');
    // 符号插入空格
    expect(insertSpace("「I said:it's a good news」")).toEqual("「I said: it's a good news」");
    // 文本和链接描述中间插入空格
    expect(insertSpace('good[描述文本format](链接wgs84)')).toEqual('good [描述文本 format](链接wgs84)');
    expect(insertSpace('good![描述文本format](链接wgs84)')).toEqual('good ![描述文本 format](链接wgs84)');
    expect(insertSpace('好[format描述文本](链接wgs84)')).toEqual('好 [format 描述文本](链接wgs84)');
    expect(insertSpace('好![format描述文本](链接wgs84)')).toEqual('好 ![format 描述文本](链接wgs84)');
  });

  test('不应该加空格', () => {
    expect(insertSpace('征文![描述文本](wgs84链接wgs84)')).toEqual('征文![描述文本](wgs84链接wgs84)');
    expect(insertSpace('征文[描述文本](wgs84链接wgs84)')).toEqual('征文[描述文本](wgs84链接wgs84)');
    expect(insertSpace('征文[描述文本](链接wgs84)')).toEqual('征文[描述文本](链接wgs84)');

    expect(insertSpace('好棒[[本地文件wgd文件]]')).toEqual('好棒[[本地文件wgd文件]]');
    expect(insertSpace('nice[[wgd文件]]')).toEqual('nice[[wgd文件]]');

    expect(insertSpace('好棒![[本地文件wgd文件]]')).toEqual('好棒![[本地文件wgd文件]]');
    expect(insertSpace('nice![[wgd文件]]')).toEqual('nice![[wgd文件]]');
    expect(insertSpace('`sf::发:ff`')).toEqual('`sf::发:ff`');
  });

  test('综合测试', () => {
    expect(insertSpace('征文![描述文本](wgs84链接wgs84)')).toEqual('征文![描述文本](wgs84链接wgs84)');
    expect(insertSpace('w定f发![描述文本](wgs84链接wgs84)g过f的')).toEqual("w 定 f 发![描述文本](wgs84链接wgs84)g 过 f 的");
    expect(insertSpace('w定f发f![描述文本](wgs84链接wgs84)g过f的')).toEqual("w 定 f 发 f ![描述文本](wgs84链接wgs84)g 过 f 的");
  })
});
