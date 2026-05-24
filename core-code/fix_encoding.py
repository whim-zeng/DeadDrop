import sys
sys.stdout.reconfigure(encoding='utf-8')

with open('E:\\ThreeInOne\\DeadDrop\\prompts\\software\\demo-server\\static\\index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Find all replacement characters
positions = [i for i, c in enumerate(html) if c == '\ufffd']
print(f'Found {len(positions)} replacement characters')

for pos in positions:
    ctx = html[max(0,pos-15):pos+15]
    print(f'  pos {pos}: [{ctx}]')
