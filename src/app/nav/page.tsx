import HomeContent from "@/components/home-content";
import navData from "@shared-data/navigation.json";

export const metadata = {
  title: "网站导航 - 星轨",
  description: "星轨 · 日常在用的优质网站，都在这里。分类导航、点击即达。",
};

// 本地静态数据，不再连数据库，也无需实时渲染
export default function NavPage() {
  return <HomeContent categories={navData.categories} bookmarks={navData.bookmarks} />;
}
