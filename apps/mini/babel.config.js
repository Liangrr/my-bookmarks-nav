// Taro 4 编译配置：framework 为 react，TypeScript 由 babel preset 处理
module.exports = {
  presets: [
    [
      "taro",
      {
        framework: "react",
        ts: true,
      },
    ],
  ],
};
