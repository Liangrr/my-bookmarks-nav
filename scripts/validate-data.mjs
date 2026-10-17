#!/usr/bin/env node
// 数据体检：在 CI 里跑，防止手改/脚本合并 JSON 时字段、枚举、取值范围、id 唯一性被破坏。
// 用法：npm run validate:data（退出码非 0 表示有硬性问题，部署会被拦下）
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const DATA_DIR = fileURLToPath(new URL("../src/data/", import.meta.url));

const CUISINES = ["粤菜·早茶", "潮汕菜", "川湘·云贵", "火锅·烤肉", "烧烤·海鲜", "日料·韩食", "东南亚·西餐", "其他菜系"];
const DISTRICTS = ["福田", "罗湖", "南山", "宝安", "龙华", "龙岗", "盐田", "光明", "坪山", "大鹏"];

const problems = [];
// 警告不阻断部署：例如「缺 sources」属于历史遗留的数据完整度问题，删掉条目会丢内容，编来源又违反诚实红线，只提示不拦。
const warnings = [];
const bad = (file, msg) => problems.push(`${file}: ${msg}`);
const warn = (file, msg) => warnings.push(`${file}: ${msg}`);
const isHttp = (v) => typeof v === "string" && /^https?:\/\//.test(v);

/** 兜底体检：递归找「带 id 的对象数组」，检查 id 是否缺失或重复 */
function checkIds(file, node, path = "") {
  if (Array.isArray(node)) {
    const objs = node.filter((x) => x && typeof x === "object");
    if (objs.length === node.length && node.length > 0 && "id" in objs[0]) {
      const seen = new Map();
      for (const o of node) {
        if (typeof o.id !== "string" && typeof o.id !== "number") bad(file, `${path}[].id 缺失或非字符串`);
        const k = String(o.id);
        if (seen.has(k)) bad(file, `${path} 出现重复 id：${k}`);
        seen.set(k, true);
      }
    }
    node.forEach((x, i) => checkIds(file, x, `${path}[${i}]`));
    return;
  }
  if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node)) checkIds(file, v, path ? `${path}.${k}` : k);
  }
}

function checkMealPlanner(file, d) {
  const feast = d.feast;
  if (!feast || !Array.isArray(feast.places)) return bad(file, "缺少 feast.places");
  const seenNames = new Set();
  feast.places.forEach((p, i) => {
    const at = `feast.places[${i}](${p.name ?? "?"})`;
    for (const k of ["name", "category", "cuisine", "district", "station", "address", "perText", "fit", "verdict", "tips", "source", "sourceNote"]) {
      if (!p[k]) bad(file, `${at} 缺字段 ${k}`);
    }
    if (!CUISINES.includes(p.cuisine)) bad(file, `${at} 菜系不在枚举内：${p.cuisine}`);
    if (!DISTRICTS.includes(p.district)) bad(file, `${at} 行政区不在枚举内：${p.district}`);
    if (!Number.isInteger(p.perPerson) || p.perPerson < 40 || p.perPerson > 200) bad(file, `${at} 人均应在 40~200：${p.perPerson}`);
    const lv = p.perPerson < 70 ? 1 : p.perPerson <= 140 ? 2 : 3;
    if (p.level !== lv) bad(file, `${at} level 与人均不符：level=${p.level} 期望 ${lv}`);
    const subs = p.subs ?? {};
    if (Object.keys(subs).length !== 4) bad(file, `${at} subs 应含 taste/vibe/service/value`);
    for (const [k, v] of Object.entries(subs)) {
      if (!Number.isInteger(v) || v < 1 || v > 5) bad(file, `${at} subs.${k} 应在 1~5：${v}`);
    }
    if (!Array.isArray(p.signature) || p.signature.length === 0) bad(file, `${at} 缺 signature 招牌菜`);
    if (!isHttp(p.source)) bad(file, `${at} source 必须是 http(s) 链接`);
    const key = `${p.name}|${p.subArea ?? ""}`;
    if (seenNames.has(key)) bad(file, `${at} 同名同商圈重复收录`);
    seenNames.add(key);
    if (typeof p.rank !== "number") bad(file, `${at} 缺 rank`);
  });
  const ranks = feast.places.map((p) => p.rank).sort((a, b) => a - b);
  if (ranks.join(",") !== ranks.map((_, i) => i + 1).join(",")) bad(file, "rank 不是 1..n 的连续编号");
}

function checkLiving(file, d) {
  if (!Array.isArray(d.sections)) return bad(file, "缺少 sections");
  d.sections.forEach((s, i) => {
    const at = `sections[${i}](${s.title ?? "?"})`;
    if (!Array.isArray(s.items) || s.items.length === 0) bad(file, `${at} items 为空`);
    (s.items ?? []).forEach((it, j) => {
      if (!["A", "B", "C"].includes(it.grade)) bad(file, `${at}.items[${j}] grade 非 A/B/C：${it.grade}`);
      if (!["极高", "高", "一般"].includes(it.ratio)) bad(file, `${at}.items[${j}] ratio 非法：${it.ratio}`);
      for (const k of ["title", "plain", "cost", "benefit"]) if (!it[k]) bad(file, `${at}.items[${j}] 缺 ${k}`);
      // 正文开头残留「：」是历史拆分脚本留下的脏字符，会直接显示在卡片上
      for (const k of ["plain", "cost", "benefit", "note"]) {
        if (typeof it[k] === "string" && /^[：:]/.test(it[k])) warn(file, `${at}.items[${j}] ${k} 开头有多余的「：」`);
      }
      const srcs = Array.isArray(it.sources) ? it.sources : [];
      if (srcs.length === 0) {
        warn(file, `${at}.items[${j}](${it.title ?? "?"}) 缺 sources（正文无出处，页面已如实展示）`);
      }
      let linked = 0;
      srcs.forEach((sc, m) => {
        const sat = `${at}.items[${j}].sources[${m}]`;
        if (!sc.text) bad(file, `${sat} 缺引用文字`);
        // 只有作者/期刊名、没有链接的引用是允许的（真正的链接通常紧随其后），但必须至少有一条可点链接
        if (!sc.url) {
          warn(file, `${sat} 只有引用文字、没有链接：${sc.text}`);
          return;
        }
        if (!isHttp(sc.url)) bad(file, `${sat} url 不是 http(s)：${sc.url}`);
        linked++;
      });
      if (srcs.length > 0 && linked === 0) bad(file, `${at}.items[${j}] 所有 sources 都没有可点链接`);
    });
  });
}

function checkFruits(file, d) {
  if (!Array.isArray(d.fruits)) return bad(file, "缺少 fruits");
  d.fruits.forEach((f, i) => {
    const at = `fruits[${i}](${f.name ?? "?"})`;
    for (const k of ["kcal", "sugar", "fat", "fiber"]) {
      if (typeof f[k] !== "number") bad(file, `${at} ${k} 不是数字`);
    }
    if (!Array.isArray(f.months) || f.months.some((m) => !Number.isInteger(m) || m < 1 || m > 12)) {
      bad(file, `${at} months 应为 1~12 的整数数组`);
    }
  });
}

const SPECIAL = { "meal-planner.json": checkMealPlanner, "living-guide.json": checkLiving, "seasonal-fruits.json": checkFruits };

const files = readdirSync(DATA_DIR).filter((f) => f.endsWith(".json")).sort();
let entities = 0;
for (const file of files) {
  let raw;
  try {
    raw = readFileSync(join(DATA_DIR, file), "utf8");
  } catch (e) {
    bad(file, `读取失败：${e.message}`);
    continue;
  }
  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    bad(file, `JSON 解析失败：${e.message}`);
    continue;
  }
  checkIds(file, data);
  if (SPECIAL[file]) SPECIAL[file](file, data);
}

// 汇总输出（每个文件的数据规模，便于人工核对；meal-planner 顶层是分组数组，单独统计）
for (const file of files) {
  const d = JSON.parse(readFileSync(join(DATA_DIR, file), "utf8"));
  if (file === "meal-planner.json") {
    const places = d.feast?.places?.length ?? 0;
    entities += places;
    console.log(`  ${file.padEnd(28)} 套餐 ${d.sets?.length ?? 0} 组 · 聚餐门店 ${places} 家`);
  } else {
    const n = Object.values(d).find((v) => Array.isArray(v))?.length ?? 0;
    entities += n;
    console.log(`  ${file.padEnd(28)} 条目 ${n}`);
  }
}

if (warnings.length > 0) {
  console.warn(`\n⚠ ${warnings.length} 条警告（不阻断部署，后续修数据时顺手处理）：`);
  for (const w of warnings.slice(0, 10)) console.warn(`  - ${w}`);
  if (warnings.length > 10) console.warn(`  … 其余 ${warnings.length - 10} 条省略`);
}

if (problems.length > 0) {
  console.error(`\n✗ 数据体检不通过，共 ${problems.length} 个问题：`);
  for (const p of problems.slice(0, 40)) console.error(`  - ${p}`);
  if (problems.length > 40) console.error(`  … 其余 ${problems.length - 40} 条省略`);
  process.exit(1);
}
console.log(`\n✓ 数据体检通过：${files.length} 个数据文件，条目合计约 ${entities}`);
