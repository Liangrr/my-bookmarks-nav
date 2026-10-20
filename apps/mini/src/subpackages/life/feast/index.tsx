import { useMemo, useState } from "react";
import { Input, Text, View, ScrollView } from "@tarojs/components";
import planner from "@shared-data/meal-planner.json";
import { filterFeastPlaces } from "@shared-lib/feast-filter";

type Place = {
  id: string;
  name: string;
  category?: string;
  cuisine?: string;
  district: string;
  subArea?: string;
  station?: string;
  address?: string;
  perPerson: number;
  perText?: string;
  signature: string[];
  verdict?: string;
  tips?: string;
  sourceNote?: string;
};

const FEAST = (planner as unknown as { feast: { places: Place[]; cuisines: string[]; updated?: string; note?: string } }).feast;
const PLACES = FEAST.places;
const CUISINES = FEAST.cuisines.filter((c) => PLACES.some((p) => p.cuisine === c));
const DISTRICTS = Array.from(new Set(PLACES.map((p) => p.district)));

export default function Feast() {
  const [q, setQ] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [district, setDistrict] = useState("");

  const list = useMemo(
    () => filterFeastPlaces(PLACES, { query: q, cuisine, district }),
    [q, cuisine, district]
  );

  return (
    <View className="page">
      <View className="title">今天吃什么 · 外食榜单</View>
      <View className="sub">
        共 {PLACES.length} 家 · 更新 {FEAST.updated ?? "-"}；人均为参考值，标「未核实」以到店为准。
      </View>

      <Input
        className="search"
        value={q}
        onInput={(e) => setQ(e.detail.value)}
        placeholder="搜店名 / 商圈 / 招牌菜 / 区域"
        placeholderClass="sub"
      />

      <View className="filter-label">菜系</View>
      <ScrollView scrollX enhanced showScrollbar={false} className="chips-scroll">
        <View className="chips">
          <View className={`chip${cuisine === "" ? " chip-on" : ""}`} onClick={() => setCuisine("")}>全部</View>
          {CUISINES.map((c) => (
            <View key={c} className={`chip${cuisine === c ? " chip-on" : ""}`} onClick={() => setCuisine(c)}>{c}</View>
          ))}
        </View>
      </ScrollView>

      <View className="filter-label">区域</View>
      <ScrollView scrollX enhanced showScrollbar={false} className="chips-scroll">
        <View className="chips">
          <View className={`chip${district === "" ? " chip-on" : ""}`} onClick={() => setDistrict("")}>全部</View>
          {DISTRICTS.map((d) => (
            <View key={d} className={`chip${district === d ? " chip-on" : ""}`} onClick={() => setDistrict(d)}>{d}</View>
          ))}
        </View>
      </ScrollView>

      <View className="sub">命中 {list.length} 家</View>

      {list.length === 0 ? (
        <View className="empty">没有符合条件的门店</View>
      ) : (
        list.map((p) => (
          <View key={p.id} className="card">
            <View className="card-head">
              <Text className="name">{p.name}</Text>
              <Text className="tag">¥{p.perPerson}/人</Text>
            </View>
            <View className="line">{p.district} · {p.subArea ?? ""}（{p.cuisine ?? p.category ?? ""}）</View>
            <View className="sig">
              {p.signature.map((s) => <Text key={s} className="sig-item">{s}</Text>)}
            </View>
            {p.address ? <View className="line">📍 {p.address}</View> : null}
            {p.verdict ? <View className="line">{p.verdict}</View> : null}
            {p.tips ? <View className="line tip">提示：{p.tips}</View> : null}
            {p.sourceNote ? <View className="line src">{p.sourceNote}</View> : null}
          </View>
        ))
      )}
    </View>
  );
}
