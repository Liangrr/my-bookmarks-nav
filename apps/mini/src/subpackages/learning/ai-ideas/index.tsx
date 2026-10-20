import { useMemo, useState } from "react";
import { Text, View, ScrollView } from "@tarojs/components";
import Taro from "@tarojs/taro";
import data from "@shared-data/ai-ideas.json";

type Link = { text: string; url: string };
type Idea = {
  id: string;
  title: string;
  audience: string[];
  level: string;
  cost: string;
  desc: string;
  how: string;
  tags: string[];
  links?: Link[];
};
type Cat = { id: string; title: string; intro: string; items: Idea[] };

const META = (data as unknown as { meta: { title: string; desc: string; updated: string }; categories: Cat[]; resources: Link[] }).meta;
const CATS = (data as unknown as { categories: Cat[] }).categories;
const RESOURCES = (data as unknown as { resources: (Link & { desc: string })[] }).resources;

function copyLink(url: string) {
  Taro.setClipboardData({
    data: url,
    success: () => Taro.showToast({ title: "链接已复制", icon: "none" }),
  });
}

export default function AiIdeas() {
  const [catId, setCatId] = useState(CATS[0].id);
  const cat = useMemo(() => CATS.find((c) => c.id === catId) ?? CATS[0], [catId]);

  return (
    <View className="page">
      <View className="title">{META.title}</View>
      <View className="sub">{META.desc}（更新 {META.updated}）</View>

      <View className="filter-sticky">
        <ScrollView scrollX enhanced showScrollbar={false} className="chips-scroll">
          <View className="chips">
            {CATS.map((c) => (
              <View key={c.id} className={`chip${c.id === catId ? " chip-on" : ""}`} onClick={() => setCatId(c.id)}>
                {c.title}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      <View className="sub">{cat.intro}</View>

      {cat.items.map((it) => (
        <View key={it.id} className="card">
          <View className="card-head">
            <Text className="name">{it.title}</Text>
          </View>
          <View className="line meta">{it.level} · {it.cost} · 受众：{it.audience.join("、")}</View>
          <View className="line">{it.desc}</View>
          <View className="line"><Text className="block-label">怎么做：</Text>{it.how}</View>
          <View className="sig">{it.tags.map((t) => <Text key={t} className="sig-item">{t}</Text>)}</View>
          {it.links?.map((l) => (
            <View key={l.url} className="line src" onClick={() => copyLink(l.url)}>🔗 {l.text}（点按复制链接）</View>
          ))}
        </View>
      ))}

      <View className="sub-h">开源参考</View>
      {RESOURCES.map((r) => (
        <View key={r.url} className="card" onClick={() => copyLink(r.url)}>
          <View className="card-head"><Text className="name">{r.title}</Text></View>
          <View className="line">{r.desc}</View>
          <View className="line src">🔗 {r.url}（点按复制）</View>
        </View>
      ))}
    </View>
  );
}
