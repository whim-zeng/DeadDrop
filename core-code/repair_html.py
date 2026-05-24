import re

with open('E:\\ThreeInOne\\DeadDrop\\prompts\\software\\demo-server\\static\\index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Build a mapping of known corrupted patterns to fixes
# Each U+FFFD appears with surrounding context
fixes = [
    # CSS comments
    ('DeadDrop \ufffd?Design System', 'DeadDrop \u2014 Design System'),
    ('Colors \ufffd?Warm Slate', 'Colors \u2014 Warm Slate'),
    ('Tailwind Compatibility Utilities \ufffd?*/', 'Tailwind Compatibility Utilities */'),
    ('/* \ufffd?\ufffd?\ufffd?\ufffd?\ufffd?\ufffd? Tailwind Compatibility Utilities \ufffd?\ufffd?\ufffd?\ufffd?\ufffd?\ufffd? */', '/* \u2014\u2014\u2014\u2014\u2014\u2014 Tailwind Compatibility Utilities \u2014\u2014\u2014\u2014\u2014\u2014 */'),
    
    # Mood labels
    ("{ label: '\u5f00\ufffd?',  color:", "{ label: '\u5f00\u5fc3',  color:"),
    ("{ label: '\u6124\ufffd?',  color:", "{ label: '\u6124\u6012',  color:"),
    
    # Distance formatter
    ("Math.round(m)+'\ufffd? : (m/1000).", "Math.round(m)+'\u7c73' : (m/1000)."),
    
    # Time formatter
    ("(diff/60)+'\u5206\u949f\ufffd?;", "(diff/60)+'\u5206\u949f\u524d';"),
    ("(diff/3600)+'\u5c0f\u65f6\ufffd?;", "(diff/3600)+'\u5c0f\u65f6\u524d';"),
    
    # genCode adjectives
    ("const adj = ['\u5b64\u72ec\ufffd?,'\u6df1\u591c\ufffd?,'\u6e56\u8fb9\ufffd?,'\u8857\u89d2\ufffd?,'\u96e8\u540e\ufffd?,'\u5348\u540e\ufffd?,'\u8ff7\u8def\ufffd?,'\u7b49\u5f85\ufffd?,'\u6c89\u9ed8\ufffd?,'\u6d41\u6d6a\ufffd?]]", 
     "const adj = ['\u5b64\u72ec\u7684','\u6df1\u591c\u7684','\u6e56\u8fb9\u7684','\u8857\u89d2\u7684','\u96e8\u540e\u7684','\u5348\u540e\u7684','\u8ff7\u8def\u7684','\u7b49\u5f85\u7684','\u6c89\u9ed8\u7684','\u6d41\u6d6a\u7684']"),
    
    # genCode nouns
    ("const noun = ['\u7f8e\u98df\ufffd?,'\u5931\u7720\ufffd?,'\u5b88\u671b\ufffd?,'\u65c5\u884c\ufffd?,'\u68a6\u60f3\ufffd?,'\u8def\u4eba\ufffd?,'\u5496\u5561\ufffd?,'\u8bfb\ufffd?,'\u5199\u4f5c\ufffd?,'\u542c\u98ce\ufffd?]]", 
     "const noun = ['\u7f8e\u98df\u5bb6','\u5931\u7720\u8005','\u5b88\u671b\u8005','\u65c5\u884c\u8005','\u68a6\u60f3\u5bb6','\u8def\u4eba\u7532','\u5496\u5561\u5e08','\u8bfb\u8005','\u5199\u4f5c\u8005','\u542c\u98ce\u8005']"),
    
    # GPS status
    ("real: ['GPS\u5b9a\u4f4d\ufffd?', 'active']", "real: ['GPS\u5b9a\u4f4d\u4e2d', 'active']"),
    
    # Welcome page
    (">\u53d1\u73b0\u8eab\u8fb9\u7684\u79d8\ufffd?</h1>", ">\u53d1\u73b0\u8eab\u8fb9\u7684\u79d8\u5bc6</h1>"),
    ("\u7740\u964c\u751f\u4eba\u7684\u6545\u4e8b\u3002\u8d70\u8fd1\uff0c\u624d\u80fd\u542c\u89c1\ufffd?</p>", 
     "\u7740\u964c\u751f\u4eba\u7684\u6545\u4e8b\u3002\u8d70\u8fd1\uff0c\u624d\u80fd\u542c\u89c1\u3002</p>"),
    (">\u5f00\u59cb\u63a2\ufffd?</button>", ">\u5f00\u59cb\u63a2\u7d22</button>"),
    ("\u65e0\u9700\u6ce8\u518c \u00b7 \u4f4d\u7f6e\u4ec5\u7528\u4e8e\u9644\u8fd1\u67e5\ufffd?</p>", 
     "\u65e0\u9700\u6ce8\u518c \u00b7 \u4f4d\u7f6e\u4ec5\u7528\u4e8e\u9644\u8fd1\u67e5\u8be2</p>"),
    
    # Identity page
    ("\u8fd9\u53ea\u662f\u4f60\ufffd?DeadDrop \u7684\u4ee3\ufffd?", 
     "\u8fd9\u53ea\u662f\u4f60\u5728 DeadDrop \u7684\u4ee3\u53f7"),
    (">\u6362\u4e00\ufffd?</button>", ">\u6362\u4e00\u4e2a</button>"),
    ('placeholder="\u7ed9\u81ea\u5df1\u8d77\u4e2a\u540d\ufffd?', 'placeholder="\u7ed9\u81ea\u5df1\u8d77\u4e2a\u540d\u5b57"'),
    
    # Map stats
    ("'\u52a0\u8f7d\ufffd?..'}", "'\u52a0\u8f7d\u4e2d...'"),
    
    # Distant notes
    (">\u524d\u65b9\ufffd?", ">\u524d\u65b9\u6709"),
    ("\u5f20\u7eb8\ufffd?</p>", "\u5f20\u7eb8</p>"),
    
    # Map controls
    ('title="\u5b9a\u4f4d\u5230\u6211\u7684\u4f4d\ufffd?', 'title="\u5b9a\u4f4d\u5230\u6211\u7684\u4f4d\u7f6e"'),
    
    # Loading spinner
    (">\u52a0\u8f7d\ufffd?..</div>", ">\u52a0\u8f7d\u4e2d...</div>"),
    
    # Note detail
    ("alert('\u8ddd\u79bb\u592a\u8fdc\ufffd? + data.messa", "alert('\u8ddd\u79bb\u592a\u8fdc\uff1a' + data.messa"),
    ("'24h'?'24\u5c0f\u65f6':'7\ufffd?}</span>", "'24h'?'24\u5c0f\u65f6':'7\u5929'}</span>"),
    ("\u8fd8\u6ca1\u6709\u56de\ufffd?</p>", "\u8fd8\u6ca1\u6709\u56de\u590d</p>"),
    ('placeholder="\u5199\u4e00\u6761\u56de\ufffd?.."', 'placeholder="\u5199\u4e00\u6761\u56de\u590d..."'),
    (">\u53d1\ufffd?</button>", ">\u53d1\u9001</button>"),
    
    # Create page
    ('placeholder="\u5199\u4e0b\u4f60\u5728\u8fd9\u91cc\u7684\u60f3\u6cd5\ufffd?.."', 
     'placeholder="\u5199\u4e0b\u4f60\u5728\u8fd9\u91cc\u7684\u60f3\u6cd5..."'),
    ("['24h','24\u5c0f\u65f6'],['7d','7\ufffd?],['permanent", 
     "['24h','24\u5c0f\u65f6'],['7d','7\u5929'],['permanent"),
    ("\u5f53\u524d\u4f4d\u7f6e\ufffd?", "\u5f53\u524d\u4f4d\u7f6e\uff1a"),
    ("alert('\u8bf7\u8f93\u5165\u5185\ufffd?);", "alert('\u8bf7\u8f93\u5165\u5185\u5bb9');"),
    
    # Chat page
    (">\u5b64\ufffd?</div>", ">\u5b64</div>"),
    ("\u6709\u4eba\u56de\u590d\u4e86\u4f60\u7684\u7eb8\ufffd?</p>", "\u6709\u4eba\u56de\u590d\u4e86\u4f60\u7684\u7eb8\u6761</p>"),
    ("2\u5206\u949f\ufffd?</span>", "2\u5206\u949f\u524d</span>"),
    (">\u6df1\ufffd?</div>", ">\u6df1</div>"),
    ("\u5916\u6ee9\u7684\u591c\u666f\u786e\u5b9e\u5f88\ufffd?</p>", "\u5916\u6ee9\u7684\u591c\u666f\u786e\u5b9e\u5f88\u7f8e</p>"),
    ("1\u5c0f\u65f6\ufffd?</span>", "1\u5c0f\u65f6\u524d</span>"),
    
    # Profile page
    ("\u6211\u653e\u7684\u7eb8\ufffd?</p>", "\u6211\u653e\u7684\u7eb8\u6761</p>"),
    ("\u6211\u8bfb\u7684\u7eb8\ufffd?</p>", "\u6211\u8bfb\u7684\u7eb8\u6761</p>"),
    ("\u6536\u5230\u7684\u56de\ufffd?</p>", "\u6536\u5230\u7684\u56de\u590d</p>"),
    (">\u9000\u51fa\u767b\ufffd?</span>", ">\u9000\u51fa\u767b\u5f55</span>"),
    
    # Simulated walk
    ("alert('\u5df2\u505c\u6b62\u6a21\u62df\u884c\ufffd?);", "alert('\u5df2\u505c\u6b62\u6a21\u62df\u884c\u8d70');"),
    ("alert('\u5df2\u5f00\u59cb\u6a21\u62df\u884c\u8d70\uff08\ufffd?.5\u79d2\u66f4\u65b0\u4f4d\u7f6e\uff09');",
     "alert('\u5df2\u5f00\u59cb\u6a21\u62df\u884c\u8d70\uff08\u6bcf1.5\u79d2\u66f4\u65b0\u4f4d\u7f6e\uff09');"),
]

original = html
count = 0
for old, new in fixes:
    if old in html:
        html = html.replace(old, new)
        count += 1
    else:
        print(f"WARNING: Pattern not found: {old[:50]!r}")

# Check remaining U+FFFD
remaining = html.count('\ufffd')
print(f"Fixed {count} patterns, remaining U+FFFD: {remaining}")

if remaining > 0:
    # Show remaining
    for i, c in enumerate(html):
        if c == '\ufffd':
            ctx = html[max(0,i-15):i+15]
            print(f"  Remaining at {i}: [{ctx!r}]")

# Write back
with open('E:\\ThreeInOne\\DeadDrop\\prompts\\software\\demo-server\\static\\index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("File written.")
