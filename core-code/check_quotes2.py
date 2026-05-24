import sys
sys.stdout.reconfigure(encoding='utf-8')

with open('E:\\ThreeInOne\\DeadDrop\\prompts\\software\\demo-server\\static\\index.html', 'r', encoding='utf-8') as f:
    html = f.read()

js_start = html.find('<script>')
js_end = html.find('</script>', js_start)
js = html[js_start:js_end]

# Find unclosed single-quote strings
state = 0
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
    print("UNCLOSED string at position", last_quote_pos, "state=", state)
    start = max(0, last_quote_pos - 80)
    end = min(len(js), last_quote_pos + 120)
    ctx = js[start:end]
    print("Context bytes:", [hex(ord(c)) for c in ctx])
    # Find line number
    line_num = js[:last_quote_pos].count('\n') + 1
    print("Line number (approx):", line_num)
else:
    print("All strings closed properly")
