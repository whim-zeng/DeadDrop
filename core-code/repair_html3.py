import re

with open('E:\\ThreeInOne\\DeadDrop\\prompts\\software\\demo-server\\static\\index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Strategy: find each U+FFFD and its context, then replace based on patterns
remaining = list(re.finditer(r'[\ufffd]', html))
print(f"Total U+FFFD to fix: {len(remaining)}")

# Pattern-based replacements using regex for more flexibility
replacements = [
    # CSS section: em dashes in comments
    (r'/\* \ufffd+ Tailwind', '/* \u2014\u2014\u2014\u2014\u2014\u2014 Tailwind'),
    (r'Utilities \ufffd+ \*/', 'Utilities */'),
    
    # genCode arrays - adjectives ending with \u7684
    (r"'\u5b64\u72ec\ufffd", "'\u5b64\u72ec\u7684"),
    (r"'\u6df1\u591c\ufffd", "'\u6df1\u591c\u7684"),
    (r"'\u6e56\u8fb9\ufffd", "'\u6e56\u8fb9\u7684"),
    (r"'\u8857\u89d2\ufffd", "'\u8857\u89d2\u7684"),
    (r"'\u96e8\u540e\ufffd", "'\u96e8\u540e\u7684"),
    (r"'\u5348\u540e\ufffd", "'\u5348\u540e\u7684"),
    (r"'\u8ff7\u8def\ufffd", "'\u8ff7\u8def\u7684"),
    (r"'\u7b49\u5f85\ufffd", "'\u7b49\u5f85\u7684"),
    (r"'\u6c89\u9ed8\ufffd", "'\u6c89\u9ed8\u7684"),
    (r"'\u6d41\u6d6a\ufffd", "'\u6d41\u6d6a\u7684"),
    
    # genCode arrays - nouns ending with \u8005 or \u5bb6 or \u5e08 or \u7532
    (r"'\u7f8e\u98df\ufffd", "'\u7f8e\u98df\u5bb6"),
    (r"'\u5931\u7720\ufffd", "'\u5931\u7720\u8005"),
    (r"'\u5b88\u671b\ufffd", "'\u5b88\u671b\u8005"),
    (r"'\u65c5\u884c\ufffd", "'\u65c5\u884c\u8005"),
    (r"'\u68a6\u60f3\ufffd", "'\u68a6\u60f3\u5bb6"),
    (r"'\u8def\u4eba\ufffd", "'\u8def\u4eba\u7532"),
    (r"'\u5496\u5561\ufffd", "'\u5496\u5561\u5e08"),
    (r"'\u8bfb\ufffd", "'\u8bfb\u8005"),
    (r"'\u5199\u4f5c\ufffd", "'\u5199\u4f5c\u8005"),
    (r"'\u542c\u98ce\ufffd", "'\u542c\u98ce\u8005"),
    
    # Common Chinese characters/punctuation
    (r"\u5b9a\u4f4d\ufffd\?", "\u5b9a\u4f4d\u4e2d"),  # \u5b9a\u4f4d\u4e2d
    (r"\u79d8\ufffd\?</h1>", "\u79d8\u5bc6</h1>"),
    (r"\u542c\u89c1\ufffd\?</p>", "\u542c\u89c1\u3002</p>"),
    (r"\u63a2\ufffd\?</button>", "\u63a2\u7d22</button>"),
    (r"\u67e5\ufffd\?</p>", "\u67e5\u8be2</p>"),
    (r"\u4ee3\ufffd\?</p>", "\u4ee3\u53f7</p>"),
    (r"\u4f60\ufffd\?DeadDrop", "\u4f60\u5728 DeadDrop"),
    (r"\u4e00\ufffd\?</button>", "\u4e00\u4e2a</button>"),
    (r"\u540d\ufffd\?", "\u540d\u5b57"),
    (r"\u52a0\u8f7d\ufffd\?\.\.", "\u52a0\u8f7d\u4e2d..."),
    (r"\u7eb8\ufffd\?</p>", "\u7eb8\u6761</p>"),
    (r"\u524d\u65b9\ufffd\?", "\u524d\u65b9\u6709"),
    (r"\u4f4d\ufffd\?", "\u4f4d\u7f6e"),
    (r"\u592a\u8fdc\ufffd\? ", "\u592a\u8fdc\uff1a' "),
    (r"7\ufffd\?\}</span>", "7\u5929'}</span>"),
    (r"\u56de\ufffd\?</p>", "\u56de\u590d</p>"),
    (r"\u56de\ufffd\?\.\.", "\u56de\u590d..."),
    (r"\u53d1\ufffd\?</button>", "\u53d1\u9001</button>"),
    (r"\u60f3\u6cd5\ufffd\?\.\.", "\u60f3\u6cd5..."),
    (r"7\ufffd\?\],\['permanent", "7\u5929'],['permanent"),
    (r"\u4f4d\u7f6e\ufffd\?", "\u4f4d\u7f6e\uff1a"),
    (r"\u5185\ufffd\?\);", "\u5185\u5bb9');"),
    (r">\u5b64\ufffd\?</div>", ">\u5b64</div>"),
    (r">\u6df1\ufffd\?</div>", ">\u6df1</div>"),
    (r"\u7eb8\ufffd\?</p>", "\u7eb8\u6761</p>"),
    (r"\u5206\u949f\ufffd\?</span>", "\u5206\u949f\u524d</span>"),
    (r"\u5f88\ufffd\?</p>", "\u5f88\u7f8e</p>"),
    (r"\u5c0f\u65f6\ufffd\?</span>", "\u5c0f\u65f6\u524d</span>"),
    (r"\u7eb8\ufffd\?</p>", "\u7eb8\u6761</p>"),
    (r"\u7eb8\ufffd\?</p>", "\u7eb8\u6761</p>"),
    (r"\u56de\ufffd\?</p>", "\u56de\u590d</p>"),
    (r"\u767b\ufffd\?</span>", "\u767b\u5f55</span>"),
    (r"\u884c\ufffd\?\);", "\u884c\u8d70');"),
    (r"\uff08\ufffd\?\.5", "\uff08\u6bcf1.5"),
    (r"\u8fd9\ufffd\?Design", "\u8fd9\u4e00 Design"),  # em dash was corrupted
    (r"\u8272 \ufffd\?Warm", "\u8272 \u2014 Warm"),
]

for pattern, replacement in replacements:
    html, n = re.subn(pattern, replacement, html)
    if n > 0:
        print(f"Fixed {n} matches for pattern: {pattern[:40]}")

remaining_count = html.count('\ufffd')
print(f"Remaining U+FFFD: {remaining_count}")

with open('E:\\ThreeInOne\\DeadDrop\\prompts\\software\\demo-server\\static\\index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("Done")
