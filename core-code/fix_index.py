import re

with open(r'E:\ThreeInOne\DeadDrop\prompts\software\demo-server\static\index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix 1: MOODS label missing closing quotes
content = content.replace("label: '开心,  color:", "label: '开心',  color:")
content = content.replace("label: '愤怒,  color:", "label: '愤怒',  color:")

# Fix 2: genCode arrays - replace ? after Chinese chars with '
# Only in lines with adj = [ or noun = [
lines = content.split('\n')
new_lines = []
for line in lines:
    if "const adj = ['" in line or "const noun = ['" in line:
        # Replace ? followed by , or ] with ' followed by , or ]
        line = re.sub(r"([\u4e00-\u9fff])\?([,\]])", r"\1'\2", line)
    new_lines.append(line)
content = '\n'.join(new_lines)

# Fix 3: HTML closing tags missing <
# Replace /tag> with </tag> for common tags, but only when not already </tag>
# Be careful not to break valid URLs or paths
# We'll target patterns inside template strings (lines with innerHTML or root.innerHTML)
lines = content.split('\n')
new_lines = []
for line in lines:
    if 'innerHTML' in line or "root.innerHTML = `" in line:
        # Fix missing < in closing tags within template strings
        for tag in ['h1', 'p', 'button', 'span', 'div', 'svg', 'blockquote']:
            # Replace /tag> with </tag> but not </tag>
            # Use negative lookbehind for <
            line = re.sub(rf"(?<!</{tag})(?<!</{tag}>)(?<!</{tag}[^>])/(?=>{tag}>)", r"</", line)
            # Simpler: just replace /tag> with </tag> if the /tag> is not preceded by <
            # But we need to be careful. Let's just do a simple replacement for /tag>
            pass
        # Actually, let's just replace specific patterns
        line = line.replace('/h1>', '</h1>')
        line = line.replace('/p>', '</p>')
        line = line.replace('/button>', '</button>')
        line = line.replace('/span>', '</span>')
        line = line.replace('/div>', '</div>')
        line = line.replace('/svg>', '</svg>')
        line = line.replace('/blockquote>', '</blockquote>')
    new_lines.append(line)
content = '\n'.join(new_lines)

with open(r'E:\ThreeInOne\DeadDrop\prompts\software\demo-server\static\index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed!")
