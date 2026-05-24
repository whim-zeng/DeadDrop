import sys
sys.stdout.reconfigure(encoding='utf-8')

with open('E:\\ThreeInOne\\DeadDrop\\prompts\\software\\demo-server\\static\\index.html', 'r', encoding='utf-8') as f:
    html = f.read()

for i, c in enumerate(html):
    if c == '\ufffd':
        ctx = html[max(0,i-20):i+20]
        print(f"pos {i}: [{ctx}]")
