import re

with open(r'E:\ThreeInOne\DeadDrop\prompts\software\demo-server\static\index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i in range(679, 730):
    line = lines[i]
    count = line.count("'")
    has_cn = any('\u4e00' <= ch <= '\u9fff' for ch in line)
    if has_cn and count > 0:
        if count % 2 != 0:
            print(f'Line {i+1}: ODD quotes ({count}): {line.strip()[:100]}')
        else:
            m = re.search(r"'[\u4e00-\u9fff]+[,;)\]]", line)
            if m:
                print(f"Line {i+1}: Pattern found {m.group(0)!r}: {line.strip()[:100]}")
