export default defineAppConfig({
  // 主包只放两个 tab 页：首页（菜单聚合）、个人；带大数据的页面放分包按需下载
  pages: ["pages/index/index", "pages/profile/index"],
  subPackages: [
    {
      root: "subpackages/budget",
      pages: ["index"],
    },
    {
      root: "subpackages/life",
      pages: ["fruits/index", "feast/index", "diy/index"],
    },
    {
      root: "subpackages/handbook",
      pages: ["survival/index", "tcm/index", "emergency/index", "ailments/index"],
    },
    {
      root: "subpackages/learning",
      pages: ["ai-ideas/index", "agent/index", "dev/index", "flutter/index", "indie/index"],
    },
    {
      root: "subpackages/living",
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
        iconPath: "assets/tab/home.png",
        selectedIconPath: "assets/tab/home-active.png",
      },
      {
        pagePath: "pages/profile/index",
        text: "个人",
        iconPath: "assets/tab/user.png",
        selectedIconPath: "assets/tab/user-active.png",
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
