import { useMemo } from "react";
import { Text, View } from "@tarojs/components";
import Taro from "@tarojs/taro";
import SectionBrowser, { type HandbookSection } from "@/components/SectionBrowser";

// 1.8MB 手册不走 webpack import（避免单分包超 2MB），由 config 拷到分包 assets，运行时读取
const JSON_PATH = "/subpackages/living/assets/living.json";

function loadSections(): { sections: HandbookSection[] | null; error: string } {
  try {
    const txt = Taro.getFileSystemManager().readFileSync(JSON_PATH, "utf-8");
    const parsed = JSON.parse(txt) as { sections: HandbookSection[] };
    return { sections: parsed.sections, error: "" };
  } catch (e) {
    return { sections: null, error: "手册数据加载失败：" + (e instanceof Error ? e.message : String(e)) };
  }
}

export default function Living() {
  const { sections, error } = useMemo(loadSections, []);

  if (error) return <View className="page"><View className="title">人生手册</View><View className="line tip">{error}</View></View>;
  if (!sections) return <View className="page"><View className="sub">加载手册中…</View></View>;

  return <SectionBrowser sections={sections} title="人生手册" />;
}
