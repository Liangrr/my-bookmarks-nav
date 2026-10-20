import { useMemo, useState } from "react";
import { Text, View, ScrollView } from "@tarojs/components";
import Taro from "@tarojs/taro";
import data from "@shared-data/independent-developers.json";

type Item = { title: string; url: string; status: string; desc?: string; links: { text: string; url: string }[] };
type Author = { name: string; links: { text: string; url: string }[]; items: Item[] };
type Group = { date: string; authors: Author[] };

const D = data as unknown as {
  updatedAt: string;
  stats: { total: number; ok: number; dead: number; authors: number; dateGroups: number };
  groups: Group[];
};

function copyLink(url: string) {
  Taro.setClipboardData({ data: url, success: () => Taro.showToast({ title: "链接已复制", icon: "none" }) });
}

export default function Indie() {
  const [q, setQ] = useState("");
  const key = q.trim().toLowerCase();

  const groups = useMemo(() => {
    if (!key) return D.groups;
    return D.groups
      .map((g) => ({
        ...g,
        authors: g.authors
          .map((a) => ({
            ...a,
            items: a.items.filter(
              (it) =>
                it.title.toLowerCase().includes(key) ||
                (it.desc ?? "").toLowerCase().includes(key) ||
                a.name.toLowerCase().includes(key)
            ),
          }))
          .filter((a) => a.items.length > 0),
      }))
      .filter((g) => g.authors.length > 0);
  }, [key]);

  return (
    <View className="page">
      <View className="title">独立开发者项目库</View>
      <View className="sub">
        更新 {D.updatedAt} · 共 {D.stats.total} 个项目（存活 {D.stats.ok} / 失效 {D.stats.dead}）· {D.stats.authors} 位作者 · {D.stats.dateGroups} 个日期分组
      </View>

      <View className="filter-sticky">
        <Input
          className="search"
          value={q}
          onInput={(e) => setQ(e.detail.value)}
          placeholder="搜项目名 / 作者 / 描述"
          placeholderClass="sub"
        />
      </View>

      {groups.map((g) => (
        <View key={g.date}>
          <View className="sub-h">{g.date}</View>
          {g.authors.map((a, ai) => (
            <View key={ai} className="card">
              <View className="card-head">
                <Text className="name">{a.name}</Text>
                {a.links.map((l) => (
                  <Text key={l.url} className="tag" onClick={() => copyLink(l.url)}>🔗</Text>
                ))}
              </View>
              {a.items.map((it) => (
                <View key={it.url} className="line">
                  <Text className={it.status === "dead" ? "dead" : "ok"}>●</Text>{" "}
                  <Text className="link" onClick={() => copyLink(it.url)}>{it.title}</Text>
                  {it.desc ? <View className="line meta">{it.desc}</View> : null}
                </View>
              ))}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}
