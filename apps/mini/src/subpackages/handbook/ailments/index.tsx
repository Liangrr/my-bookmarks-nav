import { useMemo, useState } from "react";
import { Input, Text, View, ScrollView } from "@tarojs/components";
import data from "@shared-data/common-ailments.json";

type Stage = { phase: string; period: string; desc: string; do: string[]; medicines: string[]; foods: string[] };
type Ail = {
  id: string;
  name: string;
  icon: string;
  short: string;
  duration: string;
  tags: string[];
  symptoms: string[];
  spotCheck?: { title: string; aLabel: string; bLabel: string; rows: { k: string; a: string; b: string }[] };
  stages: Stage[];
  water: { amount: string; temp: string; when: string; note: string };
  avoid: string[];
  seeDoctor: string[];
  groups: { label: string; items: string[] }[];
};

const D = data as unknown as { intro: string; disclaimer: string; ailments: Ail[] };

export default function Ailments() {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<string>(D.ailments[0].id);

  const list = useMemo(() => {
    const k = q.trim().toLowerCase();
    if (!k) return D.ailments;
    return D.ailments.filter(
      (x) => x.name.toLowerCase().includes(k) || x.short.toLowerCase().includes(k)
    );
  }, [q]);

  const current = D.ailments.find((x) => x.id === sel) ?? list[0];

  return (
    <View className="page">
      <View className="title">日常小病治理</View>
      <View className="sub">{D.intro}</View>
      <View className="line tip">{D.disclaimer}</View>

      <Input className="search" value={q} onInput={(e) => setQ(e.detail.value)} placeholder="搜病种，如：感冒、腹泻、牙痛" placeholderClass="sub" />

      <ScrollView scrollX enhanced showScrollbar={false} className="chips-scroll">
        <View className="chips">
          {list.map((x) => (
            <View key={x.id} className={`chip${x.id === sel ? " chip-on" : ""}`} onClick={() => setSel(x.id)}>
              {x.icon} {x.name}
            </View>
          ))}
        </View>
      </ScrollView>

      {current ? (
        <View>
          <View className="card">
            <View className="card-head">
              <Text className="name">{current.icon} {current.name}</Text>
            </View>
            <View className="line meta">{current.short} · {current.duration}</View>
            <View className="sig">{current.tags.map((t) => <Text key={t} className="sig-item">{t}</Text>)}</View>

            <View className="sub-h">常见症状</View>
            {current.symptoms.map((s, i) => <View key={i} className="line">· {s}</View>)}
          </View>

          {current.spotCheck ? (
            <View className="card">
              <View className="sub-h">{current.spotCheck.title}</View>
              {current.spotCheck.rows.map((r, i) => (
                <View key={i} className="compare-row">
                  <View className="compare-k">{r.k}</View>
                  <View className="compare-col"><Text className="tag">{current.spotCheck!.aLabel}</Text>{r.a}</View>
                  <View className="compare-col"><Text className="tag">{current.spotCheck!.bLabel}</Text>{r.b}</View>
                </View>
              ))}
            </View>
          ) : null}

          {current.stages.map((st, i) => (
            <View key={i} className="card">
              <View className="card-head"><Text className="name">{st.phase}</Text><Text className="tag">{st.period}</Text></View>
              <View className="line">{st.desc}</View>
              {st.do.map((d, j) => <View key={j} className="line">· {d}</View>)}
              {st.medicines.length > 0 ? <View className="line meta">用药：{st.medicines.join("；")}</View> : null}
              {st.foods.length > 0 ? <View className="line meta">饮食：{st.foods.join("；")}</View> : null}
            </View>
          ))}

          <View className="card">
            <View className="sub-h">饮水</View>
            <View className="line">量：{current.water.amount}</View>
            <View className="line">温度：{current.water.temp}</View>
            <View className="line">时机：{current.water.when}</View>
            <View className="line tip">{current.water.note}</View>
          </View>

          <View className="card">
            <View className="sub-h">忌口 / 不要做</View>
            {current.avoid.map((x, i) => <View key={i} className="line">· {x}</View>)}
          </View>

          <View className="card danger">
            <View className="sub-h">出现以下情况及时就医</View>
            {current.seeDoctor.map((x, i) => <View key={i} className="line">⚠ {x}</View>)}
          </View>

          {current.groups.map((g, i) => (
            <View key={i} className="card">
              <View className="sub-h">{g.label}</View>
              {g.items.map((x, j) => <View key={j} className="line">· {x}</View>)}
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
