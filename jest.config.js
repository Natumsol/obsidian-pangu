module.exports = {
  rootDir: "./test",
  transform: {
    "^.+\\.tsx?$": "ts-jest", // 哪些文件需要用 ts-jest 执行
  },
  moduleFileExtensions: [
    'ts',
    'tsx',
    'js',
    'jsx',
    'json',
    'node',
  ],
  globals: {

  },
};