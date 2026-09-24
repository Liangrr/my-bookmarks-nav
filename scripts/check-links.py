#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
链接可达性批量检测脚本
- 读取 src/data/zhuiju.ts 中 zhuijuBookmarks + page.tsx 硬编码书签
- 标准库 urllib，20 并发，超时 10s，自动补 https://，跟随重定向
- 输出: 汇总统计 + 明细 CSV + 失败清单
用法: python3 scripts/check-links.py
"""
import json
import re
import csv
import ssl
import time
import urllib.request
import urllib.error
from concurrent.futures import ThreadPoolExecutor, as_completed
from collections import Counter

TIMEOUT = 10
CONCURRENCY = 20
USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"

# 读取书签数据 ------------------------------------------------------------
def load_bookmarks():
    """从 zhuiju.ts 读取追剧么书签 + 从 page.tsx 提取硬编码书签"""
    bms = []
    src = open("src/data/zhuiju.ts", encoding="utf-8").read()
    m = re.search(r"export const zhuijuBookmarks: Bookmark\[\] = (\[.*?\]);\n", src, re.S)
    if m:
        bms.extend(json.loads(m.group(1)))

    page = open("src/app/page.tsx", encoding="utf-8").read()
    for line in page.split("\n"):
        line = line.strip()
        if line.startswith("{ title:"):
            try:
                title = re.search(r'title: "([^"]+)"', line).group(1)
                url = re.search(r'url: "([^"]+)"', line).group(1)
                bms.append({"title": title, "url": url, "category": "原站"})
            except Exception:
                pass
    # 去重（按 url 规范化）
    seen, out = set(), []
    for b in bms:
        u = b["url"].strip().rstrip("/").lower()
        if u in seen:
            continue
        seen.add(u)
        out.append(b)
    return out


def full_url(u):
    if not u:
        return ""
    u = u.strip()
    if not u.startswith(("http://", "https://")):
        u = "https://" + u
    return u


# 单链接检测 ---------------------------------------------------------------
def check_one(item):
    url = full_url(item["url"])
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "*/*"})
    t0 = time.time()
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT, context=ctx) as resp:
            dur = time.time() - t0
            final = resp.geturl()
            return {
                "title": item["title"], "url": item["url"], "final_url": final,
                "status": resp.status, "dur": round(dur, 1),
                "result": "ok" if resp.status < 400 else f"http_{resp.status}",
            }
    except urllib.error.HTTPError as e:
        dur = time.time() - t0
        return {
            "title": item["title"], "url": item["url"], "final_url": url,
            "status": e.code, "dur": round(dur, 1), "result": f"http_{e.code}",
        }
    except urllib.error.URLError as e:
        dur = time.time() - t0
        reason = getattr(e, "reason", str(e))
        return {
            "title": item["title"], "url": item["url"], "final_url": url,
            "status": None, "dur": round(dur, 1),
            "result": f"unreachable:{str(reason)[:60]}",
        }
    except Exception as e:
        dur = time.time() - t0
        return {
            "title": item["title"], "url": item["url"], "final_url": url,
            "status": None, "dur": round(dur, 1),
            "result": f"error:{str(e)[:60]}",
        }


def main():
    bookmarks = load_bookmarks()
    print(f"待检测链接: {len(bookmarks)} 条")

    results = []
    with ThreadPoolExecutor(max_workers=CONCURRENCY) as ex:
        futs = {ex.submit(check_one, b): b for b in bookmarks}
        for i, fut in enumerate(as_completed(futs), 1):
            r = fut.result()
            results.append(r)
            if i % 25 == 0:
                print(f"  进度 {i}/{len(bookmarks)} ...")

    # 汇总
    ok = [r for r in results if r["result"] == "ok"]
    http_err = [r for r in results if r["result"].startswith("http_")]
    unreach = [r for r in results if r["result"].startswith("unreachable")]
    other = [r for r in results if r["result"].startswith("error")]

    print("\n========== 汇总 ==========")
    print(f"可访问 (2xx/3xx): {len(ok)}")
    print(f"HTTP 错误: {len(http_err)}  {Counter(r['result'] for r in http_err)}")
    print(f"无法连接: {len(unreach)}  {Counter(r['result'] for r in unreach)}")
    print(f"其他错误: {len(other)}  {Counter(r['result'] for r in other)}")

    # 明细 CSV
    with open("scripts/link-check-result.csv", "w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f)
        w.writerow(["title", "url", "final_url", "status", "dur_s", "result"])
        for r in sorted(results, key=lambda x: x["result"]):
            w.writerow([r["title"], r["url"], r["final_url"], r["status"], r["dur"], r["result"]])
    print(f"\n明细已写入 scripts/link-check-result.csv")

    # 失败清单
    bad = [r for r in results if r["result"] != "ok"]
    print(f"\n========== 非正常链接 {len(bad)} 条 ==========")
    for r in sorted(bad, key=lambda x: x["result"]):
        print(f"  [{r['result']}] {r['title']}  {r['url']}")


if __name__ == "__main__":
    main()
