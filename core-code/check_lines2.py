import re

with open(r'E:\ThreeInOne\DeadDrop\prompts\software\demo-server\static\index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Check genCode area lines 715-725
for i in range(714, 725):
    line = lines[i]
    count = line.count("'")
    has_cn = any('\u4e00' <= ch <= '\u9fff' for ch in line)
    if has_cn:
        print(f'Line {i+1} ({count} quotes): {line.strip()[:120]}')
        # Check each char
        segment = line.strip()
        print(f'  Chars: ', end='')
        for ch in segment[:60]:
            if ch == "'":
                print("[Q]", end='')
            elif '\u4e00' <= ch <= '\u9fff':
                print(f"[{ch}]", end='')
            elif ch == ',':
                print("[C]", end='')
            else:
                print(ch, end='')
        print()
