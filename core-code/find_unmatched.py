with open('E:\\ThreeInOne\\DeadDrop\\prompts\\software\\demo-server\\static\\index.html', 'r', encoding='utf-8') as f:
    html = f.read()

js_start = html.find('<script>') + 8
js_end = html.find('</script>', js_start)
js = html[js_start:js_end]

# Proper state machine that ignores braces inside strings and comments
state = 0  # 0=normal, 1=single_quote, 2=double_quote, 3=template, 4=line_comment, 5=block_comment
stack = []
for i, ch in enumerate(js):
    if state == 0:
        if ch == '{':
            stack.append(('brace', i))
        elif ch == '}':
            if stack and stack[-1][0] == 'brace':
                stack.pop()
            else:
                print(f'Unmatched }} at {i}')
        elif ch == "'":
            state = 1
        elif ch == '"':
            state = 2
        elif ch == '`':
            state = 3
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
        elif ch == '$' and i+1 < len(js) and js[i+1] == '{':
            pass  # template expr, braces still count
    elif state == 4:
        if ch == '\n':
            state = 0
    elif state == 5:
        if ch == '*' and i+1 < len(js) and js[i+1] == '/':
            state = 0

if stack:
    print(f'Unmatched {{ count: {len(stack)}')
    for typ, pos in stack:
        ctx = js[max(0,pos-40):pos+40]
        print(f'  pos {pos}: [{ctx}]')
else:
    print('All braces balanced!')
