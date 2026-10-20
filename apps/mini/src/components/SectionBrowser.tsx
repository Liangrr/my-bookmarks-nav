import { useMemo, useState } from "react";
import { Text, View, ScrollView } from "@tarojs/components";

// 通用手册浏览器（主包组件，供 handbook / living 分包复用）：sections[]{items[]}，按字段渲染要点块。

type Source = { text?: string; url?: string };
type Block = { label: string; text: string };

export type HandbookSection = {
  id: string;
  title: string;
  intro?: string;
  items: Record<string, unknown>[];
};

function asStr(v: unknown): string {
  if (v == null) return "";
  if (Array.isArray(v)) return v.join("、");
  return String(v);
}

// 顶部元信息 chips：评级 / 难度 / 紧迫度等
const META_FIELDS = ["grade", "ratio", "level", "difficulty", "urgency", "priority"];

// 字段 → 要点块标签；按数组顺序展示
const BLOCK_FIELDS: { key: string; label: string }[] = [
  { key: "cost", label: "成本" },
  { key: "gear", label: "装备" },
  { key: "method", label: "做法" },
  { key: "steps", label: "步骤" },
  { key: "benefit", label: "收益" },
  { key: "effect", label: "效果" },
  { key: "note", label: "注意" },
  { key: "caution", label: "注意" },
  { key: "donts", label: "不要做" },
  { key: "goto", label: "立即处理" },
  { key: "source", label: "出处" },
];

function blocksOf(item: Record<string, unknown>): Block[] {
  const out: Block[] = [];
  for (const f of BLOCK_FIELDS) {
    const v = item[f.key];
    if (v == null || v === "") continue;
    if (out.some((b) => b.label === f.label)) continue;
    out.push({ label: f.label, text: asStr(v) });
  }
  return out;
}

function metaChips(item: Record<string, unknown>): string[] {
  const out: string[] = [];
  for (const k of META_FIELDS) {
    const v = item[k];
    if (v != null && v !== "") out.push(asStr(v));
  }
  return out;
}

function sourcesOf(item: Record<string, unknown>): Source[] {
  const s = item.sources;
  if (Array.isArray(s)) return s.filter((x) => x && typeof x === "object") as Source[];
  return [];
}

export default function SectionBrowser({ sections, title }: { sections: HandbookSection[]; title: string }) {
  const [secId, setSecId] = useState(sections[0]?.id ?? "");
  const section = useMemo(
    () => sections.find((s) => s.id === secId) ?? sections[0],
    [secId, sections]
  );

  return (
    <View className="page">
      <View className="title">{title}</View>
      {section?.intro ? <View className="sub">{section.intro}</View> : null}

      <ScrollView scrollX enhanced showScrollbar={false} className="chips-scroll">
        <View className="chips">
          {sections.map((s) => (
            <View key={s.id} className={`chip${s.id === secId ? " chip-on" : ""}`} onClick={() => setSecId(s.id)}>
              {s.title}
            </View>
          ))}
        </View>
      </ScrollView>

      {section?.items.map((it, i) => {
        const blocks = blocksOf(it);
        const sources = sourcesOf(it);
        const metas = metaChips(it);
        return (
          <View key={String(it.id ?? i)} className="card">
            <View className="card-head">
              <Text className="name">{asStr(it.title)}</Text>
            </View>
            {metas.length > 0 || Array.isArray(it.tags) ? (
              <View className="sig">
                {metas.map((m, j) => <Text key={`m${j}`} className="sig-item">{m}</Text>)}
                {Array.isArray(it.tags)
                  ? (it.tags as unknown[]).map((t, j) => <Text key={`t${j}`} className="sig-item">{String(t)}</Text>)
                  : null}
              </View>
            ) : null}
            {asStr(it.plain) ? <View className="line">{asStr(it.plain)}</View> : null}
            {blocks.map((b) => (
              <View key={b.label} className="line">
                <Text className="block-label">{b.label}：</Text>{b.text}
              </View>
            ))}
            {sources.map((s, j) => (
              <View key={j} className="line src">参考：{s.text ?? s.url}</View>
            ))}
          </View>
        );
      })}
    </View>
  );
}
