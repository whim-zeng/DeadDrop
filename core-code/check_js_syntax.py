import re

with open(r'E:\ThreeInOne\DeadDrop\prompts\software\demo-server\static\index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Extract JavaScript portion
script_start = content.find('<script>')
script_end = content.find('</script>', script_start)
js = content[script_start+8:script_end]

lines = js.split('\n')
issues = []

for i, line in enumerate(lines):
    # Find all single-quoted strings on this line
    # Look for patterns like 'word' or 'word'
    # Check for strings that are not properly closed before end of line or before next quote
    pos = 0
    while True:
        start = line.find("'", pos)
        if start == -1:
            break
        # Find next single quote
        end = line.find("'", start + 1)
        if end == -1:
            # No closing quote on this line - might be multi-line, skip
            break
        # Check the content between quotes
        inner = line[start+1:end]
        # If inner contains Chinese characters and the character after end quote is not , or ) or } or ] or : or ; or space
        # and if end quote is immediately followed by a letter or digit, that might be an issue
        # Actually, let's just check: if there's a Chinese char right before end quote, 
        # and the pattern looks like it should be a complete string but the closing quote is missing
        # Let's check specific bad patterns: 'xxx followed by comma without closing quote
        # or 'xxx followed by ) without closing quote
        
        # Move past this string
        pos = end + 1
    
    # Simpler: look for patterns where a quote starts, has Chinese chars, then has a comma or ) or ] without closing quote
    # Pattern: '[^'\n]*[\u4e00-\u9fff][^'\n]*(?=[,;)\]])  -- but this is hard
    
    # Let's just manually check lines with Chinese chars inside quotes
    matches = list(re.finditer(r"'([^'\n]*[\u4e00-\u9fff]+[^'\n]*?)'", line))
    # Also find unclosed ones: ' followed by Chinese chars but no closing quote before line ends (unless multi-line string, which JS doesn't have with single quotes)
    unclosed = list(re.finditer(r"'([^'\n]*[\u4e00-\u9fff]+[^'\n]*?)(?=[,;)\]])", line))
    # This regex is tricky. Let's use a different approach.

# Better approach: tokenize and find invalid JS patterns
print("=== Checking for unclosed single-quoted strings with Chinese chars ===")
for i, line in enumerate(lines):
    if i < 600:  # Skip CSS portion
        continue
    # Simple heuristic: find ' then Chinese chars then , or ) without closing '
    # We'll scan character by character
    in_string = False
    string_start = -1
    string_has_chinese = False
    for j, ch in enumerate(line):
        if ch == "'" and (j == 0 or line[j-1] != '\\'):
            if not in_string:
                in_string = True
                string_start = j
                string_has_chinese = False
            else:
                in_string = False
                string_has_chinese = False
        elif in_string:
            if '\u4e00' <= ch <= '\u9fff':
                string_has_chinese = True
    
    if in_string and string_has_chinese:
        issues.append((i+1, line.strip()))
        print(f"Line {i+1}: Unclosed string with Chinese chars")
        print(f"  {line.strip()[:120]}")

print(f"\nTotal issues found: {len(issues)}")

# Also check for the specific MOODS and genCode patterns
print("\n=== Checking specific patterns ===")
for i, line in enumerate(lines):
    if i < 600:
        continue
    # Check for 'Chinese chars then comma without closing quote
    # e.g., '开心,  or '愤怒,  or '孤独的?, 
    # Pattern: '[一-鿿]+[,;\)]
    m = re.search(r"'[\u4e00-\u9fff]+[,;)\]]", line)
    if m:
        # Verify it's actually unclosed
        start = m.start()
        match_str = m.group(0)
        # Check if there's a closing quote before the comma/paren
        if "'" not in match_str[1:-1]:
            print(f"Line {i+1}: Likely unclosed quote: {match_str}")
            print(f"  {line.strip()[:120]}")
