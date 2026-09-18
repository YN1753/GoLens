#!/usr/bin/env python3
"""Rebuild homepage chapter cards from chapters.js order."""
from pathlib import Path
import re

root = Path(__file__).resolve().parents[1]
site = root / "site"
js = (site / "assets/js/chapters.js").read_text(encoding="utf-8")
entries = re.findall(
    r'\{\s*id:\s*"([^"]+)",\s*idx:\s*"([^"]+)",\s*href:\s*"([^"]+)",\s*title:\s*"([^"]+)",\s*short:\s*"([^"]+)"',
    js,
)
blurb = {
    "string": ("字节还是字符；[]byte/[]rune；range 的字节下标。", "LAB · UTF-8 视图"),
    "slice": ("len/cap 与共享底层数组陷阱；map 哈希桶。", "LAB · append / 共享写"),
    "iface": ("接口动态派发；defer LIFO；panic/recover。", "LAB · defer 栈"),
    "error": ("哨兵错误、%w 包装、errors.Is / As。", "LAB · 错误链"),
    "generics": ("类型参数与约束集合；编译期检查。", "LAB · 约束实例化"),
    "gmp": ("G / P / M、本地与全局队列、work stealing。", "LAB · 4 场景 · 可单步"),
    "channel": ("hchan 与环形缓冲、阻塞 send/recv。", "LAB · 环形表盘"),
    "select": ("多路 channel 就绪选择、default、超时。", "LAB · 多路 select"),
    "sync": ("Mutex/WaitGroup/Once；Context 取消树。", "LAB · cancel 传播"),
    "netpoller": ("阻塞 IO 如何被摘离 CPU；与 GMP 串线。", "LAB · park/wake"),
    "memory": ("栈与堆；逃逸分析常见原因。", "LAB · 栈还是堆"),
    "gc": ("三色标记、写屏障、STW。", "LAB · 对比开/关屏障"),
    "testing": ("表格驱动、t.Run、benchmark。", "LAB · test + bench"),
    "modules": ("go.mod、require、tidy 与 MVS。", "LAB · go mod tidy"),
    "perf": ("CPU / Heap profile 热点与优化方向。", "LAB · 热点示意"),
}
cards = []
for id_, idx, href, title, short in entries:
    if id_ == "home":
        continue
    p, m = blurb.get(id_, ("", "LAB"))
    cards.append(
        f'''          <a class="chapter-card" href="{href}">
            <div class="num">{idx} / {short.upper()}</div>
            <h3>{title}</h3>
            <p>{p}</p>
            <div class="meta">{m}</div>
          </a>'''
    )
block = '<div class="chapter-grid">\n' + "\n".join(cards) + "\n        </div>"
html_path = site / "index.html"
html = html_path.read_text(encoding="utf-8")
new_html, n = re.subn(
    r'<div class="chapter-grid">.*?</div>',
    block,
    html,
    count=1,
    flags=re.S,
)
if n != 1:
    raise SystemExit("chapter-grid not replaced")
html_path.write_text(new_html, encoding="utf-8")
print("cards", len(cards) - 0)
print("ok", html_path)
