export default defineAppConfig({
  // 主包只留首页（当季水果，数据仅 28KB），保证主包尽量小
  pages: ["pages/index/index"],
  // 带大数据的页面放分包：按需下载，不进主包
  subPackages: [
    {
      root: "subpackages/budget",
      pages: ["index"],
    },
  ],
  window: {
    backgroundTextStyle: "light",
    navigationBarBackgroundColor: "#131a26",
    navigationBarTitleText: "ai-agent-asuria",
    navigationBarTextStyle: "white",
  },
});
