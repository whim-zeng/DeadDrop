import re

with open('E:\\ThreeInOne\\DeadDrop\\prompts\\software\\demo-server\\static\\index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Check in JS section
js_start = html.find('<script>')
js_end = html.find('</script>', js_start)
js = html[js_start:js_end]
js_backticks = [m.start() for m in re.finditer('`', js)]
print(f'Backticks in JS: {len(js_backticks)}')

# Find the FIRST few backticks and their context
for i, pos in enumerate(js_backticks[:5]):
    ctx = js[max(0,pos-20):pos+60]
    print(f'Backtick {i} at {pos}: ...{ctx!r}...')
    print()

# The issue might be an unmatched backtick - let's find backticks that
# are NOT part of proper template literals by doing a simple state machine
# States: 0=normal, 1=template_string, 2=single_quote, 3=double_quote
state = 0
issue_positions = []
for i, ch in enumerate(js):
    if state == 0:
        if ch == '`':
            state = 1
        elif ch == "'":
            state = 2
        elif ch == '"':
            state = 3
        elif ch == '/':
            if i+1 < len(js) and js[i+1] == '/':
                state = 4
            elif i+1 < len(js) and js[i+1] == '*':
                state = 5
    elif state == 1:
        if ch == '`':
            state = 0
        elif ch == '\\' and i+1 < len(js):
            pass  # escaped next char
        elif ch == '$' and i+1 < len(js) and js[i+1] == '{':
            pass  # template expression start
    elif state == 2:
        if ch == '\\':
            pass
        elif ch == "'":
            state = 0
    elif state == 3:
        if ch == '\\':
            pass
        elif ch == '"':
            state = 0
    elif state == 4:
        if ch == '\n':
            state = 0
    elif state == 5:
        if ch == '*' and i+1 < len(js) and js[i+1] == '/':
            state = 0

# Check final state
if state != 0:
    print(f'FINAL STATE NOT NORMAL: state={state}')
else:
    print('All strings/templates properly closed')

# Now check for nested template literals that might be problematic
# Look for `...${` patterns with unmatched closing
import re
template_pattern = re.compile(r'`(?:[^`\\]|\\.)*`', re.DOTALL)
templates = list(template_pattern.finditer(js))
print(f"Regex-found template literals: {len(templates)}")

# Check for actual syntax: template literals with nested ${}
for m in templates[:5]:
    content = m.group()
    if len(content) < 100:
        print(f"Template: {content!r}")
