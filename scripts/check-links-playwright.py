#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Playwright 浏览器级链接可达性检测
- 真实 Chromium 加载每个 URL，判定"能否真正打开"
- 并发 5，页面导航超时 25s，等待 load 事件
- 输出: 结果明细 CSV + 汇总 + 与 HTTP 层结果对比
用法: python3 scripts/check-links-playwright.py [--only-bad] [--limit N]
"""
import csv
import json
import re
import sys
import asyncio
from collections import Counter

from playwright.async_api import async_playwright

NAV_TIMEOUT = 25000  # 单页导航超时
CONCURRENCY = 5
USER_AGENT = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
              "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36")


def load_bookmarks():
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
    seen, out = set(), []
    for b in bms:
        u = b["url"].strip().rstrip("/").lower()
        if u in seen:
            continue
        seen.add(u)
        out.append(b)
    return out


def full_url(u):
    u = u.strip()
    if not u.startswith(("http://", "https://")):
        u = "https://" + u
    return u


async def check_one(browser, item):
    url = full_url(item["url"])
    ctx = await browser.new_context(
        user_agent=USER_AGENT,
        viewport={"width": 1280, "height": 800},
        ignore_https_errors=True,
    )
    page = await ctx.new_page()
    result = {
        "title": item["title"], "url": item["url"], "final_url": url,
        "status": None, "title_found": "", "content_len": 0,
        "nav_ms": 0, "result": "",
    }
    import time
    t0 = time.time()
    try:
        resp = await page.goto(url, wait_until="load", timeout=NAV_TIMEOUT)
        result["status"] = resp.status if resp else None
        result["final_url"] = page.url
        try:
            result["title_found"] = (await page.title())[:80]
        except Exception:
            result["title_found"] = ""
        try:
            body = await page.evaluate("document.body ? document.body.innerText.length : 0")
            result["content_len"] = body
        except Exception:
            result["content_len"] = 0
        result["nav_ms"] = int((time.time() - t0) * 1000)

        st = result["status"]
        if st is None or st >= 500:
            result["result"] = f"fail_http_{st}"
        elif st >= 400:
            # 403 可能是 WAF 拦裸请求，浏览器能打开就算 ok，但记录
            result["result"] = f"http_{st}"
        elif result["content_len"] < 50 and "challenge" in result["title_found"].lower():
            result["result"] = "blocked_challenge"
        else:
            result["result"] = "ok"
    except Exception as e:
        result["nav_ms"] = int((time.time() - t0) * 1000)
        result["result"] = f"fail_{str(e)[:70]}"
    finally:
        await ctx.close()
    return result


async def main():
    only_bad = "--only-bad" in sys.argv
    bookmarks = load_bookmarks()
    if only_bad:
        # 读取 HTTP 层结果，只复测非 ok 项
        try:
            rows = list(csv.DictReader(open("scripts/link-check-result.csv", encoding="utf-8-sig")))
            bad_urls = {r["url"].strip().rstrip("/").lower() for r in rows if r["result"] != "ok"}
            bookmarks = [b for b in bookmarks if b["url"].strip().rstrip("/").lower() in bad_urls]
        except Exception:
            pass
    print(f"Playwright 复测: {len(bookmarks)} 条 (并发 {CONCURRENCY})")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        sem = asyncio.Semaphore(CONCURRENCY)

        async def worker(item):
            async with sem:
                return await check_one(browser, item)

        results = await asyncio.gather(*[worker(b) for b in bookmarks])
        await browser.close()

    # 汇总
    ok = [r for r in results if r["result"] == "ok"]
    http4 = [r for r in results if r["result"].startswith("http_4")]
    blocked = [r for r in results if r["result"] == "blocked_challenge"]
    fail = [r for r in results if r["result"].startswith("fail")]
    other = [r for r in results if r not in ok and r not in http4 and r not in blocked and r not in fail]

    print("\n========== Playwright 汇总 ==========")
    print(f"正常打开: {len(ok)}")
    print(f"HTTP 4xx: {len(http4)}  {Counter(r['result'] for r in http4)}")
    print(f"被反爬拦截(challenge): {len(blocked)}")
    print(f"加载失败: {len(fail)}")
    if other:
        print(f"其他: {len(other)} {Counter(r['result'] for r in other)}")

    with open("scripts/playwright-result.csv", "w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f)
        w.writerow(["title", "url", "final_url", "status", "title_found", "content_len", "nav_ms", "result"])
        for r in sorted(results, key=lambda x: x["result"]):
            w.writerow([r["title"], r["url"], r["final_url"], r["status"], r["title_found"], r["content_len"], r["nav_ms"], r["result"]])

    print("\n明细已写入 scripts/playwright-result.csv")
    print("\n========== 无法打开的链接 ==========")
    for r in sorted(fail, key=lambda x: x["result"]):
        print(f"  [{r['result']}] {r['title']}  {r['url']}")


if __name__ == "__main__":
    asyncio.run(main())
