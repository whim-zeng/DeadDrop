with open(r'E:\ThreeInOne\DeadDrop\prompts\software\demo-server\static\index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace all /tag> with </tag> for common HTML tags
# These only appear as broken closing tags in template strings
content = content.replace('/h1>', '</h1>')
content = content.replace('/p>', '</p>')
content = content.replace('/button>', '</button>')
content = content.replace('/span>', '</span>')
content = content.replace('/div>', '</div>')
content = content.replace('/svg>', '</svg>')
content = content.replace('/blockquote>', '</blockquote>')

with open(r'E:\ThreeInOne\DeadDrop\prompts\software\demo-server\static\index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("HTML tags fixed!")
