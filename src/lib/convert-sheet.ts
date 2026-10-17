// convert-tool「CSV/JSON 转 Excel」的分支判定与 worksheet 输入形态：不依赖 XLSX，便于单测。
// 判定规则与组件内原实现一致：文件名（忽略大小写）以 .json 结尾 → JSON 分支，否则 CSV 分支。

export type SheetInput =
  /** JSON 分支：交给 XLSX.utils.json_to_sheet（单个对象会自动包成单元素数组） */
  | { kind: "json"; rows: Record<string, unknown>[] }
  /** CSV 分支：交给 XLSX.utils.aoa_to_sheet */
  | { kind: "aoa"; rows: string[][] };

export function isJsonFile(fileName: string): boolean {
  return fileName.toLowerCase().endsWith(".json");
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { cur += '"'; i++; } else inQ = false;
      } else cur += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") { row.push(cur); cur = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cur); cur = "";
      if (row.some((x) => x !== "")) rows.push(row);
      row = [];
    } else cur += c;
  }
  row.push(cur);
  if (row.some((x) => x !== "")) rows.push(row);
  return rows;
}

export function pickSheetInput(fileName: string, text: string): SheetInput {
  if (!isJsonFile(fileName)) return { kind: "aoa", rows: parseCsv(text) };
  const data = JSON.parse(text) as unknown;
  return {
    kind: "json",
    rows: Array.isArray(data) ? (data as Record<string, unknown>[]) : [data as Record<string, unknown>],
  };
}
