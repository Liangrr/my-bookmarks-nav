export default defineAppConfig({
  // 主包只放两个 tab 页：首页（菜单聚合）、个人；带大数据的页面放分包按需下载
  pages: ["pages/index/index", "pages/profile/index"],
  subPackages: [
    {
      root: "subpackages/budget",
      pages: ["index"],
    },
  ],
  tabBar: {
    color: "#8b97a8",
    selectedColor: "#4ade80",
    backgroundColor: "#131a26",
    borderStyle: "black",
    list: [
      {
        pagePath: "pages/index/index",
        text: "首页",
      },
      {
        pagePath: "pages/profile/index",
        text: "个人",
      },
    ],
  },
  window: {
    backgroundTextStyle: "light",
    navigationBarBackgroundColor: "#131a26",
    navigationBarTitleText: "星轨",
    navigationBarTextStyle: "white",
  },
});
