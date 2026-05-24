with open(r'E:\ThreeInOne\DeadDrop\prompts\software\demo-server\static\index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i in [841, 842, 843]:
    line = lines[i]
    print(f'Line {i+1}: {line.strip()[:80]}')
    print(f'  innerHTML in line: {"innerHTML" in line}')
    print(f'  Has /h1>: {"/h1>" in line}')
    print(f'  Has </h1>: {"</h1>" in line}')
