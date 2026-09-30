#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
更新「中国独立开发者项目列表（程序员版）」数据。
数据源：https://github.com/1c7/chinese-independent-developer
         .github/pages/README-Programmer-Edition.md
用法：python3 scripts/update-indie-dev.py
输出：src/data/independent-developers.json（含 stats / groups，按 md 原始倒序：最新在前）
"""
import json
import re
import sys
import urllib.request
from datetime import datetime, timezone

RAW_URL = (
    "https://raw.githubusercontent.com/1c7/chinese-independent-developer/"
    "master/.github/pages/README-Programmer-Edition.md"
)
OUT_PATH = "src/data/independent-developers.json"
SRC_URL = "https://github.com/1c7/chinese-independent-developer/blob/master/.github/pages/README-Programmer-Edition.md"

DATE_RE = re.compile(r"^###\s+(.+)$")
AUTHOR_RE = re.compile(r"^####\s+(.+)$")
ITEM_START_RE = re.compile(r"^\*\s+(:white_check_mark:|:x:)\s+(.+)$")
LINK_RE = re.compile(r"\[([^\]]+)\]\(([^)]+)\)")
# 裸标题形式：`Sitemap Creator ([Stable](url) | [Pre-Release](url))：desc`
BARE_TITLE_RE = re.compile(r"^(.*?)\s*\(\s*\[[^\]]+\]\([^)]+\)")
# 描述清洗：去掉前导分隔符/括号/管道，直到中文字母数字开头
DESC_CLEAN_RE = re.compile(r"^[^\u4e00-\u9fa5A-Za-z0-9]+")


def fetch_md() -> str:
    req = urllib.request.Request(RAW_URL, headers={"User-Agent": "bookmark-nav-site-updater/1.0"})
    with urllib.request.urlopen(req, timeout=60) as resp:
        return resp.read().decode("utf-8")


def parse_author(raw: str):
    """作者行：'名字 - [Github](url), [博客](url)' / '名字' / '名字 - [推特](url)'"""
    links = []
    for m in LINK_RE.finditer(raw):
        links.append({"text": m.group(1), "url": m.group(2)})
    name = LINK_RE.sub("", raw).strip(" -,\u3001") if links else raw.strip()
    return {"name": name or raw.strip(), "links": links}


def parse_item(line: str):
    """条目行。兼容：
    标准 `* :white_check_mark: [标题](url)：描述 - [更多介绍](url)`
    无冒号 `* :white_check_mark: [标题](url) 描述`
    ` - ` 分隔 `* :white_check_mark: [标题](url) - 描述`
    裸标题 `* :white_check_mark: Sitemap Creator ([Stable](url) | [Pre-Release](url))：描述`
    """
    m = ITEM_START_RE.match(line.strip())
    if not m:
        return None
    status = "ok" if m.group(1) == ":white_check_mark:" else "dead"
    rest = m.group(2).strip()
    links = LINK_RE.findall(rest)
    if not links:
        return None

    first_link = rest.index("(") if rest.startswith("[") else None
    if rest.startswith("[") and rest.startswith("["):
        title = links[0][0]
        url = links[0][1]
        desc_source = rest[rest.index(")") + 1:]
    else:
        bt = BARE_TITLE_RE.match(rest)
        title = bt.group(1).strip() if bt else links[0][0]
        url = links[0][1]
        # 裸标题括号形式：desc 取最后一个右括号之后
        desc_source = rest[rest.rfind(")") + 1:] if ")" in rest else ""

    # 附加链接 = 主链接之外的链接（裸标题形式 links[0] 即主链接）
    extra = []
    seen = 0
    for t, u in links:
        if seen == 0 and url == u:
            seen = 1
            continue
        if u == url and seen == 0:
            seen = 1
            continue
        extra.append({"text": t, "url": u})

    desc = LINK_RE.sub("", desc_source).strip()
    desc = DESC_CLEAN_RE.sub("", desc).strip(" -")
    return {"title": title, "url": url, "status": status, "desc": desc, "links": extra}


def main():
    md = fetch_md()
    groups = []
    cur_date = None
    cur_author = None

    for raw in md.splitlines():
        line = raw.strip()
        if not line or line == "---":
            continue
        dm = DATE_RE.match(line)
        if dm:
            cur_date = dm.group(1).strip()
            cur_author = None
            groups.append({"date": cur_date, "authors": []})
            continue
        am = AUTHOR_RE.match(line)
        if am:
            if not groups:
                groups.append({"date": "", "authors": []})
            cur_author = parse_author(am.group(1))
            groups[-1]["authors"].append({**cur_author, "items": []})
            continue
        im = parse_item(line)
        if im:
            if not groups:
                groups.append({"date": "", "authors": []})
            if not groups[-1]["authors"]:
                # 游离条目（无作者归属）：挂到「未署名」
                groups[-1]["authors"].append({"name": "（未署名）", "links": [], "items": []})
                cur_author = groups[-1]["authors"][-1]
            groups[-1]["authors"][-1]["items"].append(im)

    groups = [g for g in groups if g["authors"]]
    total_items = sum(len(a["items"]) for g in groups for a in g["authors"])
    total_authors = sum(len(g["authors"]) for g in groups)
    ok_items = sum(1 for g in groups for a in g["authors"] for it in a["items"] if it["status"] == "ok")
    dead_items = total_items - ok_items

    data = {
        "source": SRC_URL,
        "updatedAt": datetime.now(timezone.utc).astimezone().strftime("%Y-%m-%d %H:%M:%S %Z"),
        "stats": {
            "total": total_items,
            "ok": ok_items,
            "dead": dead_items,
            "authors": total_authors,
            "dateGroups": len(groups),
        },
        "groups": groups,
    }

    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)

    print(f"OK: {OUT_PATH}")
    print(f"  条目 {total_items}（ok {ok_items} / dead {dead_items}），作者 {total_authors}，日期组 {len(groups)}")
    print(f"  最新组: {groups[0]['date'] if groups else '-'}，最早组: {groups[-1]['date'] if groups else '-'}")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:  # noqa: BLE001
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)
