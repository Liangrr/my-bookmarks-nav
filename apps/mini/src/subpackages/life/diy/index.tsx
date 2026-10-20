import { useMemo, useState } from "react";
import { Text, View, ScrollView } from "@tarojs/components";
import diy from "@shared-data/diy-guide.json";

type Material = { name: string; amount: string; ratio?: string; note?: string };
type DiyItem = {
  id: string;
  title: string;
  icon: string;
  difficulty: string;
  duration: string;
  time?: string;
  yield?: string;
  tags?: string[];
  materials: Material[];
  steps: string[];
  note?: string;
  save?: string;
};
type Section = { id: string; title: string; intro: string; items: DiyItem[] };

const DATA = diy as unknown as { sections: Section[] };

export default function Diy() {
  const [secId, setSecId] = useState(DATA.sections[0].id);
  const section = useMemo(
    () => DATA.sections.find((s) => s.id === secId) ?? DATA.sections[0],
    [secId]
  );

  return (
    <View className="page">
      <View className="title">DIY 手作</View>
      <View className="sub">{section.intro}</View>

      <ScrollView scrollX enhanced showScrollbar={false} className="chips-scroll">
        <View className="chips">
          {DATA.sections.map((s) => (
            <View key={s.id} className={`chip${s.id === secId ? " chip-on" : ""}`} onClick={() => setSecId(s.id)}>
              {s.title}
            </View>
          ))}
        </View>
      </ScrollView>

      {section.items.map((it) => (
        <View key={it.id} className="card">
          <View className="card-head">
            <Text className="icon">{it.icon}</Text>
            <Text className="name">{it.title}</Text>
          </View>
          <View className="line meta">
            {it.difficulty} · {it.duration}{it.time ? ` · ${it.time}` : ""}
          </View>
          {it.tags && it.tags.length > 0 ? (
            <View className="sig">{it.tags.map((t) => <Text key={t} className="sig-item">{t}</Text>)}</View>
          ) : null}
          {it.yield ? <View className="line">产出：{it.yield}</View> : null}

          <View className="sub-h">材料</View>
          {it.materials.map((m, i) => (
            <View key={i} className="line">· {m.name} {m.amount}{m.ratio ? `（${m.ratio}）` : ""}{m.note ? `：${m.note}` : ""}</View>
          ))}

          <View className="sub-h">步骤</View>
          {it.steps.map((s, i) => (
            <View key={i} className="line">{i + 1}. {s}</View>
          ))}

          {it.note ? <View className="line tip">注意：{it.note}</View> : null}
          {it.save ? <View className="line src">省钱：{it.save}</View> : null}
        </View>
      ))}
    </View>
  );
}
