import sys, re
sys.stdout.reconfigure(encoding='utf-8')

with open('E:\\ThreeInOne\\DeadDrop\\prompts\\software\\demo-server\\static\\index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Direct replacements based on exact context observed
fixes = [
    ("label: '\u5f00\ufffd?',  color:", "label: '\u5f00\u5fc3',  color:"),
    ("label: '\u6124\ufffd?',  color:", "label: '\u6124\u6012',  color:"),
    (">\u53d1\u73b0\u8eab\u8fb9\u7684\u79d8\ufffd?</h1>", ">\u53d1\u73b0\u8eab\u8fb9\u7684\u79d8\u5bc6</h1>"),
    ("\u624d\u80fd\u542c\u89c1\ufffd?</p>", "\u624d\u80fd\u542c\u89c1\u3002</p>"),
    (">\u5f00\u59cb\u63a2\ufffd?</button>", ">\u5f00\u59cb\u63a2\u7d22</button>"),
    ("\u4ec5\u7528\u4e8e\u9644\u8fd1\u67e5\ufffd?</p>", "\u4ec5\u7528\u4e8e\u9644\u8fd1\u67e5\u8be2</p>"),
    (">\u6362\u4e00\ufffd?</button>", ">\u6362\u4e00\u4e2a</button>"),
    ("${d.count} \u5f20\u7eb8\ufffd?</p>", "${d.count} \u5f20\u7eb8\u6761</p>"),
    ("'\u5df2\u89e3\ufffd? :", "'\u5df2\u89e3\u9501' :"),
    ("\u8fd8\u6ca1\u6709\u56de\ufffd?</p>", "\u8fd8\u6ca1\u6709\u56de\u590d</p>"),
    (">\u53d1\ufffd?</button>", ">\u53d1\u9001</button>"),
    ('"\u5199\u4e0b\u4f60\u5728\u8fd9\u91cc\u7684\u60f3\ufffd?.."', '"\u5199\u4e0b\u4f60\u5728\u8fd9\u91cc\u7684\u60f3\u6cd5..."'),
    ('">\ufffd?</div>', '">\u5b64</div>'),
    ("\u4f60\u7684\u7eb8\ufffd?</p>", "\u4f60\u7684\u7eb8\u6761</p>"),
    ("2\u5206\u949f\ufffd?</span>", "2\u5206\u949f\u524d</span>"),
    ('">\ufffd?</div>\n        <div\n', '">\u6df1</div>\n        <div\n'),
    ("\u5f88\ufffd?</p>", "\u5f88\u7f8e</p>"),
    ("1\u5c0f\u65f6\ufffd?</span>", "1\u5c0f\u65f6\u524d</span>"),
    ("\u6211\u653e\u7684\u7eb8\ufffd?</p>", "\u6211\u653e\u7684\u7eb8\u6761</p>"),
    ("\u6211\u8bfb\u7684\u7eb8\ufffd?</p>", "\u6211\u8bfb\u7684\u7eb8\u6761</p>"),
    ("\u6536\u5230\u7684\u56de\ufffd?</p>", "\u6536\u5230\u7684\u56de\u590d</p>"),
    (">\u9000\u51fa\u767b\ufffd?</span>", ">\u9000\u51fa\u767b\u5f55</span>"),
]

for old, new in fixes:
    if old in html:
        html = html.replace(old, new)

remaining = html.count('\ufffd')
print(f"Remaining U+FFFD: {remaining}")

if remaining > 0:
    for i, c in enumerate(html):
        if c == '\ufffd':
            ctx = html[max(0,i-15):i+15]
            print(f"pos {i}: [{ctx}]")

with open('E:\\ThreeInOne\\DeadDrop\\prompts\\software\\demo-server\\static\\index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("Done")
