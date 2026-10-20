import { useMemo, useState } from "react";
import { Text, View, ScrollView } from "@tarojs/components";
import Taro from "@tarojs/taro";

type Link = { text: string; url: string };
type Task = { id: string; title: string; plain: string; output?: string; tags: string[]; links?: Link[] };
type Stage = { id: string; title: string; desc?: string; tasks: Task[] };
type ResGroup = { category: string; items: (Link & { desc?: string })[] };
type Ladder = { level: number; project: string; learn: string };
type Track = { id: string; title: string; desc: string; color?: string; stages: Stage[]; resources: ResGroup[]; ladder: Ladder[] };
type Gloss = { term: string; plain: string };

function copyLink(url: string) {
  Taro.setClipboardData({ data: url, success: () => Taro.showToast({ title: "链接已复制", icon: "none" }) });
}

export default function TrackGuide({
  meta,
  tracks,
  glossary,
}: {
  meta: { title: string; desc: string; updated: string };
  tracks: Track[];
  glossary: Gloss[];
}) {
  const [tid, setTid] = useState(tracks[0].id);
  const track = useMemo(() => tracks.find((t) => t.id === tid) ?? tracks[0], [tid, tracks]);

  return (
    <View className="page">
      <View className="title">{meta.title}</View>
      <View className="sub">{meta.desc}（更新 {meta.updated}）</View>

      <View className="filter-sticky">
        <ScrollView scrollX enhanced showScrollbar={false} className="chips-scroll">
          <View className="chips">
            {tracks.map((t) => (
              <View key={t.id} className={`chip${t.id === tid ? " chip-on" : ""}`} onClick={() => setTid(t.id)}>
                {t.title}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      <View className="sub">{track.desc}</View>

      {track.stages.map((st) => (
        <View key={st.id}>
          <View className="sub-h">{st.title}</View>
          {st.desc ? <View className="line meta">{st.desc}</View> : null}
          {st.tasks.map((t) => (
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
        </View>
      ))}

      <View className="sub-h">参考资源</View>
      {track.resources.map((g) => (
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

      <View className="sub-h">进阶阶梯</View>
      {track.ladder.map((l) => (
        <View key={l.level} className="card">
          <View className="card-head">
            <Text className="tag">第 {l.level} 级</Text>
            <Text className="name">{l.project}</Text>
          </View>
          <View className="line">{l.learn}</View>
        </View>
      ))}

      {glossary.length > 0 ? (
        <>
          <View className="sub-h">术语表</View>
          {glossary.map((g) => (
            <View key={g.term} className="card">
              <View className="card-head"><Text className="name">{g.term}</Text></View>
              <View className="line">{g.plain}</View>
            </View>
          ))}
        </>
      ) : null}
    </View>
  );
}
