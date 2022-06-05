import formatUtil from '../formatUtil';
describe('insertSpace test', () => {
  const insertSpace = formatUtil.insertSpace

  test('应该加空格', () => {
    expect(insertSpace('定位wgs84')).toEqual('定位 wgs84');
    expect(insertSpace('wgs84定位')).toEqual('wgs84 定位');
    expect(insertSpace('[描述文本format](链接wgs84)')).toEqual('[描述文本 format](链接wgs84)');
  });

  test('不应该加空格', () => {
    expect(insertSpace('![描述文本](wgs84链接wgs84)')).toEqual('![描述文本](wgs84链接wgs84)');
    expect(insertSpace('[描述文本](wgs84链接wgs84)')).toEqual('[描述文本](wgs84链接wgs84)');
    expect(insertSpace('[描述文本](链接wgs84)')).toEqual('[描述文本](链接wgs84)');

    expect(insertSpace('[[本地文件wgd文件]]')).toEqual('[[本地文件wgd文件]]');
    expect(insertSpace('[[wgd文件]]')).toEqual('[[wgd文件]]');

    expect(insertSpace('![[本地文件wgd文件]]')).toEqual('![[本地文件wgd文件]]');
    expect(insertSpace('![[wgd文件]]')).toEqual('![[wgd文件]]');
  });
});
