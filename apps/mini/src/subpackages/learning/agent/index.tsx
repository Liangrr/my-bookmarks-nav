import { useMemo, useState } from "react";
import { Text, View, ScrollView } from "@tarojs/components";
import Taro from "@tarojs/taro";
import data from "@shared-data/agent-learning-guide.json";

type Link = { text: string; url: string };
type Task = { id: string; title: string; plain: string; output?: string; tags: string[]; links?: Link[] };
type Stage = { id: string; title: string; desc: string; tasks: Task[] };
type ResGroup = { category: string; items: (Link & { desc?: string })[] };

const META = (data as unknown as { meta: { title: string; desc: string; updated: string }; stages: Stage[]; resources: ResGroup[]; ladder: unknown[]; glossary: { term: string; plain: string }[] }).meta;
const STAGES = (data as unknown as { stages: Stage[] }).stages;
const RES = (data as unknown as { resources: ResGroup[] }).resources;

function copyLink(url: string) {
  Taro.setClipboardData({ data: url, success: () => Taro.showToast({ title: "链接已复制", icon: "none" }) });
}

export default function AgentLearn() {
  const [sid, setSid] = useState(STAGES[0].id);
  const stage = useMemo(() => STAGES.find((s) => s.id === sid) ?? STAGES[0], [sid]);

  return (
    <View className="page">
      <View className="title">{META.title}</View>
      <View className="sub">{META.desc}（更新 {META.updated}）</View>

      <ScrollView scrollX enhanced showScrollbar={false} className="chips-scroll">
        <View className="chips">
          {STAGES.map((s) => (
            <View key={s.id} className={`chip${s.id === sid ? " chip-on" : ""}`} onClick={() => setSid(s.id)}>
              {s.title}
            </View>
          ))}
        </View>
      </ScrollView>

      <View className="sub">{stage.desc}</View>

      {stage.tasks.map((t) => (
        <View key={t.id} className="card">
          <View className="card-head"><Text className="name">{t.title}</Text></View>
          <View className="line">{t.plain}</View>
          {t.output ? <View className="line"><Text className="block-label">产出：</Text>{t.output}</View> : null}
          <View className="sig">{t.tags.map((x) => <Text key={x} className="sig-item">{x}</Text>)}</View>
          {t.links?.map((l) => (
            <View key={l.url} className="line src" onClick={() => copyLink(l.url)}>🔗 {l.text}（点按复制）</View>
          ))}
        </View>
      ))}

      <View className="sub-h">参考资源</View>
      {RES.map((g) => (
        <View key={g.category}>
          <View className="sub-h">{g.category}</View>
          {g.items.map((r) => (
            <View key={r.url} className="card" onClick={() => copyLink(r.url)}>
              <View className="card-head"><Text className="name">{r.title}</Text></View>
              {r.desc ? <View className="line">{r.desc}</View> : null}
              <View className="line src">🔗 {r.url}（点按复制）</View>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}
