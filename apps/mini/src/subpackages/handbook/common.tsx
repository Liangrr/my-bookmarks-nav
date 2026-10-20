import { useMemo, useState } from "react";
import { Text, View, ScrollView } from "@tarojs/components";

// 通用手册浏览器：4 个同构手册（sections[]{items[]}）共用，按字段映射渲染要点块。

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
    // 同标签（note/caution/不要做）只取第一个非空，避免重复
    if (out.some((b) => b.label === f.label)) continue;
    out.push({ label: f.label, text: asStr(v) });
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
        return (
          <View key={String(it.id ?? i)} className="card">
            <View className="card-head">
              <Text className="name">{asStr(it.title)}</Text>
            </View>
            {Array.isArray(it.tags) && it.tags.length > 0 ? (
              <View className="sig">
                {(it.tags as unknown[]).map((t, j) => <Text key={j} className="sig-item">{String(t)}</Text>)}
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
