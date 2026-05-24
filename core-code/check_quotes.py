import re

with open('E:\\ThreeInOne\\DeadDrop\\prompts\\software\\demo-server\\static\\index.html', 'r', encoding='utf-8') as f:
    html = f.read()

js_start = html.find('<script>')
js_end = html.find('</script>', js_start)
js = html[js_start:js_end]

# Find unclosed single-quote strings
# State machine: track whether we're in a single-quoted string
state = 0  # 0=normal, 1=single_quote, 2=double_quote, 3=template, 4=line_comment, 5=block_comment
last_quote_pos = -1
for i, ch in enumerate(js):
    if state == 0:
        if ch == "'":
            state = 1
            last_quote_pos = i
        elif ch == '"':
            state = 2
            last_quote_pos = i
        elif ch == '`':
            state = 3
            last_quote_pos = i
        elif ch == '/' and i+1 < len(js):
            if js[i+1] == '/':
                state = 4
            elif js[i+1] == '*':
                state = 5
    elif state == 1:
        if ch == '\\' and i+1 < len(js):
            pass
        elif ch == "'":
            state = 0
    elif state == 2:
        if ch == '\\' and i+1 < len(js):
            pass
        elif ch == '"':
            state = 0
    elif state == 3:
        if ch == '\\' and i+1 < len(js):
            pass
        elif ch == '`':
            state = 0
    elif state == 4:
        if ch == '\n':
            state = 0
    elif state == 5:
        if ch == '*' and i+1 < len(js) and js[i+1] == '/':
            state = 0

if state != 0:
    print(f"UNCLOSED string at position {last_quote_pos}, state={state}")
    ctx = js[max(0,last_quote_pos-80):last_quote_pos+120]
    print(f"Context: {ctx!r}")
else:
    print("All strings closed properly")
