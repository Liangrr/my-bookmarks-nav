#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
数据库书签链接可达性批量检测
- 从 Supabase 读取全部书签 (id, title, url, category_id)
- 并发 20 并发，超时 10s；直连失败后走本地代理(127.0.0.1:7897)复测
- 判定: 可访问(2xx/3xx) | 失效(404/410 / DNS失败 / 直连+代理均连接失败) | 存疑(403/401/429/5xx/SSL)
- 输出: 汇总 + /tmp/link-check-db.csv + 候选删除清单 /tmp/link-check-delete.txt
用法: python3 scripts/check-db-links.py
"""
import csv
import json
import ssl
import urllib.request
import urllib.error
from concurrent.futures import ThreadPoolExecutor, as_completed
from collections import Counter

TIMEOUT = 10
CONCURRENCY = 20
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"
PROXY = "http://127.0.0.1:7897"


def load_env():
    env = {}
    for line in open(".env.local", encoding="utf-8"):
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip().strip('"').strip("'")
    return env


def fetch_bookmarks(url, key):
    req = urllib.request.Request(
        f"{url}/rest/v1/bookmarks?select=id,title,url,category_id&limit=1000",
        headers={"apikey": key, "Authorization": f"Bearer {key}"},
    )
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.loads(r.read().decode())


def full_url(u):
    u = u.strip()
    if not u.startswith(("http://", "https://")):
        u = "https://" + u
    return u


def check_one(bm, use_proxy=False):
    """返回 (id, title, url, status, note)"""
    raw = bm["url"]
    u = full_url(raw)
    timeout = TIMEOUT + 2 if use_proxy else TIMEOUT
    opener = urllib.request.build_opener()
    if use_proxy:
        opener = urllib.request.build_opener(
            urllib.request.ProxyHandler({"http": PROXY, "https": PROXY})
        )
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    req = urllib.request.Request(u, headers={"User-Agent": UA, "Accept": "*/*"})
    try:
        with opener.open(req, timeout=timeout) as r:
            return bm["id"], bm["title"], raw, r.status, "ok"
    except urllib.error.HTTPError as e:
        code = e.code
        if code in (404, 410):
            return bm["id"], bm["title"], raw, code, "dead"
        if code in (403, 401, 429):
            return bm["id"], bm["title"], raw, code, "blocked"
        return bm["id"], bm["title"], raw, code, "http-error"
    except urllib.error.URLError as e:
        reason = str(e.reason).lower() if e.reason else ""
        if "getaddrinfo" in reason or "name or service" in reason or "nodename" in reason:
            return bm["id"], bm["title"], raw, 0, "dns-fail"
        if "timed out" in reason or "timeout" in reason:
            return bm["id"], bm["title"], raw, 0, "timeout"
        if "ssl" in reason:
            return bm["id"], bm["title"], raw, 0, "ssl-error"
        return bm["id"], bm["title"], raw, 0, f"conn-fail:{reason[:30]}"
    except TimeoutError:
        return bm["id"], bm["title"], raw, 0, "timeout"
    except Exception as e:
        return bm["id"], bm["title"], raw, 0, f"err:{type(e).__name__}"


def main():
    env = load_env()
    supabase_url = env["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/")
    anon_key = env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
    bookmarks = fetch_bookmarks(supabase_url, anon_key)
    print(f"共 {len(bookmarks)} 条书签，开始检测（20 并发，直连超时 {TIMEOUT}s，失败走代理复测）")

    results = {}
    with ThreadPoolExecutor(max_workers=CONCURRENCY) as ex:
        futs = {ex.submit(check_one, b): b for b in bookmarks}
        done = 0
        for fut in as_completed(futs):
            id_, title, raw, code, note = fut.result()
            results[id_] = (title, raw, code, note)
            done += 1
            if done % 50 == 0:
                print(f"  进度 {done}/{len(bookmarks)}")

    # 直连失败的走代理复测
    retry_ids = [i for i, (t, r, c, n) in results.items() if n in ("dns-fail", "timeout", "conn-fail", "ssl-error")]
    print(f"直连失败 {len(retry_ids)} 条，走代理复测...")
    retry_map = {b["id"]: b for b in bookmarks if b["id"] in retry_ids}
    with ThreadPoolExecutor(max_workers=10) as ex:
        futs = {ex.submit(check_one, b, True): b for b in retry_map.values()}
        for fut in as_completed(futs):
            id_, title, raw, code, note = fut.result()
            results[id_] = (title, raw, code, note + "(proxy)")

    # 汇总
    cat_cnt = Counter()
    for _t, _r, _c, n in results.values():
        base = n.split("(")[0]
        cat_cnt[base] += 1
    print("\n=== 汇总 ===")
    for k, v in sorted(cat_cnt.items(), key=lambda x: -x[1]):
        print(f"  {k}: {v}")

    # 写 CSV
    with open("/tmp/link-check-db.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["id", "title", "url", "code", "status"])
        for id_, (t, r, c, n) in results.items():
            w.writerow([id_, t, r, c, n])

    # 候选删除：dead(404/410) + 代理复测后仍 dns-fail/timeout/conn-fail
    delete_list = []
    for id_, (t, r, c, n) in results.items():
        base = n.split("(")[0]
        if base in ("dead",):
            delete_list.append((id_, t, r, c, n))
        elif base in ("dns-fail", "timeout", "conn-fail") and "(proxy)" in n:
            delete_list.append((id_, t, r, c, n))
    with open("/tmp/link-check-delete.txt", "w", encoding="utf-8") as f:
        for id_, t, r, c, n in delete_list:
            f.write(f"{id_}\t{t}\t{r}\t{c}\t{n}\n")
    print(f"\n候选删除 {len(delete_list)} 条 -> /tmp/link-check-delete.txt")
    for id_, t, r, c, n in delete_list:
        print(f"  [{id_}] {t} | {r} | {c} {n}")
    print("\n存疑(需人工确认，不自动删):")
    for id_, (t, r, c, n) in results.items():
        base = n.split("(")[0]
        if base in ("blocked", "http-error", "ssl-error"):
            print(f"  [{id_}] {t} | {r} | {c} {n}")


if __name__ == "__main__":
    main()
