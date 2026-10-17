import { describe, expect, it } from "vitest";
import { isJsonFile, parseCsv, pickSheetInput } from "../src/lib/convert-sheet";

describe("isJsonFile：按扩展名判定走哪个分支（忽略大小写）", () => {
  it("大写扩展名 x.JSON 也走 JSON 分支", () => {
    expect(isJsonFile("x.JSON")).toBe(true);
    expect(pickSheetInput("x.JSON", '[{"a":1}]').kind).toBe("json");
  });

  it("小写 a.json 走 JSON 分支", () => {
    expect(isJsonFile("a.json")).toBe(true);
    expect(pickSheetInput("a.json", '[{"a":1}]').kind).toBe("json");
  });

  it("a.csv / a.xlsx / 无扩展名 → CSV 分支", () => {
    for (const name of ["a.csv", "a.xlsx", "a", "a.CSV", "a.jsonx"]) {
      expect(isJsonFile(name), name).toBe(false);
      expect(pickSheetInput(name, "a,b\n1,2").kind, name).toBe("aoa");
    }
  });
});

describe("pickSheetInput：两种分支产出的 worksheet 输入形态", () => {
  it("CSV 分支：二维数组（aoa）", () => {
    const input = pickSheetInput("a.csv", "名称,价格\n早茶,30\n");
    expect(input).toEqual({
      kind: "aoa",
      rows: [
        ["名称", "价格"],
        ["早茶", "30"],
      ],
    });
  });

  it("JSON 分支 · 数组：原样交给 json_to_sheet", () => {
    const input = pickSheetInput("a.json", '[{"名称":"早茶","价格":30},{"名称":"卤鹅","价格":45}]');
    expect(input.kind).toBe("json");
    expect(input.kind === "json" && input.rows).toEqual([
      { 名称: "早茶", 价格: 30 },
      { 名称: "卤鹅", 价格: 45 },
    ]);
  });

  it("JSON 分支 · 单个对象：包成单元素数组（与原实现一致）", () => {
    const input = pickSheetInput("a.JSON", '{"名称":"早茶","价格":30}');
    expect(input.kind === "json" && input.rows).toEqual([{ 名称: "早茶", 价格: 30 }]);
  });

  it("JSON 非法时抛错（交给组件的错误提示处理）", () => {
    expect(() => pickSheetInput("a.json", "{不是 JSON")).toThrow();
  });

  it("parseCsv 保留原实现的细节：引号转义、\r\n、跳过空行", () => {
    expect(parseCsv('a,"b,c"\r\n"含""引号""",2\n\n,,\n')).toEqual([
      ["a", "b,c"],
      ['含"引号"', "2"],
    ]);
  });
});

describe("轻量 stub 掉 XLSX：两条分支拿到的入参都能直接生成 worksheet", () => {
  it("json 序列 → json_to_sheet(array of objects)；aoa 序列 → aoa_to_sheet(array of arrays)", () => {
    const seen: { fn: string; arg: unknown }[] = [];
    const XLSX = {
      utils: {
        json_to_sheet: (rows: unknown) => {
          seen.push({ fn: "json_to_sheet", arg: rows });
          return { kind: "ws-from-json" };
        },
        aoa_to_sheet: (rows: unknown) => {
          seen.push({ fn: "aoa_to_sheet", arg: rows });
          return { kind: "ws-from-aoa" };
        },
      },
    };
    // 与组件里同一段分派：input.kind === "json" ? json_to_sheet : aoa_to_sheet
    const build = (fileName: string, text: string) => {
      const input = pickSheetInput(fileName, text);
      return input.kind === "json" ? XLSX.utils.json_to_sheet(input.rows) : XLSX.utils.aoa_to_sheet(input.rows);
    };

    expect(build("数据.JSON", '[{"名称":"早茶"}]')).toEqual({ kind: "ws-from-json" });
    expect(build("单个.json", '{"名称":"早茶"}')).toEqual({ kind: "ws-from-json" });
    expect(build("数据.csv", "名称,价格\n早茶,30\n")).toEqual({ kind: "ws-from-aoa" });
    expect(build("无扩展名", "名称,价格\n早茶,30\n")).toEqual({ kind: "ws-from-aoa" });

    expect(seen.map((s) => s.fn)).toEqual(["json_to_sheet", "json_to_sheet", "aoa_to_sheet", "aoa_to_sheet"]);
    expect(seen[0].arg).toEqual([{ 名称: "早茶" }]);
    expect(seen[1].arg).toEqual([{ 名称: "早茶" }]);
    expect(seen[2].arg).toEqual([
      ["名称", "价格"],
      ["早茶", "30"],
    ]);
  });
});
