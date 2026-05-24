with open(r'E:\ThreeInOne\DeadDrop\prompts\software\demo-server\static\index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if '?' in line and "'" in line:
        # Check if ? appears right after Chinese chars and before comma/semicolon
        import re
        matches = re.finditer(r"[\u4e00-\u9fff]\?[,;)\]]", line)
        for m in matches:
            print(f"Line {i+1}: Found ? after Chinese char: {m.group(0)!r}")
            print(f"  {line.strip()[:120]}")

# Also check for unclosed HTML tags in template strings
print("\n=== Checking for unclosed HTML tags in templates ===")
for i, line in enumerate(lines):
    if '/h1>' in line or '/p>' in line or '/button>' in line or '/span>' in line:
        # Check if it's missing < before /
        for tag in ['h1', 'p', 'button', 'span', 'div', 'svg', 'blockquote']:
            if f'/{tag}>' in line and f'</{tag}>' not in line:
                # Might be in a template string
                if "'" in line or '"' in line:
                    print(f"Line {i+1}: Missing < in </{tag}>")
                    print(f"  {line.strip()[:120]}")
