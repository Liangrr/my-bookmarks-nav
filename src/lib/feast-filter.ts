// /meals 聚餐筛选：行政区 + 菜系 + 关键词三重过滤，纯逻辑（从 meal-planner-view 抽出，行为保持不变）。

export type FeastPlace = {
  name: string;
  category?: string;
  cuisine?: string;
  district: string;
  subArea?: string;
  station?: string;
  address?: string;
  signature: string[];
};

export type FeastFilter = {
  /** 行政区，空串 = 全部 */
  district: string;
  /** 菜系，空串 = 全部 */
  cuisine: string;
  /** 关键词（店名 / 品类 / 菜系 / 区 / 商圈 / 车站 / 地址 / 招牌菜），空白 = 不过滤 */
  query: string;
};

export function filterFeastPlaces<T extends FeastPlace>(places: T[], filter: FeastFilter): T[] {
  const q = filter.query.trim().toLowerCase();
  return places.filter((p) => {
    if (filter.district && p.district !== filter.district) return false;
    if (filter.cuisine && p.cuisine !== filter.cuisine) return false;
    if (!q) return true;
    const text = [p.name, p.category, p.cuisine, p.district, p.subArea, p.station, p.address, ...p.signature]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return text.includes(q);
  });
}
