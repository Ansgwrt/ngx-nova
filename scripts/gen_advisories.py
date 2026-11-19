#!/usr/bin/env python3
"""从 nginx.org 官方安全公告页生成 internal/service/advisories.json。

用法:
    python3 scripts/gen_advisories.py            # 联网抓取
    python3 scripts/gen_advisories.py page.html  # 使用本地已保存的页面

生成结果由 Go 侧 go:embed 嵌入二进制，用于本地版本自检（不发起任何外部请求）。
"""

import json
import re
import sys
import urllib.request
from datetime import datetime, timezone

SOURCE = "https://nginx.org/en/security_advisories.html"
OUT = "internal/service/advisories.json"

LI_RE = re.compile(r"<li><p>(.*?)</p></li>", re.S)
TAG_RE = re.compile(r"<[^>]+>")
CVE_RE = re.compile(r"CVE-\d{4}-\d+")
VER_RE = re.compile(r"^\d+\.\d+\.\d+$")


def strip_tags(fragment: str) -> str:
    return TAG_RE.sub("", fragment).replace("&nbsp;", " ").strip()


def parse_version_range(text: str):
    """把 "1.31.9+" / "0.6.18-1.31.8" / "0.1.0-0.8.14" 解析成结构化区间。"""
    text = text.strip()
    out = []
    for part in text.split(","):
        part = part.strip()
        if not part:
            continue
        if part.endswith("+"):
            v = part[:-1].strip()
            if VER_RE.match(v):
                out.append({"op": "gte", "version": v})
        elif "-" in part:
            lo, hi = [p.strip() for p in part.split("-", 1)]
            if VER_RE.match(lo) and VER_RE.match(hi):
                out.append({"op": "range", "from": lo, "to": hi})
        elif VER_RE.match(part):
            out.append({"op": "eq", "version": part})
    return out


def collect_fixed(advisories, odd: bool):
    """取该分支(奇数=mainline/偶数=stable)内最高的修复版本。"""
    best = None
    for adv in advisories:
        for rng in adv["not_vulnerable"]:
            if rng["op"] != "gte":
                continue
            ver = rng["version"]
            minor = int(ver.split(".")[1])
            if (minor % 2 == 1) != odd:
                continue
            if best is None or tuple(map(int, ver.split("."))) > tuple(map(int, best.split("."))):
                best = ver
    return best


def main() -> int:
    if len(sys.argv) > 1:
        html = open(sys.argv[1], encoding="utf-8", errors="replace").read()
    else:
        with urllib.request.urlopen(SOURCE, timeout=45) as resp:
            html = resp.read().decode("utf-8", errors="replace")

    advisories = []
    for block in LI_RE.findall(html):
        lines = [strip_tags(x) for x in block.split("<br>")]
        lines = [x for x in lines if x]
        if not lines:
            continue

        title = lines[0]
        severity = ""
        cve = ""
        not_vulnerable_text = ""
        vulnerable_text = ""

        for idx, line in enumerate(lines):
            if line.lower().startswith("severity:"):
                severity = line.split(":", 1)[1].strip().lower()
            m = CVE_RE.search(line)
            if m and not cve:
                cve = m.group(0)  # 源站偶有 CVE-CVE-xxx 笔误，正则天然纠正
            if line.startswith("Not vulnerable:"):
                not_vulnerable_text = line.split(":", 1)[1].strip()
            if line.startswith("Vulnerable:") and "Not vulnerable" not in line:
                vulnerable_text = line.split(":", 1)[1].strip()

        if not not_vulnerable_text:
            continue

        advisories.append({
            "title": title,
            "severity": severity or "unknown",
            "cve": cve,
            "not_vulnerable": parse_version_range(not_vulnerable_text),
            "vulnerable": parse_version_range(vulnerable_text),
            "not_vulnerable_text": not_vulnerable_text,
            "vulnerable_text": vulnerable_text,
        })

    payload = {
        "source": SOURCE,
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "count": len(advisories),
        "recommended": {
            "stable": collect_fixed(advisories, odd=False),
            "mainline": collect_fixed(advisories, odd=True),
        },
        "advisories": advisories,
    }

    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(payload, fh, ensure_ascii=False, indent=2)
        fh.write("\n")

    print(f"wrote {OUT}: {len(advisories)} advisories, "
          f"stable={payload['recommended']['stable']}, "
          f"mainline={payload['recommended']['mainline']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
