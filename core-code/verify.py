import re

with open(r'E:\ThreeInOne\DeadDrop\prompts\software\demo-server\static\index.html', 'r', encoding='utf-8') as f:
    content = f.read()

print('BOM present:', content[0] == '\ufeff')
print('id=root:', 'id="root"' in content)
print('render();:', 'render();' in content)
print('Length:', len(content))

for tag in ['p', 'h1', 'button', 'span', 'div', 'svg', 'blockquote']:
    bad1 = f'<</{tag}>'
    if bad1 in content:
        print(f'BAD: {bad1} x {content.count(bad1)}')
    matches = list(re.finditer(rf'(?<!<)/{tag}>', content))
    if matches:
        print(f'BAD: /{tag}> x {len(matches)}')

# Check JS syntax - count quotes in critical lines
lines = content.split('\n')
for i in [684, 686, 717, 718]:
    line = lines[i]
    print(f'Line {i+1}: {line.strip()[:80]}')
