import { useMemo, useState } from "react";
import { Input, Text, View, ScrollView } from "@tarojs/components";
import fruitsData from "@shared-data/seasonal-fruits.json";

type Fruit = {
  id: string;
  name: string;
  icon: string;
  taste: string;
  origin: string;
  sweetness: number;
  kcal: number;
  sugar: number;
  fat: number;
  fiber: number;
  diet: string;
  benefit: string;
  months: number[];
  tags?: string[];
};

const DATA = fruitsData as unknown as { intro: string; fruits: Fruit[] };
const CURRENT_MONTH = new Date().getMonth() + 1;
const MONTHS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const SWEET_LABEL: Record<number, string> = {
  1: "微甜",
  2: "清甜",
  3: "爽甜",
  4: "甘甜",
  5: "浓甜",
};

export default function Fruits() {
  const [q, setQ] = useState("");
  const [month, setMonth] = useState(CURRENT_MONTH);

  const list = useMemo(() => {
    const key = q.trim().toLowerCase();
    return DATA.fruits.filter((f) => {
      const hitMonth = month === 0 || f.months.includes(month);
      const hitKey =
        !key ||
        f.name.toLowerCase().includes(key) ||
        f.benefit.toLowerCase().includes(key) ||
        f.origin.toLowerCase().includes(key);
      return hitMonth && hitKey;
    });
  }, [q, month]);

  return (
    <View className="page">
      <View className="title">应季水果</View>
      <View className="sub">{DATA.intro}</View>

      <Input
        className="search"
        value={q}
        onInput={(e) => setQ(e.detail.value)}
        placeholder="搜索水果名、产地或功效"
        placeholderClass="sub"
      />

      <ScrollView scrollX className="chips-scroll" enhanced showScrollbar={false}>
        <View className="chips">
          {MONTHS.map((m) => (
            <View
              key={m}
              className={`chip${m === month ? " chip-on" : ""}`}
              onClick={() => setMonth(m)}
            >
              {m === 0 ? "全部" : `${m}月`}
            </View>
          ))}
        </View>
      </ScrollView>

      <View className="sub">命中 {list.length} / {DATA.fruits.length} 种</View>

      {list.length === 0 ? (
        <View className="empty">没有符合条件的当季水果</View>
      ) : (
        list.map((f) => (
          <View key={f.id} className="card">
            <View className="card-head">
              {f.icon ? <Text className="icon">{f.icon}</Text> : null}
              <Text className="name">{f.name}</Text>
              <Text className="tag">{SWEET_LABEL[f.sweetness] ?? ""} · {f.diet}</Text>
            </View>
            <View className="line">{f.taste}</View>
            <View className="line">{f.benefit}</View>
            <View className="line">产地：{f.origin}</View>
            <View className="line">上市月份：{f.months.map((m) => `${m}月`).join("、")}</View>
            <View className="nutri">
              <View className="nutri-item">热量 <Text className="nutri-value">{f.kcal}</Text> kcal</View>
              <View className="nutri-item">糖 <Text className="nutri-value">{f.sugar}</Text> g</View>
              <View className="nutri-item">脂肪 <Text className="nutri-value">{f.fat}</Text> g</View>
              <View className="nutri-item">纤维 <Text className="nutri-value">{f.fiber}</Text> g</View>
            </View>
          </View>
        ))
      )}
    </View>
  );
}
