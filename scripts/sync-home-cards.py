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
    "slice": ("len/cap 与共享底层数组；map 桶与扩容直觉。", "LAB · append / 共享写"),
    "iface": ("接口动态派发；defer LIFO；panic/recover。", "LAB · defer 栈"),
    "error": ("哨兵错误、%w 包装、errors.Is / As。", "LAB · 错误链"),
    "generics": ("类型参数与约束集合；编译期检查。", "LAB · 约束实例化"),
    "reflect": ("TypeOf/ValueOf/Elem 与结构体 Tag。", "LAB · 反射步骤"),
    "gmp": ("G/P/M、本地与全局队列、work stealing。", "LAB · 4 场景"),
    "channel": ("hchan 与环形缓冲、阻塞 send/recv、close。", "LAB · 环形表盘"),
    "select": ("多路就绪、default 非阻塞、超时 case。", "LAB · 多路 select"),
    "sync": ("Mutex/WaitGroup/Once；取消树传播。", "LAB · cancel"),
    "netpoller": ("阻塞 IO 摘离 CPU；与 GMP 串线。", "LAB · park/wake"),
    "nethttp": ("Accept + 每连接 goroutine + Handler。", "LAB · 请求生命周期"),
    "patterns": ("Worker Pool、Fan-out/in、Pipeline、可取消。", "LAB · 模式步骤"),
    "locks": ("Mutex/RWMutex/WaitGroup/Once/sync.Map。", "LAB · 锁流程"),
    "memmodel": ("happens-before、data race、-race。", "LAB · 同步边"),
    "memory": ("栈与堆；闭包/指针/接口装箱。", "LAB · 栈还是堆"),
    "gc": ("白灰黑、写屏障、STW。", "LAB · 屏障对比"),
    "testing": ("表格驱动、t.Run、benchmark。", "LAB · test + bench"),
    "modules": ("go.mod、require、tidy 与 MVS。", "LAB · go mod tidy"),
    "sql": ("连接池、事务、参数化防注入。", "LAB · SQL 流程"),
    "perf": ("CPU / Heap 热点与优化方向。", "LAB · 热点示意"),
    "checklist": ("质量 / 测试 / 发布 / Review 检查单。", "LAB · 可勾选清单"),
    "shutdown": ("Shutdown、限流、信号量、超时。", "LAB · 下线与限流"),
    "observability": ("Logs / Metrics / Tracing / SLO。", "LAB · 三支柱"),
    "drill": ("跨章串联：调度 / Channel / GC / Context。", "LAB · 模拟题"),
    "cheat": ("全站速查口袋卡片，按分组筛选。", "LAB · 速查过滤"),
}
parts = []
for id_, idx, href, title, short in entries:
    if id_ == "home":
        continue
    p, m = blurb.get(id_, ("交互讲解与 Lab。", "LAB"))
    parts.append(
        f'''          <a class="chapter-card" href="{href}">
            <div class="num">{idx} / {short.upper()}</div>
            <h3>{title}</h3>
            <p>{p}</p>
            <div class="meta">{m}</div>
          </a>'''
    )
block = (
    '        <div class="chapter-grid">\n'
    + "\n".join(parts)
    + "\n        </div>\n"
)
html_path = site / "index.html"
html = html_path.read_text(encoding="utf-8")
start = html.find('        <div class="chapter-grid">')
if start < 0:
    start = html.find('<div class="chapter-grid">')
end = html.find("<h2>设计原则", start)
if start < 0 or end < 0:
    raise SystemExit("markers not found")
html = html[:start] + block + "\n        " + html[end:]
html_path.write_text(html, encoding="utf-8")
text = html_path.read_text(encoding="utf-8")
grids = text.count('class="chapter-grid"')
cards = text.count('class="chapter-card"')
print("grids", grids, "cards", cards)
assert grids == 1 and cards == len(parts), (grids, cards, len(parts))
print("ok")
