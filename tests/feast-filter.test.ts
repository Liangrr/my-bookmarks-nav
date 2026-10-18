import { describe, expect, it } from "vitest";
import RAW from "@shared-data/meal-planner.json";
import { filterFeastPlaces, type FeastPlace } from "@shared-lib/feast-filter";

type Place = FeastPlace;
const PLACES = (RAW as unknown as { feast: { places: Place[] } }).feast.places;

const EMPTY = { district: "", cuisine: "", query: "" };

// 合成数据：字段各司其职，便于精确断言「命中的到底是哪个字段」
const A: Place = {
  name: "甲店",
  category: "粤菜 · 点心",
  cuisine: "粤菜·早茶",
  district: "福田",
  subArea: "星河 COCO Park",
  station: "地铁1号线购物公园站",
  address: "福田区福华三路 1 号",
  signature: ["脆皮乳鸽"],
};
const B: Place = {
  name: "乙店",
  category: "潮汕牛肉",
  cuisine: "潮汕菜",
  district: "南山",
  subArea: "车公庙",
  station: "地铁1号线车公庙站",
  address: "南山区泰然九路 2 号",
  signature: ["牛肉火锅"],
};
const C: Place = {
  name: "丙店",
  category: "卤味",
  cuisine: "潮汕菜",
  district: "福田",
  subArea: "皇岗",
  station: "地铁7号线皇岗村站",
  address: "福田区福民路 3 号",
  signature: ["卤鹅"],
};
const SAMPLE = [A, B, C];

describe("filterFeastPlaces：行政区 / 菜系 / 关键词三重筛选", () => {
  it("空条件 → 返回全部", () => {
    expect(filterFeastPlaces(SAMPLE, EMPTY)).toEqual(SAMPLE);
    expect(filterFeastPlaces(PLACES, EMPTY)).toHaveLength(PLACES.length);
  });

  it("只按行政区过滤", () => {
    expect(filterFeastPlaces(SAMPLE, { ...EMPTY, district: "福田" })).toEqual([A, C]);
    expect(filterFeastPlaces(SAMPLE, { ...EMPTY, district: "南山" })).toEqual([B]);
    expect(filterFeastPlaces(SAMPLE, { ...EMPTY, district: "不存在区" })).toEqual([]);
    // 真实数据：福田的店都真的是福田
    const real = filterFeastPlaces(PLACES, { ...EMPTY, district: "福田" });
    expect(real.length).toBeGreaterThan(0);
    expect(real.every((p) => p.district === "福田")).toBe(true);
  });

  it("只按菜系过滤", () => {
    expect(filterFeastPlaces(SAMPLE, { ...EMPTY, cuisine: "潮汕菜" })).toEqual([B, C]);
    expect(filterFeastPlaces(SAMPLE, { ...EMPTY, cuisine: "粤菜·早茶" })).toEqual([A]);
  });

  it("行政区 + 菜系 + 关键词三重叠加", () => {
    // 福田 ∩ 潮汕菜 ∩ 「鹅」（只在 C 的招牌菜里）
    const hit = filterFeastPlaces(SAMPLE, { district: "福田", cuisine: "潮汕菜", query: "鹅" });
    expect(hit).toEqual([C]);
    // 同样条件换成「鸽」（只在 A 的招牌菜里，但 A 不是潮汕菜）→ 无结果
    expect(filterFeastPlaces(SAMPLE, { district: "福田", cuisine: "潮汕菜", query: "鸽" })).toEqual([]);
    // 去掉菜系后「鸽」命中 A
    expect(filterFeastPlaces(SAMPLE, { district: "福田", cuisine: "", query: "鸽" })).toEqual([A]);
  });

  it("关键词能命中非店名字段：招牌菜 / 商圈 / 车站 / 地址 / 品类", () => {
    expect(filterFeastPlaces(SAMPLE, { ...EMPTY, query: "脆皮乳鸽" }).map((p) => p.name)).toEqual(["甲店"]);
    expect(filterFeastPlaces(SAMPLE, { ...EMPTY, query: "COCO Park" }).map((p) => p.name)).toEqual(["甲店"]);
    expect(filterFeastPlaces(SAMPLE, { ...EMPTY, query: "车公庙" }).map((p) => p.name)).toContain("乙店"); // 商圈 + 车站
    expect(filterFeastPlaces(SAMPLE, { ...EMPTY, query: "福民路" }).map((p) => p.name)).toEqual(["丙店"]);
    expect(filterFeastPlaces(SAMPLE, { ...EMPTY, query: "卤味" }).map((p) => p.name)).toEqual(["丙店"]); // 品类
  });

  it("关键词忽略大小写与首尾空白；空关键词等于不过滤", () => {
    expect(filterFeastPlaces(SAMPLE, { ...EMPTY, query: "  coco  " }).map((p) => p.name)).toEqual(["甲店"]);
    expect(filterFeastPlaces(SAMPLE, { ...EMPTY, query: "   " })).toEqual(SAMPLE);
  });

  it("关键词无命中 → 空数组", () => {
    expect(filterFeastPlaces(SAMPLE, { ...EMPTY, query: "不存在的东西" })).toEqual([]);
    expect(filterFeastPlaces(PLACES, { ...EMPTY, query: "不存在的东西" })).toEqual([]);
  });

  it("不改动入参（筛选返回新数组）", () => {
    const copy = SAMPLE.slice();
    filterFeastPlaces(SAMPLE, { ...EMPTY, district: "福田" });
    expect(SAMPLE).toEqual(copy);
  });
});
