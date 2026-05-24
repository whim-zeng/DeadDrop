import re

with open(r'E:\ThreeInOne\DeadDrop\prompts\software\demo-server\static\index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Step 1: Fix double < tags back to normal
for tag in ['h1', 'p', 'button', 'span', 'div', 'svg', 'blockquote']:
    content = content.replace(f'<</{tag}>', f'</{tag}>')

# Step 2: Now fix only truly broken ones ( /tag> not preceded by < )
for tag in ['h1', 'p', 'button', 'span', 'div', 'svg', 'blockquote']:
    content = re.sub(rf'(?<!<)/{tag}>', f'</{tag}>', content)

with open(r'E:\ThreeInOne\DeadDrop\prompts\software\demo-server\static\index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print('Fixed!')
